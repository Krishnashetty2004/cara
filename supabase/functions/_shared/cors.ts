/**
 * CORS Configuration for Edge Functions
 *
 * Restricts API access to known origins only.
 * Add your app domains to the ALLOWED_ORIGINS list.
 */

// Allowed origins - add your production domains here
const ALLOWED_ORIGINS = [
  // Development
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'exp://localhost:8081',

  // Expo Go (for development)
  'exp://',

  // Production - add your actual domains
  // 'https://yourdomain.com',
  // 'https://app.yourdomain.com',
]

// Environment variable to override (comma-separated origins)
const CUSTOM_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')

/**
 * Get the list of allowed origins
 */
function getAllowedOrigins(): string[] {
  if (CUSTOM_ORIGINS) {
    return [...ALLOWED_ORIGINS, ...CUSTOM_ORIGINS.split(',').map((o) => o.trim())]
  }
  return ALLOWED_ORIGINS
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false

  const allowedOrigins = getAllowedOrigins()

  // Check exact match
  if (allowedOrigins.includes(origin)) return true

  // Check prefix match for Expo
  if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) return true

  // In development, allow all origins if DEV_MODE is set
  if (Deno.env.get('DEV_MODE') === 'true') return true

  return false
}

/**
 * Get CORS headers for a request
 * Returns appropriate headers based on origin validation
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')

  // For mobile apps without origin header, allow the request
  // Mobile apps don't send origin headers in the same way browsers do
  const isMobileApp = !origin && request.headers.get('x-client-info')?.includes('expo')

  // Base headers
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  }

  // Set origin header
  if (isMobileApp || isOriginAllowed(origin)) {
    // For mobile apps or allowed origins, reflect the origin or use *
    headers['Access-Control-Allow-Origin'] = origin || '*'
  } else if (Deno.env.get('DEV_MODE') === 'true') {
    // In dev mode, allow all
    headers['Access-Control-Allow-Origin'] = '*'
  } else {
    // Restrict to first allowed origin as default
    headers['Access-Control-Allow-Origin'] = getAllowedOrigins()[0] || ''
  }

  return headers
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(request) })
}

/**
 * Temporary permissive CORS headers for migration period
 * TODO: Remove this after all clients are updated to send proper auth headers
 */
export const PERMISSIVE_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
