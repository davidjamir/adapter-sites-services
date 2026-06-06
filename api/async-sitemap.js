// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const sitemapBuffer = require("../src/sitemap-buffer");
const sitemap = require("../src/sitemap");
const { r2 } = require("../database/r2/index");
const { MAX_DEFAULT_ITEMS_EACH_SITEMAP } = require("../constants");

const { updateSitemapGeneral } = require("../src/r2upload");

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
    const option = url.searchParams.get("option");

    const siteItems = await site.getMany({ origin: originValue });

    const results = [];
    for (siteItem of siteItems) {
      const result = await updateSitemapGeneral(siteItem.domain);
      results.push(result);
    }

    return res.status(200).json({ ok: true, counts: results.length, results });
  } catch (err) {
    console.log("[api/upload-to-r2] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
