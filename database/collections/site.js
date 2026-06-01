const { getCollection } = require("../mongodb/general-db");
const COLLECTION_NAME = "sites";
const { DATABASE_INDEX_SHARD_COUNT } = require("../../constants");

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
        name: "",
        description: "",
        icon: "",
        logo: "",
        theme: "",
        siteCategory: "",
        configView: {
          category: "list",
          search: "list",
          tag: "list",
        },
        categories: [],
        pages: [],
        indexDatabaseKey:
          Math.floor(Math.random() * DATABASE_INDEX_SHARD_COUNT) + 1,
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
        status: "active",
        name: "",
        description: "",
        icon: "",
        logo: "",
        theme: "",
        siteCategory: "",
        configView: {
          category: "list",
          search: "list",
          tag: "list",
        },
        categories: [],
        pages: [],
        indexDatabaseKey:
          Math.floor(Math.random() * DATABASE_INDEX_SHARD_COUNT) + 1,
        createdAt: new Date(),
      },
      $inc: {
        totalItems: value,
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
}

async function insertOneSite({ collectionName = COLLECTION_NAME, payload }) {
  const col = await getCollection(collectionName);

  const result = await col.findOneAndUpdate(
    { domain: payload.domain },
    {
      $set: {
        ...payload,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        description: "",
        status: "active",
        icon: "",
        logo: "",
        configView: {
          category: "list",
          search: "list",
          tag: "list",
        },
        categories: [],
        pages: [],
        indexDatabaseKey:
          Math.floor(Math.random() * DATABASE_INDEX_SHARD_COUNT) + 1,
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

module.exports = { getOneSite, updateOneSite, incTotalItems, insertOneSite };
