const { MongoClient } = require("mongodb");
const { attachDatabasePool } = require("@vercel/functions");

const options = {
  appName: "adapter-sites-services.post-index",
  maxIdleTimeMS: 5000,
};

const DB_NAME = "databases";
const URI_PREFIX = "MONGODB_INDEX_URI";

/** @type {Record<string, import('mongodb').MongoClient>} */
const clients = {};
/** @type {Record<string, Promise<import('mongodb').Db>>} */
const dbPromises = {};

function normalizeSlot(slot) {
  const s = Number(slot);
  if (!Number.isFinite(s) || s < 1) {
    throw new Error(`[post-data] slot không hợp lệ: ${slot}`);
  }
  return s;
}

function getUri(slot) {
  const s = normalizeSlot(slot);
  const uri = process.env[`${URI_PREFIX}${s}`];
  if (!uri) {
    throw new Error(`[post-data] thiếu ${URI_PREFIX}${s} trong env`);
  }
  return uri;
}

function getClient(slot) {
  const s = normalizeSlot(slot);
  const cacheKey = String(s);
  if (!clients[cacheKey]) {
    const c = new MongoClient(getUri(s), options);
    clients[cacheKey] = c;
    try {
      attachDatabasePool(c);
    } catch (_) {
      /* ngoài Vercel */
    }
  }
  return clients[cacheKey];
}

function dbName() {
  return DB_NAME;
}

async function getDb(slot) {
  const cacheKey = String(normalizeSlot(slot));
  if (!dbPromises[cacheKey]) {
    const c = getClient(slot);
    dbPromises[cacheKey] = c.connect().then(() => c.db(dbName()));
  }
  return dbPromises[cacheKey];
}

async function getCollection(name, slot) {
  if (!name || String(name).trim() === "") {
    throw new Error("[post-data] thiếu collection name");
  }
  const db = await getDb(slot);
  return db.collection(String(name));
}

module.exports = {
  getClient,
  getDb,
  getCollection,
};
