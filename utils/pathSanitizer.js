/**
 * Path Sanitization Utilities
 * Ensures consistent file/folder naming across S3, database, and frontend
 */

/**
 * Sanitize a filename or folder name for S3 compatibility
 * @param {string} name - Original name
 * @param {boolean} preserveSpaces - Keep spaces (default: true)
 * @returns {string} Sanitized name
 */
export const sanitizePath = (name, preserveSpaces = true) => {
  if (!name) return '';
  
  let sanitized = name;
  
  // Remove/replace problematic characters
  // Replace: & ( ) [ ] { } < > " ' ` | ? * : \ / with -
  sanitized = sanitized.replace(/[&<>"'`|?*:\\\/\[\]{}()]/g, '-');
  
  // Normalize multiple spaces to single space
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // If preserveSpaces is false, replace spaces with dashes
  if (!preserveSpaces) {
    sanitized = sanitized.replace(/\s/g, '-');
  }
  
  // Remove leading/trailing spaces or dashes
  sanitized = sanitized.trim().replace(/^-+|-+$/g, '');
  
  // Remove multiple consecutive dashes
  sanitized = sanitized.replace(/-+/g, '-');
  
  return sanitized;
};

/**
 * Validate if a path is safe for S3 and URLs
 * @param {string} path - Path to validate
 * @returns {Object} { valid: boolean, issues: string[] }
 */
export const validatePath = (path) => {
  const issues = [];
  
  if (!path || path.trim() === '') {
    issues.push('Path is empty');
    return { valid: false, issues };
  }
  
  // Check for problematic characters
  const problematicChars = /[&<>"'`|?*:\\\/\[\]{}()]/g;
  if (problematicChars.test(path)) {
    const matches = path.match(problematicChars);
    issues.push(`Contains special characters: ${[...new Set(matches)].join(', ')}`);
  }
  
  // Check for multiple consecutive spaces
  if (/\s{2,}/.test(path)) {
    issues.push('Contains multiple consecutive spaces');
  }
  
  // Check for leading/trailing spaces
  if (path !== path.trim()) {
    issues.push('Has leading or trailing spaces');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Get sanitized version with validation results
 * @param {string} path - Original path
 * @param {boolean} preserveSpaces - Keep spaces
 * @returns {Object} { original, sanitized, changed, validation }
 */
export const sanitizeAndValidate = (path, preserveSpaces = true) => {
  const validation = validatePath(path);
  const sanitized = sanitizePath(path, preserveSpaces);
  
  return {
    original: path,
    sanitized,
    changed: path !== sanitized,
    validation
  };
};

/**
 * Extract folder name from ZIP filename
 * @param {string} zipFilename - Original ZIP filename (e.g., "Game Name (1).zip")
 * @param {boolean} sanitize - Whether to sanitize the result
 * @returns {string} Folder name without .zip extension
 */
export const getFolderNameFromZip = (zipFilename, sanitize = false) => {
  if (!zipFilename) return '';
  
  // Remove .zip extension
  let folderName = zipFilename.replace(/\.zip$/i, '');
  
  // Optionally sanitize
  if (sanitize) {
    folderName = sanitizePath(folderName, true); // Keep spaces by default
  }
  
  return folderName;
};

export default {
  sanitizePath,
  validatePath,
  sanitizeAndValidate,
  getFolderNameFromZip
};

