const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const MAX_VIES = 5;

function buildLifeBar(current, max) {
  const filled = Math.max(0, Math.min(current, max));
  const empty = max - filled;
  return '❤️'.repeat(filled) + '🖤'.repeat(empty) + ` (${filled}/${max})`;
}

function buildFicheEmbed(fiche, targetUser) {
  const stats = fiche.competences;
  const vies = fiche.vies ?? MAX_VIES;

  const embed = new EmbedBuilder()
    .setTitle(`Fiche personnage de ${targetUser.username}`)
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Nom / Prénom', value: fiche.nom || '—', inline: false },
      { name: 'Âge', value: String(fiche.age) || '—', inline: true },
      { name: 'Taille', value: fiche.taille || '—', inline: true },
      { name: 'Descriptif', value: fiche.descriptif || '—', inline: false },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '❤️ Vies', value: buildLifeBar(vies, MAX_VIES), inline: false },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '🧠 Intelligence', value: `${stats.intelligence} / 20`, inline: true },
      { name: '💪 Force', value: `${stats.force} / 20`, inline: true },
      { name: '🎯 Dextérité', value: `${stats.dexterite} / 20`, inline: true },
      { name: '🍀 Chance', value: `${stats.chance} / 20`, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '💰 Argent', value: `${fiche.argent} kyp`, inline: true },
      { name: '📈 Revenus / jour', value: `${fiche.revenu} kyp`, inline: true },
      { name: '🏡 Propriétés', value: String((fiche.proprietes || []).length), inline: true },
      { name: '🪨 Golems', value: String((fiche.golems || []).length), inline: true },
    );

  if (targetUser.displayAvatarURL) {
    embed.setThumbnail(targetUser.displayAvatarURL());
  }

  // Inventaire objets (3 par ligne)
  const inventaire = (fiche.inventaire || []).length > 0
    ? groupByLine(fiche.inventaire.map((obj, i) => {
        const niv = obj.niveau != null ? `(niv.${obj.niveau})` : '';
        return `${i + 1}. ${obj.nom}${niv}`;
      }), 3)
    : '*(vide)*';
  embed.addFields({ name: '🎒 Inventaire', value: inventaire, inline: false });

  // Inventaire golems (3 par ligne)
  const inventaireGolems = (fiche.inventaireGolems || []).length > 0
    ? groupByLine(fiche.inventaireGolems.map((obj, i) => {
        const niv = obj.niveau != null ? `(niv.${obj.niveau})` : '';
        return `${i + 1}. ${obj.nom}${niv}`;
      }), 3)
    : '*(vide)*';
  embed.addFields({ name: '🪨 Inventaire des Golems', value: inventaireGolems, inline: false });

  // Propriétés avec leurs objets (3 par ligne)
  if ((fiche.proprietes || []).length > 0) {
    for (let i = 0; i < fiche.proprietes.length; i++) {
      const p = fiche.proprietes[i];
      const nom = typeof p === 'string' ? p : p.nom;
      const objets = (p.objets || []).length > 0
        ? groupByLine(p.objets.map((o, j) => `${j + 1}. ${o}`), 3)
        : '*(vide)*';
      embed.addFields({ name: `🏡 ${i + 1}. ${nom}`, value: objets, inline: false });
    }
  } else {
    embed.addFields({ name: '🏡 Propriétés', value: '*(vide)*', inline: false });
  }

  // Golems (3 par ligne)
  const golems = (fiche.golems || []).length > 0
    ? groupByLine(fiche.golems.map((g, i) => `${i + 1}. ${g}`), 3)
    : '*(vide)*';
  embed.addFields({ name: '🪨 Liste des golems', value: golems, inline: false });

  // Champs custom
  for (const champ of fiche.champsCustom || []) {
    embed.addFields({ name: champ.nom, value: champ.valeur || '*(vide)*', inline: false });
  }

  return embed;
}

