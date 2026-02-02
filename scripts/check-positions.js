const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://fsrptlzaqjkcutoiivjr.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcnB0bHphcWprY3V0b2lpdmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNjE2MDgyMiwiZXhwIjoyMDMxNzM2ODIyfQ.bRkzdRiQBJGfyc49L7wZhfA0V-uV-nam_AAX_F0S4vI';

function fetchTable(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL.replace('https://', '').replace('/', ''),
      path: `/rest/v1/${tableName}?select=name,id&limit=1000&order=name.asc`,
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            console.error(`Error parsing JSON fo ${tableName}:`, e);
            resolve([]);
          }
        } else {
          console.error(
            `Error fetching ${tableName}: ${res.statusCode} ${data}`
          );
          resolve([]);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Request error for ${tableName}:`, e);
      reject(e);
    });

    req.end();
  });
}

async function check() {
  console.log('Fetching positions...');
  const positions = await fetchTable('positions');
  fs.writeFileSync('positions_dump.json', JSON.stringify(positions, null, 2));
  console.log('Dumped to positions_dump.json');
}

check();
