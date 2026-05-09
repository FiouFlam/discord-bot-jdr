const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getFiche, setFiche, deleteFiche, getAllFiches, getFichesByUser, getFicheByMonde, setFicheByMonde, deleteFicheByMonde, getAllFichesByMonde } = require('../utils/database');
const { buildFicheEmbed, buildFicheButtons, buildFicheButtonsReadonly, buildNavigationButtons, createDefaultFiche } = require('../utils/ficheBuilder');

// Récupère toutes les fiches d'un userId depuis MongoDB (un par monde)
async function getAllFichesByUser(client, userId) {
  const { connect } = require('../utils/database');
  const db = await connect();
  const docs = await db.collection('fiches').find({ userId }).toArray();
  return docs.map(({ _id, userId: _, ...fiche }) => fiche);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fiche')
    .setDescription('Gérer ou consulter les fiches personnages')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('[Admin] Créer une fiche personnage')
        .addUserOption(opt => opt.setName('user').setDescription('Le joueur').setRequired(true))
        .addStringOption(opt => opt.setName('nom').setDescription('Nom / Prénom').setRequired(true))
        .addStringOption(opt => opt.setName('age').setDescription('Âge').setRequired(true))
        .addStringOption(opt => opt.setName('taille').setDescription('Taille (ex: 1m75)').setRequired(true))
        .addStringOption(opt => opt.setName('descriptif').setDescription('Descriptif de la vie sur Terre').setRequired(true))
        .addStringOption(opt => opt.setName('competences').setDescription('Format: intelligence;force;dextérité;chance (ex: 10;8;12;5)').setRequired(true))
        .addIntegerOption(opt => opt.setName('monde').setDescription('Numéro du monde (défaut: 1)').setRequired(false).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('del')
        .setDescription('[Admin] Supprimer une fiche personnage')
        .addUserOption(opt => opt.setName('user').setDescription('Le joueur').setRequired(true))
        .addIntegerOption(opt => opt.setName('monde').setDescription('Numéro du monde').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('all')
        .setDescription('[Admin] Afficher toutes les fiches avec navigation')
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('[Admin] Voir les fiches d\'un joueur')
        .addUserOption(opt => opt.setName('user').setDescription('Le joueur').setRequired(true))
    ),

  async execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has('Administrator');
    const sub = interaction.options.getSubcommand();

    // Non-admin : uniquement accès à sa propre fiche (sans sous-commande = /fiche seul)
    // On traite le cas où un non-admin tente une commande réservée
    if (!isAdmin && sub !== 'self') {
      return interaction.editReply({ content: '❌ Seuls les administrateurs peuvent utiliser cette commande.' });
    }

    // ── /fiche add ──────────────────────────────────────────────────────────────
    if (sub === 'add') {
      const targetUser = interaction.options.getUser('user');
      const nom = interaction.options.getString('nom');
      const age = interaction.options.getString('age');
      const taille = interaction.options.getString('taille');
      const descriptif = interaction.options.getString('descriptif');
      const competences = interaction.options.getString('competences');
      const monde = interaction.options.getInteger('monde') ?? 1;

      const parts = competences.split(';');
      if (parts.length !== 4 || parts.some(p => isNaN(Number(p)))) {
        return interaction.editReply({ content: '❌ Format des compétences invalide ! Utilise : `intelligence;force;dextérité;chance` (ex: `10;8;12;5`)' });
      }
      const existing = await getFicheByMonde(targetUser.id, monde);
      if (existing) return interaction.editReply({ content: `❌ Une fiche existe déjà pour **${targetUser.username}** dans le monde ${monde} !` });

      const fiche = createDefaultFiche(nom, age, taille, descriptif, competences, monde);
      await setFicheByMonde(targetUser.id, monde, fiche);
      const embed = buildFicheEmbed(fiche, targetUser);
      const buttons = buildFicheButtons(targetUser.id);
      await interaction.editReply({ embeds: [embed], components: buttons });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    }

    // ── /fiche del ──────────────────────────────────────────────────────────────
    if (sub === 'del') {
      const targetUser = interaction.options.getUser('user');
      const monde = interaction.options.getInteger('monde');

      // Récupère les fiches du joueur dans ce monde pour confirmer
      const fiche = await getFicheByMonde(targetUser.id, monde);
      if (!fiche) return interaction.editReply({ content: `❌ Aucune fiche trouvée pour **${targetUser.username}** dans le monde ${monde}.` });

      // Ouvre un select menu de confirmation avec les fiches de ce monde pour ce joueur
      // (un joueur n'a qu'une fiche par monde, donc juste 1 option + annuler)
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_fiche_del_confirm_${targetUser.id}__monde_${monde}`)
          .setPlaceholder('Confirmer la suppression...')
          .addOptions([
            {
              label: `🗑️ Supprimer "${fiche.nom}" (Monde ${monde})`,
              value: `confirm_${targetUser.id}_${monde}`,
              description: `Âge: ${fiche.age} — ${fiche.descriptif?.substring(0, 40) ?? ''}`,
            },
            {
              label: '❌ Annuler',
              value: 'cancel',
              description: 'Ne pas supprimer cette fiche',
            },
          ])
      );

      await interaction.editReply({
        content: `⚠️ Confirmes-tu la suppression de la fiche de **${targetUser.username}** dans le monde **${monde}** ?`,
        components: [selectMenu],
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
    }

    // ── /fiche all ──────────────────────────────────────────────────────────────
    if (sub === 'all') {
      const fiches = await getAllFiches();
      const userIds = Object.keys(fiches);
      if (userIds.length === 0) return interaction.editReply({ content: '❌ Aucune fiche trouvée.' });
      const index = 0;
      const userId = userIds[index];
      const fiche = fiches[userId];
      let targetUser;
      try { targetUser = await interaction.client.users.fetch(userId); }
      catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }
      const embed = buildFicheEmbed(fiche, targetUser);
      embed.setFooter({ text: `Fiche ${index + 1} / ${userIds.length}` });
      const ficheButtons = buildFicheButtons(userId);
      const navButtons = buildNavigationButtons(index, userIds.length, userId);
      await interaction.editReply({ embeds: [embed], components: [...ficheButtons, navButtons] });
    }

    // ── /fiche view [user] ──────────────────────────────────────────────────────
    if (sub === 'view') {
      const targetUser = interaction.options.getUser('user');
      const fiches = await getAllFiches();
      // Filtrer les fiches du joueur ciblé (toutes ses fiches / mondes)
      const userFicheIds = Object.keys(fiches).filter(uid => uid === targetUser.id);
      // Avec le nouveau système multi-monde, getAllFiches renvoie userId unique
      // On cherche toutes les entrées MongoDB de ce user
      const allFiches = await getAllFichesByUser(interaction.client, targetUser.id);
      if (allFiches.length === 0) return interaction.editReply({ content: `❌ Aucune fiche trouvée pour **${targetUser.username}**.` });

      const index = 0;
      const fiche = allFiches[index];
      const embed = buildFicheEmbed(fiche, targetUser);
      if (allFiches.length > 1) embed.setFooter({ text: `Fiche ${index + 1} / ${allFiches.length}` });
      const ficheButtons = buildFicheButtons(targetUser.id);
      const components = [...ficheButtons];
      if (allFiches.length > 1) components.push(buildNavigationButtons(index, allFiches.length, targetUser.id));
      await interaction.editReply({ embeds: [embed], components });
    }
  }
};
