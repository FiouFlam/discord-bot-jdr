const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllFiches, setFiche } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('day')
    .setDescription('Passe un jour — ajoute les revenus journaliers à tous les joueurs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const fiches = await getAllFiches();
    const userIds = Object.keys(fiches);
    if (userIds.length === 0) return interaction.editReply({ content: '❌ Aucune fiche trouvée.' });
    let rapport = [];
    for (const userId of userIds) {
      const fiche = fiches[userId];
      if (fiche.revenu > 0) {
        fiche.argent += fiche.revenu;
        await setFiche(userId, fiche);
        rapport.push(`<@${userId}> → +${fiche.revenu} kyp (total: ${fiche.argent} kyp)`);
      }
    }
    if (rapport.length === 0) return interaction.editReply({ content: '☀️ Un jour est passé, mais personne n\'a de revenu configuré.' });
    await interaction.editReply({ content: `☀️ **Un jour est passé !** Les revenus ont été distribués :\n\n${rapport.join('\n')}` });
  }
};
