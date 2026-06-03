// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");
const { redis } = require("../database/redis/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_AGE = 0;
const S_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour
const STALE_IF_ERROR = 60 * 60 * 24 * 300; // 300 days

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
    const originDomain = url.searchParams.get("domain");
    let domain = originDomain;
    let baseUrl = "";

    // chỉ cho phép 1 mode
    if (!domain) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain",
      });
    }

    if (domain.startsWith("localhost")) {
      domain = DEFAULT_DOMAIN_DEVELOPER;
      baseUrl = `http://${originDomain}`;
    }

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      const siteCache = await redis.get(`site:${domain}`);
      if (siteCache) {
        return res.status(200).json({
          ok: true,
          source: "redis-cached",
          site: siteCache,
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

    const originItem = await origin.getOne({ origin: siteItem.origin });

    const item = {
      id: siteItem._id,
      host: siteItem.domain,
      baseUrl: baseUrl || `https://${siteItem.domain}`,
      origin: siteItem.origin,
      name: siteItem.name,
      icon: siteItem.icon || originItem.icon,
      logo: siteItem.icon || originItem.icon,
      theme: siteItem.theme || "news",
      siteCategory: siteItem.siteCategory,
      configView: siteItem.configView,
      ads: originItem.ads,
      script: originItem.script || [],
      categories: siteItem.categories?.length
        ? siteItem.categories
        : originItem.categories,
      pages: siteItem.pages?.length ? siteItem.pages : originItem.pages,
      verification: originItem.verification,
      seo: {
        title: siteItem.name || originItem.seo?.title,
        description: siteItem.description || originItem.seo?.description,
        canonicalUrl: `https://${siteItem.domain}`,
      },
    };

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      await redis.set(`site:${domain}`, item, 600);
    }
    res.setHeader(
      "Vercel-Cache-Tag",
      `${item.host}, site-${item.host}, origin-${item.origin}, site-cache`,
    );

    return res.status(200).json({
      ok: true,
      time: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      source: "mongo-database",
      site: item,
    });
  } catch (err) {
    console.log("[api/site] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
