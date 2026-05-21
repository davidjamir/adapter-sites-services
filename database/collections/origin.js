const { getCollection } = require("../mongodb/general-db");
const COLLECTION_NAME = "origins";

async function getOneOrigin({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return await col.findOne(filter);
}

async function updateOneOrigin({
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
        createdAt: new Date(),
      },
      $inc: {
        totalItems: value,
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
}

module.exports = { getOneOrigin, updateOneOrigin, incTotalItems };
