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

async function getMany(input) {
  return db.getManyPost({
    filter: input.filter,
    indexDatabaseKey: input.indexDatabaseKey,
    sort: input.sort,
    limit: input.limit,
  });
}

const storageIndex = { insert, getMany };
module.exports = storageIndex;
