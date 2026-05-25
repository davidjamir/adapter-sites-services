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
  // if (!isAuthorized(req)) {
  //   return res.status(401).json({ ok: false, error: "Unauthorized" });
  // }

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
      domain = "news.thetimenews.co";
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
      baseUrl: baseUrl ?? `https://${siteItem.domain}`,
      origin: siteItem.origin,
      name: siteItem.name,
      icon: "/images/default.png",
      logo: "/images/default.png",
      theme: "news",
      siteCaregory: siteItem.siteCategory,
      seo: {
        title: "News Theme",
        description: `${siteItem.domain} news site`,
        canonicalUrl: `https://${siteItem.domain}`,
      },
      ads: {
        adsTxt:
          "google.com, pub-1234567890, DIRECT, f08c47fec0942fa0 \ngoogle.com, pub-1234567890, DIRECT, f08c47fec0942fa0",
      },
      script: [
        {
          id: "adsense",
          src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxx",
          async: true,
          defer: false,
          crossOrigin: "anonymous",
          strategy: "afterInteractive",
          enabled: false,
        },
        {
          id: "mgid",
          src: "https://jsc.mgid.com/site/1043437.js",
          async: true,
          defer: false,
          enabled: false,
        },
      ],
      categories: [
        {
          id: "1",
          name: "Category 1",
          slug: "category-1",
        },
        {
          id: "2",
          name: "Category 2",
          slug: "category-2",
        },
      ],
      pages: [
        {
          id: "1",
          name: "Privacy Policy",
          slug: "/page/privacy-policy",
        },
        {
          id: "2",
          name: "Disclaimer",
          slug: "/page/disclaimer",
        },
        {
          id: "3",
          name: "Terms and Conditions",
          slug: "/page/terms-and-conditions",
        },
        {
          id: "4",
          name: "Contact Us",
          slug: "/page/contact-us",
        },
      ],
      verification: {
        google: siteItem.verification?.google,
        yandex: siteItem.verification?.yandex,
        yahoo: siteItem.verification?.yahoo,
        other: {
          me: siteItem.verification?.other.me,
        },
      },
    };

    await redis.set(`site:${domain}`, item, 600);
    return res.status(200).json({
      ok: true,
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
