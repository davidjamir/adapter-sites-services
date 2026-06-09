const db = require("../database/collections/site");

async function getOne(input) {
  const filter = { domain: input.domain };
  return db.getOneSite({ filter });
}

async function getMany(input) {
  const filter = { origin: input.origin, domain: input.domain };
  return db.getManySite({ filter });
}

async function getCount(input) {
  return (await db.getManySite({ filter: input.filter })).length;
}

async function update(input) {
  const filter = { domain: input.domain };

  return db.updateOneSite({
    filter,
    payload: input.payload,
  });
}

async function insertOne(input) {
  return db.insertOneSite({ payload: input.payload });
}

async function incItems(input) {
  const filter = { domain: input.domain };
  const payload = { origin: input.origin, domain: input.domain };
  return db.incTotalItems({ filter, payload });
}

const site = {
  getOne,
  insertOne,
  update,
  incItems,
  getMany,
  getCount,
};

module.exports = site;
