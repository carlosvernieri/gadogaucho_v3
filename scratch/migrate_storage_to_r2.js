/**
 * Script de migração de arquivos do Supabase Storage para o Cloudflare R2.
 * 
 * Este script deve ser executado no ambiente local onde as seguintes variáveis de ambiente estejam configuradas:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - CLOUDFLARE_R2_ACCESS_KEY_ID
 * - CLOUDFLARE_R2_SECRET_ACCESS_KEY
 * - CLOUDFLARE_R2_ENDPOINT
 * - CLOUDFLARE_R2_BUCKET_NAME
 * 
 * Requisitos:
 * npm install @aws-sdk/client-s3 dotenv
 */

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

// Carrega variáveis do .env.local de forma nativa para evitar dependência externa de 'dotenv'
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual === -1) return;
      const key = trimmed.substring(0, firstEqual).trim();
      let val = trimmed.substring(firstEqual + 1).trim();
      // Remove aspas simples ou duplas ao redor do valor
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    });
  }
} catch (e) {
  console.warn('Alerta: Erro ao carregar variáveis de ambiente do .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT; // Ex: https://<accountid>.r2.cloudflarestorage.com
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Erro: Variáveis do Supabase faltando no arquivo .env.local');
  process.exit(1);
}

if (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint || !r2BucketName) {
  console.error('Erro: Variáveis do Cloudflare R2 faltando no arquivo .env.local');
  process.exit(1);
}

// Inicializa Supabase Admin
const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false }
});

// Inicializa S3/R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey
  }
});

const BUCKET_NAME = 'gado_gaucho_media';

async function migrateFolder(folderName) {
  console.log(`\nIniciando migração da pasta: ${folderName}...`);
  
  // Listar arquivos no Supabase Storage
  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderName, { limit: 10000 });

  if (error) {
    console.error(`Erro ao listar arquivos em '${folderName}':`, error.message);
    return;
  }

  const filteredFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder');
  console.log(`Encontrados ${filteredFiles.length} arquivos para migrar em '${folderName}'.`);

  for (const file of filteredFiles) {
    const filePath = `${folderName}/${file.name}`;
    console.log(`Migrando [${filePath}]...`);

    try {
      // 1. Download do Supabase
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (downloadError) {
        console.error(`Erro ao baixar [${filePath}]:`, downloadError.message);
        continue;
      }

      // 2. Converter Blob para Buffer
      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determinar content-type simples
      let contentType = 'application/octet-stream';
      if (file.name.endsWith('.webp')) contentType = 'image/webp';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (file.name.endsWith('.png')) contentType = 'image/png';
      else if (file.name.endsWith('.mp4')) contentType = 'video/mp4';
      else if (file.name.endsWith('.webm')) contentType = 'video/webm';

      // 3. Upload para o Cloudflare R2
      await r2Client.send(new PutObjectCommand({
        Bucket: r2BucketName,
        Key: filePath,
        Body: buffer,
        ContentType: contentType
      }));

      console.log(`✅ Sucesso: [${filePath}] copiado para R2.`);
    } catch (err) {
      console.error(`❌ Falha na migração de [${filePath}]:`, err);
    }
  }
}

async function main() {
  try {
    await migrateFolder('images');
    await migrateFolder('videos');
    console.log('\n🎉 Processo de migração física finalizado!');
  } catch (err) {
    console.error('Erro na migração:', err);
  }
}

main();
