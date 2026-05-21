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
    const payload = {
      ...body.item,
      segment: config.segment,
      mainCategory: body.item?.categories[0] || "News",
      author: genAuthor(),
    };
    const newItem = await storage.insert({
      payload,
      databaseKey: config.databaseKey,
    });
    const stats = await storage.stats({ databaseKey: config.databaseKey });

    const dbInfo = await dbConfigs.updateOneDBConfig({
      filter: { segment: config.segment },
      payload: {
        type: "database",
        databaseKey: config.databaseKey,
        segment: config.segment,
        ...stats,
      },
    });

    await origin.incItems({ origin: newItem.doc.origin });
    const siteItem = await site.incItems({
      origin: newItem.doc.origin,
      domain: newItem.doc.domain,
    });

    const payloadIndex = {
      domain: newItem.doc.domain,
      origin: newItem.doc.origin,
      title: newItem.doc.title,
      slug: newItem.doc.slug,
      snippet: newItem.doc.snippet,
      featuredImage: newItem.doc.featuredImage,
      segment: newItem.doc.segment,
      categories: newItem.doc.categories,
      mainCategory: newItem.doc.mainCategory,
      author: newItem.doc.author,
      indexDatabaseKey: siteItem.indexDatabaseKey || 1,
    };

    const postIndex = await storageIndex.insert({
      payload: payloadIndex,
      indexDatabaseKey: 1,
    });

    const newItemSitemapBuffer = await sitemapBuffer.insert({
      payload: {
        domain: newItem.doc.domain,
        url: `https://${newItem.doc.domain}/${newItem.doc.segment}/${newItem.doc.slug}`,
      },
    });

    console.log({
      title: newItem.doc.title,
      domain: newItem.doc.domain,
      segment: newItem.doc.segment,
      categories: newItem.doc.categories,
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
