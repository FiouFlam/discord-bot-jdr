const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getAllFiches } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('go')
    .setDescription('Lancer une session — sélectionner les joueurs participants')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const fiches = await getAllFiches();
    const userIds = Object.keys(fiches);
    if (userIds.length === 0) return interaction.editReply({ content: '❌ Aucune fiche trouvée.' });

    const options = [];
    for (const userId of userIds.slice(0, 25)) {
      let label = userId;
      try { const u = await interaction.client.users.fetch(userId); label = u.username; } catch {}
      const nomFiche = fiches[userId]?.nom || '';
      options.push({
        label: label.substring(0, 25),
        value: userId,
        description: nomFiche ? nomFiche.substring(0, 50) : undefined,
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_session_joueurs')
        .setPlaceholder('Sélectionner les joueurs de la session...')
        .setMinValues(1)
        .setMaxValues(Math.min(options.length, 25))
        .addOptions(options)
    );

    await interaction.editReply({
      content: '🎮 **Nouvelle session** — Sélectionne les joueurs participants :',
      components: [selectMenu],
    });
  }
};
