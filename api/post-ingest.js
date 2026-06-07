// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const { genAuthor } = require("../helper/genAuthor");
const storage = require("../src/storage");
const dbConfigs = require("../database/collections/dbconfigs");
const origin = require("../src/origin");
const site = require("../src/site");
const storageIndex = require("../src/storage-index");
const sitemapBuffer = require("../src/sitemap-buffer");
const { updateFeed, updateLatest } = require("../src/r2upload");
const { formatNewYorkDate } = require("../helper/date");
const { genPostSlug } = require("../helper/genPostSlug");
const { generateHash } = require("../helper/genHash");

export function randomInt(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  console.log("Ingest API Adapter Server Posts ", new Date());
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const body = req.body || {};
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Missing JSON body" });
    }

    const configs = await dbConfigs.getManyDBConfigs({
      filter: { mode: "read-write", status: "active" },
    });

    const config = configs[randomInt(0, configs.length - 1)];

    const categories = [...body.item?.categories, "News"];
    const payload = {
      tags: [],
      ...body.item,
      id: generateHash(8),
      segment: config.segment,
      categories,
      mainCategory: categories[0],
      author: genAuthor(),
      createdAt: formatNewYorkDate(new Date()),
      slug: genPostSlug({
        title: toStr(body.item.title),
      }),
    };

    const newItem = await storage.insert(config.endpoint, payload);

    await origin.incItems({ origin: payload.origin });
    const siteItem = await site.incItems({
      origin: payload.origin,
      domain: payload.domain,
    });

    const payloadIndex = {
      domain: payload.domain,
      origin: payload.origin,
      title: payload.title,
      slug: payload.slug,
      snippet: payload.snippet,
      featuredImage: payload.featuredImage,
      segment: payload.segment,
      categories: payload.categories,
      mainCategory: payload.mainCategory,
      author: payload.author,
      tags: payload.tags || [],
      indexDatabaseKey: siteItem.value.indexDatabaseKey,
    };

    const postIndex = await storageIndex.insert({
      payload: payloadIndex,
      indexDatabaseKey: payloadIndex.indexDatabaseKey,
    });

    const newItemSitemapBuffer = await sitemapBuffer.insert({
      payload: {
        domain: payload.domain,
        url: `https://${payload.domain}/post/${payload.segment}/${payload.slug}`,
      },
    });

    const r2feed = await updateFeed(payload.domain);
    const r2latest = await updateLatest(payload.domain);

    console.log({
      title: payload.title,
      domain: payload.domain,
      segment: payload.segment,
      categories: payload.categories,
      r2feed,
      r2latest,
    });
    return res.status(200).json({
      ok: true,
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log("[api/post-ingest] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
