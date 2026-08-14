import type { SystemStatus, OAuthProvider } from '../types'

export { buildOIDCOAuthUrl } from '@/lib/oauth'

// ============================================================================
// OAuth Providers Utilities
// ============================================================================

/**
 * Get available OAuth providers from system status
 */
export function getAvailableOAuthProviders(
  status: SystemStatus | null
): OAuthProvider[] {
  if (!status) return []

  const providers: OAuthProvider[] = []

  if (status.oidc_enabled) {
    providers.push({
      name: 'OIDC',
      type: 'oidc',
      enabled: true,
      clientId: status.oidc_client_id,
      authEndpoint: status.oidc_authorization_endpoint,
    })
  }

  return providers
}

/**
 * Check if any OAuth provider is available
 */
export function hasOAuthProviders(status: SystemStatus | null): boolean {
  if (!status) return false
  return !!(status.oidc_enabled || status.wechat_login)
}
