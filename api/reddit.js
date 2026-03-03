export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("https://www.reddit.com/")) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RedditScraper/1.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Reddit returned ${response.status}` });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
