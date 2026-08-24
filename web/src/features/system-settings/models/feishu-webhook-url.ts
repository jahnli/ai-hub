const feishuRobotWebhookHost = 'open.feishu.cn'
const feishuRobotWebhookPathPrefix = '/open-apis/bot/v2/hook/'

export function isValidFeishuRobotWebhookUrl(value: string): boolean {
  const trimmedValue = value.trim()
  if (!trimmedValue) return true

  try {
    const parsedUrl = new URL(trimmedValue)
    const webhookToken = parsedUrl.pathname.startsWith(
      feishuRobotWebhookPathPrefix
    )
      ? parsedUrl.pathname.slice(feishuRobotWebhookPathPrefix.length)
      : ''

    return (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname.toLowerCase() === feishuRobotWebhookHost &&
      parsedUrl.port === '' &&
      parsedUrl.username === '' &&
      parsedUrl.password === '' &&
      parsedUrl.search === '' &&
      parsedUrl.hash === '' &&
      /^[A-Za-z0-9_-]+$/.test(webhookToken)
    )
  } catch {
    return false
  }
}
