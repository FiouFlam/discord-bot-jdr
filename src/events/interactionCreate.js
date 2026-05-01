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

      // Navigation prev/next
      if (id.startsWith('nav_prev_') || id.startsWith('nav_next_')) {
        const parts = id.split('_');
        const direction = parts[1]; // prev ou next
        const currentIndex = parseInt(parts[2]);
        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        const fiches = getAllFiches();
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

      // btn_objet_USERID
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
              .setLabel('Niveau de l\'objet (ex: 1, 2, 3...)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('1')
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // btn_golem_USERID
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

      // btn_propriete_USERID
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

      // btn_argent_USERID
      if (id.startsWith('btn_argent_')) {
        const userId = id.replace('btn_argent_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_argent_${userId}`)
          .setTitle('Modifier l\'argent');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('argent_action')
              .setLabel('+ pour ajouter, - pour retirer (ex: +500 ou -200)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('+500')
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // btn_revenu_USERID
      if (id.startsWith('btn_revenu_')) {
        const userId = id.replace('btn_revenu_', '');
        const fiche = getFiche(userId);
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

      // btn_champ_USERID
      if (id.startsWith('btn_champ_')) {
        const userId = id.replace('btn_champ_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_champ_${userId}`)
          .setTitle('Ajouter un champ personnalisé');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('champ_nom')
              .setLabel('Nom du champ (ex: Inventaire de la maison)')
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
    }

    // ── Modals ──────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      async function refreshFiche(userId, interaction, isUpdate = false) {
        const fiche = getFiche(userId);
        let targetUser;
        try { targetUser = await interaction.client.users.fetch(userId); }
        catch { targetUser = { username: 'Joueur inconnu', displayAvatarURL: () => null }; }

        const embed = buildFicheEmbed(fiche, targetUser);
        const buttons = buildFicheButtons(userId);

        if (isUpdate) {
          return interaction.update({ embeds: [embed], components: buttons });
        }
        return interaction.reply({ embeds: [embed], components: buttons });
      }

      // modal_objet_USERID
      if (id.startsWith('modal_objet_')) {
        const userId = id.replace('modal_objet_', '');
        const fiche = getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const nom = interaction.fields.getTextInputValue('objet_nom');
        const niveauRaw = interaction.fields.getTextInputValue('objet_niveau');
        const niveau = parseInt(niveauRaw);
        if (isNaN(niveau) || niveau < 1) {
          return interaction.reply({ content: '❌ Niveau invalide ! Entre un nombre supérieur à 0.', ephemeral: true });
        }

        fiche.inventaire.push({ nom, niveau });
        setFiche(userId, fiche);
        return refreshFiche(userId, interaction);
      }

      // modal_golem_USERID
      if (id.startsWith('modal_golem_')) {
        const userId = id.replace('modal_golem_', '');
        const fiche = getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const nom = interaction.fields.getTextInputValue('golem_input');
        fiche.golems.push(nom);
        setFiche(userId, fiche);
        return refreshFiche(userId, interaction);
      }

      // modal_propriete_USERID
      if (id.startsWith('modal_propriete_')) {
        const userId = id.replace('modal_propriete_', '');
        const fiche = getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const nom = interaction.fields.getTextInputValue('propriete_input');
        fiche.proprietes.push(nom);
        setFiche(userId, fiche);
        return refreshFiche(userId, interaction);
      }

      // modal_argent_USERID
      if (id.startsWith('modal_argent_')) {
        const userId = id.replace('modal_argent_', '');
        const fiche = getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const input = interaction.fields.getTextInputValue('argent_action').trim();
        const match = input.match(/^([+-]?)(\d+)$/);
        if (!match) {
          return interaction.reply({ content: '❌ Format invalide ! Ex: `+500` ou `-200` ou `500`', ephemeral: true });
        }

        const sign = match[1] === '-' ? -1 : 1;
        const amount = parseInt(match[2]);
        fiche.argent = Math.max(0, fiche.argent + sign * amount);
        setFiche(userId, fiche);
        return refreshFiche(userId, interaction);
      }

      // modal_revenu_USERID
      if (id.startsWith('modal_revenu_')) {
        const userId = id.replace('modal_revenu_', '');
        const fiche = getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const val = parseInt(interaction.fields.getTextInputValue('revenu_input'));
        if (isNaN(val) || val < 0) {
          return interaction.reply({ content: '❌ Valeur invalide !', ephemeral: true });
        }

        fiche.revenu = val;
        setFiche(userId, fiche);
        return refreshFiche(userId, interaction);
      }

      // modal_champ_USERID
      if (id.startsWith('modal_champ_')) {
        const userId = id.replace('modal_champ_', '');
        const fiche = getFiche(userId);
        if (!fiche) return interaction.reply({ content: '❌ Fiche introuvable.', ephemeral: true });

        const nom = interaction.fields.getTextInputValue('champ_nom');
        const valeur = interaction.fields.getTextInputValue('champ_valeur') || '';

        if (!fiche.champsCustom) fiche.champsCustom = [];
        fiche.champsCustom.push({ nom, valeur });
        setFiche(userId, fiche);
        return refreshFiche(userId, interaction);
      }
    }
  }
};
