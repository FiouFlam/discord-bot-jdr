const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('❌ MONGODB_URI manquant !');

const client = new MongoClient(uri);
let db = null;

async function connect() {
  if (!db) {
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

module.exports = { getFiche, setFiche, deleteFiche, getAllFiches, connect };
