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

/**
 * Generates an SEO friendly URL for a listing.
 * Format: /anuncio/[category]/[breed]/[city]/[id]
 */
export function getListingUrl(listing: any) {
  if (!listing) return '/';
  
  const category = slugify(listing.category || 'geral');
  const breed = slugify(listing.breed || 'geral');
  const city = slugify(listing.location || listing.seller_city || 'rs');
  const id = listing.id;

  return `/anuncio/${category}/${breed}/${city}/${id}`;
}

export const generateVideoThumbnail = (file: File, seekTo = 1.0): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail generation timed out after 4 seconds'));
    }, 4000);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      clearTimeout(timeoutId);
      try {
        URL.revokeObjectURL(video.src);
      } catch (e) {}
    };

    // Load video from file
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Seek to the specified time or midway if video is shorter
      const time = Math.min(seekTo, video.duration / 2);
      video.currentTime = time;
    };

    video.onseeked = () => {
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Se o navegador falhar em carregar os metadados reais e retornar 300x150 (padrão) ou 0
      if (!width || !height || (width === 300 && height === 150)) {
        width = 1280;
        height = 720;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        cleanup();
        return reject(new Error('Canvas context not available'));
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        cleanup();
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail blob'));
        }
      }, 'image/jpeg', 0.90); // 90% quality JPG
    };

    video.onerror = (e) => {
      cleanup();
      reject(new Error('Failed to load video file: ' + String(e)));
    };
  });
};

export const deleteMediaFromStorage = async (urls: string[]) => {
  if (!urls || urls.length === 0) return;
  
  const validUrls = urls.filter(url => url && url.includes('media.gadogaucho.com'));
  if (validUrls.length === 0) return;

  try {
    const res = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: validUrls })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Failed to delete media from storage:', err);
    }
  } catch (err) {
    console.error('Failed to delete media from storage:', err);
  }
};
