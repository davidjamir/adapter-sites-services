const db = require("../database/collections/storage");
const { genPostSlug } = require("../helper/genPostSlug");

async function insert(input) {
  const payload = input.payload;
  payload.slug = genPostSlug({
    title: payload.title ?? "",
  });

  const filter = {
    slug: payload.slug,
  };
  return db.insertPost({
    filter,
    payload: input.payload,
    databaseKey: input.databaseKey,
  });
}

async function getOne(input) {
  const sort = { createdAt: -1 };
  return db.getOnePost({
    filter: input.filter,
    sort,
    databaseKey: input.databaseKey,
  });
}

// async function getMany(input) {
//   return db.getManyPost({
//     collectionName: input.collectionName,
//     filter: input.filter,
//     sort: input.sort,
//     limit: input.limit,
//     databaseKey: input.databaseKey,
//   });
// }

// async function getManyWithCategory(input) {
//   return db.getManyPostPerCategory({
//     collectionName: input.collectionName,
//     filter: input.filter,
//     categories: input.categories,
//     categoryField: input.categoryField,
//     perCategoryLimit: input.perCategoryLimit,
//     sort: input.sort,
//     databaseKey: input.databaseKey,
//   });
// }

// async function deleteOne(input) {
//   return db.deleteOnePost({
//     collectionName: input.collectionName,
//     filter: input.filter,
//     databaseKey: input.databaseKey,
//   });
// }

// async function deleteMany(input) {
//   return db.deleteManyPost({
//     collectionName: input.collectionName,
//     filter: input.filter,
//     sort: input.sort,
//     limit: input.limit,
//     databaseKey: input.databaseKey,
//   });
// }

async function stats({ databaseKey }) {
  const { statsDb, statsCollection } = await db.statsDB({ databaseKey });

  return {
    storageSize: statsDb.storageSize,
    dataSize: statsDb.dataSize,
    avgObjSize: statsCollection.avgObjSize,
    collections: statsDb.collections,
    items: statsCollection.count,
  };
}

const storage = {
  insert,
  getOne,
  //   getMany,
  //   getManyWithCategory,
  //   deleteOne,
  //   deleteMany,
  stats,
};

module.exports = storage;
