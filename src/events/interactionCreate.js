// src/events/interactionCreate.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getFiche, setFiche, getAllFiches } = require('../utils/database');
const {
  buildFicheEmbed,
  buildFicheButtons,
  buildGolemActionMenu,
  buildPropActionMenu,
  buildNavigationButtons
} = require('../utils/ficheBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // Slash Commands
    if (interaction.isChatInputCommand()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Administrateur uniquement.', ephemeral: true });
      }
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Administrateur uniquement.', ephemeral: true });
      }

      const customId = interaction.customId;
      const userId = customId.split('_').pop();

      // Golem & Propriété
      if (customId.startsWith('btn_golem_')) {
        return interaction.reply({ components: [buildGolemActionMenu(userId)], ephemeral: true });
      }
      if (customId.startsWith('btn_prop_')) {
        return interaction.reply({ components: [buildPropActionMenu(userId)], ephemeral: true });
      }

      // Navigation, HP, Refresh, etc. → garde ton ancien code ici si tu veux
      if (customId.startsWith('btn_hp_plus_') || customId.startsWith('btn_hp_minus_') || 
          customId.startsWith('btn_refresh_') || customId.startsWith('nav_')) {
        // Ton ancien code pour ces boutons...
        return;
      }

      // Transfert Argent
      if (customId.startsWith('btn_transfert_argent_')) {
        const modal = new ModalBuilder()
          .setCustomId(`modal_transfert_argent_${userId}`)
          .setTitle('💳 Transférer Argent');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('cible').setLabel('Pseudo ou ID').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('montant').setLabel('Montant en kyp').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // Select Menus
    if (interaction.isStringSelectMenu()) {
      if (!interaction.memberPermissions?.has('Administrator')) return;
      const value = interaction.values[0];
      const userId = interaction.customId.split('_').pop();

      if (interaction.customId.startsWith('select_golem_action_')) {
        const modal = value === 'add' ? createAddGolemModal(userId) : createDelGolemModal(userId);
        return interaction.showModal(modal);
      }
      if (interaction.customId.startsWith('select_prop_action_')) {
        const modal = value === 'add' ? createAddPropModal(userId) : createDelPropModal(userId);
        return interaction.showModal(modal);
      }
    }

    // Modals
    if (interaction.isModalSubmit()) {
      if (!interaction.memberPermissions?.has('Administrator')) return;

      const customId = interaction.customId;

      // Transfert Argent (sans ID obligatoire)
      if (customId.startsWith('modal_transfert_argent_')) {
        const cibleInput = interaction.fields.getTextInputValue('cible').trim();
        const montant = parseInt(interaction.fields.getTextInputValue('montant'));

        const sourceFiche = await getFiche(customId.split('_').pop());
        if (!sourceFiche || (sourceFiche.argent ?? 0) < montant) {
          return interaction.reply({ content: '❌ Fonds insuffisants.', ephemeral: true });
        }

        const targetFiche = await findFicheByNameOrId(cibleInput, client);
        if (!targetFiche) {
          return interaction.reply({ content: '❌ Joueur cible introuvable.', ephemeral: true });
        }

        sourceFiche.argent = (sourceFiche.argent ?? 0) - montant;
        targetFiche.argent = (targetFiche.argent ?? 0) + montant;

        await setFiche(customId.split('_').pop(), sourceFiche);
        await setFiche(targetFiche.userId, targetFiche);

        await updateFicheMessage(interaction, customId.split('_').pop());
        return interaction.followUp({ content: '✅ Transfert effectué !', ephemeral: true });
      }
    }
  }
};

// ====================== HELPERS ======================
async function findFicheByNameOrId(input, client) {
  const allFiches = await getAllFiches();
  
  // Par ID direct
  if (allFiches[input]) return { ...allFiches[input], userId: input };

  // Par pseudo
  for (const [id, fiche] of Object.entries(allFiches)) {
    try {
      const user = await client.users.fetch(id);
      if (user && user.username.toLowerCase() === input.toLowerCase()) {
        return { ...fiche, userId: id };
      }
    } catch (e) {}
  }
  return null;
}

async function updateFicheMessage(interaction, userId) {
  const fiche = await getFiche(userId);
  let user = { username: 'Joueur' };
  try { user = await interaction.client.users.fetch(userId); } catch {}

  const embed = buildFicheEmbed(fiche, user);
  const components = buildFicheButtons(userId);

  if (interaction.message) {
    await interaction.update({ embeds: [embed], components });
  }
}

// Modals Golem & Propriété
function createAddGolemModal(userId) {
  const modal = new ModalBuilder().setCustomId(`modal_add_golem_${userId}`).setTitle('🪨 Ajouter Golem');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('nom').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  return modal;
}

function createDelGolemModal(userId) {
  const modal = new ModalBuilder().setCustomId(`modal_del_golem_${userId}`).setTitle('🪨 Supprimer Golem');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('numero').setLabel('Numéro (ex: 1)').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  return modal;
}

function createAddPropModal(userId) {
  const modal = new ModalBuilder().setCustomId(`modal_add_prop_${userId}`).setTitle('🏡 Ajouter Propriété');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('nom').setLabel('Nom de la propriété').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  return modal;
}

function createDelPropModal(userId) {
  const modal = new ModalBuilder().setCustomId(`modal_del_prop_${userId}`).setTitle('🏡 Supprimer Propriété');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('numero').setLabel('Numéro (ex: 1)').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  return modal;
}
