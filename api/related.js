const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const { formatPubDate } = require("../helper/date");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const { redis } = require("../database/redis/index");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_RELATED_POSTS = 3;

module.exports = async (req, res) => {
  // res.setHeader(
  //   "Cache-Control",
  //   "public, max-age=30, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400",
  // );

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  // if (!isAuthorized(req)) {
  //   return res.status(401).json({ ok: false, error: "Unauthorized" });
  // }

  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    let domain = url.searchParams.get("domain");
    const slug = url.searchParams.get("slug");
    const categories = url.searchParams.get("categories")
      ? url.searchParams.get("categories").split(",")
      : [];

    // chỉ cho phép 1 mode
    if (!domain || !slug) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain, categories, slug",
      });
    }

    if (domain.startsWith("localhost")) {
      domain = DEFAULT_DOMAIN_DEVELOPER;
    }

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      const siteCache = await redis.get(`related:${domain}:${slug}`);
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
    let items = await storageIndex.getMany({
      filter: {
        domain: siteItem.domain,
        categories: { $in: categories },
        slug: { $ne: slug },
      },
      indexDatabaseKey: siteItem.indexDatabaseKey,
      sort: { createdAt: -1 },
      limit: MAX_RELATED_POSTS,
    });

    if (items.length < MAX_RELATED_POSTS) {
      const fallback = await storageIndex.getMany({
        filter: {
          domain: siteItem.domain,
          slug: { $ne: slug },
        },
        indexDatabaseKey: siteItem.indexDatabaseKey,
        sort: { createdAt: -1 },
        limit: MAX_RELATED_POSTS - items.length,
      });

      items = [
        ...items,
        ...fallback.filter((x) => !items.some((y) => y.slug === x.slug)),
      ];
    }

    const newItems = items.map((item) => ({
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
      createdAt: formatPubDate(item.createdAt),
    }));

    if (process.env.REQUIRE_REDIS_CACHE === "true") {
      await redis.set(`related:${domain}:${slug}`, newItems, 600);
    }
    return res.status(200).json({
      ok: true,
      count: items.length,
      items: newItems,
    });
  } catch (err) {
    console.log("[api/related] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
