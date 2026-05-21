const { getCollection } = require("../mongodb/sitemap-buffer");
const COLLECTION_NAME = "sitemap-buffer";

async function insertOneItem({
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
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      includeResultMetadata: true,
    },
  );
  return {
    ...result.value,
    inserted: Boolean(result.lastErrorObject?.upserted),
  };
}

async function getManyItems({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return col.find(filter).sort({ createdAt: 1 }).toArray();
}

async function deleteManyItem({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return col.deleteMany(filter);
}

module.exports = { insertOneItem, getManyItems, deleteManyItem };
