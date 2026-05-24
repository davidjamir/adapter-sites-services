const { getCollection } = require("../mongodb/general-db");
const { generateHash } = require("../../helper/genHash");

const COLLECTION_NAME = "sitemaps";

async function getOneSitemap({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return col.findOne(filter);
}

async function getManySitemap({ collectionName = COLLECTION_NAME, filter }) {
  const col = await getCollection(collectionName);
  return col.find(filter).sort({ createdAt: 1 }).toArray();
}

async function updateOneSitemap({
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
        sitemapId: generateHash(),
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
        domain: payload.domain,
        createdAt: new Date(),
      },
      $inc: {
        totalItems: value,
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
}

async function insertOneSitemap({ collectionName = COLLECTION_NAME, payload }) {
  const col = await getCollection(collectionName);
  const newPayload = {
    ...payload,
    sitemapId: generateHash(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "active",
    totalItems: 0,
    dbMode: "mongodb",
  };
  const result = await col.insertOne(newPayload);

  return {
    ...newPayload,
    _id: result.insertedId,
  };
}

module.exports = {
  getOneSitemap,
  getManySitemap,
  updateOneSitemap,
  insertOneSitemap,
  incTotalItems,
};
