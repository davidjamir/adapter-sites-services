// api/news-ingest.js
const { isAuthorized } = require("../helper/isAuthorized");
const { toStr } = require("../helper/toString");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const origin = require("../src/origin");

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
    domain = "news.thetimenews.co";

    // chỉ cho phép 1 mode
    if (!domain) {
      return res.status(400).json({
        ok: false,
        error: "Require exactly one of: domain",
      });
    }

    const siteItem = await site.getOne({ domain });
    if (!siteItem) {
      return res.status(404).json({
        ok: false,
        error: "Site not found",
      });
    }

    const originItem = await origin.getOne({ origin: siteItem.origin });

    return res.status(200).json({
      ok: true,
      site: {
        id: siteItem._id,
        host: siteItem.domain,
        origin: siteItem.origin,
        name: siteItem.name,
        icon: "/vercel.svg",
        logo: "/next.svg",
        theme: siteItem.theme,
        seo: {
          title: siteItem.domain,
          description: `${siteItem.domain} news site`,
          canonicalUrl: `https://${siteItem.domain}`,
        },
        ads: {
          adsTxt:
            "google.com, pub-1234567890, DIRECT, f08c47fec0942fa0 \ngoogle.com, pub-1234567890, DIRECT, f08c47fec0942fa0",
        },
        categories: [
          {
            id: "1",
            name: "Category 1",
            slug: "category-1",
          },
          {
            id: "2",
            name: "Category 2",
            slug: "category-2",
          },
        ],
        pages: [
          {
            id: "1",
            name: "Page 1",
            slug: "about",
          },
          {
            id: "2",
            name: "Page 2",
            slug: "disclamer",
          },
        ],
      },
    });
  } catch (err) {
    console.log("[api/site] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
