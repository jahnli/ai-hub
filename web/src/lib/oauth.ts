// ============================================================================
// OAuth URL Builders
// ============================================================================

export interface CustomOAuthBinding {
  provider_id: number
  provider_name: string
  provider_slug: string
  provider_icon: string
  provider_user_id: string
}

export function indexCustomOAuthBindings(
  bindings: CustomOAuthBinding[]
): Map<number, CustomOAuthBinding> {
  return new Map(bindings.map((binding) => [binding.provider_id, binding]))
}

/**
 * Build OIDC OAuth URL
 */
export function buildOIDCOAuthUrl(
  authUrl: string,
  clientId: string,
  state: string
): string {
  const url = new URL(authUrl)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${window.location.origin}/oauth/oidc`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid profile email')
  url.searchParams.set('state', state)
  return url.toString()
}
