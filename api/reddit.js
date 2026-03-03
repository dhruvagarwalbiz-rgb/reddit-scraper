export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url param" });
  }

  // Switch to old.reddit.com which is less restrictive
  const redditUrl = url.replace("https://www.reddit.com/", "https://old.reddit.com/");

  try {
    const response = await fetch(redditUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Reddit returned ${response.status}` });
    }

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: "Reddit did not return JSON" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
