const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const { formatPubDate, formatNewYorkDate } = require("../helper/date");
const storage = require("../src/storage");
const site = require("../src/site");
const { redis } = require("../database/redis/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_AGE = 0;
const S_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour
const STALE_IF_ERROR = 60 * 60 * 24 * 90; // 90 days

module.exports = async (req, res) => {
  res.setHeader(
    "Cache-Control",
    `public, max-age=${MAX_AGE}, s-maxage=${S_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}, stale-if-error=${STALE_IF_ERROR}`,
  );

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  // if (!isAuthorized(req)) {
  //   return res.status(401).json({ ok: false, error: "Unauthorized" });
  // }

  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    let domain = url.searchParams.get("domain");
    const segment = url.searchParams.get("segment");
    const slug = url.searchParams.get("slug");

    // chỉ cho phép 1 mode
    if (!domain || !segment || !slug) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain, segment, slug",
      });
    }

    if (domain.startsWith("localhost")) {
      domain = DEFAULT_DOMAIN_DEVELOPER;
    }

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      const siteCache = await redis.get(`post:${domain}:${segment}:${slug}`);
      if (siteCache) {
        return res.status(200).json({
          ok: true,
          source: "redis-cached",
          item: siteCache,
        });
      }
    }

    const siteItem = await site.getOne({ domain });
    if (!siteItem) {
      return res.status(404).json({
        ok: false,
        error: "Site not found",
      });
    }
    const item = await storage.getOne({
      filter: { domain: siteItem.domain, slug },
      databaseKey: Number(segment.slice(1)),
    });
    const newItem = {
      id: item._id,
      title: item.title,
      slug: item.slug,
      domain: item.domain,
      featuredImage: item.featuredImage,
      snippet: item.snippet,
      mainCategory: item.mainCategory,
      categories: item.categories,
      segment: item.segment,
      author: item.author,
      tags: item.tags || [],
      createdAt: formatNewYorkDate(item.createdAt),
      content: item.content,
    };

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      await redis.set(`post:${domain}:${segment}:${slug}`, newItem, 600);
    }

    res.setHeader(
      "Cache-Tag",
      `${siteItem.domain}, post-${siteItem.domain}, origin-${siteItem.origin}, post-cache`,
    );
    return res.status(200).json({
      ok: true,
      source: "mongo-database",
      item: newItem,
    });
  } catch (err) {
    console.log("[api/post] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
