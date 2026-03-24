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
