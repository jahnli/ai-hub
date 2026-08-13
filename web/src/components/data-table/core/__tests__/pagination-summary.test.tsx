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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'

import { DataTablePagination } from '../pagination'

describe('data table pagination summary', () => {
  test('renders the summary between total and page-size controls', async () => {
    const i18n = createInstance()
    await i18n.use(initReactI18next).init({
      lng: 'en',
      nsSeparator: false,
      resources: {
        en: {
          translation: {
            'Total:': 'Total:',
            'Rows per page': 'Rows per page',
            'Go to first page': 'Go to first page',
            'Go to previous page': 'Go to previous page',
            'Go to next page': 'Go to next page',
            'Go to last page': 'Go to last page',
            'Go to page {{page}}': 'Go to page {{page}}',
          },
        },
      },
    })

    const table = {
      getState: () => ({ pagination: { pageIndex: 0, pageSize: 20 } }),
      getPageCount: () => 2,
      getRowCount: () => 25,
      getCanPreviousPage: () => false,
      getCanNextPage: () => true,
    } as never

    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DataTablePagination
          table={table}
          summary={<span data-pagination-summary='true'>Status summary</span>}
        />
      </I18nextProvider>
    )

    const totalIndex = html.indexOf('Total:')
    const summaryIndex = html.indexOf('data-pagination-summary')
    const pageSizeIndex = html.indexOf('Rows per page')

    assert.notEqual(totalIndex, -1)
    assert.notEqual(summaryIndex, -1)
    assert.notEqual(pageSizeIndex, -1)
    assert.ok(totalIndex < summaryIndex)
    assert.ok(summaryIndex < pageSizeIndex)
  })
})
