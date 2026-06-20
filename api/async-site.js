// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const {
  updateAdsTxt,
  updateSite,
  updateRobotsTxt,
  updateSitemapPage,
  updateSitemapCategory,
  updateSitemapGeneral,
  updateFeed,
  updateLatest,
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
    const originValue = url.searchParams.get("origin");
    const domain = url.searchParams.get("domain");
    const keyA = url.searchParams.get("keyA");
    const keyB = url.searchParams.get("keyB");
    const keyC = url.searchParams.get("keyC");
    const keyD = url.searchParams.get("keyD");
    const keyE = url.searchParams.get("keyE");
    const keyF = url.searchParams.get("keyF");
    const keyG = url.searchParams.get("keyG");
    const keyH = url.searchParams.get("keyH");

    if (!originValue) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: origin",
      });
    }

    const originItem = await origin.getOne({ origin: originValue });

    const siteItems = !domain
      ? await site.getMany({ filter: { origin: originValue } })
      : await site.getMany({ filter: { origin: originValue, domain } });

    if (!originItem) {
      return res.status(404).json({
        ok: false,
        error: "Origin not found",
      });
    }

    const items = [];

    for (siteItem of siteItems) {
      const payload = {
        id: siteItem._id,
        host: siteItem.domain,
        baseUrl: `https://${siteItem.domain}`,
        origin: siteItem.origin,
        name: siteItem.name,
        icon: siteItem.icon || originItem.icon,
        logo: siteItem.logo || originItem.logo,
        wordmark: siteItem.wordmark,
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
        config: {
          ...originItem.config,
          ...siteItem.config,
        },
      };
      const robotsTxt = `User-agent: *\nAllow: /\nDisallow: /admin\n\nHost: ${payload.baseUrl}\nSitemap: ${payload.baseUrl}/sitemap.xml`;

      if (keyA === "true") {
        await updateSite(siteItem.domain, payload);
      }
      if (keyB === "true") {
        await updateAdsTxt(siteItem.domain, payload.ads?.adsTxt);
      }
      if (keyC === "true") {
        await updateSitemapGeneral(siteItem.domain);
      }
      if (keyD === "true") {
        await updateSitemapPage(siteItem.domain, payload.pages);
      }
      if (keyE === "true") {
        await updateSitemapCategory(siteItem.domain, payload.categories);
      }
      if (keyF === "true") {
        await updateRobotsTxt(siteItem.domain, robotsTxt);
      }
      if (keyG === "true") {
        await updateFeed(siteItem.domain);
      }
      if (keyH === "true") {
        await updateLatest(siteItem.domain);
      }

      items.push(payload.host);
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
