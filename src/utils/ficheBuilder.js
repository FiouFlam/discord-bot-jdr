const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── Formate une liste d'items — un par ligne, numérotés correctement ──────────
function formatItemList(items, formatter) {
  if (!items || items.length === 0) return '*(vide)*';
  return items.map((item, i) => formatter(item, i)).join('\n');
}

// Formateur objet perso/golem : { nom, quantite?, niveau? }
function fmtObj(obj, i) {
  if (!obj || typeof obj !== 'object') return `${i + 1}. ???`;
  const nom = obj.nom || '???';
  const niv = obj.niveau != null ? ` niv.${obj.niveau}` : '';
  const qty = (obj.quantite != null && obj.quantite > 1) ? ` x${obj.quantite}` : '';
  return `${i + 1}. ${nom}${niv}${qty}`;
}

// Formateur objet propriété : string ou { nom, quantite? }
function fmtPropObj(obj, i) {
  if (typeof obj === 'string') return `${i + 1}. ${obj}`;
  const nom = obj.nom || '???';
  const qty = (obj.quantite != null && obj.quantite > 1) ? ` x${obj.quantite}` : '';
  return `${i + 1}. ${nom}${qty}`;
}

// Sécurise une valeur de field embed (jamais vide/undefined/null)
function safeVal(v, fallback = '—') {
  if (v == null) return fallback;
  const s = String(v).trim();
  return (s === '' || s === 'undefined' || s === 'null') ? fallback : s;
}

// Affichage HP — gère le cas 0 HP (string vide interdit dans Discord)
function fmtHp(hp) {
  const val = Math.max(0, Math.min(5, hp ?? 5));
  if (val === 0) return '💀 0/5';
  return '❤️'.repeat(val) + ` (${val}/5)`;
}

// ─── Build embed ───────────────────────────────────────────────────────────────
function buildFicheEmbed(fiche, targetUser) {
  const stats = fiche.competences || { intelligence: 0, force: 0, dexterite: 0, chance: 0 };

  const embed = new EmbedBuilder()
    .setTitle(`Fiche personnage de ${targetUser.username}`)
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Nom / Prénom',    value: safeVal(fiche.nom),       inline: false },
      { name: 'Âge',             value: safeVal(fiche.age),       inline: true  },
      { name: 'Taille',          value: safeVal(fiche.taille),    inline: true  },
      { name: 'Descriptif',      value: safeVal(fiche.descriptif),inline: false },
      { name: '\u200B',          value: '\u200B',                 inline: false },
      { name: '🧠 Intelligence', value: `${stats.intelligence ?? 0} / 20`, inline: true },
      { name: '💪 Force',        value: `${stats.force ?? 0} / 20`,        inline: true },
      { name: '🎯 Dextérité',    value: `${stats.dexterite ?? 0} / 20`,    inline: true },
      { name: '🍀 Chance',       value: `${stats.chance ?? 0} / 20`,       inline: true },
      { name: '\u200B',          value: '\u200B',                           inline: false },
      { name: '❤️ Vie (HP)',     value: fmtHp(fiche.hp),                   inline: true },
      { name: '💰 Argent',       value: `${fiche.argent ?? 0} kyp`,         inline: true },
      { name: '📈 Revenus/j',    value: `${fiche.revenu ?? 0} kyp`,         inline: true },
      { name: '🏡 Propriétés',   value: String((fiche.proprietes || []).length), inline: true },
      { name: '🪨 Golems',       value: String((fiche.golems || []).length),     inline: true },
    );

  if (targetUser.displayAvatarURL) {
    embed.setThumbnail(targetUser.displayAvatarURL());
  }

  // Inventaire perso
  embed.addFields({
    name: '🎒 Inventaire (perso)',
    value: formatItemList(fiche.inventaire || [], fmtObj),
    inline: false,
  });

  // Golems + leur inventaire
  if ((fiche.golems || []).length > 0) {
    for (let i = 0; i < fiche.golems.length; i++) {
      const g = fiche.golems[i];
      const nom = typeof g === 'string' ? g : (g.nom || `Golem ${i + 1}`);
      const inv = (typeof g === 'object' && Array.isArray(g.inventaire)) ? g.inventaire : [];
      embed.addFields({
        name: `🪨 ${i + 1}. ${nom}`,
        value: formatItemList(inv, fmtObj),
        inline: false,
      });
    }
  } else {
    embed.addFields({ name: '🪨 Golems', value: '*(vide)*', inline: false });
  }

  // Propriétés + leurs objets
  if ((fiche.proprietes || []).length > 0) {
    for (let i = 0; i < fiche.proprietes.length; i++) {
      const p = fiche.proprietes[i];
      const nom = typeof p === 'string' ? p : (p.nom || `Propriété ${i + 1}`);
      const objets = (typeof p === 'object' && Array.isArray(p.objets)) ? p.objets : [];
      embed.addFields({
        name: `🏡 ${i + 1}. ${nom}`,
        value: formatItemList(objets, fmtPropObj),
        inline: false,
      });
    }
  } else {
    embed.addFields({ name: '🏡 Propriétés', value: '*(vide)*', inline: false });
  }

  // Champs custom
  for (const champ of fiche.champsCustom || []) {
    embed.addFields({
      name: safeVal(champ.nom, 'Champ'),
      value: safeVal(champ.valeur, '*(vide)*'),
      inline: false,
    });
  }

  return embed;
}

