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
// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { describe, expect, mock, test } from 'bun:test'

import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

mock.module('@/components/ui/alert-dialog', () => ({
  AlertDialog: (props: { children: ReactNode }) => <div>{props.children}</div>,
  AlertDialogCancel: (props: { children: ReactNode; disabled?: boolean }) => (
    <button type='button' disabled={props.disabled}>
      {props.children}
    </button>
  ),
  AlertDialogContent: (props: { children: ReactNode }) => (
    <section>{props.children}</section>
  ),
  AlertDialogDescription: (props: { children: ReactNode }) => (
    <div>{props.children}</div>
  ),
  AlertDialogFooter: (props: { children: ReactNode }) => (
    <footer>{props.children}</footer>
  ),
  AlertDialogHeader: (props: { children: ReactNode }) => (
    <header>{props.children}</header>
  ),
  AlertDialogTitle: (props: { children: ReactNode }) => (
    <h2>{props.children}</h2>
  ),
}))

mock.module('@/components/ui/button', () => ({
  Button: (props: { children: ReactNode; disabled?: boolean }) => (
    <button type='button' disabled={props.disabled}>
      {props.children}
    </button>
  ),
}))

mock.module('@/components/ui/spinner', () => ({
  Spinner: () => <span data-testid='loading-spinner'>Loading</span>,
}))

const { ConfirmDialog } = await import('../confirm-dialog')

describe('confirm dialog loading state', () => {
  test('shows a spinner and disables actions while loading', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title='Subscribe all users'
        desc='Description'
        handleConfirm={() => undefined}
        confirmText='Confirm subscribe all users'
        isLoading
      />
    )

    expect(html).toContain('data-testid="loading-spinner"')
    expect(html).toContain('Confirm subscribe all users')
    expect(html.match(/disabled=""/g)?.length).toBe(2)
  })
})
