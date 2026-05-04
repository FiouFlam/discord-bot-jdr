const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getFiche, setFiche, getAllFiches } = require('../utils/database');
const { sessions } = require('../utils/session');
const {
  buildFicheEmbed,
  buildFicheButtons,
  buildGolemActionMenu,
  buildPropActionMenu,
  buildTransferActionMenu,
  buildNavigationButtons,
  getInventoryList,
  getInventoryListLabels,
  resolveInventory,
  resolveInventoryByLabel,
  addToInventory,
  removeFromInventory,
  removeFromInventoryByIndex,
} = require('../utils/ficheBuilder');

// ─── Helper : récupère la rangée de navigation si elle existe dans le message ──
function getNavRow(msg) {
  if (!msg) return null;
  const last = msg.components[msg.components.length - 1];
  if (!last) return null;
  const hasNav = last.components?.some(c =>
    c.customId?.startsWith('nav_prev_') || c.customId?.startsWith('nav_next_')
  );
  return hasNav ? last : null;
}

// ─── Helper : trouve l'ID d'un joueur par son nom (username ou displayName) ───
async function findPlayerIdByName(client, name) {
  const fiches = await getAllFiches();
  const userIds = Object.keys(fiches);
  for (const uid of userIds) {
    try {
      const u = await client.users.fetch(uid);
      if (
        u.username.toLowerCase() === name.toLowerCase() ||
        (u.displayName && u.displayName.toLowerCase() === name.toLowerCase()) ||
        (u.globalName && u.globalName.toLowerCase() === name.toLowerCase())
      ) {
        return uid;
      }
    } catch {}
  }
  return null;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ─── SLASH COMMANDS ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces commandes.', ephemeral: true });
      }
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await interaction.deferReply();
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        interaction.deferred
          ? interaction.editReply({ content: '❌ Une erreur est survenue.' })
          : interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
      }
      return;
    }

    // ─── SELECT MENUS ──────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces menus.', ephemeral: true });
      }
      const id = interaction.customId;
      const messageId = interaction.message.id;

      // Lancement session
      if (id === 'select_session_joueurs') {
        const selectedIds = interaction.values;

        const index = 0;
        const userId = selectedIds[index];
        const fiche = await getFiche(userId);
        let targetUser;
        try { targetUser = await interaction.client.users.fetch(userId); }
        catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }

        const embed = buildFicheEmbed(fiche, targetUser);
        embed.setFooter({ text: `Session • Fiche ${index + 1} / ${selectedIds.length}` });
        const ficheButtons = buildFicheButtons(userId);
        const navButtons = buildNavigationButtons(index, selectedIds.length, userId);
        await interaction.update({
          content: `🎮 **Session lancée** avec ${selectedIds.length} joueur(s) !`,
          embeds: [embed],
          components: [...ficheButtons, navButtons],
        });

        // Stocker la session avec le message pour pouvoir le supprimer avec /end
        const msg = await interaction.fetchReply().catch(() => interaction.message);
        sessions.set(interaction.guildId, { userIds: selectedIds, message: msg });
        return;
      }

      // Golem action
      if (id.startsWith('select_golem_action_')) {
        const userId = id.replace('select_golem_action_', '');
        const action = interaction.values[0];
        if (action === 'add') {
          const modal = new ModalBuilder()
            .setCustomId(`modal_add_golem_${userId}__${messageId}`)
            .setTitle('🪨 Ajouter un golem');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('nom').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setPlaceholder('ex: Golem de pierre niv.3').setRequired(true)
            ),
          );
          return interaction.showModal(modal);
        } else if (action === 'del') {
          const fiche = await getFiche(userId);
          const golemList = (fiche?.golems || []).map((g, i) => `g${i+1}: ${typeof g === 'string' ? g : g.nom}`).join(', ') || 'aucun';
          const modal = new ModalBuilder()
            .setCustomId(`modal_del_golem_${userId}__${messageId}`)
            .setTitle('🪨 Supprimer un golem');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('numero').setLabel('Numéro du golem (g1, g2...)').setStyle(TextInputStyle.Short).setPlaceholder(golemList.substring(0, 100)).setRequired(true)
            ),
          );
          return interaction.showModal(modal);
        }
      }

      // Propriété action
      if (id.startsWith('select_prop_action_')) {
        const userId = id.replace('select_prop_action_', '');
        const action = interaction.values[0];
        if (action === 'add') {
          const modal = new ModalBuilder()
            .setCustomId(`modal_add_prop_${userId}__${messageId}`)
            .setTitle('🏡 Ajouter une propriété');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('nom').setLabel('Nom de la propriété').setStyle(TextInputStyle.Short).setPlaceholder('ex: Petit abris en bois').setRequired(true)
            ),
          );
          return interaction.showModal(modal);
        } else if (action === 'del') {
          const fiche = await getFiche(userId);
          const propList = (fiche?.proprietes || []).map((p, i) => `p${i+1}: ${typeof p === 'string' ? p : p.nom}`).join(', ') || 'aucune';
          const modal = new ModalBuilder()
            .setCustomId(`modal_del_prop_${userId}__${messageId}`)
            .setTitle('🏡 Supprimer une propriété');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('numero').setLabel('Numéro de la propriété (p1, p2...)').setStyle(TextInputStyle.Short).setPlaceholder(propList.substring(0, 100)).setRequired(true)
            ),
          );
          return interaction.showModal(modal);
        }
      }
      // Transfert action
      if (id.startsWith('select_transfer_action_')) {
        const userId = id.replace('select_transfer_action_', '');
        const action = interaction.values[0];
        const fiche = await getFiche(userId);
        const invList = fiche ? getInventoryListLabels(fiche).join(', ') : 'perso';

        if (action === 'inventaire') {
          // Transfert entre inventaires du même joueur
          const modal = new ModalBuilder()
            .setCustomId(`modal_transferer_inv_${userId}__${messageId}`)
            .setTitle('🔁 Transfert inventaire');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('source').setLabel('Inventaire source (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('objet_numero').setLabel('N° objet(s) — ex: 1 ou 1;3;5').setStyle(TextInputStyle.Short).setPlaceholder('ex: 1  ou  1;3;5  pour plusieurs').setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('destination').setLabel('Inventaire destination (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder('perso, g1, p1...').setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('quantite').setLabel('Quantité (vide = tout transférer)').setStyle(TextInputStyle.Short).setPlaceholder('vide = tout le stock de chaque objet').setRequired(false)
            ),
          );
          return interaction.showModal(modal);
        } else if (action === 'joueur') {
          // Afficher un select menu avec la liste des joueurs ayant une fiche
          const fiches = await getAllFiches();
          const autreJoueurs = Object.entries(fiches).filter(([id]) => id !== userId);
          if (autreJoueurs.length === 0) {
            return interaction.reply({ content: '❌ Aucun autre joueur avec une fiche.', ephemeral: true });
          }
          const options = [];
          for (const [id] of autreJoueurs.slice(0, 25)) {
            let label = id;
            try {
              const u = await interaction.client.users.fetch(id);
              label = u.username;
            } catch {}
            const nomFiche = fiches[id]?.nom || '';
            options.push({
              label: label.substring(0, 25),
              value: id,
              description: nomFiche ? nomFiche.substring(0, 50) : undefined,
            });
          }
          const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`select_transferer_joueur_cible_${userId}__${messageId}`)
              .setPlaceholder('Choisir le joueur destinataire')
              .addOptions(options)
          );
          const ficheButtons = buildFicheButtons(userId);
          const msg = interaction.message;
          const navRow = getNavRow(msg);
          const components = [...ficheButtons, selectMenu];
          if (navRow) components.push(navRow);
          return interaction.update({ embeds: interaction.message.embeds, components });
        }
      }

      // Joueur cible argent sélectionné → modal pour le montant
      if (id.startsWith('select_argent_cible_')) {
        const rest = id.replace('select_argent_cible_', '');
        const [userId] = rest.split('__');
        const cibleId = interaction.values[0];
        let cibleLabel = cibleId;
        try { const u = await interaction.client.users.fetch(cibleId); cibleLabel = u.username; } catch {}
        const modal = new ModalBuilder()
          .setCustomId(`modal_transfert_argent_${userId}_cible_${cibleId}__${messageId}`)
          .setTitle(`💳 Transfert → ${cibleLabel.substring(0, 20)}`);
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }

      // Joueur cible sélectionné → modal pour choisir objet
      if (id.startsWith('select_transferer_joueur_cible_')) {
        const rest = id.replace('select_transferer_joueur_cible_', '');
        const [userId] = rest.split('__');
        const cibleId = interaction.values[0];
        const fiche = await getFiche(userId);
        const invList = fiche ? getInventoryListLabels(fiche).join(', ') : 'perso';
        let cibleLabel = cibleId;
        try { const u = await interaction.client.users.fetch(cibleId); cibleLabel = u.username; } catch {}
        const modal = new ModalBuilder()
          .setCustomId(`modal_transferer_joueur_${userId}_cible_${cibleId}__${messageId}`)
          .setTitle(`👤 Transfert → ${cibleLabel.substring(0, 20)}`);
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('source').setLabel('Inventaire source (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('objet_numero').setLabel('N° objet(s) — ex: 1 ou 1;3;5').setStyle(TextInputStyle.Short).setPlaceholder('ex: 1  ou  1;3;5  pour plusieurs').setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité (vide = tout transférer)').setStyle(TextInputStyle.Short).setPlaceholder('vide = tout le stock de chaque objet').setRequired(false)
          ),
        );
        return interaction.showModal(modal);
      }
    }

    // ─── BUTTONS ──────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces boutons.', ephemeral: true });
      }
      const id = interaction.customId;
      const messageId = interaction.message.id;

      // Navigation
      if (id.startsWith('nav_prev_') || id.startsWith('nav_next_')) {
        const parts = id.split('_');
        const direction = parts[1];
        const currentIndex = parseInt(parts[2]);

        // Utilise la liste de la session si active, sinon toutes les fiches
        let userIds;
        const session = sessions.get(interaction.guildId);
        if (session) {
          userIds = session.userIds;
        } else {
          const fiches = await getAllFiches();
          userIds = Object.keys(fiches);
        }

        let newIndex;
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % userIds.length;
        } else {
          newIndex = (currentIndex - 1 + userIds.length) % userIds.length;
        }
        const userId = userIds[newIndex];
        const fiche = await getFiche(userId);
        let targetUser;
        try { targetUser = await interaction.client.users.fetch(userId); }
        catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }
        const embed = buildFicheEmbed(fiche, targetUser);
        const label = session ? 'Session' : 'Fiche';
        embed.setFooter({ text: `${label} • Fiche ${newIndex + 1} / ${userIds.length}` });
        const ficheButtons = buildFicheButtons(userId);
        const navButtons = buildNavigationButtons(newIndex, userIds.length, userId);
        return interaction.update({ embeds: [embed], components: [...ficheButtons, navButtons] });
      }

      // Refresh
      if (id.startsWith('btn_refresh_')) {
        return updateMessage(interaction, id.replace('btn_refresh_', ''), true);
      }

      // HP +
      if (id.startsWith('btn_hp_plus_')) {
        const userId = id.replace('btn_hp_plus_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.hp = Math.min(5, (fiche.hp ?? 5) + 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, true);
      }

      // HP -
      if (id.startsWith('btn_hp_minus_')) {
        const userId = id.replace('btn_hp_minus_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.hp = Math.max(0, (fiche.hp ?? 5) - 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, true);
      }

      // Ajouter argent
      if (id.startsWith('argent_ajouter_')) {
        const userId = id.replace('argent_ajouter_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_argent_ajouter_${userId}__${messageId}`)
          .setTitle('💸 Ajouter de l\'argent');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)
        ));
        return interaction.showModal(modal);
      }

      // Retirer argent
      if (id.startsWith('argent_retirer_')) {
        const userId = id.replace('argent_retirer_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_argent_retirer_${userId}__${messageId}`)
          .setTitle('💸 Retirer de l\'argent');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)
        ));
        return interaction.showModal(modal);
      }

      // Revenu / jour
      if (id.startsWith('btn_revenu_')) {
        const userId = id.replace('btn_revenu_', '');
        const fiche = await getFiche(userId);
        const modal = new ModalBuilder()
          .setCustomId(`modal_revenu_${userId}__${messageId}`)
          .setTitle('🪙 Revenu journalier');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('revenu_input').setLabel('Revenu par jour (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder(String(fiche?.revenu ?? 0)).setRequired(true)
        ));
        return interaction.showModal(modal);
      }

      // ➕ Ajouter objet
      if (id.startsWith('btn_ajouter_')) {
        const userId = id.replace('btn_ajouter_', '');
        const fiche = await getFiche(userId);
        const invList = fiche ? getInventoryListLabels(fiche).join(', ') : 'perso';
        const modal = new ModalBuilder()
          .setCustomId(`modal_ajouter_${userId}__${messageId}`)
          .setTitle('➕ Ajouter un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('inventaire').setLabel('Inventaire (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setPlaceholder('ex: Viande, Hache niv.2...').setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité (vide = 1)').setStyle(TextInputStyle.Short).setPlaceholder('vide = 1').setRequired(false)
          ),
        );
        return interaction.showModal(modal);
      }

      // ➖ Supprimer objet
      if (id.startsWith('btn_supprimer_')) {
        const userId = id.replace('btn_supprimer_', '');
        const fiche = await getFiche(userId);
        const invList = fiche ? getInventoryListLabels(fiche).join(', ') : 'perso';
        const modal = new ModalBuilder()
          .setCustomId(`modal_supprimer_${userId}__${messageId}`)
          .setTitle('➖ Supprimer un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('inventaire').setLabel('Inventaire (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('objet_numero').setLabel('N° objet(s) — ex: 1 ou 1;3;5').setStyle(TextInputStyle.Short).setPlaceholder('ex: 1  ou  1;3;5  pour plusieurs').setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité à enlever (vide = tout)').setStyle(TextInputStyle.Short).setPlaceholder('vide = tout le stock de chaque objet').setRequired(false)
          ),
        );
        return interaction.showModal(modal);
      }

      // 🔁 Transférer objet → affiche le select menu de type de transfert
      if (id.startsWith('btn_transferer_')) {
        const userId = id.replace('btn_transferer_', '');
        const fiche = await getFiche(userId);
        const embed = buildFicheEmbed(fiche, await interaction.client.users.fetch(userId).catch(() => ({ username: 'Joueur inconnu', displayAvatarURL: () => null })));
        const ficheButtons = buildFicheButtons(userId);
        const transferMenu = buildTransferActionMenu(userId);
        const msg = interaction.message;
        let components = [...ficheButtons, transferMenu];
        const navRow = getNavRow(msg);
        if (navRow) components.push(navRow);
        return interaction.update({ embeds: [embed], components });
      }

      // 💳 Transférer argent — FIX: accepte pseudo OU ID
      if (id.startsWith('btn_transfert_argent_')) {
        const userId = id.replace('btn_transfert_argent_', '');
        const fiches = await getAllFiches();
        const autresJoueurs = Object.entries(fiches).filter(([id]) => id !== userId);
        if (autresJoueurs.length === 0) {
          return interaction.reply({ content: '❌ Aucun autre joueur avec une fiche.', ephemeral: true });
        }
        const options = [];
        for (const [id] of autresJoueurs.slice(0, 25)) {
          let label = id;
          try { const u = await interaction.client.users.fetch(id); label = u.username; } catch {}
          const nomFiche = fiches[id]?.nom || '';
          options.push({
            label: label.substring(0, 25),
            value: id,
            description: nomFiche ? nomFiche.substring(0, 50) : undefined,
          });
        }
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`select_argent_cible_${userId}__${messageId}`)
            .setPlaceholder('Choisir le joueur destinataire')
            .addOptions(options)
        );
        const ficheButtons = buildFicheButtons(userId);
        const msg = interaction.message;
        const navRow = getNavRow(msg);
        const components = [...ficheButtons, selectMenu];
        if (navRow) components.push(navRow);
        return interaction.update({ embeds: interaction.message.embeds, components });
      }

      // 💰 Vendre
      if (id.startsWith('btn_vendre_')) {
        const userId = id.replace('btn_vendre_', '');
        const fiche = await getFiche(userId);
        const invList = fiche ? getInventoryListLabels(fiche).join(', ') : 'perso';
        const modal = new ModalBuilder()
          .setCustomId(`modal_vendre_${userId}__${messageId}`)
          .setTitle('💰 Vendre un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('inventaire').setLabel('Inventaire (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('objet_numero').setLabel('Numéro de l\'objet (dans l\'inventaire)').setStyle(TextInputStyle.Short).setPlaceholder('ex: 3').setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité (vide = tout vendre)').setStyle(TextInputStyle.Short).setPlaceholder('vide = tout le stock').setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('prix').setLabel('Prix de vente total (kyp)').setStyle(TextInputStyle.Short).setPlaceholder('ex: 100').setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }

      // FIX: btn_golem_ → affiche le select menu Golem
      if (id.startsWith('btn_golem_')) {
        const userId = id.replace('btn_golem_', '');
        const { buildGolemActionMenu } = require('../utils/ficheBuilder');
        const fiche = await getFiche(userId);
        const embed = buildFicheEmbed(fiche, await interaction.client.users.fetch(userId).catch(() => ({ username: 'Joueur inconnu', displayAvatarURL: () => null })));
        const ficheButtons = buildFicheButtons(userId);
        const golemMenu = buildGolemActionMenu(userId);
        const msg = interaction.message;
        let components = [...ficheButtons, golemMenu];
        // Conserve navigation si présente
        const navRow = getNavRow(msg);
        if (navRow) components.push(navRow);
        return interaction.update({ embeds: [embed], components });
      }

      // FIX: btn_prop_ → affiche le select menu Propriété
      if (id.startsWith('btn_prop_')) {
        const userId = id.replace('btn_prop_', '');
        const { buildPropActionMenu } = require('../utils/ficheBuilder');
        const fiche = await getFiche(userId);
        const embed = buildFicheEmbed(fiche, await interaction.client.users.fetch(userId).catch(() => ({ username: 'Joueur inconnu', displayAvatarURL: () => null })));
        const ficheButtons = buildFicheButtons(userId);
        const propMenu = buildPropActionMenu(userId);
        const msg = interaction.message;
        let components = [...ficheButtons, propMenu];
        const navRow = getNavRow(msg);
        if (navRow) components.push(navRow);
        return interaction.update({ embeds: [embed], components });
      }

      // 🪨 Ajouter golem (legacy direct buttons — conservés pour compatibilité)
      if (id.startsWith('btn_add_golem_')) {
        const userId = id.replace('btn_add_golem_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_add_golem_${userId}__${messageId}`)
          .setTitle('🪨 Ajouter un golem');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nom').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setPlaceholder('ex: Golem de pierre niv.3').setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }

      // 🪨 Supprimer golem
      if (id.startsWith('btn_del_golem_')) {
        const userId = id.replace('btn_del_golem_', '');
        const fiche = await getFiche(userId);
        const golemList = (fiche?.golems || []).map((g, i) => `g${i+1}: ${typeof g === 'string' ? g : g.nom}`).join(', ') || 'aucun';
        const modal = new ModalBuilder()
          .setCustomId(`modal_del_golem_${userId}__${messageId}`)
          .setTitle('🪨 Supprimer un golem');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('numero').setLabel('Numéro du golem (g1, g2...)').setStyle(TextInputStyle.Short).setPlaceholder(golemList.substring(0, 100)).setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }

      // 🏡 Ajouter propriété
      if (id.startsWith('btn_add_prop_')) {
        const userId = id.replace('btn_add_prop_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_add_prop_${userId}__${messageId}`)
          .setTitle('🏡 Ajouter une propriété');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nom').setLabel('Nom de la propriété').setStyle(TextInputStyle.Short).setPlaceholder('ex: Petit abris en bois').setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }

      // 🏡 Supprimer propriété
      if (id.startsWith('btn_del_prop_')) {
        const userId = id.replace('btn_del_prop_', '');
        const fiche = await getFiche(userId);
        const propList = (fiche?.proprietes || []).map((p, i) => `p${i+1}: ${typeof p === 'string' ? p : p.nom}`).join(', ') || 'aucune';
        const modal = new ModalBuilder()
          .setCustomId(`modal_del_prop_${userId}__${messageId}`)
          .setTitle('🏡 Supprimer une propriété');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('numero').setLabel('Numéro de la propriété (p1, p2...)').setStyle(TextInputStyle.Short).setPlaceholder(propList.substring(0, 100)).setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }
    }

    // ─── MODAL SUBMITS ─────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces actions.', ephemeral: true });
      }
      const id = interaction.customId;
      const sepIdx = id.lastIndexOf('__');
      const messageId = sepIdx !== -1 ? id.slice(sepIdx + 2) : null;
      const baseId   = sepIdx !== -1 ? id.slice(0, sepIdx) : id;

      // Argent ajouter
      if (baseId.startsWith('modal_argent_ajouter_')) {
        const userId = baseId.replace('modal_argent_ajouter_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const montant = parseInt(interaction.fields.getTextInputValue('montant').trim());
        if (isNaN(montant) || montant <= 0) return interaction.reply({ content: '❌ Montant invalide !', ephemeral: true });
        fiche.argent = (fiche.argent ?? 0) + montant;
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // Argent retirer
      if (baseId.startsWith('modal_argent_retirer_')) {
        const userId = baseId.replace('modal_argent_retirer_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const montant = parseInt(interaction.fields.getTextInputValue('montant').trim());
        if (isNaN(montant) || montant <= 0) return interaction.reply({ content: '❌ Montant invalide !', ephemeral: true });
        fiche.argent = Math.max(0, (fiche.argent ?? 0) - montant);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // Revenu
      if (baseId.startsWith('modal_revenu_')) {
        const userId = baseId.replace('modal_revenu_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const val = parseInt(interaction.fields.getTextInputValue('revenu_input'));
        if (isNaN(val) || val < 0) return interaction.reply({ content: '❌ Valeur invalide !', ephemeral: true });
        fiche.revenu = val;
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // ➕ Ajouter
      if (baseId.startsWith('modal_ajouter_')) {
        const userId = baseId.replace('modal_ajouter_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const invName  = interaction.fields.getTextInputValue('inventaire').trim() || 'perso';
        const objetNom = interaction.fields.getTextInputValue('objet_nom').trim();
        const quantite = parseInt(interaction.fields.getTextInputValue('quantite').trim()) || 1;
        const inv = resolveInventoryByLabel(fiche, invName);
        if (!inv) return interaction.reply({ content: `❌ Inventaire "${invName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });
        addToInventory(inv.arr, objetNom, quantite, inv.type);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // ➖ Supprimer — FIX: supporte plusieurs numéros séparés par ";"
      if (baseId.startsWith('modal_supprimer_')) {
        const userId = baseId.replace('modal_supprimer_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const invName  = interaction.fields.getTextInputValue('inventaire').trim() || 'perso';
        const objetNumRaw = interaction.fields.getTextInputValue('objet_numero').trim();
        const quantiteRaw = interaction.fields.getTextInputValue('quantite').trim();
        const quantite = quantiteRaw === '' ? null : parseInt(quantiteRaw);
        const inv = resolveInventoryByLabel(fiche, invName);
        if (!inv) return interaction.reply({ content: `❌ Inventaire "${invName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });

        // Parse les numéros (séparés par ; ou virgule)
        const nums = objetNumRaw.split(/[;,]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (nums.length === 0) return interaction.reply({ content: '❌ Numéro(s) invalide(s).', ephemeral: true });

        // Trier en décroissant pour supprimer sans décaler les index
        nums.sort((a, b) => b - a);
        const errors = [];
        for (const num of nums) {
          if (num < 1 || num > inv.arr.length) {
            errors.push(`Numéro ${num} invalide`);
            continue;
          }
          const err = removeFromInventoryByIndex(inv.arr, num - 1, quantite, inv.type);
          if (err) errors.push(err);
        }
        if (errors.length > 0) return interaction.reply({ content: `❌ Erreurs : ${errors.join(', ')}`, ephemeral: true });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 🔁 Transférer inventaire (entre inventaires du même joueur)
      if (baseId.startsWith('modal_transferer_inv_')) {
        const userId = baseId.replace('modal_transferer_inv_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const srcName  = interaction.fields.getTextInputValue('source').trim() || 'perso';
        const dstName  = interaction.fields.getTextInputValue('destination').trim() || 'perso';
        const objetNumRaw = interaction.fields.getTextInputValue('objet_numero').trim();
        const quantiteRaw = interaction.fields.getTextInputValue('quantite').trim();
        const quantite = quantiteRaw === '' ? null : parseInt(quantiteRaw);

        const src = resolveInventoryByLabel(fiche, srcName);
        if (!src) return interaction.reply({ content: `❌ Source "${srcName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });
        const dst = resolveInventoryByLabel(fiche, dstName);
        if (!dst) return interaction.reply({ content: `❌ Destination "${dstName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });

        const nums = objetNumRaw.split(/[;,]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (nums.length === 0) return interaction.reply({ content: '❌ Numéro(s) invalide(s).', ephemeral: true });

        const toTransfer = [];
        const errors = [];
        for (const num of nums) {
          if (num < 1 || num > src.arr.length) { errors.push(`Numéro ${num} invalide`); continue; }
          const obj = src.arr[num - 1];
          const nom = (typeof obj === 'string') ? obj : (obj.nom || '???');
          // Si quantite null (champ vide) → prendre tout le stock de cet objet
          const qtyItem = quantite === null ? (typeof obj === 'string' ? 1 : (obj.quantite || 1)) : quantite;
          toTransfer.push({ num, nom, qtyItem });
        }
        if (errors.length > 0) return interaction.reply({ content: `❌ Erreurs : ${errors.join(', ')}`, ephemeral: true });

        toTransfer.sort((a, b) => b.num - a.num);
        for (const { num, nom, qtyItem } of toTransfer) {
          const err = removeFromInventoryByIndex(src.arr, num - 1, qtyItem, src.type);
          if (err) { errors.push(err); continue; }
          addToInventory(dst.arr, nom, qtyItem, dst.type);
        }
        if (errors.length > 0) return interaction.reply({ content: `❌ Erreurs partielles : ${errors.join(', ')}`, ephemeral: true });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 👤 Transférer joueur (vers l'inventaire perso d'un autre joueur)
      if (baseId.startsWith('modal_transferer_joueur_')) {
        // format: modal_transferer_joueur_{userId}_cible_{cibleId}
        const rest = baseId.replace('modal_transferer_joueur_', '');
        const cibleMatch = rest.match(/^(.+)_cible_(.+)$/);
        if (!cibleMatch) return interaction.reply({ content: '❌ Format invalide.', ephemeral: true });
        const userId = cibleMatch[1];
        const cibleId = cibleMatch[2];

        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const ficheCible = await getFiche(cibleId);
        if (!ficheCible) return interaction.reply({ content: '❌ Fiche du joueur cible introuvable.', ephemeral: true });

        const srcName     = interaction.fields.getTextInputValue('source').trim() || 'perso';
        const objetNumRaw = interaction.fields.getTextInputValue('objet_numero').trim();
        const quantiteRaw = interaction.fields.getTextInputValue('quantite').trim();
        const quantite    = quantiteRaw === '' ? null : parseInt(quantiteRaw);

        const src = resolveInventoryByLabel(fiche, srcName);
        if (!src) return interaction.reply({ content: `❌ Source "${srcName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });

        const nums = objetNumRaw.split(/[;,]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (nums.length === 0) return interaction.reply({ content: '❌ Numéro(s) invalide(s).', ephemeral: true });

        const toTransfer = [];
        const errors = [];
        for (const num of nums) {
          if (num < 1 || num > src.arr.length) { errors.push(`Numéro ${num} invalide`); continue; }
          const obj = src.arr[num - 1];
          const nom = (typeof obj === 'string') ? obj : (obj.nom || '???');
          const qtyItem = quantite === null ? (typeof obj === 'string' ? 1 : (obj.quantite || 1)) : quantite;
          toTransfer.push({ num, nom, qtyItem });
        }
        if (errors.length > 0) return interaction.reply({ content: `❌ Erreurs : ${errors.join(', ')}`, ephemeral: true });

        toTransfer.sort((a, b) => b.num - a.num);
        for (const { num, nom, qtyItem } of toTransfer) {
          const err = removeFromInventoryByIndex(src.arr, num - 1, qtyItem, src.type);
          if (err) { errors.push(err); continue; }
          if (!Array.isArray(ficheCible.inventaire)) ficheCible.inventaire = [];
          addToInventory(ficheCible.inventaire, nom, qtyItem, 'perso');
        }
        if (errors.length > 0) return interaction.reply({ content: `❌ Erreurs partielles : ${errors.join(', ')}`, ephemeral: true });
        await setFiche(userId, fiche);
        await setFiche(cibleId, ficheCible);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 💳 Transférer argent — FIX: accepte pseudo OU ID Discord
      if (baseId.startsWith('modal_transfert_argent_')) {
        const rest = baseId.replace('modal_transfert_argent_', '');
        const cibleMatch = rest.match(/^(.+)_cible_(.+)$/);
        if (!cibleMatch) return interaction.reply({ content: '❌ Format invalide.', ephemeral: true });
        const userId = cibleMatch[1];
        const cibleId = cibleMatch[2];

        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const montant = parseInt(interaction.fields.getTextInputValue('montant').trim());
        if (isNaN(montant) || montant <= 0) return interaction.reply({ content: '❌ Montant invalide !', ephemeral: true });

        const ficheCible = await getFiche(cibleId);
        if (!ficheCible) return interaction.reply({ content: '❌ Fiche du joueur cible introuvable.', ephemeral: true });
        if ((fiche.argent ?? 0) < montant) return interaction.reply({ content: `❌ Fonds insuffisants ! Solde : ${fiche.argent ?? 0} kyp.`, ephemeral: true });
        fiche.argent = (fiche.argent ?? 0) - montant;
        ficheCible.argent = (ficheCible.argent ?? 0) + montant;
        await setFiche(userId, fiche);
        await setFiche(cibleId, ficheCible);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 💰 Vendre
      if (baseId.startsWith('modal_vendre_')) {
        const userId = baseId.replace('modal_vendre_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const invName  = interaction.fields.getTextInputValue('inventaire').trim() || 'perso';
        const objetNum = parseInt(interaction.fields.getTextInputValue('objet_numero').trim());
        const quantiteRaw = interaction.fields.getTextInputValue('quantite').trim();
        const quantite = quantiteRaw === '' ? null : parseInt(quantiteRaw);
        const prix     = parseInt(interaction.fields.getTextInputValue('prix').trim());
        if (isNaN(prix) || prix < 0) return interaction.reply({ content: '❌ Prix invalide !', ephemeral: true });
        const inv = resolveInventoryByLabel(fiche, invName);
        if (!inv) return interaction.reply({ content: `❌ Inventaire "${invName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });
        if (isNaN(objetNum) || objetNum < 1 || objetNum > inv.arr.length) return interaction.reply({ content: `❌ Numéro invalide. L'inventaire contient ${inv.arr.length} objet(s).`, ephemeral: true });
        const err = removeFromInventoryByIndex(inv.arr, objetNum - 1, quantite, inv.type);
        if (err) return interaction.reply({ content: err, ephemeral: true });
        fiche.argent = (fiche.argent ?? 0) + prix;
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 🪨 Ajouter golem
      if (baseId.startsWith('modal_add_golem_')) {
        const userId = baseId.replace('modal_add_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const nom = interaction.fields.getTextInputValue('nom').trim();
        if (!nom) return interaction.reply({ content: '❌ Nom invalide.', ephemeral: true });
        if (!Array.isArray(fiche.golems)) fiche.golems = [];
        fiche.golems.push({ nom, inventaire: [] });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 🪨 Supprimer golem
      if (baseId.startsWith('modal_del_golem_')) {
        const userId = baseId.replace('modal_del_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const input = interaction.fields.getTextInputValue('numero').trim().toLowerCase();
        const match = input.match(/^g(\d+)$/);
        if (!match) return interaction.reply({ content: '❌ Format invalide. Utilise g1, g2, etc.', ephemeral: true });
        const idx = parseInt(match[1]) - 1;
        if (idx < 0 || idx >= (fiche.golems || []).length) return interaction.reply({ content: `❌ Numéro invalide. Il y a ${(fiche.golems || []).length} golem(s).`, ephemeral: true });
        fiche.golems.splice(idx, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 🏡 Ajouter propriété
      if (baseId.startsWith('modal_add_prop_')) {
        const userId = baseId.replace('modal_add_prop_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const nom = interaction.fields.getTextInputValue('nom').trim();
        if (!nom) return interaction.reply({ content: '❌ Nom invalide.', ephemeral: true });
        if (!Array.isArray(fiche.proprietes)) fiche.proprietes = [];
        fiche.proprietes.push({ nom, objets: [] });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 🏡 Supprimer propriété
      if (baseId.startsWith('modal_del_prop_')) {
        const userId = baseId.replace('modal_del_prop_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const input = interaction.fields.getTextInputValue('numero').trim().toLowerCase();
        const match = input.match(/^p(\d+)$/);
        if (!match) return interaction.reply({ content: '❌ Format invalide. Utilise p1, p2, etc.', ephemeral: true });
        const idx = parseInt(match[1]) - 1;
        if (idx < 0 || idx >= (fiche.proprietes || []).length) return interaction.reply({ content: `❌ Numéro invalide. Il y a ${(fiche.proprietes || []).length} propriété(s).`, ephemeral: true });
        fiche.proprietes.splice(idx, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }
    }
  }
};

// ─── Helper updateMessage ──────────────────────────────────────────────────────
async function updateMessage(interaction, userId, isButton = false, messageId = null) {
  const fiche = await getFiche(userId);
  let targetUser;
  try { targetUser = await interaction.client.users.fetch(userId); }
  catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }

  const embed = buildFicheEmbed(fiche, targetUser);
  const buttons = buildFicheButtons(userId);

  if (isButton) {
    const msg = interaction.message;
    let components = [...buttons];
    const navRow = getNavRow(msg);
    if (navRow) components.push(navRow);
    return interaction.update({ embeds: [embed], components });
  }

  await interaction.deferUpdate();

  if (!messageId || !interaction.channel) {
    return interaction.followUp({ content: '✅ Mis à jour !', ephemeral: true });
  }

  try {
    const msg = await interaction.channel.messages.fetch(messageId);
    let components = [...buttons];
    const navRow = getNavRow(msg);
    if (navRow) components.push(navRow);
    await msg.edit({ embeds: [embed], components });
  } catch (e) {
    console.error('Erreur édition message:', e);
    await interaction.followUp({ content: '✅ Mis à jour (impossible d\'éditer le message).', ephemeral: true });
  }
}
