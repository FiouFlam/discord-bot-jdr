const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sessions } = require('../utils/session');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('end')
    .setDescription('Terminer la session en cours')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!sessions.has(guildId)) {
      return interaction.editReply({ content: '❌ Aucune session en cours.' });
    }
    sessions.delete(guildId);
    await interaction.editReply({ content: '✅ **Session terminée !**' });
  }
};
