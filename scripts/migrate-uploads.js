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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  // Check/Create bucket
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError.message);
    return;
  }

  const bucketName = 'transactions';
  const bucketExists = buckets.some(b => b.name === bucketName);

  if (!bucketExists) {
    console.log(`Bucket '${bucketName}' not found. Creating...`);
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true // or false depending on requirements, usually true for reading images
    });
    if (createError) {
      console.error('Error creating bucket:', createError.message);
      return;
    }
    console.log(`Bucket '${bucketName}' created.`);
  } else {
    console.log(`Bucket '${bucketName}' exists.`);
  }

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found at', uploadsDir);
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files to upload...`);

  for (const file of files) {
    if (file.startsWith('.')) continue;

    const filePath = path.join(uploadsDir, file);
    const fileContent = fs.readFileSync(filePath);
    
    let contentType = 'application/octet-stream';
    if (file.endsWith('.png')) contentType = 'image/png';
    else if (file.endsWith('.webm')) contentType = 'video/webm';
    else if (file.endsWith('.gif')) contentType = 'image/gif';
    else if (file.endsWith('.html')) contentType = 'text/html';

    const storagePath = `migrated/${file}`;
    
    console.log(`Uploading ${file}...`);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileContent, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`Failed to upload ${file}:`, error.message);
    } else {
      console.log(`Success: ${storagePath}`);
    }
  }
  
  console.log('Migration complete.');
}

migrate();
