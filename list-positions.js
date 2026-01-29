const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.ENV_SUPABASE_URL;
const supabaseKey = process.env.ENV_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing ENV_SUPABASE_URL or ENV_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fs = require('fs');

async function listPositions() {
  // Fetch positions
  const { data: positions, error: posError } = await supabase
    .from('positions')
    .select('id, name, department_id, company_id')
    .order('name');

  if (posError) {
    console.error('Error fetching positions:', posError);
    process.exit(1);
  }

  // Fetch employees to count usage
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, position_id');

  if (empError) {
    console.error('Error fetching employees:', empError);
    // Continue anyway, just without counts
  }

  const counts = {};
  if (employees) {
    employees.forEach((emp) => {
      if (emp.position_id) {
        counts[emp.position_id] = (counts[emp.position_id] || 0) + 1;
      }
    });
  }

  const result = positions.map((pos) => ({
    ...pos,
    employee_count: counts[pos.id] || 0,
  }));

  fs.writeFileSync(
    'positions-usage.json',
    JSON.stringify(result, null, 2),
    'utf8'
  );
  console.log('Data saved to positions-usage.json');
}

listPositions();
