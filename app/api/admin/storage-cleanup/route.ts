import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';
import { getSession } from '@/lib/auth';
import { parseJsonField } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all listings
    const { data: listings, error: dbError } = await supabaseAdmin
      .from('listings')
      .select('image, images, videos');
    
    if (dbError) {
      return NextResponse.json({ error: 'Failed to fetch listings data' }, { status: 500 });
    }

    // 2. Extract valid active storage paths (relative to bucket root, e.g. "images/filename.webp")
    const activePaths = new Set<string>();

    listings?.forEach((listing: any) => {
      // Collect Main Image
      if (listing.image && typeof listing.image === 'string' && listing.image.includes('media.gadogaucho.com/')) {
        activePaths.add(listing.image.split('media.gadogaucho.com/')[1]);
      }
      
      // Collect Array Images
      const images = parseJsonField(listing.images) || [];
      images.forEach((url: string) => {
        if (url && typeof url === 'string' && url.includes('media.gadogaucho.com/')) {
          activePaths.add(url.split('media.gadogaucho.com/')[1]);
        }
      });

      // Collect Array Videos
      const videos = parseJsonField(listing.videos) || [];
      videos.forEach((url: string) => {
        if (url && typeof url === 'string' && url.includes('media.gadogaucho.com/')) {
          activePaths.add(url.split('media.gadogaucho.com/')[1]);
        }
      });
    });

    // 3. List objects from Cloudflare R2 in paths 'images/' and 'videos/'
    const listObjectsInPrefix = async (prefix: string) => {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
      });
      const response = await r2Client.send(command);
      return response.Contents || [];
    };

    const imageFiles = await listObjectsInPrefix('images/');
    const videoFiles = await listObjectsInPrefix('videos/');

    // 4. Determine orphans
    const pathsToRemove: string[] = [];
    
    // Check images
    imageFiles.forEach((file) => {
      if (!file.Key || file.Key.endsWith('/')) return; // Ignore directories/placeholders
      if (!activePaths.has(file.Key)) {
        pathsToRemove.push(file.Key);
      }
    });

    // Check videos
    videoFiles.forEach((file) => {
      if (!file.Key || file.Key.endsWith('/')) return;
      if (!activePaths.has(file.Key)) {
        pathsToRemove.push(file.Key);
      }
    });

    // 5. Delete orphans in chunks
    if (pathsToRemove.length === 0) {
      return NextResponse.json({ 
        success: true, 
        removed: 0, 
        checked: imageFiles.length + videoFiles.length 
      });
    }

    const chunkSize = 100;
    let totalRemoved = 0;
    
    for (let i = 0; i < pathsToRemove.length; i += chunkSize) {
      const chunkKeys = pathsToRemove.slice(i, i + chunkSize).map(key => ({ Key: key }));
      
      const command = new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: chunkKeys,
          Quiet: true,
        },
      });

      await r2Client.send(command);
      totalRemoved += chunkKeys.length;
    }

    return NextResponse.json({ 
      success: true, 
      removed: totalRemoved, 
      checked: imageFiles.length + videoFiles.length 
    });

  } catch (error: any) {
    console.error('Storage Cleanup API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
