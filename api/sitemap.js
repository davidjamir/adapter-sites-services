// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const sitemapBuffer = require("../src/sitemap-buffer");
const sitemap = require("../src/sitemap");
const { redis } = require("../database/redis/index");
const { r2 } = require("../database/r2/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_AGE = 0;
const S_MAX_AGE = 60 * 60 * 24 * 2; // 2 days
const STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour
const STALE_IF_ERROR = 60 * 60 * 24 * 7; // 7 days

module.exports = async (req, res) => {
  res.setHeader(
    "Vercel-CDN-Cache-Control",
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
    const id = url.searchParams.get("id");

    // chỉ cho phép 1 mode
    if ((!domain && !id) || (domain && id)) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain or id",
      });
    }

    // mode: domain -> lấy danh sách sitemap
    if (domain) {
      if (domain.startsWith("localhost")) {
        domain = DEFAULT_DOMAIN_DEVELOPER;
      }

      if (process.env.REQUIRE_REDIS_CACHE === "true") {
        const siteCache = await redis.get(`sitemap:${domain}`);
        if (siteCache) {
          return res.status(200).json({
            ok: true,
            source: "redis-cached",
            items: siteCache,
          });
        }
      }

      const items = (
        await sitemap.getMany({
          filter: { domain },
        })
      ).map((i) => ({
        sitemapId: i.sitemapId,
        domain: i.domain,
        status: i.status,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));

      await redis.set(`sitemap:${domain}`, items, 600);

      return res.status(200).json({
        ok: true,
        source: "mongo-database",
        items: items,
      });
    }

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      const siteCache = await redis.get(`sitemap:${domain}:${id}`);
      if (siteCache) {
        return res.status(200).json({
          ok: true,
          source: "redis-cached",
          sitemapId: id,
          items: siteCache,
        });
      }
    }

    // mode: id -> lấy sitemap item
    const sitemapItem = await sitemap.getOne({ filter: { sitemapId: id } });

    if (!sitemapItem) {
      return res.status(404).json({
        ok: false,
        error: "Sitemap not found",
      });
    }

    const items =
      sitemapItem.dbMode === "r2-cloudflare"
        ? await r2.get(
            sitemapItem.shardIdR2,
            sitemapItem.keyR2,
            sitemapItem.domain,
          )
        : (
            await sitemapBuffer.getMany({
              filter: {
                sitemapId: sitemapItem.sitemapId,
              },
            })
          ).map((i) => ({
            domain: i.domain,
            sitemapId: i.sitemapId,
            url: i.url,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
          }));

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      await redis.set(`sitemap:${domain}:${id}`, items, 600);
    }
    return res.status(200).json({
      ok: true,
      source:
        sitemapItem.dbMode === "r2-cloudflare"
          ? "r2-database"
          : "mongo-database",
      sitemapId: sitemapItem.sitemapId,
      items: items,
    });
  } catch (err) {
    console.log("[api/sitemap] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
