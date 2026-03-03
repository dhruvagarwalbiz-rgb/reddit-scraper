export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("https://www.reddit.com/")) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  // Use a public CORS proxy
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Request returned ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
