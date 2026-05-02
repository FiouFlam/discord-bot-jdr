const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getFiche, setFiche, getAllFiches } = require('../utils/database');
const { buildFicheEmbed, buildFicheButtons, buildNavigationButtons } = require('../utils/ficheBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash Commands ──────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
        interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
      }
      return;
    }

    // ── Buttons ─────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // ── Navigation ──
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

      // ── Refresh ──
      if (id.startsWith('btn_refresh_')) {
        const userId = id.replace('btn_refresh_', '');
        return updateMessage(interaction, userId, true);
      }

      // ── Argent : ajouter ou retirer directement via modal ──
      if (id.startsWith('argent_ajouter_') || id.startsWith('argent_retirer_')) {
        const action = id.startsWith('argent_ajouter_') ? 'ajouter' : 'retirer';
        const userId = id.replace(`argent_${action}_`, '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_argent_${action}_${userId}`)
          .setTitle(action === 'ajouter' ? '➕ Ajouter de l\'argent' : '➖ Retirer de l\'argent');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('argent_montant')
              .setLabel('Montant (en kyp)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('500')
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Objet ──
      if (id.startsWith('btn_objet_')) {
        const userId = id.replace('btn_objet_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_objet_${userId}`)
          .setTitle('Ajouter un objet');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('objet_nom')
              .setLabel('Nom de l\'objet')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('objet_niveau')
              .setLabel('Niveau de l\'objet (optionnel)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('ex: 1')
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Golem ──
      if (id.startsWith('btn_golem_')) {
        const userId = id.replace('btn_golem_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_golem_${userId}`)
          .setTitle('Ajouter un golem');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('golem_input')
              .setLabel('Nom du golem')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Propriété ──
      if (id.startsWith('btn_propriete_')) {
        const userId = id.replace('btn_propriete_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_propriete_${userId}`)
          .setTitle('Ajouter une propriété');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('propriete_input')
              .setLabel('Nom de la propriété')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Revenu ──
      if (id.startsWith('btn_revenu_')) {
        const userId = id.replace('btn_revenu_', '');
        const fiche = await getFiche(userId);
        const modal = new ModalBuilder()
          .setCustomId(`modal_revenu_${userId}`)
          .setTitle('Revenu journalier');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('revenu_input')
              .setLabel('Revenu par jour (en kyp)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder(String(fiche?.revenu || 0))
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Champ custom ──
      if (id.startsWith('btn_champ_')) {
        const userId = id.replace('btn_champ_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_champ_${userId}`)
          .setTitle('Ajouter un champ personnalisé');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('champ_nom')
              .setLabel('Nom du champ')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('champ_valeur')
              .setLabel('Contenu initial (optionnel)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Supprimer objet ──
      if (id.startsWith('btn_suppr_objet_')) {
        const userId = id.replace('btn_suppr_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche || fiche.inventaire.length === 0) {
          return interaction.reply({ content: '❌ L\'inventaire est vide !', ephemeral: true });
        }
        const modal = new ModalBuilder()
          .setCustomId(`modal_suppr_objet_${userId}`)
          .setTitle('Supprimer un objet');
        const liste = fiche.inventaire.map((o, i) => {
          const niv = o.niveau != null ? ` (niv.${o.niveau})` : '';
          return `${i + 1}. ${o.nom}${niv}`;
        }).join('\n');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('suppr_objet_num')
              .setLabel('Numéro de l\'objet à supprimer')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder(liste.substring(0, 100))
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Supprimer propriété ──
      if (id.startsWith('btn_suppr_propriete_')) {
        const userId = id.replace('btn_suppr_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche || fiche.proprietes.length === 0) {
          return interaction.reply({ content: '❌ Aucune propriété !', ephemeral: true });
        }
        const modal = new ModalBuilder()
          .setCustomId(`modal_suppr_propriete_${userId}`)
          .setTitle('Supprimer une propriété');
        const liste = fiche.proprietes.map((p, i) => `${i + 1}. ${p}`).join('\n');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('suppr_propriete_num')
              .setLabel('Numéro de la propriété à supprimer')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder(liste.substring(0, 100))
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ── Supprimer golem ──
      if (id.startsWith('btn_suppr_golem_')) {
        const userId = id.replace('btn_suppr_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche || fiche.golems.length === 0) {
          return interaction.reply({ content: '❌ Aucun golem !', ephemeral: true });
        }
        const modal = new ModalBuilder()
          .setCustomId(`modal_suppr_golem_${userId}`)
          .setTitle('Supprimer un golem');
        const liste = fiche.golems.map((g, i) => `${i + 1}. ${g}`).join('\n');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('suppr_golem_num')
              .setLabel('Numéro du golem à supprimer')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder(liste.substring(0, 100))
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // ── Modals ──────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      // Argent ajouter/retirer
      if (id.startsWith('modal_argent_')) {
        const parts = id.replace('modal_argent_', '').split('_');
        const action = parts[0]; // ajouter ou retirer
        const userId = parts.slice(1).join('_');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const montantRaw = interaction.fields.getTextInputValue('argent_montant').trim();
        const montant = parseInt(montantRaw);
        if (isNaN(montant) || montant <= 0) {
          return interaction.reply({ content: '❌ Montant invalide ! Entre un nombre positif.', ephemeral: true });
        }

        if (action === 'ajouter') {
          fiche.argent += montant;
        } else {
          fiche.argent = Math.max(0, fiche.argent - montant);
        }
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Objet
      if (id.startsWith('modal_objet_')) {
        const userId = id.replace('modal_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const nom = interaction.fields.getTextInputValue('objet_nom');
        const niveauRaw = interaction.fields.getTextInputValue('objet_niveau').trim();
        const niveau = niveauRaw !== '' ? parseInt(niveauRaw) : null;

        if (niveauRaw !== '' && (isNaN(niveau) || niveau < 1)) {
          return interaction.reply({ content: '❌ Niveau invalide ! Laisse vide ou entre un nombre ≥ 1.', ephemeral: true });
        }

        fiche.inventaire.push({ nom, niveau });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Golem
      if (id.startsWith('modal_golem_')) {
        const userId = id.replace('modal_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.golems.push(interaction.fields.getTextInputValue('golem_input'));
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Propriété
      if (id.startsWith('modal_propriete_')) {
        const userId = id.replace('modal_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        fiche.proprietes.push(interaction.fields.getTextInputValue('propriete_input'));
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Revenu
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

      // Champ custom
      if (id.startsWith('modal_champ_')) {
        const userId = id.replace('modal_champ_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        if (!fiche.champsCustom) fiche.champsCustom = [];
        fiche.champsCustom.push({
          nom: interaction.fields.getTextInputValue('champ_nom'),
          valeur: interaction.fields.getTextInputValue('champ_valeur') || ''
        });
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Supprimer objet
      if (id.startsWith('modal_suppr_objet_')) {
        const userId = id.replace('modal_suppr_objet_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_objet_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.inventaire.length) {
          return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        }
        fiche.inventaire.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Supprimer propriété
      if (id.startsWith('modal_suppr_propriete_')) {
        const userId = id.replace('modal_suppr_propriete_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_propriete_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.proprietes.length) {
          return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        }
        fiche.proprietes.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }

      // Supprimer golem
      if (id.startsWith('modal_suppr_golem_')) {
        const userId = id.replace('modal_suppr_golem_', '');
        const fiche = await getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });
        const num = parseInt(interaction.fields.getTextInputValue('suppr_golem_num')) - 1;
        if (isNaN(num) || num < 0 || num >= fiche.golems.length) {
          return interaction.reply({ content: '❌ Numéro invalide !', ephemeral: true });
        }
        fiche.golems.splice(num, 1);
        await setFiche(userId, fiche);
        return updateMessage(interaction, userId);
      }
    }
  }
};

// Édite le message d'origine silencieusement (sans message de confirmation)
// isButton=true : utilise interaction.update() — pour les boutons directs (refresh)
// isButton=false : utilise msg.edit() + deferUpdate() — pour les modals
async function updateMessage(interaction, userId, isButton = false) {
  const fiche = await getFiche(userId);
  let targetUser;
  try { targetUser = await interaction.client.users.fetch(userId); }
  catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }

  const embed = buildFicheEmbed(fiche, targetUser);
  const buttons = buildFicheButtons(userId);

  // Garde les boutons de navigation si présents
  const msg = interaction.message;
  let components = [...buttons];
  if (msg && msg.components.length > buttons.length) {
    const lastRow = msg.components[msg.components.length - 1];
    if (lastRow) {
      const { ActionRowBuilder } = require('discord.js');
      components.push(lastRow);
    }
  }

  if (isButton) {
    // Bouton direct (refresh) → update() répond directement
    return interaction.update({ embeds: [embed], components });
  }

  // Modal → on édite le message parent + deferUpdate pour acquitter l'interaction
  try {
    await msg.edit({ embeds: [embed], components });
    await interaction.deferUpdate();
  } catch (e) {
    console.error(e);
    await interaction.reply({ content: '✅ Mis à jour !', ephemeral: true });
  }
}
