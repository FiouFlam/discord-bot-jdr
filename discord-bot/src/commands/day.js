const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllFiches, setFiche } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('day')
    .setDescription('Passe un jour — ajoute les revenus journaliers à tous les joueurs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const fiches = getAllFiches();
    const userIds = Object.keys(fiches);

    if (userIds.length === 0) {
      return interaction.reply({ content: '❌ Aucune fiche trouvée.', ephemeral: true });
    }

    let rapport = [];

    for (const userId of userIds) {
      const fiche = fiches[userId];
      if (fiche.revenu > 0) {
        fiche.argent += fiche.revenu;
        setFiche(userId, fiche);

        // Try to get username from Discord
        let username = `<@${userId}>`;
        rapport.push(`${username} → +${fiche.revenu} kyp (total: ${fiche.argent} kyp)`);
      }
    }

    if (rapport.length === 0) {
      return interaction.reply({
        content: '☀️ Un jour est passé, mais personne n\'a de revenu configuré.',
        ephemeral: false
      });
    }

    await interaction.reply({
      content: `☀️ **Un jour est passé !** Les revenus ont été distribués :\n\n${rapport.join('\n')}`,
    });
  }
};
