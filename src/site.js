const db = require("../database/collections/site");

async function getOne(input) {
  const filter = { domain: input.domain };
  return db.getOneSite({ filter });
}

async function update(input) {
  const filter = { domain: input.domain };

  return db.updateOneSite({
    filter,
    payload: input.payload,
  });
}

async function incItems(input) {
  const filter = { domain: input.domain };
  const payload = { origin: input.origin, domain: input.domain };
  return db.incTotalItems({ filter, payload });
}

const site = {
  getOne,
  update,
  incItems,
};

module.exports = site;
