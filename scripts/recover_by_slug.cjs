const fs = require('fs');
const https = require('https');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'admir_database.json');
const scrapedTeamPath = path.join(__dirname, '..', 'scraped_team.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const team = JSON.parse(fs.readFileSync(scrapedTeamPath, 'utf8'));

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileStream = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      } else {
        fileStream.close();
        fs.unlinkSync(destPath);
        resolve(false);
      }
    }).on('error', (err) => {
      fileStream.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

async function run() {
  console.log('=== ADVANCED SLUG RECOVERY OF AMBASSADOR PHOTOS ===');

  let totalRecovered = 0;
  let totalMissing = 0;

  for (const amb of db.ambassadors) {
    if (amb.photo) {
      const p = path.join(__dirname, '..', 'public', amb.photo);
      if (!fs.existsSync(p)) {
        totalMissing++;
        // Get slug from ambassador ID
        const slug = amb.id.replace(/^amb-/, '');
        
        // Find team member with this slug
        const teamMember = team.find(t => t.slug === slug);
        if (teamMember) {
          // Look for embedded featured media URL
          let sourceUrl = null;
          if (teamMember._embedded && teamMember._embedded['wp:featuredmedia'] && teamMember._embedded['wp:featuredmedia'][0]) {
            sourceUrl = teamMember._embedded['wp:featuredmedia'][0].source_url;
          }

          if (sourceUrl) {
            console.log(`Found source URL for "${amb.fullName}": ${sourceUrl}`);
            try {
              const success = await downloadFile(sourceUrl, p);
              if (success) {
                console.log(`SUCCESS: Downloaded and mapped to ${amb.photo}`);
                totalRecovered++;
              } else {
                console.log(`FAILED to download from: ${sourceUrl}`);
              }
            } catch (err) {
              console.error(`Error downloading for "${amb.fullName}":`, err.message);
            }
          } else {
            console.log(`No featured media URL for slug "${slug}"`);
          }
        } else {
          console.log(`No team member matching slug "${slug}" in scraped_team.json`);
        }
      }
    }
  }

  console.log(`=== PROCESS COMPLETE: Recovered ${totalRecovered} out of ${totalMissing} missing photos ===`);
}

run();
