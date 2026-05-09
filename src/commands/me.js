const { SlashCommandBuilder } = require('discord.js');
const { buildFicheEmbed, buildFicheButtonsReadonly, buildNavigationButtons } = require('../utils/ficheBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Voir ta propre fiche personnage'),

  async execute(interaction) {
    const userId = interaction.user.id;

    const { connect } = require('../utils/database');
    const db = await connect();
    const docs = await db.collection('fiches').find({ userId }).toArray();

    if (docs.length === 0) {
      return interaction.editReply({ content: '❌ Tu n\'as pas encore de fiche personnage.' });
    }

    const fiches = docs.map(({ _id, userId: _, ...f }) => f);
    const index = 0;
    const fiche = fiches[index];

    let targetUser;
    try { targetUser = await interaction.client.users.fetch(userId); }
    catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }

    const embed = buildFicheEmbed(fiche, targetUser);
    if (fiches.length > 1) embed.setFooter({ text: `Fiche ${index + 1} / ${fiches.length}` });

    const buttons = buildFicheButtonsReadonly(userId);
    const components = [...buttons];
    if (fiches.length > 1) components.push(buildNavigationButtons(index, fiches.length, userId, userId));

    return interaction.editReply({ embeds: [embed], components });
  },
};
