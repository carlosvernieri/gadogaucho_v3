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
 * Masks a phone number in the format (xx) xxxx xxxxx.
 */
export function maskPhone(value: string) {
  if (!value) return "";
  value = value.replace(/\D/g, "");
  if (value.length > 11) value = value.slice(0, 11);
  
  if (value.length > 2) {
    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
  }
  if (value.length > 9) {
    value = `${value.slice(0, 9)}-${value.slice(9)}`;
  }
  return value;
}

/**
 * Validates an email address.
 */
export function validateEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
