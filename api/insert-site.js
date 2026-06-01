// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");
const { redis } = require("../database/redis/index");

module.exports = async (req, res) => {
  res.setHeader(
    "Cache-Control",
    "public, max-age=30, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400",
  );

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  /*Body: {
    items: [ { name: "Hot News", domain: "www.hotzxgirl.online", theme: "news", siteCategory: "News" }];
    }*/

  try {
    const body = req.body || {};
    const items = body.items;

    // chỉ cho phép 1 mode
    if (!items.length) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: items",
      });
    }
    const results = [];
    for (const item of items) {
      const payload = {
        ...item,
        origin: item.domain.substring(item.domain.indexOf(".") + 1),
      };
      const result = await site.insertOne({ payload: payload });
      results.push(result.doc.domain);
    }
    // results.push(payload);

    return res.status(200).json({
      ok: true,
      count: results.length,
      sites: results,
    });
  } catch (err) {
    console.log("[api/insert-site] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
