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
 * Formats a phone number string to (xx) xxxx xxxxx.
 */
export function formatPhone(value: string) {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength <= 2) {
    return `(${phoneNumber}`;
  }
  if (phoneNumberLength <= 6) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  }
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)} ${phoneNumber.slice(6, 11)}`;
}

/**
 * Validates if a phone number is in the format (xx) xxxx xxxxx.
 */
export function isValidPhone(phone: string) {
  const phoneRegex = /^\(\d{2}\) \d{4} \d{5}$/;
  return phoneRegex.test(phone);
}
