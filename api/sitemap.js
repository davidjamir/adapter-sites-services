// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const sitemapBuffer = require("../src/sitemap-buffer");
const sitemap = require("../src/sitemap");

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
    const domain = query.domain;
    const id = query.id;

    // chỉ cho phép 1 mode
    if ((!domain && !id) || (domain && id)) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain or id",
      });
    }

    // mode: domain -> lấy danh sách sitemap
    if (domain) {
      const items = await sitemap.getMany({
        filter: { domain },
      });

      return res.status(200).json({
        ok: true,
        items: items.map((i) => ({
          sitemapId: i.sitemapId,
          domain: i.domain,
          status: i.status,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
      });
    }

    // mode: id -> lấy sitemap item
    const sitemapItem = await sitemap.getOne({ filter: { sitemapId: id } });

    if (!sitemapItem) {
      return res.status(404).json({
        ok: false,
        error: "Sitemap not found",
      });
    }

    const items = await sitemapBuffer.getMany({
      filter: {
        sitemapId: sitemapItem.sitemapId,
      },
    });

    return res.status(200).json({
      ok: true,
      sitemapId: sitemapItem.sitemapId,
      items: items.map((i) => ({
        domain: i.domain,
        sitemapId: i.sitemapId,
        url: i.url,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
    });
  } catch (err) {
    console.log("[api/sitemap] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
