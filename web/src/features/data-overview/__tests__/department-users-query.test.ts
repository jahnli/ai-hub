import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  DEPARTMENT_USERS_INITIAL_PAGE_SIZE,
  DEPARTMENT_USERS_INITIAL_SORT_BY,
  DEPARTMENT_USERS_INITIAL_SORT_ORDER,
  isInitialDepartmentUsersQuery,
} from '../lib/department-users-query'

const initialQuery = {
  pageIndex: 0,
  pageSize: DEPARTMENT_USERS_INITIAL_PAGE_SIZE,
  sortBy: DEPARTMENT_USERS_INITIAL_SORT_BY,
  sortOrder: DEPARTMENT_USERS_INITIAL_SORT_ORDER,
}

describe('department users bootstrap query', () => {
  test('uses aggregated users for the initial table state', () => {
    assert.equal(isInitialDepartmentUsersQuery(initialQuery), true)
  })

  test('loads the standalone endpoint after pagination, sorting, or filtering', () => {
    assert.equal(
      isInitialDepartmentUsersQuery({ ...initialQuery, pageIndex: 1 }),
      false
    )
    assert.equal(
      isInitialDepartmentUsersQuery({ ...initialQuery, sortBy: 'username' }),
      false
    )
    assert.equal(
      isInitialDepartmentUsersQuery({
        ...initialQuery,
        registrationStatus: 'registered',
      }),
      false
    )
  })
})
