import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getServerErrorMessageKey } from './server-error-message'

describe('server error message mapping', () => {
  test('maps the active-session limit to recovery instructions', () => {
    const message = getServerErrorMessageKey({ code: 'AUTH_SESSION_LIMIT' })

    assert.match(message ?? '', /Sign out other sessions/)
    assert.match(message ?? '', /reset your password/)
  })

  test('maps an Axios-shaped issuance limit to rolling-window guidance', () => {
    const message = getServerErrorMessageKey({
      response: { data: { code: 'AUTH_SESSION_ISSUANCE_LIMIT' } },
    })

    assert.match(message ?? '', /rolling window/)
    assert.equal(getServerErrorMessageKey({ code: 'UNKNOWN_CODE' }), null)
  })
})
