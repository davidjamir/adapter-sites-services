const { getCollection } = require("../mongodb/general-db");
const COLLECTION_NAME = "sites";
const DEFAULT_INDEX_DATABASE_KEY = 3;

async function getOneSite({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return await col.findOne(filter);
}

async function updateOneSite({
  collectionName = COLLECTION_NAME,
  filter,
  payload,
}) {
  const col = await getCollection(collectionName);

  const result = await col.findOneAndUpdate(
    filter,
    {
      $set: {
        ...payload,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        status: "active",
        indexDatabaseKey: DEFAULT_INDEX_DATABASE_KEY,
        createdAt: new Date(),
        totalItems: 0,
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );

  return {
    doc: result.value,
    inserted: Boolean(result.lastErrorObject?.upserted),
  };
}

async function incTotalItems({
  collectionName = COLLECTION_NAME,
  filter,
  payload,
  value = 1,
}) {
  const col = await getCollection(collectionName);

  return col.findOneAndUpdate(
    filter,
    {
      $set: {
        updatedAt: new Date(),
      },
      $setOnInsert: {
        origin: payload.origin,
        domain: payload.domain,
        indexDatabaseKey: DEFAULT_INDEX_DATABASE_KEY,
        createdAt: new Date(),
      },
      $inc: {
        totalItems: value,
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
}

module.exports = { getOneSite, updateOneSite, incTotalItems };
