const { MongoClient } = require("mongodb");
const { attachDatabasePool } = require("@vercel/functions");

const options = {
  appName: "adapter-sites-services.sitemap-buffer",
  maxIdleTimeMS: 5000,
};

const DB_NAME = "databases";

let client;
let dbPromise;

function getClient() {
  const uri = process.env.SITEMAP_BUFFER_URI;
  if (!uri) {
    throw new Error("[sitemap-buffer] thiếu SITEMAP_BUFFER_URI trong env");
  }
  if (!client) {
    client = new MongoClient(uri, options);
    try {
      attachDatabasePool(client);
    } catch (_) {
      /* ngoài Vercel có thể không có pool */
    }
  }
  return client;
}

function dbName() {
  return DB_NAME;
}

async function getDb() {
  if (!dbPromise) {
    const c = getClient();
    dbPromise = c.connect().then(() => c.db(dbName()));
  }
  return dbPromise;
}

async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

module.exports = {
  getClient,
  getDb,
  getCollection,
};
