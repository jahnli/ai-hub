import type { DepartmentQueryParams, DeptTreeNode } from '../types'

export function isDepartmentNodeDisabled(node: DeptTreeNode): boolean {
  return node.disabled || Boolean(node.error)
}

export function findDepartmentNodeByValue(
  nodes: DeptTreeNode[],
  value: string
): DeptTreeNode | null {
  for (const node of nodes) {
    if (node.value === value) return node
    const child = findDepartmentNodeByValue(node.children, value)
    if (child) return child
  }
  return null
}

export function findFirstSelectableNode(
  nodes: DeptTreeNode[]
): DeptTreeNode | null {
  for (const node of nodes) {
    if (!isDepartmentNodeDisabled(node)) return node
    const child = findFirstSelectableNode(node.children)
    if (child) return child
  }
  return null
}

export function createDepartmentQueryParams(
  node: DeptTreeNode,
  startTimestamp: number,
  endTimestamp: number
): DepartmentQueryParams {
  return {
    company_id: node.company_id ?? 0,
    department_id: node.value,
    start_timestamp: startTimestamp,
    end_timestamp: endTimestamp,
  }
}

export function getDepartmentNodeErrorText(
  node: DeptTreeNode,
  translate: (key: string, options: { error: string }) => string
): string | undefined {
  if (!node.error) return undefined
  return translate('Company data unavailable: {{error}}', {
    error: node.error,
  })
}
