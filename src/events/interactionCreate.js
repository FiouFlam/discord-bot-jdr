const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getFiche, setFiche, getAllFiches } = require('../utils/database');
const { buildFicheEmbed, buildFicheButtons, buildNavigationButtons } = require('../utils/ficheBuilder');

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

    if (interaction.isButton()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces boutons.', ephemeral: true });
      }
      const id = interaction.customId;

      if (id.startsWith('nav_prev_') || id.startsWith('nav_next_')) {
        const parts = id.split('_');
        const direction = parts[1];
        const currentIndex = parseInt(parts[2]);
        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        const fiches = await getAllFiches();
        const userIds = Object.keys(fiches);
        if (newIndex < 0 || newIndex >= userIds.length) return interaction.deferUpdate();
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

      if (id.startsWith('btn_refresh_')) {
        const userId = id.replace('btn_refresh_', '');
        return updateMessage(interaction, userId, true);
      }

      if (id.startsWith('argent_ajouter_') || id.startsWith('argent_retirer_')) {
        const action = id.startsWith('argent_ajouter_') ? 'ajouter' : 'retirer';
        const userId = id.replace(`argent_${action}_`, '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_argent_${action}_${userId}`)
          .setTitle(action === 'ajouter' ? '➕ Ajouter de l\'argent' : '➖ Retirer de l\'argent');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('argent_montant').setLabel('Montant (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder('500').setRequired(true)
        ));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_objet_propriete_')) {
        const userId = id.replace('btn_objet_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche || (fiche.proprietes || []).length === 0) return interaction.reply({ content: '❌ Aucune propriété ! Ajoute d\'abord une propriété.', ephemeral: true });
        const liste = fiche.proprietes.map((p, i) => {
          const nom = typeof p === 'string' ? p : p.nom;
          return `${i + 1}. ${nom}`;
        }).join('\n');
        const modal = new ModalBuilder().setCustomId(`modal_objet_propriete_${userId}`).setTitle('Ajouter un objet à une propriété');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_num').setLabel('Numéro de la propriété').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_objet_')) {
        const userId = id.replace('btn_objet_', '');
        const modal = new ModalBuilder().setCustomId(`modal_objet_${userId}`).setTitle('Ajouter un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objet_nom').setLabel('Nom de l\'objet').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('objet_niveau').setLabel('Niveau de l\'objet (optionnel)').setStyle(TextInputStyle.Short).setPlaceholder('ex: 1').setRequired(false))
        );
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_golem_')) {
        const userId = id.replace('btn_golem_', '');
        const modal = new ModalBuilder().setCustomId(`modal_golem_${userId}`).setTitle('Ajouter un golem');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('golem_input').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setRequired(true)));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_propriete_')) {
        const userId = id.replace('btn_propriete_', '');
        const modal = new ModalBuilder().setCustomId(`modal_propriete_${userId}`).setTitle('Ajouter une propriété');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('propriete_input').setLabel('Nom de la propriété').setStyle(TextInputStyle.Short).setRequired(true)));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_revenu_')) {
        const userId = id.replace('btn_revenu_', '');
        const fiche = await getFiche(userId);
        const modal = new ModalBuilder().setCustomId(`modal_revenu_${userId}`).setTitle('Revenu journalier');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('revenu_input').setLabel('Revenu par jour (en kyp)').setStyle(TextInputStyle.Short).setPlaceholder(String(fiche?.revenu || 0)).setRequired(true)));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_champ_')) {
        const userId = id.replace('btn_champ_', '');
        const modal = new ModalBuilder().setCustomId(`modal_champ_${userId}`).setTitle('Ajouter un champ personnalisé');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('champ_nom').setLabel('Nom du champ').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('champ_valeur').setLabel('Contenu initial (optionnel)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_suppr_objet_propriete_')) {
        const userId = id.replace('btn_suppr_objet_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche || (fiche.proprietes || []).length === 0) return interaction.reply({ content: '❌ Aucune propriété !', ephemeral: true });
        const liste = fiche.proprietes.map((p, i) => {
          const nom = typeof p === 'string' ? p : p.nom;
          return `${i + 1}. ${nom}`;
        }).join('\n');
        const modal = new ModalBuilder().setCustomId(`modal_suppr_objet_propriete_${userId}`).setTitle('Supprimer un objet d\'une propriété');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_num').setLabel('Numéro de la propriété').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prop_objet_num').setLabel('Numéro de l\'objet à supprimer').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_suppr_objet_')) {
        const userId = id.replace('btn_suppr_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche || fiche.inventaire.length === 0) return interaction.reply({ content: '❌ L\'inventaire est vide !', ephemeral: true });
        const liste = fiche.inventaire.map((o, i) => `${i + 1}. ${o.nom}${o.niveau != null ? ` (niv.${o.niveau})` : ''}`).join('\n');
        const modal = new ModalBuilder().setCustomId(`modal_suppr_objet_${userId}`).setTitle('Supprimer un objet');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_objet_num').setLabel('Numéro de l\'objet à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_suppr_propriete_')) {
        const userId = id.replace('btn_suppr_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche || fiche.proprietes.length === 0) return interaction.reply({ content: '❌ Aucune propriété !', ephemeral: true });
        const liste = fiche.proprietes.map((p, i) => {
          const nom = typeof p === 'string' ? p : p.nom;
          return `${i + 1}. ${nom}`;
        }).join('\n');
        const modal = new ModalBuilder().setCustomId(`modal_suppr_propriete_${userId}`).setTitle('Supprimer une propriété');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_propriete_num').setLabel('Numéro de la propriété à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
        return interaction.showModal(modal);
      }

      if (id.startsWith('btn_suppr_golem_')) {
        const userId = id.replace('btn_suppr_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche || fiche.golems.length === 0) return interaction.reply({ content: '❌ Aucun golem !', ephemeral: true });
        const liste = fiche.golems.map((g, i) => `${i + 1}. ${g}`).join('\n');
        const modal = new ModalBuilder().setCustomId(`modal_suppr_golem_${userId}`).setTitle('Supprimer un golem');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('suppr_golem_num').setLabel('Numéro du golem à supprimer').setStyle(TextInputStyle.Short).setPlaceholder(liste.substring(0, 100)).setRequired(true)));
        return interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces actions.', ephemeral: true });
      }
      const id = interaction.customId;

      if (id.startsWith('modal_argent_')) {
        const parts = id.replace('modal_argent_', '').split('_');
        const action = parts[0];
        const userId = parts.slice(1).join('_');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const montant = parseInt(interaction.fields.getTextInputValue('argent_montant').trim());
        if (isNaN(montant) || montant <= 0) return interaction.reply({ content: '❌ Montant invalide !', ephemeral: true });
        fiche.argent = action === 'ajouter' ? fiche.argent + montant : Math.max(0, fiche.argent - montant);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_objet_propriete_')) {
        const userId = id.replace('modal_objet_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const propNum = parseInt(interaction.fields.getTextInputValue('prop_num')) - 1;
        if (isNaN(propNum) || propNum < 0 || propNum >= fiche.proprietes.length) return interaction.reply({ content: '❌ Numéro de propriété invalide !', ephemeral: true });
        const objetNom = interaction.fields.getTextInputValue('prop_objet_nom').trim();
        // Migration : si la propriété est encore une string, on la convertit en objet
        if (typeof fiche.proprietes[propNum] === 'string') {
          fiche.proprietes[propNum] = { nom: fiche.proprietes[propNum], objets: [] };
        }
        if (!fiche.proprietes[propNum].objets) fiche.proprietes[propNum].objets = [];
        fiche.proprietes[propNum].objets.push(objetNom);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_objet_')) {
        const userId = id.replace('modal_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const nom = interaction.fields.getTextInputValue('objet_nom');
        const niveauRaw = interaction.fields.getTextInputValue('objet_niveau').trim();
        const niveau = niveauRaw !== '' ? parseInt(niveauRaw) : null;
        if (niveauRaw !== '' && (isNaN(niveau) || niveau < 1)) return interaction.reply({ content: '❌ Niveau invalide !', ephemeral: true });
        fiche.inventaire.push({ nom, niveau });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_golem_')) {
        const userId = id.replace('modal_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.golems.push(interaction.fields.getTextInputValue('golem_input'));
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_propriete_')) {
        const userId = id.replace('modal_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        // Nouvelle propriété stockée comme objet avec tableau d'objets
        fiche.proprietes.push({ nom: interaction.fields.getTextInputValue('propriete_input'), objets: [] });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_revenu_')) {
        const userId = id.replace('modal_revenu_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const val = parseInt(interaction.fields.getTextInputValue('revenu_input'));
        if (isNaN(val) || val < 0) return interaction.reply({ content: '❌ Valeur invalide !', ephemeral: true });
        fiche.revenu = val;
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_champ_')) {
        const userId = id.replace('modal_champ_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        if (!fiche.champsCustom) fiche.champsCustom = [];
        fiche.champsCustom.push({ nom: interaction.fields.getTextInputValue('champ_nom'), valeur: interaction.fields.getTextInputValue('champ_valeur') || '' });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_suppr_objet_propriete_')) {
        const userId = id.replace('modal_suppr_objet_propriete_', '');
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
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_suppr_objet_')) {
        const userId = id.replace('modal_suppr_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_objet_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.inventaire.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.inventaire.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_suppr_propriete_')) {
        const userId = id.replace('modal_suppr_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_propriete_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.proprietes.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.proprietes.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      if (id.startsWith('modal_suppr_golem_')) {
        const userId = id.replace('modal_suppr_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_golem_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.golems.length) return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        fiche.golems.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }
    }
  }
};

async function updateMessage(interaction, userId, isButton = false) {
  const fiche = await getFiche(userId);
  let targetUser;
  try { targetUser = await interaction.client.users.fetch(userId); }
  catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }
  const embed = buildFicheEmbed(fiche, targetUser);
  const buttons = buildFicheButtons(userId);
  const msg = interaction.message;
  let components = [...buttons];
  if (msg && msg.components.length > buttons.length) {
    components.push(msg.components[msg.components.length - 1]);
  }
  if (isButton) return interaction.update({ embeds: [embed], components });
  try {
    await msg.edit({ embeds: [embed], components });
    await interaction.deferUpdate();
  } catch (e) {
    console.error(e);
    await interaction.reply({ content: '✅ Mis à jour !', ephemeral: true });
  }
}
