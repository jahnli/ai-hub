export function buildCCSwitchURL(
  app: string,
  name: string,
  models: Record<string, string>,
  apiKey: string
): string {
  const pageOrigin = window.location.origin
  const endpoint = app === 'codex' ? `${pageOrigin}/v1` : pageOrigin
  const params = new URLSearchParams()
  params.set('resource', 'provider')
  params.set('app', app)
  params.set('name', name)
  params.set('endpoint', endpoint)
  params.set('apiKey', apiKey)
  for (const [key, value] of Object.entries(models)) {
    if (value) params.set(key, value)
  }
  params.set('homepage', pageOrigin)
  params.set('enabled', 'true')
  return `ccswitch://v1/import?${params.toString()}`
}
