const { getCollection } = require("../mongodb/general-db");
const COLLECTION_NAME = "dbconfigs";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const MAX_STORAGE_SIZE = 512 * 1024 * 1024; // 512MB
const WARNING_BUFFER = 10 * 1024 * 1024; // 10MB
const DISABLE_THRESHOLD = MAX_STORAGE_SIZE - WARNING_BUFFER;

function resolveLimit(limit) {
  const n = limit == null ? DEFAULT_LIMIT : Number(limit);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function findOptions({ sort, limit, projection }) {
  const opts = { limit: resolveLimit(limit) };
  if (sort != null) opts.sort = sort;
  if (projection != null) opts.projection = projection;
  return opts;
}

async function getOneDBConfig({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return col.findOne(filter);
}

async function getManyDBConfigs({
  collectionName = COLLECTION_NAME,
  filter,
  sort,
  limit,
}) {
  const col = await getCollection(collectionName);
  return col.find(filter, findOptions({ sort, limit })).toArray();
}

async function updateOneDBConfig({
  collectionName = COLLECTION_NAME,
  filter,
  payload,
}) {
  const col = await getCollection(collectionName);

  if (payload?.storageSize >= DISABLE_THRESHOLD) {
    payload.mode = "read-only";
  }

  const result = await col.findOneAndUpdate(
    filter,
    {
      $set: {
        ...payload,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        status: "active",
        mode: "read-write",
        maxStorageSize: MAX_STORAGE_SIZE,
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );

  return {
    doc: result.value,
    inserted: Boolean(result.lastErrorObject?.upserted),
  };
}

module.exports = { getOneDBConfig, getManyDBConfigs, updateOneDBConfig };
