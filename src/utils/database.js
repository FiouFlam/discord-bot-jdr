const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  if (!db) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('❌ MONGODB_URI manquant dans les variables d\'environnement !');
    client = new MongoClient(uri);
    await client.connect().catch(err => { console.error('❌ Erreur MongoDB:', err); throw err; });
    db = client.db('discord_bot');
    console.log('✅ Connecté à MongoDB');
  }
  return db;
}

async function getFiche(userId) {
  const database = await connect();
  const doc = await database.collection('fiches').findOne({ userId });
  if (!doc) return null;
  const { _id, userId: _, ...fiche } = doc;
  return fiche;
}

async function setFiche(userId, fiche) {
  const database = await connect();
  await database.collection('fiches').updateOne(
    { userId },
    { $set: { userId, ...fiche } },
    { upsert: true }
  );
}

async function deleteFiche(userId) {
  const database = await connect();
  const result = await database.collection('fiches').deleteOne({ userId });
  return result.deletedCount > 0;
}

async function getAllFiches() {
  const database = await connect();
  const docs = await database.collection('fiches').find({}).toArray();
  const fiches = {};
  for (const doc of docs) {
    const { _id, userId, ...fiche } = doc;
    fiches[userId] = fiche;
  }
  return fiches;
}

// Récupère toutes les fiches d'un userId (peut en avoir plusieurs, une par monde)
// Retourne un tableau [{ ficheId, ...fiche }]
async function getFichesByUser(userId) {
  const database = await connect();
  const docs = await database.collection('fiches').find({ userId }).toArray();
  return docs.map(({ _id, userId: _, ...fiche }) => ({ ...fiche }));
}

// Récupère toutes les fiches d'un monde donné : Map<userId, fiche>
async function getAllFichesByMonde(monde) {
  const database = await connect();
  const m = monde ?? 1;
  // Inclure les fiches sans champ monde (= monde 1)
  const query = m === 1
    ? { $or: [{ monde: 1 }, { monde: { $exists: false } }] }
    : { monde: m };
  const docs = await database.collection('fiches').find(query).toArray();
  const fiches = {};
  for (const doc of docs) {
    const { _id, userId, ...fiche } = doc;
    // Une fiche par (userId, monde) — clé composite
    const key = `${userId}::${m}`;
    fiches[key] = { ...fiche, _userId: userId };
  }
  return fiches;
}

// Récupère la fiche d'un userId pour un monde précis
async function getFicheByMonde(userId, monde) {
  const database = await connect();
  const m = monde ?? 1;
  const query = m === 1
    ? { userId, $or: [{ monde: 1 }, { monde: { $exists: false } }] }
    : { userId, monde: m };
  const doc = await database.collection('fiches').findOne(query);
  if (!doc) return null;
  const { _id, userId: _, ...fiche } = doc;
  return fiche;
}

// Set fiche par userId + monde
async function setFicheByMonde(userId, monde, fiche) {
  const database = await connect();
  const m = monde ?? 1;
  // Pour le monde 1, on cherche aussi les fiches sans champ monde (migration)
  // afin d'éviter de créer un doublon si la fiche existante n'a pas le champ monde
  const filter = m === 1
    ? { userId, $or: [{ monde: 1 }, { monde: { $exists: false } }] }
    : { userId, monde: m };
  await database.collection('fiches').updateOne(
    filter,
    { $set: { userId, monde: m, ...fiche } },
    { upsert: true }
  );
}

// Supprime la fiche d'un userId pour un monde précis
async function deleteFicheByMonde(userId, monde) {
  const database = await connect();
  const m = monde ?? 1;
  const query = m === 1
    ? { userId, $or: [{ monde: 1 }, { monde: { $exists: false } }] }
    : { userId, monde: m };
  const result = await database.collection('fiches').deleteOne(query);
  return result.deletedCount > 0;
}

module.exports = { getFiche, setFiche, deleteFiche, getAllFiches, connect, getFichesByUser, getAllFichesByMonde, getFicheByMonde, setFicheByMonde, deleteFicheByMonde };
