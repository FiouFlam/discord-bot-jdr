const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/fiches.json');
const ITEMS_PATH = path.join(__dirname, '../../data/items.json');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFiches() {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveFiches(data) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getFiche(userId) {
  const fiches = loadFiches();
  return fiches[userId] || null;
}

function setFiche(userId, fiche) {
  const fiches = loadFiches();
  fiches[userId] = fiche;
  saveFiches(fiches);
}

function deleteFiche(userId) {
  const fiches = loadFiches();
  if (fiches[userId]) {
    delete fiches[userId];
    saveFiches(fiches);
    return true;
  }
  return false;
}

function getAllFiches() {
  return loadFiches();
}

function loadItems() {
  if (!fs.existsSync(ITEMS_PATH)) {
    const defaultItems = [
      { id: 'epee', name: '⚔️ Épée', description: 'Une épée basique' },
      { id: 'bouclier', name: '🛡️ Bouclier', description: 'Un bouclier solide' },
      { id: 'potion', name: '🧪 Potion de soin', description: 'Restaure de la vie' },
      { id: 'arc', name: '🏹 Arc', description: 'Un arc en bois' },
      { id: 'grimoire', name: '📖 Grimoire', description: 'Contient des sorts' },
    ];
    fs.writeFileSync(ITEMS_PATH, JSON.stringify(defaultItems, null, 2));
    return defaultItems;
  }
  return JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'));
}

module.exports = { getFiche, setFiche, deleteFiche, getAllFiches, loadItems };
