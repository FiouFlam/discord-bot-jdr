const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getFiche, setFiche } = require('../utils/database');
const { sessions } = require('../utils/session');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('day')
    .setDescription('Passe un jour — revenus + régénération HP (session requise)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const session = sessions.get(interaction.guildId);
    if (!session) {
      return interaction.editReply({ content: '❌ Aucune session en cours. Lance une session avec `/go` d\'abord.' });
    }

    const userIds = session.userIds;
    if (userIds.length === 0) return interaction.editReply({ content: '❌ La session ne contient aucun joueur.' });

    const rapport = [];

    for (const userId of userIds) {
      const fiche = await getFiche(userId);
      if (!fiche) continue;

      const lignes = [];

      // Revenus journaliers
      if (fiche.revenu > 0) {
        fiche.argent = (fiche.argent ?? 0) + fiche.revenu;
        lignes.push(`+${fiche.revenu} kyp (total: ${fiche.argent} kyp)`);
      }

      // Régénération HP : +1 coeur si pas au max (5)
      const hpActuel = fiche.hp ?? 5;
      if (hpActuel < 5) {
        fiche.hp = hpActuel + 1;
        lignes.push(`❤️ HP : ${hpActuel} → ${fiche.hp}`);
      }

      if (lignes.length > 0) {
        await setFiche(userId, fiche);
        rapport.push(`<@${userId}> → ${lignes.join(' | ')}`);
      }
    }

    if (rapport.length === 0) {
      return interaction.editReply({ content: '☀️ Un jour est passé, mais rien à mettre à jour pour les joueurs de la session.' });
    }

    await interaction.editReply({
      content: `☀️ **Un jour est passé !**\n\n${rapport.join('\n')}`,
    });
  }
};
