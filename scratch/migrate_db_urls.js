/**
 * Script de migração de URLs no banco de dados do Supabase.
 * 
 * Este script varre a tabela 'listings' e altera todos os links que apontavam para
 * o Supabase Storage antigo, fazendo-os apontar para o subdomínio do Cloudflare R2 (media.gadogaucho.com).
 * 
 * Execução:
 * node scratch/migrate_db_urls.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Carrega variáveis do .env.local de forma nativa
const envVars = {};
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      envVars[key] = val;
    });
  }
} catch (e) {
  console.warn('Erro ao carregar o arquivo .env.local:', e.message);
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Erro: Variáveis do Supabase faltando no arquivo .env.local');
  process.exit(1);
}

// Inicializa Supabase Admin (necessário para atualizar registros e ignorar RLS se aplicável)
const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false }
});

const OLD_URL_PREFIX = 'https://samxgkpylumzyvjmraju.supabase.co/storage/v1/object/public/gado_gaucho_media/';
const NEW_URL_PREFIX = 'https://media.gadogaucho.com/';

async function main() {
  console.log('Iniciando atualização de URLs no banco de dados...');

  // 1. Buscar todos os anúncios
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, image, images, videos');

  if (error) {
    console.error('Erro ao buscar anúncios:', error.message);
    process.exit(1);
  }

  console.log(`Encontrados ${listings.length} anúncios no total para verificar.`);
  let updatedCount = 0;

  for (const listing of listings) {
    let hasChanges = false;
    let updatedImage = listing.image;
    let updatedImages = listing.images;
    let updatedVideos = listing.videos;

    // Verificar campo 'image' (capa)
    if (updatedImage && updatedImage.includes(OLD_URL_PREFIX)) {
      updatedImage = updatedImage.replace(new RegExp(OLD_URL_PREFIX, 'g'), NEW_URL_PREFIX);
      hasChanges = true;
    }

    // Verificar campo 'images' (JSONB/array)
    if (Array.isArray(updatedImages)) {
      const newImages = updatedImages.map(img => {
        if (typeof img === 'string' && img.includes(OLD_URL_PREFIX)) {
          hasChanges = true;
          return img.replace(new RegExp(OLD_URL_PREFIX, 'g'), NEW_URL_PREFIX);
        }
        return img;
      });
      if (hasChanges) {
        updatedImages = newImages;
      }
    }

    // Verificar campo 'videos' (JSONB/array)
    if (Array.isArray(updatedVideos)) {
      const newVideos = updatedVideos.map(vid => {
        if (typeof vid === 'string' && vid.includes(OLD_URL_PREFIX)) {
          hasChanges = true;
          return vid.replace(new RegExp(OLD_URL_PREFIX, 'g'), NEW_URL_PREFIX);
        }
        return vid;
      });
      if (hasChanges) {
        updatedVideos = newVideos;
      }
    }

    // Se houve alterações, atualizar no banco de dados
    if (hasChanges) {
      console.log(`Atualizando URLs do anúncio ID ${listing.id}...`);
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          image: updatedImage,
          images: updatedImages,
          videos: updatedVideos
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`Erro ao atualizar anúncio ID ${listing.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 Atualização concluída! ${updatedCount} anúncios foram migrados para o novo storage R2.`);
}

main();
