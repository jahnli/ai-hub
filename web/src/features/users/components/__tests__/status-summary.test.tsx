import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'

import { UserStatusSummary } from '../user-status-summary'

describe('user status pagination summary', () => {
  test('shows localized enabled and disabled totals', async () => {
    const i18n = createInstance()
    await i18n.use(initReactI18next).init({
      lng: 'zh',
      nsSeparator: false,
      resources: {
        zh: {
          translation: {
            'Disabled:': '禁用：',
            'Enabled:': '启用：',
            'Total:': '总计：',
          },
        },
      },
    })

    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <UserStatusSummary
          totalCount={1234}
          enabledCount={1234}
          disabledCount={56}
        />
      </I18nextProvider>
    )

    assert.match(html, /总计：/)
    assert.match(html, /1,234/)
    assert.match(html, /启用：/)
    assert.match(html, /禁用：/)
    assert.match(html, /56/)
  })
})
