
const https = require("https");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  const home = await fetchText("https://admiramerican.com/");
  const favicons = [...home.matchAll(/<link[^>]+(?:icon|apple-touch-icon)[^>]+href=["']([^"']+)["'][^>]*>/gi)].map(m => m[0]);
  console.log("Favicons:", favicons);

  const about = await fetchText("https://admiramerican.com/about/");
  const aboutImgs = [...about.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[0]);
  console.log("About page images count:", aboutImgs.length);
  aboutImgs.forEach(img => {
    const src = img.match(/src=["']([^"']+)["']/i)?.[1];
    const alt = img.match(/alt=["']([^"']*?)["']/i)?.[1];
    console.log("ABOUT IMG:", src, "| ALT:", alt);
  });
})();
