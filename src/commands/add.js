const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSession, getSessionsByGuild } = require('../utils/session');
const { applyDay } = require('./day');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('[Admin] Ajouter un joueur oublié à une session existante')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Le joueur à ajouter').setRequired(true)
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

    if (session.userIds.includes(targetUser.id)) {
      await interaction.editReply({ content: `❌ **${targetUser.username}** est déjà dans la session #${session.sessionNum}.` });
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    }

    session.userIds.push(targetUser.id);

    // Si /day déjà utilisé → l'appliquer automatiquement sur le nouveau joueur
    let dayInfo = '';
    if (session.dayUsed) {
      const rapport = await applyDay(interaction.client, { ...session, userIds: [targetUser.id] });
      if (rapport.length > 0) dayInfo = `\n☀️ Day automatiquement appliqué :\n${rapport.join('\n')}`;
    }

    await interaction.editReply({
      content: `✅ **${targetUser.username}** ajouté à la session #${session.sessionNum} (Monde ${session.monde}).${dayInfo}`,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }
};
