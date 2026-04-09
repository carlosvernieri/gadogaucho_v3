import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { parseJsonField } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all listings
    const { data: listings, error: dbError } = await supabaseAdmin.from('listings').select('image, images, videos');
    
    if (dbError) {
      return NextResponse.json({ error: 'Failed to fetch listings data' }, { status: 500 });
    }

    // 2. Extract valid active storage paths
    const activePaths = new Set<string>();

    listings?.forEach((listing: any) => {
        // Collect Main Image
        if (listing.image && typeof listing.image === 'string' && listing.image.includes('gado_gaucho_media/')) {
            activePaths.add(listing.image.split('gado_gaucho_media/')[1]);
        }
        
        // Collect Array Images
        const images = parseJsonField(listing.images) || [];
        images.forEach((url: string) => {
             if (url && typeof url === 'string' && url.includes('gado_gaucho_media/')) {
                 activePaths.add(url.split('gado_gaucho_media/')[1]);
             }
        });

        // Collect Array Videos
        const videos = parseJsonField(listing.videos) || [];
        videos.forEach((url: string) => {
             if (url && typeof url === 'string' && url.includes('gado_gaucho_media/')) {
                 activePaths.add(url.split('gado_gaucho_media/')[1]);
             }
        });
    });

    // 3. Fetch from bucket 'gado_gaucho_media' in paths 'images' and 'videos'
    const limitParams = { limit: 10000 };

    const { data: imageFiles, error: errorImg } = await supabaseAdmin.storage
      .from('gado_gaucho_media')
      .list('images', limitParams);
      
    const { data: videoFiles, error: errorVid } = await supabaseAdmin.storage
      .from('gado_gaucho_media')
      .list('videos', limitParams);

    if (errorImg || errorVid) {
         return NextResponse.json({ error: 'Failed to fetch files from storage' }, { status: 500 });
    }

    // 4. Determine orphans
    const pathsToRemove: string[] = [];
    
    // Add orphaned images
    imageFiles?.forEach((file: any) => {
        if (file.name === '.emptyFolderPlaceholder') return;
        const path = `images/${file.name}`;
        if (!activePaths.has(path)) {
            pathsToRemove.push(path);
        }
    });

    // Add orphaned videos
    videoFiles?.forEach((file: any) => {
        if (file.name === '.emptyFolderPlaceholder') return;
        const path = `videos/${file.name}`;
        if (!activePaths.has(path)) {
            pathsToRemove.push(path);
        }
    });

    // 5. Delete orphans
    if (pathsToRemove.length === 0) {
        return NextResponse.json({ 
            success: true, 
            removed: 0, 
            checked: (imageFiles?.length || 0) + (videoFiles?.length || 0) 
        });
    }

    // Split removal into chunks of 100 to avoid Supabase url length limits
    const chunkSize = 100;
    let totalRemoved = 0;
    
    for (let i = 0; i < pathsToRemove.length; i += chunkSize) {
        const chunk = pathsToRemove.slice(i, i + chunkSize);
        const { error: deletionError } = await supabaseAdmin.storage
        .from('gado_gaucho_media')
        .remove(chunk);

        if (deletionError) {
          console.error(`Error deleting chunk starting at index ${i}:`, deletionError);
          // depending on needs, you can throw or continue. We continue to try destroying as much as possible.
        } else {
            totalRemoved += chunk.length;
        }
    }

    return NextResponse.json({ 
        success: true, 
        removed: totalRemoved, 
        checked: (imageFiles?.length || 0) + (videoFiles?.length || 0) 
    });

  } catch (error: any) {
    console.error('Storage Cleanup API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
