const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const { formatPubDate } = require("../helper/date");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const { redis } = require("../database/redis/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_AGE = 0;
const S_MAX_AGE = 60 * 60 * 24 * 1; // 1 day
const STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour
const STALE_IF_ERROR = 60 * 60 * 24 * 7; // 7 days

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
    const tag = url.searchParams.get("tag");

    // chỉ cho phép 1 mode
    if (!domain || !tag) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain, tag",
      });
    }

    if (domain.startsWith("localhost")) {
      domain = DEFAULT_DOMAIN_DEVELOPER;
    }

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      const siteCache = await redis.get(`tag:${domain}:${tag}`);
      if (siteCache) {
        return res.status(200).json({
          ok: true,
          source: "redis-cached",
          count: (siteCache || []).length,
          items: siteCache,
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
    const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const items = await storageIndex
      .getMany({
        filter: {
          domain: siteItem.domain,
          tags: {
            $regex: safeTag,
            $options: "i",
          },
        },
        indexDatabaseKey: siteItem.indexDatabaseKey,
        sort: { createdAt: -1 },
        limit: 25,
      })
      .map((item) => ({
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
        createdAt: formatPubDate(item.createdAt),
      }));

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      await redis.set(`tag:${domain}:${tag}`, items, 600);
    }
    res.setHeader(
      "Cache-Tag",
      `${siteItem.domain}, tag-${siteItem.domain}, origin-${siteItem.origin}, tag-cache`,
    );
    res.setHeader(
      "Vercel-Cache-Tag",
      `${siteItem.domain}, tag-${siteItem.domain}, origin-${siteItem.origin}, tag-cache`,
    );

    return res.status(200).json({
      ok: true,
      count: items.length,
      items: items,
    });
  } catch (err) {
    console.log("[api/tag] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
