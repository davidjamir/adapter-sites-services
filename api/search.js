const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const { formatPubDate } = require("../helper/date");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const { redis } = require("../database/redis/index");

module.exports = async (req, res) => {
  res.setHeader(
    "Cache-Control",
    "public, max-age=30, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400",
  );

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  //   if (!isAuthorized(req)) {
  //     return res.status(401).json({ ok: false, error: "Unauthorized" });
  //   }

  try {
    const query = req.query || {};
    let domain = query.domain;
    const q = query.q;

    // chỉ cho phép 1 mode
    if (!domain && !q) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain or q",
      });
    }

    if (domain.startsWith("localhost")) {
      domain = "news.thetimenews.co";
    }

    const siteItem = await site.getOne({ domain });
    if (!siteItem) {
      return res.status(404).json({
        ok: false,
        error: "Site not found",
      });
    }
    const items = await storageIndex.getMany({
      filter: { domain: siteItem.domain, title: { $regex: q, $options: "i" } },
      indexDatabaseKey: siteItem.indexDatabaseKey,
      sort: { createdAt: -1 },
      limit: 20,
    });
    return res.status(200).json({
      ok: true,
      count: items.length,
      items: items.map((item) => ({
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
        tags: item.tags || ["Abc", "Xyz"],
        createdAt: formatPubDate(item.createdAt),
      })),
    });
  } catch (err) {
    console.log("[api/search] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
