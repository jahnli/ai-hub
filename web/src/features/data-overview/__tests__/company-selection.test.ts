import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  createDepartmentQueryParams,
  findFirstSelectableNode,
  getDepartmentNodeErrorText,
  isDepartmentNodeDisabled,
} from '../lib/department-selection'
import type { DeptTreeNode } from '../types'

function createNode(overrides: Partial<DeptTreeNode>): DeptTreeNode {
  return {
    value: 'legacy-department',
    label: 'Department',
    disabled: false,
    children: [],
    ...overrides,
  }
}

describe('company-aware department selection', () => {
  test('uses the selected node company field for scoped requests', () => {
    const node = createNode({
      value: 'company:999',
      company_id: 42,
      node_type: 'company',
    })

    assert.deepEqual(createDepartmentQueryParams(node, 100, 200), {
      company_id: 42,
      department_id: 'company:999',
      start_timestamp: 100,
      end_timestamp: 200,
    })
  })

  test('rejects a legacy node without company metadata', () => {
    const node = createNode({ value: 'legacy-department-id' })

    assert.equal(isDepartmentNodeDisabled(node), true)
    assert.throws(
      () => createDepartmentQueryParams(node, 100, 200),
      /missing company_id/
    )
  })

  test('allows a backend-enabled directory-platform company (admin view)', () => {
    const feishuCompany = createNode({
      value: 'company:7',
      company_id: 7,
      platform: 'feishu',
      node_type: 'company',
      disabled: false,
      children: [
        createNode({
          value: 'dept:7:dept-a',
          company_id: 7,
          node_type: 'department',
          department_id: 'dept-a',
        }),
      ],
    })

    assert.equal(isDepartmentNodeDisabled(feishuCompany), false)
    assert.equal(findFirstSelectableNode([feishuCompany]), feishuCompany)
  })

  test('disables a directory-platform company when backend marks it disabled (BP/leader view)', () => {
    const feishuCompany = createNode({
      value: 'company:7',
      company_id: 7,
      platform: 'feishu',
      node_type: 'company',
      disabled: true,
      children: [
        createNode({
          value: 'dept:7:dept-a',
          company_id: 7,
          node_type: 'department',
          department_id: 'dept-a',
        }),
      ],
    })

    assert.equal(isDepartmentNodeDisabled(feishuCompany), true)
    assert.equal(findFirstSelectableNode([feishuCompany]), feishuCompany.children[0])
  })

  test('allows a none-platform company without children to be selected', () => {
    const noneCompany = createNode({
      value: 'company:7',
      company_id: 7,
      platform: 'none',
      node_type: 'company',
      children: [],
    })

    assert.equal(isDepartmentNodeDisabled(noneCompany), false)
    assert.equal(findFirstSelectableNode([noneCompany]), noneCompany)
  })

  test('disables an error node, exposes its error, and skips selection', () => {
    const errorCompany = createNode({
      value: 'company:8',
      company_id: 8,
      platform: 'feishu',
      node_type: 'company',
      error: 'tenant mismatch',
    })
    const availableCompany = createNode({
      value: 'company:9',
      company_id: 9,
      platform: 'none',
      node_type: 'company',
    })

    const errorText = getDepartmentNodeErrorText(
      errorCompany,
      (_key, options) => `Company data unavailable: ${options.error}`
    )

    assert.equal(isDepartmentNodeDisabled(errorCompany), true)
    assert.equal(errorText, 'Company data unavailable: tenant mismatch')
    assert.equal(
      findFirstSelectableNode([errorCompany, availableCompany]),
      availableCompany
    )
  })
})
