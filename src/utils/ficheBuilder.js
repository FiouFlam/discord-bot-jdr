const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

// ==================== FORMATAGE LISTE (FIX NUMÉROTATION) ====================
function formatItemList(items, formatter) {
  if (!items || items.length === 0) return '*(vide)*';
  
  // Numérotation propre : 1. 2. 3. etc.
  return items.map((item, index) => formatter(item, index)).join('\n');
}

function fmtObj(obj, i) {
  if (!obj) return `${i + 1}. ???`;
  const nom = typeof obj === 'string' ? obj : (obj.nom || '???');
  const niv = obj.niveau != null ? ` niv.${obj.niveau}` : '';
  const qty = (obj.quantite != null && obj.quantite > 1) ? ` x${obj.quantite}` : '';
  return `${i + 1}. ${nom}${niv}${qty}`;
}

function fmtPropObj(obj, i) {
  if (typeof obj === 'string') return `${i + 1}. ${obj}`;
  const nom = obj.nom || '???';
  const qty = (obj.quantite != null && obj.quantite > 1) ? ` x${obj.quantite}` : '';
  return `${i + 1}. ${nom}${qty}`;
}

function safeVal(v, fallback = '—') {
  if (v == null) return fallback;
  const s = String(v).trim();
  return (s === '' || s === 'undefined' || s === 'null') ? fallback : s;
}

function fmtHp(hp) {
  const val = Math.max(0, Math.min(5, hp ?? 5));
  return val === 0 ? '💀 0/5' : '❤️'.repeat(val) + ` (${val}/5)`;
}

// ==================== EMBED ====================
function buildFicheEmbed(fiche, targetUser) {
  const stats = fiche.competences || { intelligence: 0, force: 0, dexterite: 0, chance: 0 };

  const embed = new EmbedBuilder()
    .setTitle(`Fiche de ${targetUser.username}`)
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Nom / Prénom', value: safeVal(fiche.nom), inline: false },
      { name: 'Âge', value: safeVal(fiche.age), inline: true },
      { name: 'Taille', value: safeVal(fiche.taille), inline: true },
      { name: 'Descriptif', value: safeVal(fiche.descriptif), inline: false },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '🧠 Intelligence', value: `${stats.intelligence ?? 0} / 20`, inline: true },
      { name: '💪 Force', value: `${stats.force ?? 0} / 20`, inline: true },
      { name: '🎯 Dextérité', value: `${stats.dexterite ?? 0} / 20`, inline: true },
      { name: '🍀 Chance', value: `${stats.chance ?? 0} / 20`, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '❤️ Vie (HP)', value: fmtHp(fiche.hp), inline: true },
      { name: '💰 Argent', value: `${fiche.argent ?? 0} kyp`, inline: true },
      { name: '📈 Revenus/j', value: `${fiche.revenu ?? 0} kyp`, inline: true },
    );

  if (targetUser.displayAvatarURL) {
    embed.setThumbnail(targetUser.displayAvatarURL());
  }

  // Inventaire Perso
  embed.addFields({
    name: '🎒 Inventaire (perso)',
    value: formatItemList(fiche.inventaire || [], fmtObj),
    inline: false
  });

  // Golems
  (fiche.golems || []).forEach((g, i) => {
    const nom = typeof g === 'string' ? g : (g.nom || `Golem ${i+1}`);
    const inv = Array.isArray(g?.inventaire) ? g.inventaire : [];
    embed.addFields({
      name: `🪨 ${i + 1}. ${nom}`,
      value: formatItemList(inv, fmtObj),
      inline: false
    });
  });

  // Propriétés
  (fiche.proprietes || []).forEach((p, i) => {
    const nom = typeof p === 'string' ? p : (p.nom || `Propriété ${i+1}`);
    const inv = Array.isArray(p?.objets) ? p.objets : [];
    embed.addFields({
      name: `🏡 ${i + 1}. ${nom}`,
      value: formatItemList(inv, fmtPropObj),
      inline: false
    });
  });

  return embed;
}

// ==================== BOUTONS ====================
function buildFicheButtons(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`btn_ajouter_${userId}`).setLabel('➕ Ajouter').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_supprimer_${userId}`).setLabel('➖ Supprimer').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`btn_transferer_${userId}`).setLabel('🔁 Transférer').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_vendre_${userId}`).setLabel('💰 Vendre').setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`argent_ajouter_${userId}`).setLabel('💸 + Argent').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`argent_retirer_${userId}`).setLabel('💸 - Argent').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`btn_transfert_argent_${userId}`).setLabel('💳 Transf. Argent').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_revenu_${userId}`).setLabel('🪙 Revenu').setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`btn_golem_${userId}`).setLabel('🪨 Golem').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_prop_${userId}`).setLabel('🏡 Propriété').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`btn_hp_plus_${userId}`).setLabel('❤️ HP +').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`btn_hp_minus_${userId}`).setLabel('💔 HP -').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`btn_refresh_${userId}`).setLabel('🔄').setStyle(ButtonStyle.Secondary),
    )
  ];
}

function buildGolemActionMenu(userId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_golem_action_${userId}`)
      .setPlaceholder('Que faire avec les Golems ?')
      .addOptions([
        { label: 'Ajouter un Golem', value: 'add' },
        { label: 'Supprimer un Golem', value: 'del' },
      ])
  );
}

function buildPropActionMenu(userId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_prop_action_${userId}`)
      .setPlaceholder('Que faire avec les Propriétés ?')
      .addOptions([
        { label: 'Ajouter une Propriété', value: 'add' },
        { label: 'Supprimer une Propriété', value: 'del' },
      ])
  );
}

module.exports = {
  buildFicheEmbed,
  buildFicheButtons,
  buildGolemActionMenu,
  buildPropActionMenu,
  getInventoryListLabels,
  resolveInventoryByLabel,
  addToInventory,
  removeFromInventoryByIndex,
};
