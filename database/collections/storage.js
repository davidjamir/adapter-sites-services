const { getCollection, getDb } = require("../mongodb/post-data");

const COLLECTION_NAME = "posts";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const DEFAULT_PER_CATEGORY_LIMIT = 5;

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

function resolvePerCategoryLimit(limit) {
  const n = limit == null ? DEFAULT_PER_CATEGORY_LIMIT : Number(limit);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PER_CATEGORY_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

/** Chỉ tạo 1 lần theo filter; trùng thì không lỗi, không ghi đè ($setOnInsert). */
async function insertPost({
  collectionName = COLLECTION_NAME,
  filter,
  payload,
  databaseKey,
}) {
  const col = await getCollection(collectionName, databaseKey);
  const result = await col.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        ...payload,
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
    doc: result.value,
    inserted: Boolean(result.lastErrorObject?.upserted),
  };
}

async function getOnePost({
  filter,
  databaseKey,
  collectionName = COLLECTION_NAME,
  sort,
}) {
  const col = await getCollection(collectionName, databaseKey);
  const opts = findOptions({ sort, limit: 1 });
  return col.findOne(filter, opts);
}

async function getManyPost({
  filter,
  databaseKey,
  collectionName = COLLECTION_NAME,
  sort,
  limit,
}) {
  const col = await getCollection(collectionName, databaseKey);
  return col.find(filter, findOptions({ sort, limit })).toArray();
}

// /** Mỗi category tối đa perCategoryLimit bản (aggregate, không dùng find limit chung). */
// async function getManyPostPerCategory({
//   filter,
//   categories,
//   categoryField = "category",
//   perCategoryLimit,
//   sort = { createdAt: -1 },
//   databaseKey,
//   collectionName = COLLECTION_NAME,
// }) {
//   const col = await getCollection(collectionName, databaseKey);
//   const list = Array.isArray(categories) ? categories : [];
//   if (!list.length) return [];

//   const take = resolvePerCategoryLimit(perCategoryLimit);
//   const match = {
//     ...filter,
//     [categoryField]: { $in: list },
//   };
//   const sortStage = { [categoryField]: 1, ...sort };

//   return col
//     .aggregate([
//       { $match: match },
//       { $sort: sortStage },
//       {
//         $group: {
//           _id: `$${categoryField}`,
//           items: { $push: "$$ROOT" },
//         },
//       },
//       {
//         $project: {
//           items: { $slice: ["$items", take] },
//         },
//       },
//       { $unwind: "$items" },
//       { $replaceRoot: { newRoot: "$items" } },
//     ])
//     .toArray();
// }

// async function deleteOnePost({
//   filter,
//   databaseKey,
//   collectionName = COLLECTION_NAME,
// }) {
//   const col = await getCollection(collectionName, databaseKey);
//   return col.deleteOne(filter);
// }

async function deleteManyPost({
  filter,
  databaseKey,
  collectionName = COLLECTION_NAME,
}) {
  const col = await getCollection(collectionName, databaseKey);
  return col.deleteMany(filter);
}

async function statsDB({ collectionName = COLLECTION_NAME, databaseKey }) {
  const db = await getDb(databaseKey);
  const statsDb = await db.stats();
  const statsCollection = await db.command({
    collStats: collectionName,
  });
  return { statsDb, statsCollection };
}

module.exports = {
  COLLECTION_NAME,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_PER_CATEGORY_LIMIT,
  insertPost,
  getOnePost,
  getManyPost,
  // getManyPostPerCategory,
  // deleteOnePost,
  deleteManyPost,
  statsDB,
};
