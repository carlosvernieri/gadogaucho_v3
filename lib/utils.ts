import { supabase } from '@/lib/supabase';

/**
 * Safely stringifies an object, handling circular references.
 */
export const safeJsonStringify = (obj: any, indent = 0): string => {
  const cache = new Set();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    },
    indent
  );
};

/**
 * Parses a JSON field from the database, handling cases where it might be a string.
 */
export const parseJsonField = (field: any) => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return [];
    }
  }
  return field || [];
};

/**
 * Combines class names for Tailwind CSS.
 */
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Slugifies a string.
 */
export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Unslugifies a string, optionally matching against a list of known strings.
 */
export function unslugify(slug: string, list?: string[]) {
  if (list) {
    const found = list.find(item => slugify(item) === slug);
    if (found) return found;
  }
  
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const generateVideoThumbnail = (file: File, seekTo = 1.0): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Load video from file
    video.src = URL.createObjectURL(file);

    video.onloadeddata = () => {
      // Seek to the specified time or midway if video is shorter
      const time = Math.min(seekTo, video.duration / 2);
      video.currentTime = time;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        URL.revokeObjectURL(video.src);
        return reject(new Error('Canvas context not available'));
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(video.src);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail blob'));
        }
      }, 'image/jpeg', 0.85); // 85% quality JPG
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video file: ' + String(e)));
    };
  });
};

export const deleteMediaFromStorage = async (urls: string[]) => {
  if (!urls || urls.length === 0) return;
  const pathsToRemove = urls
    .filter(url => url && url.includes('supabase.co') && url.includes('gado_gaucho_media/'))
    .map(url => url.split('gado_gaucho_media/')[1])
    .filter(Boolean);

  if (pathsToRemove.length > 0) {
    try {
      await supabase.storage.from('gado_gaucho_media').remove(pathsToRemove);
    } catch(err) {
      console.error('Failed to delete media from storage:', err);
    }
  }
};
