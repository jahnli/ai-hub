/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, expect, test } from 'vitest'

import { resolveChatUrl } from '../lib/chat-links'

describe('chat link branding', () => {
  test('uses the ai-gateway identifier in AQBot configuration', () => {
    const resolved = resolveChatUrl({
      template: 'aqbot://providers?{aqbotConfig}',
      apiKey: 'secret',
      serverAddress: 'https://gateway.example',
    })

    expect(resolved).toContain('name=ai-gateway')
    expect(resolved).not.toContain('New%20API')
  })
})
