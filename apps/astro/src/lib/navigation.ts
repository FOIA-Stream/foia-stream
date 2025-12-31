/**
 * Navigation utilities for handling URLs with proper origin preservation.
 * Ensures port is preserved when navigating (fixes redirect issues behind proxies).
 */

/**
 * Gets the current origin (protocol + hostname + port).
 * Works in both browser and SSR contexts.
 *
 * @example
 * getOrigin() // Returns "http://localhost:8080" in dev
 */
export function getOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // SSR fallback - return empty string (paths will be relative)
  return '';
}

/**
 * Creates a full URL from a path, preserving the current origin.
 *
 * @param path - The path to navigate to (e.g., '/login', '/dashboard')
 * @returns Full URL with origin (e.g., 'http://localhost:8080/login')
 *
 * @example
 * getFullUrl('/login') // Returns "http://localhost:8080/login" in dev
 */
export function getFullUrl(path: string): string {
  const origin = getOrigin();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

/**
 * Navigate to a path using full absolute URL (preserves port).
 * This is a drop-in replacement for `window.location.href = '/path'`.
 *
 * @param path - The path to navigate to (e.g., '/login', '/dashboard')
 *
 * @example
 * navigateTo('/login') // Navigates to "http://localhost:8080/login"
 */
export function navigateTo(path: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = getFullUrl(path);
  }
}

/**
 * Navigate to a path and replace current history entry.
 * Use this when you don't want the current page in history.
 *
 * @param path - The path to navigate to
 */
export function navigateReplace(path: string): void {
  if (typeof window !== 'undefined') {
    window.location.replace(getFullUrl(path));
  }
}
