const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSession, getSessionsByGuild, deleteSession } = require('../utils/session');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('end')
    .setDescription('[Admin] Terminer une session en cours')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('session')
        .setDescription('Numéro de session (défaut: la seule active)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const activeSessions = getSessionsByGuild(guildId);

    if (activeSessions.length === 0) {
      await interaction.editReply({ content: '❌ Aucune session en cours.' });
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    }

    let session;
    const sessionNum = interaction.options.getInteger('session');

    if (sessionNum) {
      session = getSession(guildId, sessionNum);
      if (!session) {
        await interaction.editReply({ content: `❌ Session #${sessionNum} introuvable.` });
        return setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      }
    } else if (activeSessions.length === 1) {
      session = activeSessions[0];
    } else {
      const list = activeSessions.map(s => `#${s.sessionNum} (Monde ${s.monde}, ${s.userIds.length} joueur(s))`).join('\n');
      await interaction.editReply({ content: `❌ Plusieurs sessions actives. Précise le numéro :\n${list}` });
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 10000);
    }

    if (session.message) {
      await session.message.delete().catch(() => {});
    }

    deleteSession(guildId, session.sessionNum);
    await interaction.editReply({ content: `✅ **Session #${session.sessionNum} (Monde ${session.monde}) terminée !**` });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }
};
