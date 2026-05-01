const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getFiche, setFiche, deleteFiche } = require('../utils/database');
const { buildFicheEmbed, buildFicheButtons, createDefaultFiche } = require('../utils/ficheBuilder');

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

      // Validate competences format
      const parts = competences.split(';');
      if (parts.length !== 4 || parts.some(p => isNaN(Number(p)))) {
        return interaction.reply({
          content: '❌ Format des compétences invalide ! Utilise : `intelligence;force;dextérité;chance` (ex: `10;8;12;5`)',
          ephemeral: true
        });
      }

      // Check if fiche already exists
      const existing = getFiche(targetUser.id);
      if (existing) {
        return interaction.reply({
          content: `❌ Une fiche existe déjà pour ${targetUser.username} ! Supprime-la d'abord avec \`/fiche del\`.`,
          ephemeral: true
        });
      }

      const fiche = createDefaultFiche(nom, age, taille, descriptif, competences);
      setFiche(targetUser.id, fiche);

      const embed = buildFicheEmbed(fiche, targetUser);
      const buttons = buildFicheButtons(targetUser.id);

      await interaction.reply({
        embeds: [embed],
        components: buttons,
      });
    }

    if (sub === 'del') {
      const targetUser = interaction.options.getUser('user');
      const deleted = deleteFiche(targetUser.id);

      if (!deleted) {
        return interaction.reply({
          content: `❌ Aucune fiche trouvée pour ${targetUser.username}.`,
          ephemeral: true
        });
      }

      await interaction.reply({
        content: `✅ La fiche de **${targetUser.username}** a été supprimée.`,
        ephemeral: true
      });
    }
  }
};
