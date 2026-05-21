const db = require("../database/collections/origin");

async function getOne(input) {
  const filter = { origin: input.origin };
  return db.getOneOrigin({ filter });
}

async function update(input) {
  const filter = { origin: input.origin };

  return db.updateOneOrigin({
    filter,
    payload: input.payload,
  });
}

async function incItems(input) {
  const filter = { origin: input.origin };
  const payload = { origin: input.origin };
  return db.incTotalItems({ filter, payload });
}

const origin = {
  getOne,
  update,
  incItems,
};

module.exports = origin;
