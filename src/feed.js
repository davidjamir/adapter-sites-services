const storageIndex = require("./storage-index");
const { DEFAULT_NUMBER_ITEMS_FEED } = require("../constants");

async function genFeed(domain, indexDatabaseKey) {
  const posts = (
    await storageIndex.getMany({
      filter: { domain: domain },
      indexDatabaseKey: indexDatabaseKey,
      sort: { createdAt: -1 },
      limit: DEFAULT_NUMBER_ITEMS_FEED,
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

  return `
    <rss version="2.0"
        xmlns:atom="http://www.w3.org/2005/Atom"
        xmlns:media="http://search.yahoo.com/mrss/"
        xmlns:content="http://purl.org/rss/1.0/modules/content/"
        xmlns:mi="http://schemas.ingestion.microsoft.com/common/"
        xmlns:flatplan="https://www.wearemathematics.co.uk/flatplan-feedspec/">
      <channel>
        <atom:link
          href="${siteUrl}/feed"
          rel="self"
          type="application/rss+xml"
        />
        <description>${site.seo.description}</description>
        <title>${site.seo.title}</title>
        <link>${site.seo.canonicalUrl}</link>

        ${posts
          .map(
            (post) => `
          <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${siteUrl}/post/${post.segment}/${post.slug}</link>
            <description><![CDATA[${post.snippet}]]></description>
            <pubDate>${post.createdAt}</pubDate>
            <author>${post.author}</author>
            <guid isPermaLink="false">${post.id}</guid>
            <language>en</language>
            <media:thumbnail url="${post.featuredImage}" caption="${post.title}"/>
            <flatplan:sponsor/>
            <flatplan:author name="${post.author}"/>
          </item>
        `,
          )
          .join("")}

      </channel>
    </rss>
  `;
}

export async function updateFeed(domain, indexDatabaseKey) {
  const xmlBody = await genFeed(domain, indexDatabaseKey);
  const res = await fetch("https://your-worker-url/upload", {
    method: "PUT",
    headers: {
      "Content-Type": "application/xml",
      Authorization: `Bearer ${process.env.SECRET_STORAGE_R2_FEED}`,
    },
    body: xmlBody,
  });

  return res.json();
}
