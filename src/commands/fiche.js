const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getFiche, setFiche, deleteFiche, getAllFiches } = require('../utils/database');
const { buildFicheEmbed, buildFicheButtons, buildNavigationButtons, createDefaultFiche } = require('../utils/ficheBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fiche')
    .setDescription('Gérer les fiches personnages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Créer une fiche personnage')
        .addUserOption(opt => opt.setName('user').setDescription('Le joueur').setRequired(true))
        .addStringOption(opt => opt.setName('nom').setDescription('Nom / Prénom').setRequired(true))
        .addStringOption(opt => opt.setName('age').setDescription('Âge').setRequired(true))
        .addStringOption(opt => opt.setName('taille').setDescription('Taille (ex: 1m75)').setRequired(true))
        .addStringOption(opt => opt.setName('descriptif').setDescription('Descriptif de la vie sur Terre').setRequired(true))
        .addStringOption(opt => opt.setName('competences').setDescription('Format: intelligence;force;dextérité;chance (ex: 10;8;12;5)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('del')
        .setDescription('Supprimer une fiche personnage')
        .addUserOption(opt => opt.setName('user').setDescription('Le joueur').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('all')
        .setDescription('Afficher toutes les fiches avec navigation')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const targetUser = interaction.options.getUser('user');
      const nom = interaction.options.getString('nom');
      const age = interaction.options.getString('age');
      const taille = interaction.options.getString('taille');
      const descriptif = interaction.options.getString('descriptif');
      const competences = interaction.options.getString('competences');
      const parts = competences.split(';');
      if (parts.length !== 4 || parts.some(p => isNaN(Number(p)))) {
        return interaction.editReply({ content: '❌ Format des compétences invalide ! Utilise : `intelligence;force;dextérité;chance` (ex: `10;8;12;5`)' });
      }
      const existing = await getFiche(targetUser.id);
      if (existing) return interaction.editReply({ content: `❌ Une fiche existe déjà pour ${targetUser.username} !` });
      const fiche = createDefaultFiche(nom, age, taille, descriptif, competences);
      await setFiche(targetUser.id, fiche);
      const embed = buildFicheEmbed(fiche, targetUser);
      const buttons = buildFicheButtons(targetUser.id);
      await interaction.editReply({ embeds: [embed], components: buttons });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    }

    if (sub === 'del') {
      const targetUser = interaction.options.getUser('user');
      const deleted = await deleteFiche(targetUser.id);
      if (!deleted) return interaction.editReply({ content: `❌ Aucune fiche trouvée pour ${targetUser.username}.` });
      await interaction.editReply({ content: `✅ La fiche de **${targetUser.username}** a été supprimée.` });
    }

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
  }
};
