const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getFiche, setFiche, getAllFiches } = require('../utils/database');
const {
  buildFicheEmbed,
  buildFicheButtons,
  buildGolemActionMenu,
  buildPropActionMenu,
  buildNavigationButtons,
  getInventoryListLabels,
  resolveInventoryByLabel,
  addToInventory,
  removeFromInventoryByIndex,
} = require('../utils/ficheBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    if (interaction.isChatInputCommand()) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Seuls les administrateurs peuvent utiliser ces commandes.', ephemeral: true });
      }
      // ... ton code slash command existant
    }

    // ====================== BUTTONS ======================
    if (interaction.isButton()) {
      if (!interaction.memberPermissions?.has('Administrator')) return;

      const id = interaction.customId;
      const userId = id.split('_').pop();

      // Golem & Propriété
      if (id.startsWith('btn_golem_')) {
        return interaction.reply({ components: [buildGolemActionMenu(userId)], ephemeral: true });
      }
      if (id.startsWith('btn_prop_')) {
        return interaction.reply({ components: [buildPropActionMenu(userId)], ephemeral: true });
      }

      // Navigation, HP, Argent, etc. (je garde le reste de ton code original ici)
      // ... (le code pour nav_prev, hp, refresh, ajouter, supprimer, etc. reste le même)

      // Bouton Transfert Argent
      if (id.startsWith('btn_transfert_argent_')) {
        const modal = new ModalBuilder()
          .setCustomId(`modal_transfert_argent_${userId}`)
          .setTitle('💳 Transférer de l\'argent');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('cible').setLabel('Pseudo ou ID du destinataire').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('montant').setLabel('Montant (kyp)').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // ====================== SELECT MENUS ======================
    if (interaction.isStringSelectMenu()) {
      if (!interaction.memberPermissions?.has('Administrator')) return;
      const value = interaction.values[0];
      const userId = interaction.customId.split('_').pop();

      if (interaction.customId.startsWith('select_golem_action_')) {
        const modal = value === 'add' 
          ? createAddGolemModal(userId) 
          : createDelGolemModal(userId);
        return interaction.showModal(modal);
      }
      if (interaction.customId.startsWith('select_prop_action_')) {
        const modal = value === 'add' 
          ? createAddPropModal(userId) 
          : createDelPropModal(userId);
        return interaction.showModal(modal);
      }
    }

    // ====================== MODALS ======================
    if (interaction.isModalSubmit()) {
      if (!interaction.memberPermissions?.has('Administrator')) return;

      const customId = interaction.customId;
      const userId = customId.split('_').pop().split('__')[0]; // sécurité

      // Transfert d'argent (sans besoin d'ID exact)
      if (customId.startsWith('modal_transfert_argent_')) {
        const cibleInput = interaction.fields.getTextInputValue('cible').trim();
        const montant = parseInt(interaction.fields.getTextInputValue('montant'));

        const ficheSource = await getFiche(userId);
        if (!ficheSource || (ficheSource.argent ?? 0) < montant) {
          return interaction.reply({ content: '❌ Fonds insuffisants ou fiche introuvable.', ephemeral: true });
        }

        const cibleFiche = await findFicheByNameOrId(cibleInput);
        if (!cibleFiche) {
          return interaction.reply({ content: '❌ Joueur cible introuvable.', ephemeral: true });
        }

        ficheSource.argent = (ficheSource.argent ?? 0) - montant;
        cibleFiche.argent = (cibleFiche.argent ?? 0) + montant;

        await setFiche(userId, ficheSource);
        await setFiche(cibleFiche.userId, cibleFiche);

        return updateMessage(interaction, userId);
      }

      // Autres modals (ajouter, supprimer, etc.) restent inchangés...
      // Tu peux garder ton ancien code pour les autres modals.
    }
  }
};

// ====================== HELPERS ======================
async function findFicheByNameOrId(input) {
  const all = await getAllFiches();
  // Par ID
  if (all[input]) return { ...all[input], userId: input };

  // Par username (approximatif)
  for (const [id, fiche] of Object.entries(all)) {
    try {
      const user = await client.users.fetch(id);
      if (user.username.toLowerCase() === input.toLowerCase()) {
        return { ...fiche, userId: id };
      }
    } catch {}
  }
  return null;
}

async function updateMessage(interaction, userId) {
  const fiche = await getFiche(userId);
  let targetUser = { username: 'Joueur' };
  try { targetUser = await interaction.client.users.fetch(userId); } catch {}

  const embed = buildFicheEmbed(fiche, targetUser);
  const buttons = buildFicheButtons(userId);

  if (interaction.isButton() || interaction.isModalSubmit()) {
    await interaction.update({ embeds: [embed], components: buttons });
  }
}

// Modals Golem & Propriété (simples)
function createAddGolemModal(userId) {
  const modal = new ModalBuilder().setCustomId(`modal_add_golem_${userId}`).setTitle('Ajouter un Golem');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('nom').setLabel('Nom du golem').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  return modal;
}

function createDelGolemModal(userId) { /* similaire */ }
function createAddPropModal(userId) { /* similaire */ }
function createDelPropModal(userId) { /* similaire */ }
