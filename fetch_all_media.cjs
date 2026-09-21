
const https = require("https");
const fs = require("fs");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*"
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ json: JSON.parse(data), headers: res.headers });
        } catch (e) {
          reject(new Error("Parse error on " + url + ": " + data.slice(0, 150)));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log("Fetching all media items...");
  let allMedia = [];
  for (let page = 1; page <= 7; page++) {
    console.log("Fetching media page", page);
    try {
      const res = await fetchJson("https://admiramerican.com/wp-json/wp/v2/media?per_page=100&page=" + page);
      allMedia = allMedia.concat(res.json);
      console.log("Got", res.json.length, "items. Total so far:", allMedia.length);
      await sleep(300);
    } catch (err) {
      console.error("Error on page", page, err.message);
      break;
    }
  }

  fs.writeFileSync("scraped_media.json", JSON.stringify(allMedia, null, 2));
  console.log("Saved", allMedia.length, "media items to scraped_media.json");
}

main();
