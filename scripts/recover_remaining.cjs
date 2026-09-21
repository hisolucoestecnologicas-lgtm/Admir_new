const fs = require('fs');
const https = require('https');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'admir_database.json');
const scrapedMediaPath = path.join(__dirname, '..', 'scraped_media.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const scraped = JSON.parse(fs.readFileSync(scrapedMediaPath, 'utf8'));

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
  console.log('=== FUZZY RECOVERY OF REMAINING PHOTOS ===');

  const missing = [];
  db.ambassadors.forEach(a => {
    if (a.photo) {
      const p = path.join(__dirname, '..', 'public', a.photo);
      if (!fs.existsSync(p)) {
        missing.push(a);
      }
    }
  });

  console.log(`Starting fuzzy search for ${missing.length} missing photos`);

  for (const amb of missing) {
    const originalFile = path.basename(amb.photo);
    const originalNameNoExt = path.basename(amb.photo, path.extname(amb.photo));
    
    // Try to find any scraped item that contains parts of the name
    // e.g., first 7 characters
    const part = originalNameNoExt.substring(0, 8).toLowerCase();
    const matches = scraped.filter(s => 
      (s.filename && s.filename.toLowerCase().includes(part)) ||
      (s.slug && s.slug.toLowerCase().includes(part))
    );

    let downloaded = false;
    if (matches.length > 0) {
      console.log(`Found ${matches.length} potential matches for "${amb.fullName}" (part: "${part}")`);
      for (const m of matches) {
        if (m.source_url) {
          console.log(`Trying URL: ${m.source_url} -> saving to ${amb.photo}`);
          const success = await downloadFile(m.source_url, path.join(__dirname, '..', 'public', amb.photo));
          if (success) {
            console.log(`SUCCESS: Downloaded fuzzy match for "${amb.fullName}"!`);
            downloaded = true;
            break;
          }
        }
      }
    }

    // If still not downloaded, try to download as .jpg instead of .png, or visa versa
    if (!downloaded) {
      const alternativeExt = path.extname(amb.photo) === '.png' ? '.jpg' : '.png';
      const altFilename = originalNameNoExt + alternativeExt;
      const altUrl = `https://admiramerican.com/wp-content/uploads/2026/03/${altFilename}`;
      console.log(`Trying direct alternative extension for "${amb.fullName}": ${altUrl}`);
      try {
        const success = await downloadFile(altUrl, path.join(__dirname, '..', 'public', amb.photo));
        if (success) {
          console.log(`SUCCESS with alt extension for "${amb.fullName}"!`);
          downloaded = true;
        } else {
          // try backup month
          const altUrlBackup = `https://admiramerican.com/wp-content/uploads/2026/02/${altFilename}`;
          const successBackup = await downloadFile(altUrlBackup, path.join(__dirname, '..', 'public', amb.photo));
          if (successBackup) {
            console.log(`SUCCESS with alt extension backup month for "${amb.fullName}"!`);
            downloaded = true;
          }
        }
      } catch (err) {
        console.log(`Failed direct alternative for "${amb.fullName}":`, err.message);
      }
    }

    if (!downloaded) {
      console.log(`Could not find any match for "${amb.fullName}"`);
    }
  }

  console.log('=== FUZZY RECOVERY PROCESS COMPLETE ===');
}

run();
