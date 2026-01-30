
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found at', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seedPaymentMethods() {
  const methods = [
    { name: 'Cash', type: 'cash', is_active: true, sort_order: 1 },
    { name: 'QRIS', type: 'non_cash', is_active: true, sort_order: 2 },
    { name: 'Event', type: 'non_cash', is_active: true, sort_order: 3 },
  ];

  for (const method of methods) {
    // Check if exists by name
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('name', method.name)
      .maybeSingle();

    if (!existing) {
      console.log(`Inserting ${method.name}...`);
      const { error } = await supabase
        .from('payment_methods')
        .insert(method);
      
      if (error) {
        console.error(`Error inserting ${method.name}:`, error.message);
      } else {
        console.log(`Inserted ${method.name}`);
      }
    } else {
      console.log(`${method.name} already exists.`);
    }
  }
}

seedPaymentMethods();
