const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildFicheEmbed(fiche, targetUser) {
  const stats = fiche.competences;

  const embed = new EmbedBuilder()
    .setTitle(`Fiche personnage de ${targetUser.username}`)
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Nom / Prénom', value: fiche.nom || '—', inline: false },
      { name: 'Âge', value: String(fiche.age) || '—', inline: true },
      { name: 'Taille', value: fiche.taille || '—', inline: true },
      { name: 'Descriptif', value: fiche.descriptif || '—', inline: false },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '🧠 Intelligence', value: `${stats.intelligence} / 20`, inline: true },
      { name: '💪 Force', value: `${stats.force} / 20`, inline: true },
      { name: '🎯 Dextérité', value: `${stats.dexterite} / 20`, inline: true },
      { name: '🍀 Chance', value: `${stats.chance} / 20`, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '💰 Argent', value: `${fiche.argent} kyp`, inline: true },
      { name: '📈 Revenus / jour', value: `${fiche.revenu} kyp`, inline: true },
      { name: '🏡 Propriété', value: String(fiche.proprietes.length), inline: true },
      { name: '🪨 Golem', value: String(fiche.golems.length), inline: true },
    );

  if (targetUser.displayAvatarURL) {
    embed.setThumbnail(targetUser.displayAvatarURL());
  }

  // Inventaire
  const inventaire = fiche.inventaire.length > 0
    ? fiche.inventaire.map(obj => `• ${obj.nom} *(niv. ${obj.niveau})*`).join('\n')
    : '*(vide)*';
  embed.addFields({ name: '🎒 Inventaire', value: inventaire, inline: false });

  // Propriétés
  if (fiche.proprietes.length > 0) {
    embed.addFields({ name: '🏡 Liste des propriétés', value: fiche.proprietes.map(p => `• ${p}`).join('\n'), inline: false });
  }

  // Golems
  if (fiche.golems.length > 0) {
    embed.addFields({ name: '🪨 Liste des golems', value: fiche.golems.map(g => `• ${g}`).join('\n'), inline: false });
  }

  // Champs custom
  for (const champ of fiche.champsCustom || []) {
    embed.addFields({ name: champ.nom, value: champ.valeur || '*(vide)*', inline: false });
  }

  return embed;
}

function buildFicheButtons(userId) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_objet_${userId}`)
      .setLabel('Ajouter un objet')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_golem_${userId}`)
      .setLabel('Ajouter golem')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_propriete_${userId}`)
      .setLabel('Ajouter une propriété')
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_argent_${userId}`)
      .setLabel('Modifier argent')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_revenu_${userId}`)
      .setLabel('Ajouter revenu / jour')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_champ_${userId}`)
      .setLabel('Ajouter un champ')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

function buildNavigationButtons(currentIndex, total, currentUserId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`nav_prev_${currentIndex}_${currentUserId}`)
      .setLabel('◀ Fiche précédente')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`nav_next_${currentIndex}_${currentUserId}`)
      .setLabel('Fiche suivante ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === total - 1),
  );
  return row;
}

function createDefaultFiche(nom, age, taille, descriptif, competences) {
  const [intelligence, force, dexterite, chance] = competences.split(';').map(Number);
  return {
    nom,
    age,
    taille,
    descriptif,
    competences: {
      intelligence: intelligence || 0,
      force: force || 0,
      dexterite: dexterite || 0,
      chance: chance || 0,
    },
    argent: 0,
    revenu: 0,
    proprietes: [],
    golems: [],
    inventaire: [],
    champsCustom: [],
    createdAt: new Date().toISOString(),
  };
}

module.exports = { buildFicheEmbed, buildFicheButtons, buildNavigationButtons, createDefaultFiche };
