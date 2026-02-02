const https = require('https');

const SUPABASE_URL = 'https://fsrptlzaqjkcutoiivjr.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcnB0bHphcWprY3V0b2lpdmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNjE2MDgyMiwiZXhwIjoyMDMxNzM2ODIyfQ.bRkzdRiQBJGfyc49L7wZhfA0V-uV-nam_AAX_F0S4vI';

function fetchTable(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL.replace('https://', '').replace('/', ''),
      path: `/rest/v1/${tableName}?select=*&limit=100`,
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
            console.error(`Error parsing JSON for ${tableName}:`, e);
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
  console.log('--- Job Applications ---');
  const apps = await fetchTable('job_applications');
  const suspApps = apps.filter((d) =>
    JSON.stringify(d).toLowerCase().includes('pecado')
  );
  console.log('Suspicious Applications:', suspApps);
}

check();
