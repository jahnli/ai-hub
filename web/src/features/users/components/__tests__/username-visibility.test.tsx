import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import type { UserColumnRow } from '../../types'
import { userNameColumn } from '../shared-user-columns'

const user: UserColumnRow = {
  id: 42,
  username: 'alice',
  display_name: 'Alice Example',
  avatar_url: 'https://example.com/alice.png',
  remark: 'Finance administrator',
  quota: 0,
  used_quota: 0,
  sub_quota_used: 0,
  sub_quota_total: 0,
  request_count: 0,
  group: 'default',
  status: 1,
  role: 1,
  open_id: 'ou_alice',
}

describe('shared username column visibility', () => {
  test('shows only the demo mask instead of user identity details in demo mode', () => {
    const column = userNameColumn<UserColumnRow>((key) => key, true)
    const cell = column.cell
    assert.equal(typeof cell, 'function')
    if (typeof cell !== 'function') {
      throw new TypeError('Expected the username column to provide a cell')
    }

    const element = cell({ row: { original: user } } as never)
    const html = renderToStaticMarkup(element as ReactElement)

    assert.match(html, /\*\*\*/)
    assert.doesNotMatch(html, /alice/i)
    assert.doesNotMatch(html, /Finance administrator/)
    assert.doesNotMatch(html, /<img|<a/)
  })
})
