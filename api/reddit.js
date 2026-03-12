// export default async function handler(req, res) {
//   const { url } = req.query;

//   if (!url || !url.startsWith("https://www.reddit.com/")) {
//     return res.status(400).json({ error: "Invalid URL" });
//   }

//   // Use a public CORS proxy
//   const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

//   try {
//     const response = await fetch(proxyUrl, {
//       headers: {
//         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
//       },
//     });

//     if (!response.ok) {
//       return res.status(response.status).json({ error: `Request returned ${response.status}` });
//     }

//     const data = await response.json();
//     return res.status(200).json(data);
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// }


// export default async function handler(req, res) {
//   const { url } = req.query;

//   if (!url) {
//     return res.status(400).json({ error: "Missing url param" });
//   }

//   // Allow both Reddit and Arctic Shift URLs
//   const isReddit = url.startsWith("https://www.reddit.com/");
//   const isArcticShift = url.startsWith("https://arctic-shift.photon-reddit.com/");

//   if (!isReddit && !isArcticShift) {
//     return res.status(400).json({ error: "Invalid URL - only Reddit and Arctic Shift allowed" });
//   }

//   try {
//     const response = await fetch(url, {
//       headers: {
//         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
//         "Accept": "application/json",
//         "Accept-Language": "en-US,en;q=0.9",
//       },
//     });

//     if (!response.ok) {
//       return res.status(response.status).json({ error: "Request returned " + response.status });
//     }

//     const data = await response.json();
//     return res.status(200).json(data);
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// }


export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url param" });
  }

  const isReddit = url.startsWith("https://www.reddit.com/");
  const isArcticShift = url.startsWith("https://arctic-shift.photon-reddit.com/");

  if (!isReddit && !isArcticShift) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    // Use corsproxy for Reddit (they block Vercel IPs), direct for Arctic Shift
    const fetchUrl = isReddit
      ? `https://corsproxy.io/?${encodeURIComponent(url)}`
      : url;

    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Request returned " + response.status });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
