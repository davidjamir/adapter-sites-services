const storageIndex = require("./storage-index");
const site = require("./site");
const origin = require("./origin");
const sitemap = require("./sitemap");

const { formatPubDate } = require("../helper/date");

const { DEFAULT_NUMBER_ITEMS_FEED } = require("../constants");

const attr = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;");

async function uploadR2General(domain, contentType, key, payload) {
  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/${key}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: payload,
    },
  );

  return res.json();
}

async function getLatestPosts(domain, indexDatabaseKey, limit) {
  return (
    await storageIndex.getMany({
      filter: { domain: domain },
      indexDatabaseKey: indexDatabaseKey,
      sort: { createdAt: -1 },
      limit: limit,
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
}

async function genFeed(domain) {
  const siteItem = await site.getOne({ domain });
  const originItem = await origin.getOne({ origin: siteItem.origin });

  const siteRes = {
    id: siteItem._id,
    host: siteItem.domain,
    baseUrl: `https://${siteItem.domain}`,
    origin: siteItem.origin,
    name: siteItem.name,
    icon: siteItem.icon || originItem.icon,
    logo: siteItem.icon || originItem.icon,
    theme: siteItem.theme || "news",
    siteCategory: siteItem.siteCategory,
    configView: siteItem.configView,
    ads: originItem.ads,
    script: originItem.script || [],
    categories: siteItem.categories?.length
      ? siteItem.categories
      : originItem.categories,
    pages: siteItem.pages?.length ? siteItem.pages : originItem.pages,
    verification: originItem.verification,
    seo: {
      title: siteItem.name || originItem.seo?.title,
      description: siteItem.description || originItem.seo?.description,
      canonicalUrl: `https://${siteItem.domain}`,
    },
    config: {
      ...originItem.config,
      ...siteItem.config,
    },
    analytics: {
      ...originItem?.analytics,
      ...siteItem?.analytics,
    },
  };

  const posts = await getLatestPosts(
    domain,
    siteItem.indexDatabaseKey,
    DEFAULT_NUMBER_ITEMS_FEED,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:mi="http://schemas.ingestion.microsoft.com/common/" xmlns:flatplan="https://www.wearemathematics.co.uk/flatplan-feedspec/">
        <channel>
            <atom:link href="${siteRes.baseUrl}/feed" rel="self" type="application/rss+xml" />
            <title><![CDATA[${siteRes.seo.title}]]></title>
            <description><![CDATA[${siteRes.seo.description}]]></description>
            <link>${siteRes.seo.canonicalUrl}</link>
            ${posts
              .map(
                (post) => `<item>
                <title><![CDATA[${post.title ?? ""}]]></title>
                <link>${siteRes.baseUrl}/post/${post.segment}/${attr(post.slug)}</link>
                <description><![CDATA[${post.snippet ?? ""}]]></description>
                <pubDate>${post.createdAt ?? ""}</pubDate>
                <author>${attr(post.author ?? "")}</author>
                <guid isPermaLink="false">${post.id ?? ""}</guid>
                <language>en</language>
                <media:thumbnail url="${attr(post.featuredImage)}" caption="${attr(post.title)}"/>
                <flatplan:sponsor/>
                <flatplan:author name="${attr(post.author)}"/>
            </item>`,
              )
              .join("")}
        </channel>
    </rss>`;
}

export async function updateFeed(domain) {
  const xmlBody = await genFeed(domain);
  return await uploadR2General(domain, "application/xml", "feed.xml", xmlBody);
}

export async function updateLatest(domain) {
  const siteItem = await site.getOne({ domain });
  const posts = await getLatestPosts(
    domain,
    siteItem.indexDatabaseKey,
    DEFAULT_NUMBER_ITEMS_FEED,
  );

  const payload = {
    ok: true,
    count: posts.length,
    items: posts,
  };

  return await uploadR2General(
    domain,
    "application/json",
    "latest.json",
    JSON.stringify(payload),
  );
}

export async function updateAdsTxt(domain, payload) {
  return await uploadR2General(domain, "text/plain", "ads.txt", payload);
}

export async function updateRobotsTxt(domain, payload) {
  return await uploadR2General(domain, "text/plain", "robots.txt", payload);
}

export async function updateSite(domain, payload) {
  return await uploadR2General(
    domain,
    "application/json",
    "site.json",
    JSON.stringify(payload),
  );
}

export async function genSitemapGeneral(domain) {
  const sitemapItems = await sitemap.getMany({
    filter: { domain },
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}</loc>
    <lastmod>2026-06-06T07:43:00.237Z</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1</priority>
  </url>
  <url>
    <loc>https://${domain}/sitemap-page.xml</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://${domain}/sitemap-category.xml</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  ${sitemapItems
    .map(
      (item) => `<url>
    <loc>https://${item.domain}/sitemap-post/${item.sitemapId}.xml</loc>
    <lastmod>${item.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("")}
</urlset>`;
}

export async function updateSitemapGeneral(domain) {
  const xmlSitemap = await genSitemapGeneral(domain);
  return await uploadR2General(
    domain,
    "application/xml",
    "sitemap.xml",
    xmlSitemap,
  );
}

export async function genSitemapItem(items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${items
    .map(
      (item) => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.updatedAt.toISOString()}</lastmod>
  </url>`,
    )
    .join("")}
</urlset>`;
}

export async function updateSitemapItem(domain, id, items) {
  const xmlSitemapItem = await genSitemapItem(items);
  return await uploadR2General(
    domain,
    "application/xml",
    `sitemap-post/${id}.xml`,
    xmlSitemapItem,
  );
}

async function genSitemapPageItems(domain, pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((page) => {
    return `  <url>
    <loc>https://${domain}${page.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;
}

export async function updateSitemapPage(domain, pages) {
  const xmlSitemapPageItem = await genSitemapPageItems(domain, pages);
  return await uploadR2General(
    domain,
    "application/xml",
    `sitemap-page.xml`,
    xmlSitemapPageItem,
  );
}

async function genSitemapCategoryItems(domain, categories) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories
  .map((category) => {
    return `  <url>
    <loc>https://${domain}${category.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;
}

export async function updateSitemapCategory(domain, categories) {
  const xmlSitemapCategoryItem = await genSitemapCategoryItems(
    domain,
    categories,
  );
  return await uploadR2General(
    domain,
    "application/xml",
    `sitemap-category.xml`,
    xmlSitemapCategoryItem,
  );
}
