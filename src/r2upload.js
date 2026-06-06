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
    .replace(/>/g, "&gt;");

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
            <description>${siteRes.seo.description}</description>
            <title>${siteRes.seo.title}</title>
            <link>${siteRes.seo.canonicalUrl}</link>
            ${posts
              .map(
                (post) => `<item>
                <title><![CDATA[${post.title ?? ""}]]></title>
                <link>${siteRes.baseUrl}/post/${post.segment}/${post.slug}</link>
                <description><![CDATA[${post.snippet ?? ""}]]></description>
                <pubDate>${post.createdAt ?? ""}</pubDate>
                <author>${post.author ?? ""}</author>
                <guid isPermaLink="false">${post.id ?? ""}</guid>
                <language>en</language>
                <media:thumbnail url="${post.featuredImage}" caption="${attr(post.title)}"/>
                <flatplan:sponsor/>
                <flatplan:author name="${post.author}"/>
            </item>`,
              )
              .join("")}
        </channel>
    </rss>`;
}

export async function updateFeed(domain) {
  const xmlBody = await genFeed(domain);
  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/feed.xml`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/xml",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: xmlBody,
    },
  );

  return res.json();
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

  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/latest.json`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: JSON.stringify(payload),
    },
  );

  return res.json();
}

export async function updateAdsTxt(domain, payload) {
  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/ads.txt`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: payload,
    },
  );

  return res.json();
}

export async function updateRobotsTxt(domain, payload) {
  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/robots.txt`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: payload,
    },
  );

  return res.json();
}

export async function updateSite(domain, payload) {
  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/site.json`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: JSON.stringify(payload),
    },
  );

  return res.json();
}

function genSitemapGeneral(domain) {
  const sitemapItems = (
    await sitemap.getMany({
      filter: { domain },
    })
  ).map((i) => ({
    sitemapId: i.sitemapId,
    domain: i.domain,
    status: i.status,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));

  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
    <loc>https://${item.domain}</loc>
    <lastmod>2026-06-06T07:43:00.237Z</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1</priority>
    </url>
    <url>
    <loc>https://${item.domain}/sitemap-page.xml</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    </url>
    <url>
    <loc>https://${item.domain}/sitemap-category.xml</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    </url>
    ${ sitemapItems.map(item => {`<url>
      <loc>https://${item.domain}/sitemap-post/${item.sitemapId}.xml</loc>
      <lastmod>${new Date(item.updatedAt)}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>`})
    }
</urlset>`
}

export async function updateSitemapGeneral(domain) {

  const xmlSitemap = genSitemapGeneral(domain)

  const res = await fetch(
    `${process.env.ENDPOINT_STORAGE_GENERAL_R2}/${domain}/sitemap.xml`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/xml",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: xmlSitemap,
    },
  );

  return res.json();
}
