const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSession, getSessionsByGuild } = require('../utils/session');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('del')
    .setDescription('[Admin] Retirer un joueur d\'une session')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Le joueur à retirer').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('session')
        .setDescription('Numéro de session (défaut: la seule active)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');
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
      const list = activeSessions.map(s => `#${s.sessionNum} (Monde ${s.monde})`).join('\n');
      await interaction.editReply({ content: `❌ Plusieurs sessions actives. Précise le numéro :\n${list}` });
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 10000);
    }

    const idx = session.userIds.indexOf(targetUser.id);
    if (idx === -1) {
      await interaction.editReply({ content: `❌ **${targetUser.username}** n'est pas dans la session #${session.sessionNum}.` });
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    }

    session.userIds.splice(idx, 1);
    await interaction.editReply({
      content: `✅ **${targetUser.username}** retiré de la session #${session.sessionNum} (Monde ${session.monde}).`,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }
};
