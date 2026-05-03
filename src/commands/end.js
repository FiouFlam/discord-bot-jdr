const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sessions } = require('../utils/session');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('end')
    .setDescription('Terminer la session en cours')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const session = sessions.get(guildId);
    if (!session) {
      return interaction.editReply({ content: '❌ Aucune session en cours.' });
    }

    // Supprimer le message de session
    if (session.message) {
      await session.message.delete().catch(() => {});
    }

    sessions.delete(guildId);
    await interaction.editReply({ content: '✅ **Session terminée !**' });

    // Auto-suppression du message /end après 5 secondes
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }
};
