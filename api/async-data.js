// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");
const { redis } = require("../database/redis/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");
const dbConfigs = require("../database/collections/dbconfigs");
const storage = require("../src/storage");
const { formatPubDate, formatNewYorkDate } = require("../helper/date");
const { genAuthor } = require("../helper/genAuthor");

function getRootDomain(hostname) {
  const parts = hostname.split(".");

  if (parts.length <= 2) return hostname;

  return parts.slice(-2).join(".");
}

const {
  updateAdsTxt,
  updateSite,
  updateRobotsTxt,
  updateSitemapPage,
  updateSitemapCategory,
} = require("../src/r2upload");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const key = url.searchParams.get("key");
    const limit = url.searchParams.get("limit");

    const config = await dbConfigs.getOneDBConfig({
      filter: { databaseKey: Number(key) },
    });

    if (!config) {
      return res.status(404).json({
        ok: false,
        error: "Database not found",
      });
    }

    const posts = await storage.getMany({
      filter: {},
      sort: { createdAt: 1 },
      limit: Number(limit),
      databaseKey: key,
    });

    const items = [];
    for (item of posts) {
      const payload = {
        id: item._id,
        title: item.title,
        slug: item.slug,
        domain: item.domain,
        featuredImaged: item.featuredImage || item.featuredImaged || "",
        snippet: item.snippet,
        mainCategory: item.mainCategory || item.categories[0] || "",
        categories: item.categories || [],
        segment: item.segment,
        author: item.author || genAuthor(),
        tags: item.tags || [],
        createdAt: formatNewYorkDate(item.createdAt),
        content: item.content,
        origin: getRootDomain(item.domain),
      };

      const newItems = await storage.insert(config.endpoint, payload);
      items.push({ response: newItems, payload });
    }

    return res.status(200).json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.log("[api/async-site] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
