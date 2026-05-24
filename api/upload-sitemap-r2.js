// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const sitemapBuffer = require("../src/sitemap-buffer");
const sitemap = require("../src/sitemap");
const { r2 } = require("../database/r2/index");
const { MAX_DEFAULT_ITEMS } = require("../constants");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const sitemaps = await sitemap.getMany({
      filter: {
        totalItems: {
          $gte: MAX_DEFAULT_ITEMS,
        },
      },
    });

    const resutls = [];
    for (const sitemapItem of sitemaps) {
      const items = await sitemapBuffer.getMany({
        filter: {
          sitemapId: sitemapItem.sitemapId,
        },
      });

      const result = await r2.set(`sitemap:${sitemapItem.sitemapId}`, items);

      results.push(result);
      console.log(sitemapItem.domain, items.length);
    }

    return res.status(200).json({ ok: true, sitemaps, resutls });
  } catch (err) {
    console.log("[api/upload-to-r2] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
