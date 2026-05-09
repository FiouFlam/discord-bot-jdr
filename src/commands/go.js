const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getAllFichesByMonde } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('go')
    .setDescription('[Admin] Lancer une session — sélectionner les joueurs participants')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('monde')
        .setDescription('Numéro du monde (défaut: 1)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const monde = interaction.options.getInteger('monde') ?? 1;
    const fichesByMonde = await getAllFichesByMonde(monde);
    const entries = Object.values(fichesByMonde);

    if (entries.length === 0) {
      return interaction.editReply({ content: `❌ Aucune fiche trouvée dans le monde ${monde}.` });
    }

    const options = [];
    for (const entry of entries.slice(0, 25)) {
      const userId = entry._userId;
      let label = userId;
      try { const u = await interaction.client.users.fetch(userId); label = u.username; } catch {}
      const nomFiche = entry?.nom || '';
      options.push({
        label: label.substring(0, 25),
        value: `${userId}`,
        description: nomFiche ? `${nomFiche.substring(0, 40)} (Monde ${monde})` : `Monde ${monde}`,
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_session_joueurs__monde_${monde}`)
        .setPlaceholder('Sélectionner les joueurs de la session...')
        .setMinValues(1)
        .setMaxValues(Math.min(options.length, 25))
        .addOptions(options)
    );

    await interaction.editReply({
      content: `🎮 **Nouvelle session — Monde ${monde}** — Sélectionne les joueurs participants :`,
      components: [selectMenu],
    });
  }
};