// ─── Boutons ───────────────────────────────────────────────────────────────────
function buildFicheButtons(userId) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`btn_ajouter_${userId}`).setLabel('➕ Ajouter objet').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_supprimer_${userId}`).setLabel('➖ Supprimer objet').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`btn_transferer_${userId}`).setLabel('🔁 Transférer objet').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_vendre_${userId}`).setLabel('💰 Vendre').setStyle(ButtonStyle.Success),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`argent_ajouter_${userId}`).setLabel('💸 Ajouter argent').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`argent_retirer_${userId}`).setLabel('💸 Retirer argent').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`btn_transfert_argent_${userId}`).setLabel('💳 Transférer argent').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_revenu_${userId}`).setLabel('🪙 Revenu / jour').setStyle(ButtonStyle.Success),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`btn_add_golem_${userId}`).setLabel('🪨 Ajouter golem').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_del_golem_${userId}`).setLabel('🪨 Supprimer golem').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`btn_add_prop_${userId}`).setLabel('🏡 Ajouter propriété').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`btn_del_prop_${userId}`).setLabel('🏡 Supprimer propriété').setStyle(ButtonStyle.Danger),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`btn_hp_plus_${userId}`).setLabel('❤️ HP +').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`btn_hp_minus_${userId}`).setLabel('💔 HP -').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`btn_refresh_${userId}`).setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3, row4];
}

