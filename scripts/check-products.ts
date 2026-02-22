
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load env
dotenv.config({ path: join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Use Service Role if available, or Anon

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    console.log('Checking products table...');
    const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1)
        .single();

    if (error) {
        console.error('Error accessing products:', error.message);
    } else {
        console.log('Products table accessible. Count result:', data);
    }

    console.log('Checking product_categories table...');
    const { data: catData, error: catError } = await supabase
        .from('product_categories')
        .select('count')
        .limit(1)
        .single();

    if (catError) {
        console.error('Error accessing product_categories:', catError.message);
    } else {
        console.log('Categories table accessible. Count result:', catData);
    }
}

checkProducts();
