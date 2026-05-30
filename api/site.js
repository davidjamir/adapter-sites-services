// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");
const { redis } = require("../database/redis/index");

module.exports = async (req, res) => {
  res.setHeader(
    "Cache-Control",
    "public, max-age=30, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400",
  );

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const query = req.query || {};
    const originDomain = query.domain;
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
      domain = "fanzone.thetimenews.us";
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

    await redis.set(`site:${domain}`, item, 600);
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
