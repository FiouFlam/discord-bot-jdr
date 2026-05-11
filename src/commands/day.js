const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getFicheByMonde, setFicheByMonde } = require('../utils/database');
const { getSession, getSessionsByGuild } = require('../utils/session');

// Applique le day pour tous les joueurs de la session — retourne le rapport
async function applyDay(client, session) {
  const rapport = [];
  for (const userId of session.userIds) {
    try {
      const fiche = await getFicheByMonde(userId, session.monde);
      if (!fiche) continue;
      const lignes = [];

      const revenu = parseInt(fiche.revenu) || 0;
      if (revenu > 0) {
        fiche.argent = (parseInt(fiche.argent) || 0) + revenu;
        lignes.push(`+${revenu} kyp (total: ${fiche.argent} kyp)`);
      }

      const maxHp    = parseInt(fiche.maxHp) || 5;
      // parseInt peut retourner NaN — on utilise || plutôt que ?? pour couvrir NaN
      const hpActuel = parseInt(fiche.hp) || 0;
      if (hpActuel < maxHp) {
        fiche.hp = hpActuel + 1;
        lignes.push(`❤️ HP : ${hpActuel} → ${fiche.hp}/${maxHp}`);
      }

      if (lignes.length > 0) {
        await setFicheByMonde(userId, session.monde, fiche);
        rapport.push(`<@${userId}> → ${lignes.join(' | ')}`);
      }
    } catch (err) {
      console.error(`[/day] Erreur pour userId=${userId}:`, err);
      rapport.push(`<@${userId}> → ❌ Erreur lors de la mise à jour`);
    }
  }
  return rapport;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('day')
    .setDescription('[Admin] Passe un jour — revenus + régénération HP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('session')
        .setDescription('Numéro de session (défaut: la seule active, ou obligatoire si plusieurs)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const activeSessions = getSessionsByGuild(guildId);

    if (activeSessions.length === 0) {
      await interaction.editReply({ content: '❌ Aucune session en cours. Lance une session avec `/go` d\'abord.' });
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

    const rapport = await applyDay(interaction.client, session);

    if (rapport.length === 0) {
      await interaction.editReply({ content: `☀️ Un jour est passé (session #${session.sessionNum}), mais rien à mettre à jour.` });
    } else {
      await interaction.editReply({
        content: `☀️ **Un jour est passé ! (Session #${session.sessionNum} — Monde ${session.monde})**\n\n${rapport.join('\n')}`,
      });
    }
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  },

  applyDay,
};
