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

    // Mettre à jour le message de session pour afficher la nouvelle fiche
    if (session.message) {
      try {
        const { buildFicheEmbed, buildFicheButtons, buildNavigationButtons } = require('../utils/ficheBuilder');
        const { getFicheByMonde } = require('../utils/database');
        const index = 0;
        const firstUserId = session.userIds[index];
        const fiche = await getFicheByMonde(firstUserId, session.monde);
        let targetUserFirst;
        try { targetUserFirst = await interaction.client.users.fetch(firstUserId); }
        catch { targetUserFirst = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }
        const embed = buildFicheEmbed(fiche, targetUserFirst);
        embed.setFooter({ text: `Session #${session.sessionNum} (Monde ${session.monde}) • Fiche ${index + 1} / ${session.userIds.length}` });
        const ficheButtons = buildFicheButtons(firstUserId);
        const navButtons = buildNavigationButtons(index, session.userIds.length, firstUserId);
        await session.message.edit({
          content: `🎮 **Session #${session.sessionNum} lancée** (Monde ${session.monde}) avec ${session.userIds.length} joueur(s) !`,
          embeds: [embed],
          components: [...ficheButtons, navButtons],
        });
      } catch (e) {
        console.error('Erreur mise à jour message session après /add:', e);
      }
    }
  }
};
