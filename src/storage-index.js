const db = require("../database/collections/storage-index");

async function insert(input) {
  const payload = input.payload;
  const filter = {
    domain: payload.domain,
    slug: payload.slug,
  };
  return db.insertPostIndex({
    filter,
    payload: input.payload,
    indexDatabaseKey: input.indexDatabaseKey,
  });
}

async function insertMany(input) {
  return db.insertManyPostIndex({
    payload: input.payload,
    indexDatabaseKey: input.indexDatabaseKey,
  });
}

async function getMany(input) {
  return db.getManyPostIndex({
    filter: input.filter,
    indexDatabaseKey: input.indexDatabaseKey,
    sort: input.sort,
    limit: input.limit,
  });
}

async function deleteMany(input) {
  return db.deleteManyPostIndex({
    filter: input.filter,
    indexDatabaseKey: input.indexDatabaseKey,
  });
}

async function stats(input) {
  return db.statsDBPostIndex({ indexDatabaseKey: input.indexDatabaseKey });
}
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
const storageIndex = { insert, insertMany, getMany, deleteMany, stats };
module.exports = storageIndex;
