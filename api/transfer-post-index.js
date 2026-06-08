// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");
const { genAuthor } = require("../helper/genAuthor");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const domain = url.searchParams.get("domain");
    const targetValue = url.searchParams.get("target");
    const limit = Number(url.searchParams.get("limit") || 50);

    if (!domain || !targetValue) {
      return res.status(400).json({
        ok: false,
        error: "Require domain and target key for transfer data",
      });
    }

    const target = Number(targetValue);

    const siteItem = await site.getOne({ domain });

    if (!siteItem) {
      return res.status(400).json({
        ok: false,
        error: `Not found site item with domain: ${domain}!`,
      });
    }

    if (siteItem.indexDatebaseKey === target) {
      return res.status(400).json({
        ok: false,
        error: "Require target key different with current index database key!",
      });
    }

    const items = await storageIndex.getMany({
      filter: { domain: siteItem.domain },
      indexDatabaseKey: siteItem.indexDatabaseKey,
      sort: { createdAt: 1 },
      limit: limit,
    });

    const ids = items.map((item) => item._id);

    if (items.length <= 0) {
      return res.status(200).json({
        ok: false,
        error: "Not found items in db cluster",
      });
    }

    const payload = items.map((item) => ({
      title: item.title,
      domain: item.domain,
      origin: item.origin,
      slug: item.slug,
      featuredImage: item.featuredImage || item.featureImage,
      mainCategory: item.mainCategory,
      categories: item.categories || [],
      indexDatabaseKey: target,
      segment: item.segment,
      snippet: item.snippet,
      tags: item.tag || [],
      author: item.author || genAuthor(),
      createdAt: item.createdAt,
    }));

    const inserts = await storageIndex.insertMany({
      payload,
      indexDatabaseKey: target,
    });

    const deleted = await storageIndex.deleteMany({
      filter: { _id: { $in: ids } },
      indexDatabaseKey: siteItem.indexDatabaseKey,
    });

    return res.status(200).json({
      ok: true,
      count: items.length,
      ids,
      inserts,
      deleted,
    });
  } catch (err) {
    console.log("[api/transfer-post-index] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