function buildFicheButtons(userId) {
  // Ligne 1 : Bouton "Ajouter" (select menu) | Bouton "Supprimer" (select menu)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_menu_ajouter_${userId}`)
      .setLabel('➕ Ajouter')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_menu_supprimer_${userId}`)
      .setLabel('🗑️ Supprimer')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_transferer_${userId}`)
      .setLabel('🔄 Transférer')
      .setStyle(ButtonStyle.Secondary),
  );

  // Ligne 2 : ➕ Ajouter argent | ➖ Retirer argent | Revenu / jour
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`argent_ajouter_${userId}`)
      .setLabel('➕ Argent')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`argent_retirer_${userId}`)
      .setLabel('➖ Argent')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_revenu_${userId}`)
      .setLabel('📈 Revenu / jour')
      .setStyle(ButtonStyle.Success),
  );

  // Ligne 3 : +1 Vie | -1 Vie
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_vie_plus_${userId}`)
      .setLabel('❤️ +1 Vie')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_vie_moins_${userId}`)
      .setLabel('💀 -1 Vie')
      .setStyle(ButtonStyle.Danger),
  );

  return [row1, row2, row3];
}

function buildSelectMenuAjouter(userId) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_ajouter_${userId}`)
      .setPlaceholder('Choisir quoi ajouter...')
      .addOptions([
        { label: 'Objet (inventaire)', value: 'objet', emoji: '🎒' },
        { label: 'Objet golem (inventaire golem)', value: 'objet_golem', emoji: '🪨' },
        { label: 'Objet à propriété', value: 'objet_propriete', emoji: '📦' },
        { label: 'Propriété', value: 'propriete', emoji: '🏡' },
        { label: 'Golem', value: 'golem', emoji: '🗿' },
        { label: 'Argent', value: 'argent', emoji: '💰' },
        { label: 'Champ personnalisé', value: 'champ', emoji: '📝' },
      ])
  );
  return row;
}

function buildSelectMenuSupprimer(userId) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_supprimer_${userId}`)
      .setPlaceholder('Choisir quoi supprimer...')
      .addOptions([
        { label: 'Objet (inventaire)', value: 'objet', emoji: '🎒' },
        { label: 'Objet golem (inventaire golem)', value: 'objet_golem', emoji: '🪨' },
        { label: 'Objet d\'une propriété', value: 'objet_propriete', emoji: '📦' },
        { label: 'Propriété', value: 'propriete', emoji: '🏡' },
        { label: 'Golem', value: 'golem', emoji: '🗿' },
        { label: 'Champ personnalisé', value: 'champ', emoji: '📝' },
      ])
  );
  return row;
}

function buildNavigationButtons(currentIndex, total, currentUserId) {
  // Navigation circulaire : les flèches sont toujours actives si total > 1
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`nav_prev_${currentIndex}_${currentUserId}`)
      .setLabel('◀ Précédente')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(total <= 1),
    new ButtonBuilder()
      .setCustomId(`nav_next_${currentIndex}_${currentUserId}`)
      .setLabel('Suivante ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(total <= 1),
  );
  return row;
}

function createDefaultFiche(nom, age, taille, descriptif, competences) {
  const [intelligence, force, dexterite, chance] = competences.split(';').map(Number);
  return {
    nom, age, taille, descriptif,
    vies: MAX_VIES,
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
    inventaireGolems: [],
    champsCustom: [],
    createdAt: new Date().toISOString(),
  };
}

function groupByLine(items, perLine) {
  const lines = [];
  for (let i = 0; i < items.length; i += perLine) {
    lines.push(items.slice(i, i + perLine).join('  |  '));
  }
  return lines.join('\n');
}

module.exports = {
  buildFicheEmbed,
  buildFicheButtons,
  buildSelectMenuAjouter,
  buildSelectMenuSupprimer,
  buildNavigationButtons,
  createDefaultFiche,
  MAX_VIES,
};
