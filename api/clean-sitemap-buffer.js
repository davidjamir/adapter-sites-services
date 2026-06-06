// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const sitemapBuffer = require("../src/sitemap-buffer");
const sitemap = require("../src/sitemap");
const { MAX_DEFAULT_ITEMS_EACH_SITEMAP } = require("../constants");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const sitemaps = await sitemap.getMany({
      filter: {
        dbMode: "mongodb",
        totalItems: {
          $gte: MAX_DEFAULT_ITEMS_EACH_SITEMAP,
        },
      },
    });

    const results = [];
    for (const sitemapItem of sitemaps) {
      const items = await sitemapBuffer.getMany({
        filter: {
          sitemapId: sitemapItem.sitemapId,
        },
      });

      const result = await sitemapBuffer.deleteMany({
        filter: { sitemapId: sitemapItem.sitemapId },
      });

      results.push(result);
      console.log("Clean sitemap items :", sitemapItem.domain, items.length);
    }

    return res.status(200).json({ ok: true, sitemaps, results });
  } catch (err) {
    console.log("[api/clean-sitemap-buffer] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
