// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const sitemapBuffer = require("../src/sitemap-buffer");
const sitemap = require("../src/sitemap");
const { redis } = require("../database/redis/index");
const { r2 } = require("../database/r2/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_AGE = 0;
const S_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour
const STALE_IF_ERROR = 60 * 60 * 24 * 7; // 7 days

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const id = url.searchParams.get("id");

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
      await redis.set(`sitemap:${sitemapItem.domain}:${id}`, items, 600);
    }

    res.setHeader(
      "Cache-Tag",
      `${sitemapItem.domain}, sitemap-${sitemapItem.domain}, origin-${sitemapItem.domain.split(".")[0]}, sitemap-id-${id}, sitemap-id-cache`,
    );
    res.setHeader(
      "Vercel-Cache-Tag",
      `${sitemapItem.domain}, sitemap-${sitemapItem.domain}, origin-${sitemapItem.domain.split(".")[0]}, sitemap-id-${id}, sitemap-id-cache`,
    );

    return res.status(200).json({
      ok: true,
      source:
        sitemapItem.dbMode === "r2-cloudflare"
          ? "r2-database"
          : "mongo-database",
      sitemapId: sitemapItem.sitemapId,
      counts: items.length,
      items: items,
    });
  } catch (err) {
    console.log("[api/sitemap] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
