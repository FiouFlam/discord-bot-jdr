const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getFiche, setFiche, getAllFiches } = require('../utils/database');
const {
  buildFicheEmbed,
  buildFicheButtons,
  buildNavigationButtons,
  getInventoryList,
  getInventoryListLabels,
  resolveInventory,
  resolveInventoryByLabel,
  addToInventory,
  removeFromInventory,
  removeFromInventoryByIndex,
} = require('../utils/ficheBuilder');

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
        const fiches = await getAllFiches();
        const userIds = Object.keys(fiches);
        // Navigation circulaire
        let newIndex;
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % userIds.length;
        } else {
          newIndex = (currentIndex - 1 + userIds.length) % userIds.length;
        }
        const userId = userIds[newIndex];
        const fiche = fiches[userId];
        let targetUser;
        try { targetUser = await interaction.client.users.fetch(userId); }
        catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }
        const embed = buildFicheEmbed(fiche, targetUser);
        embed.setFooter({ text: `Fiche ${newIndex + 1} / ${userIds.length}` });
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
            new TextInputBuilder().setCustomId('objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité').setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(false)
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
            new TextInputBuilder().setCustomId('objet_numero').setLabel('Numéro de l\'objet (dans l\'inventaire)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité à enlever').setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(false)
          ),
        );
        return interaction.showModal(modal);
      }

      // 🔁 Transférer
      if (id.startsWith('btn_transferer_')) {
        const userId = id.replace('btn_transferer_', '');
        const fiche = await getFiche(userId);
        const invList = fiche ? getInventoryListLabels(fiche).join(', ') : 'perso';
        const modal = new ModalBuilder()
          .setCustomId(`modal_transferer_${userId}__${messageId}`)
          .setTitle('🔁 Transférer un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('source').setLabel('Source (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('destination').setLabel('Destination (vide = perso)').setStyle(TextInputStyle.Short).setPlaceholder(invList.substring(0, 100)).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('objet_numero').setLabel('Numéro de l\'objet (source)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité').setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(false)
          ),
        );
        return interaction.showModal(modal);
      }

      // 💳 Transférer argent
      if (id.startsWith('btn_transfert_argent_')) {
        const userId = id.replace('btn_transfert_argent_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_transfert_argent_${userId}__${messageId}`)
          .setTitle('💳 Transférer de l\'argent');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('cible_id').setLabel('ID Discord du destinataire').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)
          ),
        );
        return interaction.showModal(modal);
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
            new TextInputBuilder().setCustomId('objet_numero').setLabel('Numéro de l\'objet (dans l\'inventaire)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('quantite').setLabel('Quantité').setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('prix').setLabel('Prix de vente total (kyp)').setStyle(TextInputStyle.Short).setPlaceholder('100').setRequired(true)
          ),
        );
        return interaction.showModal(modal);
      }

      // 🪨 Ajouter golem
      if (id.startsWith('btn_add_golem_')) {
        const userId = id.replace('btn_add_golem_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_add_golem_${userId}__${messageId}`)
          .setTitle('🪨 Ajouter un golem');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nom').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setRequired(true)
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
            new TextInputBuilder().setCustomId('nom').setLabel('Nom de la propriété').setStyle(TextInputStyle.Short).setRequired(true)
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

      // ➖ Supprimer
      if (baseId.startsWith('modal_supprimer_')) {
        const userId = baseId.replace('modal_supprimer_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const invName   = interaction.fields.getTextInputValue('inventaire').trim() || 'perso';
        const objetNum  = parseInt(interaction.fields.getTextInputValue('objet_numero').trim());
        const quantite  = parseInt(interaction.fields.getTextInputValue('quantite').trim()) || 1;
        const inv = resolveInventoryByLabel(fiche, invName);
        if (!inv) return interaction.reply({ content: `❌ Inventaire "${invName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });
        if (isNaN(objetNum) || objetNum < 1 || objetNum > inv.arr.length) return interaction.reply({ content: `❌ Numéro invalide. L'inventaire contient ${inv.arr.length} objet(s).`, ephemeral: true });
        const err = removeFromInventoryByIndex(inv.arr, objetNum - 1, quantite, inv.type);
        if (err) return interaction.reply({ content: err, ephemeral: true });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 🔁 Transférer
      if (baseId.startsWith('modal_transferer_')) {
        const userId = baseId.replace('modal_transferer_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const srcName  = interaction.fields.getTextInputValue('source').trim() || 'perso';
        const dstName  = interaction.fields.getTextInputValue('destination').trim() || 'perso';
        const objetNum = parseInt(interaction.fields.getTextInputValue('objet_numero').trim());
        const quantite = parseInt(interaction.fields.getTextInputValue('quantite').trim()) || 1;
        const src = resolveInventoryByLabel(fiche, srcName);
        if (!src) return interaction.reply({ content: `❌ Source "${srcName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });
        const dst = resolveInventoryByLabel(fiche, dstName);
        if (!dst) return interaction.reply({ content: `❌ Destination "${dstName}" introuvable.\nDisponibles : ${getInventoryListLabels(fiche).join(', ')}`, ephemeral: true });
        if (isNaN(objetNum) || objetNum < 1 || objetNum > src.arr.length) return interaction.reply({ content: `❌ Numéro invalide. La source contient ${src.arr.length} objet(s).`, ephemeral: true });
        const obj = src.arr[objetNum - 1];
        const nom = (typeof obj === 'string') ? obj : (obj.nom || '???');
        const err = removeFromInventoryByIndex(src.arr, objetNum - 1, quantite, src.type);
        if (err) return interaction.reply({ content: err, ephemeral: true });
        addToInventory(dst.arr, nom, quantite, dst.type);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // 💳 Transférer argent
      if (baseId.startsWith('modal_transfert_argent_')) {
        const userId = baseId.replace('modal_transfert_argent_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const cibleId = interaction.fields.getTextInputValue('cible_id').trim();
        const montant = parseInt(interaction.fields.getTextInputValue('montant').trim());
        if (isNaN(montant) || montant <= 0) return interaction.reply({ content: '❌ Montant invalide !', ephemeral: true });
        const ficheCible = await getFiche(cibleId);
        if (!ficheCible) return interaction.reply({ content: `❌ Fiche du joueur "${cibleId}" introuvable.`, ephemeral: true });
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
        const quantite = parseInt(interaction.fields.getTextInputValue('quantite').trim()) || 1;
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
    if (msg && msg.components.length > buttons.length) {
      components.push(msg.components[msg.components.length - 1]);
    }
    return interaction.update({ embeds: [embed], components });
  }

  await interaction.deferUpdate();

  if (!messageId || !interaction.channel) {
    return interaction.followUp({ content: '✅ Mis à jour !', ephemeral: true });
  }

  try {
    const msg = await interaction.channel.messages.fetch(messageId);
    let components = [...buttons];
    if (msg && msg.components.length > buttons.length) {
      components.push(msg.components[msg.components.length - 1]);
    }
    await msg.edit({ embeds: [embed], components });
  } catch (e) {
    console.error('Erreur édition message:', e);
    await interaction.followUp({ content: '✅ Mis à jour (impossible d\'éditer le message).', ephemeral: true });
  }
}
