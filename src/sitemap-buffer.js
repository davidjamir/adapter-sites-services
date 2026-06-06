const db = require("../database/collections/sitemap-buffer");
const sitemap = require("./sitemap");
const { MAX_DEFAULT_ITEMS_EACH_SITEMAP } = require("../constants");
const { updateSitemapGeneral, updateSitemapItem } = require("../src/r2upload");

async function insert(input) {
  const payload = input.payload;

  let sitemapItem = await sitemap.getOne({
    filter: {
      domain: payload.domain,
      dbMode: "mongodb",
      totalItems: {
        $lt: MAX_DEFAULT_ITEMS_EACH_SITEMAP,
      },
    },
  });

  if (!sitemapItem) {
    sitemapItem = await sitemap.insert({
      payload: {
        domain: payload.domain,
      },
    });

    // Update sitemap.xml when insert new a sitemap-post
    await updateSitemapGeneral(payload.domain);
  }

  const result = await db.insertOneItem({
    filter: { domain: payload.domain, url: payload.url },
    payload: {
      ...payload,
      sitemapId: sitemapItem.sitemapId,
    },
  });

  await sitemap.incItems({
    domain: result.domain,
    sitemapId: sitemapItem.sitemapId,
  });

  await updateSitemapItem(payload.domain, sitemapItem.sitemapId);

  return result;
}

async function getMany(input) {
  const filter = input.filter;
  return db.getManyItems({ filter });
}

async function deleteMany(input) {
  const filter = input.filter;
  return db.deleteManyItem({ filter });
}

const sitemapBuffer = {
  insert,
  getMany,
  deleteMany,
};

module.exports = sitemapBuffer;
