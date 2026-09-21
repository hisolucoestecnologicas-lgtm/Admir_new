const fs = require('fs');
const https = require('https');
const path = require('path');

// Load database and scraped media
const dbPath = path.join(__dirname, '..', 'data', 'admir_database.json');
const scrapedMediaPath = path.join(__dirname, '..', 'scraped_media.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const scraped = JSON.parse(fs.readFileSync(scrapedMediaPath, 'utf8'));

// Helper to download a file
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    // Ensure parent directory exists
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
        fs.unlinkSync(destPath); // Delete empty file
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
  console.log('=== STARTING ADMIR MEDIA RECOVERY ===');
  
  const stats = {
    RECUPERADA_LOCALMENTE: 0,
    RECUPERADA_FONTE_OFICIAL: 0,
    ARQUIVO_EXISTENTE_COM_EXTENSÃO_DIFERENTE: 0,
    REFERÊNCIA_CORRIGIDA: 0,
    NÃO_LOCALIZADA: 0
  };

  // 1. Audit missing items in db.media
  const missingMedia = [];
  db.media.forEach(m => {
    const p = path.join(__dirname, '..', 'public', m.url);
    if (!fs.existsSync(p)) {
      missingMedia.push(m);
    } else {
      stats.RECUPERADA_LOCALMENTE++; // Already exists locally
    }
  });

  console.log(`Found ${missingMedia.length} missing records in db.media out of ${db.media.length}`);

  for (const item of missingMedia) {
    const filename = path.basename(item.url);
    const slugName = path.basename(item.url, path.extname(item.url));
    const dest = path.join(__dirname, '..', 'public', item.url);

    // Look for matching slug/filename in scraped_media
    const scrapedItem = scraped.find(s => 
      s.filename === filename || 
      s.slug === slugName || 
      (s.source_url && s.source_url.endsWith(filename))
    );

    let downloadUrl = null;
    if (scrapedItem && scrapedItem.source_url) {
      downloadUrl = scrapedItem.source_url;
    } else {
      // Try default fallback path based on common WP upload structures
      downloadUrl = `https://admiramerican.com/wp-content/uploads/2026/03/${filename}`;
    }

    try {
      console.log(`Downloading ${filename} from ${downloadUrl}...`);
      const success = await downloadFile(downloadUrl, dest);
      if (success) {
        console.log(`SUCCESS: Saved ${filename}`);
        stats.RECUPERADA_FONTE_OFICIAL++;
      } else {
        // Try other months/folders
        let backupUrl = `https://admiramerican.com/wp-content/uploads/2026/02/${filename}`;
        const secondTry = await downloadFile(backupUrl, dest);
        if (secondTry) {
          console.log(`SUCCESS (2nd try): Saved ${filename}`);
          stats.RECUPERADA_FONTE_OFICIAL++;
        } else {
          console.log(`FAILED: Could not download ${filename}`);
          stats.NÃO_LOCALIZADA++;
        }
      }
    } catch (e) {
      console.error(`Error downloading ${filename}:`, e.message);
      stats.NÃO_LOCALIZADA++;
    }
  }

  // 2. Audit and download any missing ambassador photos from db.ambassadors
  let missingAmbPhotosCount = 0;
  let recoveredAmbPhotosCount = 0;

  for (const amb of db.ambassadors) {
    if (amb.photo) {
      const p = path.join(__dirname, '..', 'public', amb.photo);
      if (!fs.existsSync(p)) {
        missingAmbPhotosCount++;
        const filename = path.basename(amb.photo);
        const slugName = path.basename(amb.photo, path.extname(amb.photo));
        
        // Find in scraped media
        const scrapedItem = scraped.find(s => 
          s.filename === filename || 
          s.slug === slugName || 
          (s.source_url && s.source_url.endsWith(filename))
        );

        let downloadUrl = null;
        if (scrapedItem && scrapedItem.source_url) {
          downloadUrl = scrapedItem.source_url;
        } else {
          downloadUrl = `https://admiramerican.com/wp-content/uploads/2026/03/${filename}`;
        }

        try {
          const success = await downloadFile(downloadUrl, p);
          if (success) {
            console.log(`SUCCESS: Recovered ambassador photo for ${amb.fullName}`);
            recoveredAmbPhotosCount++;
          } else {
            // Try 2026/02 or 2026/01
            const backupUrl = `https://admiramerican.com/wp-content/uploads/2026/02/${filename}`;
            const secondTry = await downloadFile(backupUrl, p);
            if (secondTry) {
              console.log(`SUCCESS: Recovered ambassador photo (backup URL) for ${amb.fullName}`);
              recoveredAmbPhotosCount++;
            } else {
              console.log(`FAILED: Could not recover photo for ${amb.fullName} (${filename})`);
            }
          }
        } catch (err) {
          console.error(`Error recovering ambassador photo ${filename}:`, err.message);
        }
      }
    }
  }

  console.log('=== ADMIR MEDIA RECOVERY COMPLETE ===');
  console.log('Stats on Media Library (db.media):', stats);
  console.log(`Ambassador Photos: ${missingAmbPhotosCount} missing originally, ${recoveredAmbPhotosCount} successfully recovered.`);
}

run();
