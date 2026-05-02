const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getFiche, setFiche, deleteFiche, getAllFiches } = require('../utils/database');
const {
  buildFicheEmbed,
  buildFicheButtons,
  buildSelectMenuAjouter,
  buildSelectMenuSupprimer,
  buildNavigationButtons,
  MAX_VIES,
} = require('../utils/ficheBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

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
        interaction.deferred ? interaction.editReply({ content: '❌ Une erreur est survenue.' }) : interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
      }
      return;
    }

    // ─────────────────── SELECT MENUS ───────────────────
    if (interaction.isStringSelectMenu()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces menus.', ephemeral: true });
      }
      const id = interaction.customId;
      const messageId = interaction.message.id;

      if (id.startsWith('select_ajouter_')) {
        const userId = id.replace('select_ajouter_', '');
        const choice = interaction.values[0];

        if (choice === 'objet') {
          const modal = new ModalBuilder().setCustomId(`modal_objet_${userId}__${messageId}`).setTitle('Ajouter un objet (inventaire)');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objet_niveau').setLabel('Niveau (optionnel)').setStyle(TextInputStyle.Short).setPlaceholder('ex: 1').setRequired(false))
          );
          return interaction.showModal(modal);
        }

        if (choice === 'objet_golem') {
          const modal = new ModalBuilder().setCustomId(`modal_objet_golem_${userId}__${messageId}`).setTitle('Ajouter un objet (inventaire golem)');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objet_niveau').setLabel('Niveau (optionnel)').setStyle(TextInputStyle.Short).setPlaceholder('ex: 1').setRequired(false))
          );
          return interaction.showModal(modal);
        }

        if (choice === 'objet_propriete') {
          const fiche = await getFiche(userId);
          if (!fiche || (fiche.proprietes || []).length === 0) return interaction.reply({ content: '❌ Aucune propriété ! Ajoute d\'abord une propriété.', ephemeral: true });
          const liste = fiche.proprietes.map((p, i) => { const nom = typeof p === 'string' ? p : p.nom; return `${i + 1}. ${nom}`; }).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_objet_propriete_${userId}__${messageId}`).setTitle('Ajouter un objet à une propriété');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_num').setLabel('Numéro de la propriété').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setRequired(true))
          );
          return interaction.showModal(modal);
        }

        if (choice === 'propriete') {
          const modal = new ModalBuilder().setCustomId(`modal_propriete_${userId}__${messageId}`).setTitle('Ajouter une propriété');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('propriete_input').setLabel('Nom de la propriété').setStyle(TextInputStyle.Short).setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'golem') {
          const modal = new ModalBuilder().setCustomId(`modal_golem_${userId}__${messageId}`).setTitle('Ajouter un golem');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('golem_input').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'argent') {
          const modal = new ModalBuilder().setCustomId(`modal_argent_ajouter_${userId}__${messageId}`).setTitle('➕ Ajouter de l\'argent');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('argent_montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'champ') {
          const modal = new ModalBuilder().setCustomId(`modal_champ_${userId}__${messageId}`).setTitle('Ajouter un champ personnalisé');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('champ_nom').setLabel('Nom du champ').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('champ_valeur').setLabel('Contenu initial (optionnel)').setStyle(TextInputStyle.Paragraph).setRequired(false))
          );
          return interaction.showModal(modal);
        }
      }

      if (id.startsWith('select_supprimer_')) {
        const userId = id.replace('select_supprimer_', '');
        const choice = interaction.values[0];
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        if (choice === 'objet') {
          if (!fiche.inventaire || fiche.inventaire.length === 0) return interaction.reply({ content: '❌ L\'inventaire est vide !', ephemeral: true });
          const liste = fiche.inventaire.map((o, i) => `${i + 1}. ${o.nom}${o.niveau != null ? ` (niv.${o.niveau})` : ''}`).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_suppr_objet_${userId}__${messageId}`).setTitle('Supprimer un objet');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_objet_num').setLabel('Numéro de l\'objet à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'objet_golem') {
          if (!fiche.inventaireGolems || fiche.inventaireGolems.length === 0) return interaction.reply({ content: '❌ L\'inventaire golem est vide !', ephemeral: true });
          const liste = fiche.inventaireGolems.map((o, i) => `${i + 1}. ${o.nom}${o.niveau != null ? ` (niv.${o.niveau})` : ''}`).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_suppr_objet_golem_${userId}__${messageId}`).setTitle('Supprimer un objet (inventaire golem)');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_objet_num').setLabel('Numéro de l\'objet à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'objet_propriete') {
          if ((fiche.proprietes || []).length === 0) return interaction.reply({ content: '❌ Aucune propriété !', ephemeral: true });
          const liste = fiche.proprietes.map((p, i) => { const nom = typeof p === 'string' ? p : p.nom; return `${i + 1}. ${nom}`; }).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_suppr_objet_propriete_${userId}__${messageId}`).setTitle('Supprimer un objet d\'une propriété');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_num').setLabel('Numéro de la propriété').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_objet_num').setLabel('Numéro de l\'objet à supprimer').setStyle(TextInputStyle.Short).setRequired(true))
          );
          return interaction.showModal(modal);
        }

        if (choice === 'propriete') {
          if ((fiche.proprietes || []).length === 0) return interaction.reply({ content: '❌ Aucune propriété !', ephemeral: true });
          const liste = fiche.proprietes.map((p, i) => { const nom = typeof p === 'string' ? p : p.nom; return `${i + 1}. ${nom}`; }).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_suppr_propriete_${userId}__${messageId}`).setTitle('Supprimer une propriété');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_propriete_num').setLabel('Numéro de la propriété à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'golem') {
          if ((fiche.golems || []).length === 0) return interaction.reply({ content: '❌ Aucun golem !', ephemeral: true });
          const liste = fiche.golems.map((g, i) => `${i + 1}. ${g}`).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_suppr_golem_${userId}__${messageId}`).setTitle('Supprimer un golem');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_golem_num').setLabel('Numéro du golem à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
          return interaction.showModal(modal);
        }

        if (choice === 'champ') {
          if (!fiche.champsCustom || fiche.champsCustom.length === 0) return interaction.reply({ content: '❌ Aucun champ personnalisé !', ephemeral: true });
          const liste = fiche.champsCustom.map((c, i) => `${i + 1}. ${c.nom}`).join('\n');
          const modal = new ModalBuilder().setCustomId(`modal_suppr_champ_${userId}__${messageId}`).setTitle('Supprimer un champ personnalisé');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_champ_num').setLabel('Numéro du champ à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
          return interaction.showModal(modal);
        }
      }
    }

    // ─────────────────── BOUTONS ───────────────────
    if (interaction.isButton()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces boutons.', ephemeral: true });
      }
      const id = interaction.customId;

      // Navigation circulaire
      if (id.startsWith('nav_prev_') || id.startsWith('nav_next_')) {
        const parts = id.split('_');
        const direction = parts[1];
        const currentIndex = parseInt(parts[2]);
        const fiches = await getAllFiches();
        const userIds = Object.keys(fiches);
        const total = userIds.length;
        if (total === 0) return interaction.deferUpdate();

        let newIndex;
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % total;
        } else {
          newIndex = (currentIndex - 1 + total) % total;
        }

        const userId = userIds[newIndex];
        const fiche = fiches[userId];
        let targetUser;
        try { targetUser = await interaction.client.users.fetch(userId); }
        catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }
        const embed = buildFicheEmbed(fiche, targetUser);
        embed.setFooter({ text: `Fiche ${newIndex + 1} / ${total}` });
        const ficheButtons = buildFicheButtons(userId);
        const navButtons = buildNavigationButtons(newIndex, total, userId);
        return interaction.update({ embeds: [embed], components: [...ficheButtons, navButtons] });
      }

      // Ouvrir le select menu "Ajouter"
      if (id.startsWith('btn_menu_ajouter_')) {
        const userId = id.replace('btn_menu_ajouter_', '');
        const selectRow = buildSelectMenuAjouter(userId);
        return interaction.reply({ content: '📋 Que voulez-vous ajouter ?', components: [selectRow], ephemeral: true });
      }

      // Ouvrir le select menu "Supprimer"
      if (id.startsWith('btn_menu_supprimer_')) {
        const userId = id.replace('btn_menu_supprimer_', '');
        const selectRow = buildSelectMenuSupprimer(userId);
        return interaction.reply({ content: '🗑️ Que voulez-vous supprimer ?', components: [selectRow], ephemeral: true });
      }

      // Transférer entre inventaires
      if (id.startsWith('btn_transferer_')) {
        const userId = id.replace('btn_transferer_', '');
        const messageId = interaction.message.id;
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const invStr = (fiche.inventaire || []).length > 0
          ? fiche.inventaire.map((o, i) => `${i + 1}. ${o.nom}`).join('\n')
          : '(vide)';
        const invGolemStr = (fiche.inventaireGolems || []).length > 0
          ? fiche.inventaireGolems.map((o, i) => `${i + 1}. ${o.nom}`).join('\n')
          : '(vide)';
        const modal = new ModalBuilder().setCustomId(`modal_transferer_${userId}__${messageId}`).setTitle('Transférer un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('transferer_source').setLabel('Source : "inv" ou "golem"').setStyle(TextInputStyle.Short).setPlaceholder('inv').setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('transferer_num').setLabel('Numéro de l\'objet à transférer').setStyle(TextInputStyle.Short).setPlaceholder(`Inv: ${invStr.substring(0, 40)}`).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('transferer_dest').setLabel('Destination : "inv" ou "golem"').setStyle(TextInputStyle.Short).setPlaceholder('golem').setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // Vies +1
      if (id.startsWith('btn_vie_plus_')) {
        const userId = id.replace('btn_vie_plus_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        if ((fiche.vies ?? MAX_VIES) >= MAX_VIES) return interaction.reply({ content: `❤️ Vies déjà au maximum (${MAX_VIES}/${MAX_VIES}) !`, ephemeral: true });
        fiche.vies = Math.min(MAX_VIES, (fiche.vies ?? MAX_VIES) + 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, true);
      }

      // Vies -1
      if (id.startsWith('btn_vie_moins_')) {
        const userId = id.replace('btn_vie_moins_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const viesActuelles = fiche.vies ?? MAX_VIES;
        if (viesActuelles <= 0) return interaction.reply({ content: '💀 Le personnage est déjà à 0 vie !', ephemeral: true });

        fiche.vies = viesActuelles - 1;

        if (fiche.vies === 0) {
          await setFiche(userId, fiche);
          // Mettre à jour l'affichage d'abord
          await updateMessage(interaction, userId, true);
          // Puis demander confirmation pour supprimer
          const { ActionRowBuilder: ARB, ButtonBuilder: BB, ButtonStyle: BS } = require('discord.js');
          const confirmRow = new ARB().addComponents(
            new BB().setCustomId(`btn_confirmer_mort_${userId}`).setLabel('⚰️ Oui, supprimer la fiche').setStyle(BS.Danger),
            new BB().setCustomId(`btn_annuler_mort_${userId}`).setLabel('❌ Non, garder la fiche').setStyle(BS.Secondary),
          );
          return interaction.followUp({ content: `💀 **Le personnage <@${userId}> est à 0 vie !** Voulez-vous supprimer sa fiche ?`, components: [confirmRow], ephemeral: true });
        }

        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, true);
      }

      // Confirmation mort - supprimer fiche
      if (id.startsWith('btn_confirmer_mort_')) {
        const userId = id.replace('btn_confirmer_mort_', '');
        await deleteFiche(userId);
        return interaction.update({ content: `⚰️ La fiche du personnage <@${userId}> a été supprimée.`, components: [] });
      }

      // Annuler mort
      if (id.startsWith('btn_annuler_mort_')) {
        return interaction.update({ content: '✅ La fiche a été conservée.', components: [] });
      }

      // Argent ajouter/retirer (via anciens customIds depuis select menu)
      const messageId = interaction.message.id;

      if (id.startsWith('argent_ajouter_') || id.startsWith('argent_retirer_')) {
        const action = id.startsWith('argent_ajouter_') ? 'ajouter' : 'retirer';
        const userId = id.replace(`argent_${action}_`, '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_argent_${action}_${userId}__${messageId}`)
          .setTitle(action === 'ajouter' ? '➕ Ajouter de l\'argent' : '➖ Retirer de l\'argent');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('argent_montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)
        ));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_revenu_')) {
        const userId = id.replace('btn_revenu_', '');
        const fiche = await getFiche(userId);
        const modal = new ModalBuilder().setCustomId(`modal_revenu_${userId}__${messageId}`).setTitle('Revenu journalier');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('revenu_input').setLabel('Revenu par jour (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder(String(fiche?.revenu || 0)).setRequired(true)));
        return interaction.showModal(modal);
      }
    }

    // ─────────────────── MODAL SUBMIT ───────────────────
    if (interaction.isModalSubmit()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces actions.', ephemeral: true });
      }
      const id = interaction.customId;

      const sepIdx = id.lastIndexOf('__');
      const messageId = sepIdx !== -1 ? id.slice(sepIdx + 2) : null;
      const baseId = sepIdx !== -1 ? id.slice(0, sepIdx) : id;

      if (baseId.startsWith('modal_argent_')) {
        const parts = baseId.replace('modal_argent_', '').split('_');
        const action = parts[0];
        const userId = parts.slice(1).join('_');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const montant = parseInt(interaction.fields.getTextInputValue('argent_montant').trim());
        if (isNaN(montant) || montant <= 0) return interaction.reply({ content: '❌ Montant invalide !', ephemeral: true });
        fiche.argent = action === 'ajouter' ? fiche.argent + montant : Math.max(0, fiche.argent - montant);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_objet_propriete_')) {
        const userId = baseId.replace('modal_objet_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const propNum = parseInt(interaction.fields.getTextInputValue('prop_num')) - 1;
        if (isNaN(propNum) || propNum < 0 || propNum >= fiche.proprietes.length) return interaction.reply({ content: '❌ Numéro de propriété invalide !', ephemeral: true });
        const objetNom = interaction.fields.getTextInputValue('prop_objet_nom').trim();
        if (typeof fiche.proprietes[propNum] === 'string') {
          fiche.proprietes[propNum] = { nom: fiche.proprietes[propNum], objets: [] };
        }
        if (!fiche.proprietes[propNum].objets) fiche.proprietes[propNum].objets = [];
        fiche.proprietes[propNum].objets.push(objetNom);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // Objet inventaire golem
      if (baseId.startsWith('modal_objet_golem_')) {
        const userId = baseId.replace('modal_objet_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const nom = interaction.fields.getTextInputValue('objet_nom');
        const niveauRaw = interaction.fields.getTextInputValue('objet_niveau').trim();
        const niveau = niveauRaw !== '' ? parseInt(niveauRaw) : null;
        if (niveauRaw !== '' && (isNaN(niveau) || niveau < 1)) return interaction.reply({ content: '❌ Niveau invalide !', ephemeral: true });
        if (!fiche.inventaireGolems) fiche.inventaireGolems = [];
        fiche.inventaireGolems.push({ nom, niveau });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_objet_')) {
        const userId = baseId.replace('modal_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const nom = interaction.fields.getTextInputValue('objet_nom');
        const niveauRaw = interaction.fields.getTextInputValue('objet_niveau').trim();
        const niveau = niveauRaw !== '' ? parseInt(niveauRaw) : null;
        if (niveauRaw !== '' && (isNaN(niveau) || niveau < 1)) return interaction.reply({ content: '❌ Niveau invalide !', ephemeral: true });
        fiche.inventaire.push({ nom, niveau });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_golem_')) {
        const userId = baseId.replace('modal_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.golems.push(interaction.fields.getTextInputValue('golem_input'));
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_propriete_')) {
        const userId = baseId.replace('modal_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.proprietes.push({ nom: interaction.fields.getTextInputValue('propriete_input'), objets: [] });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

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

      if (baseId.startsWith('modal_champ_')) {
        const userId = baseId.replace('modal_champ_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        if (!fiche.champsCustom) fiche.champsCustom = [];
        fiche.champsCustom.push({ nom: interaction.fields.getTextInputValue('champ_nom'), valeur: interaction.fields.getTextInputValue('champ_valeur') || '' });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_suppr_objet_propriete_')) {
        const userId = baseId.replace('modal_suppr_objet_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const propNum = parseInt(interaction.fields.getTextInputValue('prop_num')) - 1;
        if (isNaN(propNum) || propNum < 0 || propNum >= fiche.proprietes.length) return interaction.reply({ content: '❌ Numéro de propriété invalide !', ephemeral: true });
        const prop = fiche.proprietes[propNum];
        if (typeof prop === 'string' || !prop.objets || prop.objets.length === 0) return interaction.reply({ content: '❌ Cette propriété n\'a aucun objet !', ephemeral: true });
        const objNum = parseInt(interaction.fields.getTextInputValue('prop_objet_num')) - 1;
        if (isNaN(objNum) || objNum < 0 || objNum >= prop.objets.length) return interaction.reply({ content: '❌ Numéro d\'objet invalide !', ephemeral: true });
        fiche.proprietes[propNum].objets.splice(objNum, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // Supprimer objet inventaire golem
      if (baseId.startsWith('modal_suppr_objet_golem_')) {
        const userId = baseId.replace('modal_suppr_objet_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        if (!fiche.inventaireGolems) fiche.inventaireGolems = [];
        const num = parseInt(interaction.fields.getTextInputValue('suppr_objet_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.inventaireGolems.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.inventaireGolems.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_suppr_objet_')) {
        const userId = baseId.replace('modal_suppr_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_objet_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.inventaire.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.inventaire.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_suppr_propriete_')) {
        const userId = baseId.replace('modal_suppr_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_propriete_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.proprietes.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.proprietes.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_suppr_golem_')) {
        const userId = baseId.replace('modal_suppr_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_golem_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.golems.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.golems.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      if (baseId.startsWith('modal_suppr_champ_')) {
        const userId = baseId.replace('modal_suppr_champ_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_champ_num')) - 1;
        if (!fiche.champsCustom || isNaN(num) || num < 0 || num >= fiche.champsCustom.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.champsCustom.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }

      // Transfert entre inventaires
      if (baseId.startsWith('modal_transferer_')) {
        const userId = baseId.replace('modal_transferer_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const source = interaction.fields.getTextInputValue('transferer_source').trim().toLowerCase();
        const dest = interaction.fields.getTextInputValue('transferer_dest').trim().toLowerCase();
        const numRaw = interaction.fields.getTextInputValue('transferer_num').trim();
        const num = parseInt(numRaw) - 1;

        if (!['inv', 'golem'].includes(source)) return interaction.reply({ content: '❌ Source invalide ! Utilisez "inv" ou "golem".', ephemeral: true });
        if (!['inv', 'golem'].includes(dest)) return interaction.reply({ content: '❌ Destination invalide ! Utilisez "inv" ou "golem".', ephemeral: true });
        if (source === dest) return interaction.reply({ content: '❌ La source et la destination doivent être différentes !', ephemeral: true });

        const srcArray = source === 'inv' ? (fiche.inventaire || []) : (fiche.inventaireGolems || []);
        if (isNaN(num) || num < 0 || num >= srcArray.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });

        const objet = srcArray.splice(num, 1)[0];
        if (source === 'inv') {
          fiche.inventaire = srcArray;
          if (!fiche.inventaireGolems) fiche.inventaireGolems = [];
          fiche.inventaireGolems.push(objet);
        } else {
          fiche.inventaireGolems = srcArray;
          if (!fiche.inventaire) fiche.inventaire = [];
          fiche.inventaire.push(objet);
        }

        await setFiche(userId, fiche);
        return updateMessage(interaction, userId, false, messageId);
      }
    }
  }
};

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
    console.error('Erreur lors de l\'édition du message:', e);
    await interaction.followUp({ content: '✅ Mis à jour (impossible d\'éditer le message) !', ephemeral: true });
  }
}