function buildNavigationButtons(currentIndex, total, currentUserId) {
  return new ActionRowBuilder().addComponents(
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
}

function createDefaultFiche(nom, age, taille, descriptif, competences) {
  const [intelligence, force, dexterite, chance] = competences.split(';').map(Number);
  return {
    nom, age, taille, descriptif,
    competences: {
      intelligence: intelligence || 0,
      force: force || 0,
      dexterite: dexterite || 0,
      chance: chance || 0,
    },
    hp: 5,
    argent: 0,
    revenu: 0,
    proprietes: [],
    golems: [],
    inventaire: [],
    champsCustom: [],
    createdAt: new Date().toISOString(),
  };
}

// ─── Résolution inventaire ─────────────────────────────────────────────────────
// Retourne la liste des noms d'inventaires avec leur casse originale
function getInventoryList(fiche) {
  const list = ['perso'];
  for (const g of fiche.golems || []) list.push(typeof g === 'string' ? g : g.nom);
  for (const p of fiche.proprietes || []) list.push(typeof p === 'string' ? p : p.nom);
  return list;
}

// Résout un nom → { arr, type } ou null. Migre les vieux formats à la volée.
function resolveInventory(fiche, name) {
  const n = name.trim().toLowerCase();

  if (n === 'perso') {
    if (!Array.isArray(fiche.inventaire)) fiche.inventaire = [];
    return { arr: fiche.inventaire, type: 'perso' };
  }

  for (let i = 0; i < (fiche.golems || []).length; i++) {
    const g = fiche.golems[i];
    const nom = (typeof g === 'string' ? g : (g.nom || ''));
    if (nom.toLowerCase() === n) {
      if (typeof fiche.golems[i] === 'string') fiche.golems[i] = { nom: fiche.golems[i], inventaire: [] };
      if (!Array.isArray(fiche.golems[i].inventaire)) fiche.golems[i].inventaire = [];
      return { arr: fiche.golems[i].inventaire, type: 'golem', index: i };
    }
  }

  for (let i = 0; i < (fiche.proprietes || []).length; i++) {
    const p = fiche.proprietes[i];
    const nom = (typeof p === 'string' ? p : (p.nom || ''));
    if (nom.toLowerCase() === n) {
      if (typeof fiche.proprietes[i] === 'string') fiche.proprietes[i] = { nom: fiche.proprietes[i], objets: [] };
      if (!Array.isArray(fiche.proprietes[i].objets)) fiche.proprietes[i].objets = [];
      return { arr: fiche.proprietes[i].objets, type: 'propriete', index: i };
    }
  }

  return null;
}

// ─── Add / Remove ──────────────────────────────────────────────────────────────
function addToInventory(arr, nom, quantite, type) {
  const qty = Math.max(1, parseInt(quantite) || 1);

  if (type === 'propriete') {
    const idx = arr.findIndex(o => {
      const n = typeof o === 'string' ? o : (o.nom || '');
      return n.toLowerCase() === nom.toLowerCase();
    });
    if (idx !== -1) {
      if (typeof arr[idx] === 'string') arr[idx] = { nom: arr[idx], quantite: 1 };
      arr[idx].quantite = (arr[idx].quantite || 1) + qty;
    } else {
      arr.push(qty > 1 ? { nom, quantite: qty } : nom);
    }
  } else {
    // perso / golem — objets toujours { nom, quantite?, niveau? }
    const idx = arr.findIndex(o => o && typeof o === 'object' && (o.nom || '').toLowerCase() === nom.toLowerCase());
    if (idx !== -1) {
      arr[idx].quantite = (arr[idx].quantite || 1) + qty;
    } else {
      arr.push({ nom, quantite: qty });
    }
  }
}

// Retourne une string d'erreur ou null si OK
function removeFromInventory(arr, nom, quantite, type) {
  const qty = Math.max(1, parseInt(quantite) || 1);

  let idx;
  if (type === 'propriete') {
    idx = arr.findIndex(o => {
      const n = typeof o === 'string' ? o : (o.nom || '');
      return n.toLowerCase() === nom.toLowerCase();
    });
  } else {
    idx = arr.findIndex(o => o && typeof o === 'object' && (o.nom || '').toLowerCase() === nom.toLowerCase());
  }

  if (idx === -1) return `❌ Objet "${nom}" introuvable dans cet inventaire.`;

  const obj = arr[idx];
  const current = typeof obj === 'string' ? 1 : (obj.quantite || 1);

  if (qty >= current) {
    arr.splice(idx, 1);
  } else {
    if (typeof arr[idx] === 'string') arr[idx] = { nom: arr[idx], quantite: current - qty };
    else arr[idx].quantite = current - qty;
  }
  return null;
}

// ─── Labels g1/g2/p1/p2 pour l'affichage dans les modals ─────────────────────
function getInventoryListLabels(fiche) {
  const list = ['perso'];
  for (let i = 0; i < (fiche.golems || []).length; i++) list.push(`g${i + 1}`);
  for (let i = 0; i < (fiche.proprietes || []).length; i++) list.push(`p${i + 1}`);
  return list;
}

// Résout un label (perso, g1, g2, p1...) OU le nom exact → { arr, type } ou null
function resolveInventoryByLabel(fiche, name) {
  const n = name.trim().toLowerCase();

  if (n === 'perso' || n === '') {
    if (!Array.isArray(fiche.inventaire)) fiche.inventaire = [];
    return { arr: fiche.inventaire, type: 'perso' };
  }

  // gX → golem par index
  const golemMatch = n.match(/^g(\d+)$/);
  if (golemMatch) {
    const idx = parseInt(golemMatch[1]) - 1;
    if (idx < 0 || idx >= (fiche.golems || []).length) return null;
    if (typeof fiche.golems[idx] === 'string') fiche.golems[idx] = { nom: fiche.golems[idx], inventaire: [] };
    if (!Array.isArray(fiche.golems[idx].inventaire)) fiche.golems[idx].inventaire = [];
    return { arr: fiche.golems[idx].inventaire, type: 'golem', index: idx };
  }

  // pX → propriété par index
  const propMatch = n.match(/^p(\d+)$/);
  if (propMatch) {
    const idx = parseInt(propMatch[1]) - 1;
    if (idx < 0 || idx >= (fiche.proprietes || []).length) return null;
    if (typeof fiche.proprietes[idx] === 'string') fiche.proprietes[idx] = { nom: fiche.proprietes[idx], objets: [] };
    if (!Array.isArray(fiche.proprietes[idx].objets)) fiche.proprietes[idx].objets = [];
    return { arr: fiche.proprietes[idx].objets, type: 'propriete', index: idx };
  }

  // Fallback : résolution par nom exact
  return resolveInventory(fiche, name);
}

// Supprime par index (0-based) dans arr
function removeFromInventoryByIndex(arr, index, quantite, type) {
  const qty = Math.max(1, parseInt(quantite) || 1);
  if (index < 0 || index >= arr.length) return `❌ Numéro invalide.`;
  const obj = arr[index];
  const current = typeof obj === 'string' ? 1 : (obj.quantite || 1);
  if (qty >= current) {
    arr.splice(index, 1);
  } else {
    if (typeof arr[index] === 'string') arr[index] = { nom: arr[index], quantite: current - qty };
    else arr[index].quantite = current - qty;
  }
  return null;
}

module.exports = {
  buildFicheEmbed,
  buildFicheButtons,
  buildNavigationButtons,
  createDefaultFiche,
  getInventoryList,
  getInventoryListLabels,
  resolveInventory,
  resolveInventoryByLabel,
  addToInventory,
  removeFromInventory,
  removeFromInventoryByIndex,
};
