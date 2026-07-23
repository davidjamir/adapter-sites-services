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

function toSlug(str) {
  return str.trim().toLowerCase().replace(/\s+/g, "-");
}

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

    const networks = [];

    for (networkItem of originItem.networks) {
      const netItems = await site.getMany({
        filter: { networks: networkItem },
      });

      for (const item of netItems) {
        const site = {
          id: item._id,
          host: item.domain,
          baseUrl: `https://${item.domain}`,
          name: item.name,
          logo: item.logo || originItem.logo,
          entity: item.entity,
        };

        if (!item.league) {
          generalSites.push(site);
          continue;
        }

        if (!leagueMap.has(item.league)) {
          leagueMap.set(item.league, {
            slug: toSlug(item.league),
            name: item.league,
            sites: [],
          });
        }

        leagueMap.get(item.league).sites.push(site);
      }

      networks.push({
        slug: toSlug(networkItem),
        name: networkItem,
        leagues: [...leagueMap.values()],
        generalSites,
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
          colorHeader:
            siteItem.config?.colorHeader || originItem.config.colorHeader,
          colorTextHeader:
            siteItem.config?.colorTextHeader ||
            originItem.config?.colorTextHeader,
          visibledBreadcrumb:
            siteItem.config?.visibledBreadcrumb ??
            originItem.config.visibledBreadcrumb,
          customOpengraphImage:
            siteItem.config?.customOpengraphImage ??
            originItem.config.customOpengraphImage,
          enabledAds:
            siteItem.config?.enabledAds ?? originItem.config.enabledAds,
        },
        analytics: {
          gaId: siteItem.analytics?.gaId || originItem.analytics?.gaId || "",
          gtmId: siteItem.analytics?.gtmId || originItem.analytics?.gtmId || "",
        },
        socials: {
          facebook: siteItem.socials?.facebook || originItem.socials?.facebook,
          instagram:
            siteItem.socials?.instagram || originItem.socials?.instagram,
          threads: siteItem.socials?.threads || originItem.socials?.threads,
          x: siteItem.socials?.x || originItem.socials?.x,
          tiktok: siteItem.socials?.tiktok || originItem.socials?.tiktok,
          youtube: siteItem.socials?.youtube || originItem.socials?.youtube,
          telegram: siteItem.socials?.telegram || originItem.socials?.telegram,
          reddit: siteItem.socials?.reddit || originItem.socials?.reddit,
          pinterest:
            siteItem.socials?.pinterest || originItem.socials?.pinterest,
          discord: siteItem.socials?.discord || originItem.socials?.discord,
          whatsapp: siteItem.socials?.whatsapp || originItem.socials?.whatsapp,
          snapchat: siteItem.socials?.snapchat || originItem.socials?.snapchat,
          twitch: siteItem.socials?.twitch || originItem.socials?.twitch,
          linkedin: siteItem.socials?.linkedin || originItem.socials?.linkedin,
        },
        networks,
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
