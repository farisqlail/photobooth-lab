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

async function debugTemplates() {
  console.log('Fetching templates from DB...');
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*');

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  console.log(`Found ${templates.length} templates in DB.`);

  for (const t of templates) {
    console.log('--------------------------------------------------');
    console.log(`ID: ${t.id}`);
    console.log(`Name: ${t.name}`);
    console.log(`File Path: ${t.file_path}`);

    if (t.file_path.startsWith('http')) {
      console.log('Status: Valid (External URL)');
    } else {
      // Check if file exists in storage
      // Note: list() works on folders, so we might need to list the root or the folder
      // But creating a signed URL is the ultimate test used in the frontend
      const { data: signedData, error: signedError } = await supabase.storage
        .from('templates')
        .createSignedUrl(t.file_path, 60);

      if (signedError) {
        console.error('Error creating signed URL:', signedError.message);
      } else {
         console.log('Signed URL created successfully.');
         // Optional: Verify if the signed URL is actually accessible (head request)
         // But usually if createSignedUrl works, the path format is valid.
         // However, createSignedUrl might return a URL even if file doesn't exist?
         // Let's check with list() to be sure if file exists.
      }
      
      // Check existence using list
      const dirname = path.dirname(t.file_path);
      const basename = path.basename(t.file_path);
      // If file_path is at root, dirname is '.'
      const searchDir = dirname === '.' ? '' : dirname;
      
      const { data: files, error: listError } = await supabase.storage
        .from('templates')
        .list(searchDir, {
            search: basename
        });
        
      if (listError) {
          console.error('Error listing files in storage:', listError.message);
      } else {
          const fileExists = files.some(f => f.name === basename);
          if (fileExists) {
              console.log('Status: File FOUND in storage bucket.');
          } else {
              console.log('Status: File NOT FOUND in storage bucket.');
              console.log('Files found in dir:', files.map(f => f.name));
          }
      }
    }
  }
}

debugTemplates();
