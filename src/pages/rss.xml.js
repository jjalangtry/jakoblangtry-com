import postsData from "../../public/data/posts.json";

export async function GET() {
  const posts = postsData.posts || [];
  const siteUrl = "https://jakoblangtry.com";

  const items = posts
    .map((post) => {
      const link = `${siteUrl}/#blog-${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.summary || "")}</description>
      <content:encoded><![CDATA[${post.content || ""}]]></content:encoded>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Jakob Langtry - Blog</title>
    <link>${siteUrl}</link>
    <description>Blog posts from Jakob Langtry's terminal portfolio.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
