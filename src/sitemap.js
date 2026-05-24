const db = require("../database/collections/sitemap");

async function insert(input) {
  const payload = input.payload;
  return db.insertOneSitemap({ payload });
}

async function getOne(input) {
  const filter = input.filter;
  return db.getOneSitemap({ filter });
}

async function getMany(input) {
  const filter = input.filter;
  return db.getManySitemap({ filter });
}

async function update(input) {
  const filter = input.filter;
  return db.updateOneSitemap({
    filter,
    payload: input.payload,
  });
}

async function incItems(input) {
  const filter = { domain: input.domain, sitemapId: input.sitemapId };
  const payload = { domain: input.domain };
  return db.incTotalItems({ filter, payload });
}

const sitemap = {
  insert,
  getOne,
  getMany,
  update,
  incItems,
};

module.exports = sitemap;
