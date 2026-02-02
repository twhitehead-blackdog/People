const https = require('https');

const SUPABASE_URL = 'https://fsrptlzaqjkcutoiivjr.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcnB0bHphcWprY3V0b2lpdmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNjE2MDgyMiwiZXhwIjoyMDMxNzM2ODIyfQ.bRkzdRiQBJGfyc49L7wZhfA0V-uV-nam_AAX_F0S4vI';

function fetchSchema() {
  return new Promise((resolve, reject) => {
    // Supabase exposes definitions via OpenAPI or we can try to query pg_catalog/information_schema if exposed via database function?
    // Supabase REST API doesn't expose information_schema directly usually unless configured.
    // access to "rpc" might work if there's a function.

    // Instead, I'll try to guess typical tables or just ask the user.
    // But let's try to query "/" to get the Swagger definition which lists paths (tables).
    const options = {
      hostname: SUPABASE_URL.replace('https://', '').replace('/', ''),
      path: '/rest/v1/?apikey=' + SUPABASE_KEY,
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
            // The root returns the OpenApi spec or similar description
            // Actually PostgREST root returns the API definition
            resolve(JSON.parse(data));
          } catch (e) {
            console.error('Error parsing JSON:', e);
            // Maybe it's not JSON, let's look at the text
            console.log('Response:', data.substring(0, 500));
            resolve({});
          }
        } else {
          console.error(`Error fetching root: ${res.statusCode} ${data}`);
          resolve({});
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Request error:`, e);
      reject(e);
    });

    req.end();
  });
}

async function check() {
  console.log('Fetching API definition...');
  const def = await fetchSchema();
  // PostgREST returns a JSON object where keys are table names in definitions
  if (def.definitions) {
    console.log('Tables found:', Object.keys(def.definitions));
  } else {
    console.log('Could not retrieve definitions. Raw keys:', Object.keys(def));
  }
}

check();
