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
      { name: '🏡 Propriétés', value: String((fiche.proprietes || []).length), inline: true },
      { name: '🪨 Golems', value: String((fiche.golems || []).length), inline: true },
    );

  if (targetUser.displayAvatarURL) {
    embed.setThumbnail(targetUser.displayAvatarURL());
  }

  // Inventaire objets
  const inventaire = (fiche.inventaire || []).length > 0
    ? fiche.inventaire.map((obj, i) => {
        const niv = obj.niveau != null ? ` *(niv. ${obj.niveau})*` : '';
        return `${i + 1}. ${obj.nom}${niv}`;
      }).join('\n')
    : '*(vide)*';
  embed.addFields({ name: '🎒 Inventaire', value: inventaire, inline: false });

  // Propriétés avec leurs objets
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

  // Golems
  const golems = (fiche.golems || []).length > 0
    ? fiche.golems.map((g, i) => `${i + 1}. ${g}`).join('\n')
    : '*(vide)*';
  embed.addFields({ name: '🪨 Liste des golems', value: golems, inline: false });

  // Champs custom
  for (const champ of fiche.champsCustom || []) {
    embed.addFields({ name: champ.nom, value: champ.valeur || '*(vide)*', inline: false });
  }

  return embed;
}

function buildFicheButtons(userId) {
  // Ligne 1 : Ajouter objet | Ajouter golem | Ajouter objet à propriété | Ajouter propriété
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
      .setCustomId(`btn_objet_propriete_${userId}`)
      .setLabel('📦 Ajouter objet à propriété')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_propriete_${userId}`)
      .setLabel('🏡 Ajouter propriété')
      .setStyle(ButtonStyle.Primary),
  );

  // Ligne 2 : Supprimer objet | Supprimer golem | Supprimer objet propriété | Supprimer propriété
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_suppr_objet_${userId}`)
      .setLabel('🗑️ Supprimer objet')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_suppr_golem_${userId}`)
      .setLabel('🗑️ Supprimer golem')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_suppr_objet_propriete_${userId}`)
      .setLabel('🗑️ Supprimer objet propriété')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_suppr_propriete_${userId}`)
      .setLabel('🗑️ Supprimer propriété')
      .setStyle(ButtonStyle.Danger),
  );

  // Ligne 3 : ➕ Ajouter argent | ➖ Retirer argent | Revenu / jour | Ajouter un champ
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`argent_ajouter_${userId}`)
      .setLabel('➕ Ajouter argent')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`argent_retirer_${userId}`)
      .setLabel('➖ Retirer argent')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`btn_revenu_${userId}`)
      .setLabel('Revenu / jour')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_champ_${userId}`)
      .setLabel('Ajouter un champ')
      .setStyle(ButtonStyle.Secondary),
  );

  // Ligne 4 : Rafraîchir
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_refresh_${userId}`)
      .setLabel('🔄 Rafraîchir')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3, row4];
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
