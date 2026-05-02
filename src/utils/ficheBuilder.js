cat > /home/claude/bot/src/utils/ficheBuilder.js << 'EOF'
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

function buildFicheEmbed(fiche, targetUser) {
  const stats = fiche.competences;
  const vie = fiche.vie ?? 5;
  const vieMax = fiche.vieMax ?? 5;

  const coeursPleins = '❤️'.repeat(vie);
  const coeursvides = '🖤'.repeat(Math.max(0, vieMax - vie));
  const vieStr = `${coeursPleins}${coeursvides} (${vie}/${vieMax})`;

  const embed = new EmbedBuilder()
    .setTitle(`Fiche personnage de ${targetUser.username}`)
    .setColor(vie === 0 ? 0x000000 : 0x2b2d31)
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
      { name: '❤️ Vie', value: vieStr, inline: false },
      { name: '💰 Argent', value: `${fiche.argent} kyp`, inline: true },
      { name: '📈 Revenus / jour', value: `${fiche.revenu} kyp`, inline: true },
      { name: '🏡 Propriétés', value: String((fiche.proprietes || []).length), inline: true },
      { name: '🪨 Golems', value: String((fiche.golems || []).length), inline: true },
    );

  if (targetUser.displayAvatarURL) {
    embed.setThumbnail(targetUser.displayAvatarURL());
  }

  const inventaire = (fiche.inventaire || []).length > 0
    ? fiche.inventaire.map((obj, i) => {
        const niv = obj.niveau != null ? ` *(niv. ${obj.niveau})*` : '';
        return `${i + 1}. ${obj.nom}${niv}`;
      }).join('\n')
    : '*(vide)*';
  embed.addFields({ name: '🎒 Inventaire', value: inventaire, inline: false });

  if ((fiche.proprietes || []).length > 0) {
    for (let i = 0; i < fiche.proprietes.length; i++) {
      const p = fiche.proprietes[i];
      const nom = typeof p === 'string' ? p : p.nom;
      const objets = (p.objets || []).length > 0
        ? p.objets.map((o, j) => `   ${j + 1}. ${o}`).join('\n')
        : '   *(vide)*';
      embed.addFields({ name: `🏡 ${i + 1}. ${nom}`, value: objets, inline: false });
    }
  } else {
    embed.addFields({ name: '🏡 Propriétés', value: '*(vide)*', inline: false });
  }

  const golems = (fiche.golems || []).length > 0
    ? fiche.golems.map((g, i) => `${i + 1}. ${g}`).join('\n')
    : '*(vide)*';
  embed.addFields({ name: '🪨 Liste des golems', value: golems, inline: false });

  for (const champ of fiche.champsCustom || []) {
    embed.addFields({ name: champ.nom, value: champ.valeur || '*(vide)*', inline: false });
  }

  return embed;
}

function buildFicheButtons(userId) {
  // Ligne 1 : Ajouter | Supprimer (ouvrent chacun un select menu éphémère)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_menu_ajouter_${userId}`)
      .setLabel('➕ Ajouter')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_menu_supprimer_${userId}`)
      .setLabel('🗑️ Supprimer')
      .setStyle(ButtonStyle.Danger),
  );

  // Ligne 2 : Revenu / jour | Ajouter un champ | Supprimer un champ
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_revenu_${userId}`)
      .setLabel('📈 Revenu / jour')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_champ_${userId}`)
      .setLabel('➕ Ajouter un champ')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`btn_suppr_champ_${userId}`)
      .setLabel('🗑️ Supprimer un champ')
      .setStyle(ButtonStyle.Secondary),
  );

  // Ligne 3 : Vie
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_vie_plus_${userId}`)
      .setLabel('❤️ +1 Vie')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`btn_vie_moins_${userId}`)
      .setLabel('🖤 -1 Vie')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

function buildSelectMenuAjouter(userId) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`select_ajouter_${userId}`)
    .setPlaceholder('Fais un choix...')
    .addOptions([
      { label: 'Objet', description: "Ajouter un objet à l'inventaire", value: `ajouter_objet_${userId}`, emoji: '🎒' },
      { label: 'Golem', description: 'Ajouter un golem', value: `ajouter_golem_${userId}`, emoji: '🪨' },
      { label: 'Objet à une propriété', description: 'Ajouter un objet dans une propriété existante', value: `ajouter_objet_prop_${userId}`, emoji: '📦' },
      { label: 'Propriété', description: 'Ajouter une nouvelle propriété', value: `ajouter_propriete_${userId}`, emoji: '🏡' },
      { label: 'Argent', description: "Ajouter de l'argent au personnage", value: `ajouter_argent_${userId}`, emoji: '💰' },
    ]);
  return new ActionRowBuilder().addComponents(select);
}

function buildSelectMenuSupprimer(userId) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`select_supprimer_${userId}`)
    .setPlaceholder('Fais un choix...')
    .addOptions([
      { label: 'Objet', description: "Supprimer un objet de l'inventaire", value: `supprimer_objet_${userId}`, emoji: '🎒' },
      { label: 'Golem', description: 'Supprimer un golem', value: `supprimer_golem_${userId}`, emoji: '🪨' },
      { label: "Objet d'une propriété", description: 'Supprimer un objet dans une propriété', value: `supprimer_objet_prop_${userId}`, emoji: '📦' },
      { label: 'Propriété', description: 'Supprimer une propriété', value: `supprimer_propriete_${userId}`, emoji: '🏡' },
      { label: 'Argent', description: "Retirer de l'argent au personnage", value: `supprimer_argent_${userId}`, emoji: '💰' },
    ]);
  return new ActionRowBuilder().addComponents(select);
}

function buildNavigationButtons(currentIndex, total, currentUserId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`nav_prev_${currentIndex}_${currentUserId}`)
      .setLabel('◀ Précédente')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`nav_next_${currentIndex}_${currentUserId}`)
      .setLabel('Suivante ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === total - 1),
  );
  return row;
}

function createDefaultFiche(nom, age, taille, descriptif, competences) {
  const [intelligence, force, dexterite, chance] = competences.split(';').map(Number);
  return {
    nom, age, taille, descriptif,
    competences: { intelligence: intelligence || 0, force: force || 0, dexterite: dexterite || 0, chance: chance || 0 },
    vie: 5, vieMax: 5, argent: 0, revenu: 0,
    proprietes: [], golems: [], inventaire: [], champsCustom: [],
    createdAt: new Date().toISOString(),
  };
}

module.exports = { buildFicheEmbed, buildFicheButtons, buildSelectMenuAjouter, buildSelectMenuSupprimer, buildNavigationButtons, createDefaultFiche };
EOF
echo "ficheBuilder OK"
