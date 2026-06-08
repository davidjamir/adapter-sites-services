const { isAuthorized } = require("../helper/isAuthorized");
const { formatPubDate } = require("../helper/date");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const { DEFAULT_DOMAIN_DEVELOPER } = require("../constants");

const MAX_AGE = 0;
const S_MAX_AGE = 60 * 60 * 24 * 3; // 3 days
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
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    let domain = url.searchParams.get("domain");
    const q = url.searchParams.get("q");

    // chỉ cho phép 1 mode
    if (!domain && !q) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain or q",
      });
    }

    if (domain.startsWith("localhost")) {
      domain = DEFAULT_DOMAIN_DEVELOPER;
    }

    const siteItem = await site.getOne({ domain });
    if (!siteItem) {
      return res.status(404).json({
        ok: false,
        error: "Site not found",
      });
    }
    const items = (
      await storageIndex.getMany({
        filter: {
          domain: siteItem.domain,
          title: { $regex: q, $options: "i" },
        },
        indexDatabaseKey: siteItem.indexDatabaseKey,
        sort: { createdAt: -1 },
        limit: 20,
      })
    ).map((item) => ({
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

    res.setHeader(
      "Cache-Tag",
      `${siteItem.domain}, search-${siteItem.domain}, origin-${siteItem.origin}, search-cache`,
    );
    res.setHeader(
      "Vercel-Cache-Tag",
      `${siteItem.domain}, search-${siteItem.domain}, origin-${siteItem.origin}, search-cache`,
    );
    return res.status(200).json({
      ok: true,
      count: items.length,
      items: items,
    });
  } catch (err) {
    console.log("[api/search] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
