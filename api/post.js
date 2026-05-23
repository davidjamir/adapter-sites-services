const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const { formatPubDate } = require("../helper/date");
const storage = require("../src/storage");
const site = require("../src/site");
const { redis } = require("../database/redis/index");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const query = req.query || {};
    let domain = query.domain;
    const segment = query.segment;
    const slug = query.slug;

    // chỉ cho phép 1 mode
    if (!domain | !segment | !slug) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain, segment, slug",
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
    const item = await storage.getOne({
      filter: { domain: siteItem.domain, slug },
      databaseKey: Number(segment.slice(1)),
    });
    return res.status(200).json({
      ok: true,
      item: {
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
        createdAt: item.createdAt,
        content: item.content,
      },
    });
  } catch (err) {
    console.log("[api/post] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
