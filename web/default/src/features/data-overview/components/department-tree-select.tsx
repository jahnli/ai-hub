import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ChevronRight, Building2, Check, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { DeptTreeNode } from '../types'

interface DepartmentTreeSelectProps {
  treeData: DeptTreeNode[]
  value?: string
  onValueChange: (deptId: string, node: DeptTreeNode) => void
  placeholder?: string
  disabled?: boolean
}

export function DepartmentTreeSelect(props: DepartmentTreeSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activePath, setActivePath] = useState<DeptTreeNode[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Restore path to selected node when opening
      if (props.value && props.treeData.length > 0) {
        const path = findNodePath(props.treeData, props.value)
        setActivePath(path)
      } else {
        setActivePath([])
      }
      setTimeout(() => searchInputRef.current?.focus(), 80)
    } else {
      setSearchQuery('')
    }
  }, [open, props.value, props.treeData])

  const selectedLabel = useMemo(() => {
    if (!props.value) return null
    return findLabel(props.treeData, props.value)
  }, [props.value, props.treeData])

  const handleHover = useCallback(
    (node: DeptTreeNode, depth: number) => {
      setActivePath((prev) => {
        const next = prev.slice(0, depth)
        next.push(node)
        return next
      })
    },
    []
  )

  const handleSelect = useCallback(
    (node: DeptTreeNode) => {
      if (node.disabled) return
      props.onValueChange(node.value, node)
      setOpen(false)
    },
    [props.onValueChange]
  )

  // Build cascader columns: column 0 = root list, column N = children of activePath[N-1]
  const columns = useMemo(() => {
    if (searchQuery.trim()) return [] // hide columns when searching
    const cols: DeptTreeNode[][] = [props.treeData]
    for (const pathNode of activePath) {
      if (pathNode.children.length > 0) {
        cols.push(pathNode.children)
      }
    }
    return cols
  }, [props.treeData, activePath, searchQuery])

  // Flat search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return flatSearch(props.treeData, searchQuery.toLowerCase())
  }, [props.treeData, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={props.disabled}
            className='h-8 min-w-[200px] max-w-[320px] justify-between gap-2 px-3 font-normal'
          />
        }
      >
        <div className='flex items-center gap-2 truncate'>
          <Building2 className='text-muted-foreground size-4 shrink-0' />
          <span className='truncate'>
            {selectedLabel ?? props.placeholder ?? t('Select department')}
          </span>
        </div>
        <ChevronRight className='text-muted-foreground size-3.5 shrink-0' />
      </PopoverTrigger>
      <PopoverContent
        side='bottom'
        align='start'
        sideOffset={4}
        className='w-auto max-w-[90vw] overflow-hidden p-0'
      >
        {/* Search bar */}
        <div className='border-b px-2.5 py-2'>
          <div className='bg-muted/50 flex items-center gap-2 rounded-md px-2'>
            <Search className='text-muted-foreground size-3.5 shrink-0' />
            <input
              ref={searchInputRef}
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search departments...')}
              className='placeholder:text-muted-foreground h-8 w-full min-w-[180px] bg-transparent text-sm outline-none'
            />
            {searchQuery && (
              <button
                type='button'
                tabIndex={-1}
                className='text-muted-foreground hover:text-foreground shrink-0'
                onClick={() => setSearchQuery('')}
              >
                <X className='size-3.5' />
              </button>
            )}
          </div>
        </div>

        {/* Cascader columns or search results */}
        {searchQuery.trim() ? (
          <SearchResultList
            results={searchResults}
            selectedValue={props.value}
            onSelect={handleSelect}
            emptyText={t('No departments found')}
          />
        ) : (
          <div className='flex'>
            {columns.map((nodes, colIdx) => (
              <CascaderColumn
                key={colIdx}
                nodes={nodes}
                depth={colIdx}
                activeNode={activePath[colIdx]}
                selectedValue={props.value}
                onHover={handleHover}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Cascader Column ───────────────────────────────────────────────

interface CascaderColumnProps {
  nodes: DeptTreeNode[]
  depth: number
  activeNode?: DeptTreeNode
  selectedValue?: string
  onHover: (node: DeptTreeNode, depth: number) => void
  onSelect: (node: DeptTreeNode) => void
}

function CascaderColumn(props: CascaderColumnProps) {
  return (
    <div
      className={cn(
        'flex min-w-[160px] max-w-[220px] flex-col overflow-y-auto py-1',
        props.depth > 0 && 'border-l'
      )}
      style={{ maxHeight: 'min(480px, 60vh)' }}
    >
      {props.nodes.map((node) => {
        const isActive = props.activeNode?.value === node.value
        const isSelected = props.selectedValue === node.value
        const hasChildren = node.children.length > 0

        return (
          <div
            key={node.value}
            role='option'
            aria-selected={isSelected}
            aria-disabled={node.disabled}
            className={cn(
              'mx-1 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
              node.disabled
                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                : 'hover:bg-accent',
              isActive && !node.disabled && 'bg-accent',
              isSelected && !node.disabled && 'text-primary font-medium'
            )}
            onMouseEnter={() => {
              if (!node.disabled) props.onHover(node, props.depth)
            }}
            onClick={() => props.onSelect(node)}
          >
            <span className='min-w-0 flex-1 truncate'>{node.label}</span>
            {isSelected && (
              <Check className='text-primary size-3.5 shrink-0' />
            )}
            {hasChildren && !isSelected && (
              <ChevronRight className='text-muted-foreground size-3.5 shrink-0' />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Search Results ────────────────────────────────────────────────

interface SearchResultListProps {
  results: { node: DeptTreeNode; breadcrumb: string }[]
  selectedValue?: string
  onSelect: (node: DeptTreeNode) => void
  emptyText: string
}

function SearchResultList(props: SearchResultListProps) {
  return (
    <div
      className='overflow-y-auto py-1'
      style={{ maxHeight: 'min(400px, 60vh)', minWidth: 260 }}
    >
      {props.results.length === 0 ? (
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {props.emptyText}
        </div>
      ) : (
        props.results.map((item) => {
          const isSelected = props.selectedValue === item.node.value
          return (
            <div
              key={item.node.value}
              role='option'
              aria-selected={isSelected}
              aria-disabled={item.node.disabled}
              className={cn(
                'mx-1 flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 transition-colors',
                item.node.disabled
                  ? 'text-muted-foreground cursor-not-allowed opacity-50'
                  : 'hover:bg-accent',
                isSelected && 'bg-accent'
              )}
              onClick={() => props.onSelect(item.node)}
            >
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'truncate text-sm',
                    isSelected && 'text-primary font-medium'
                  )}
                >
                  {item.node.label}
                </span>
                {isSelected && (
                  <Check className='text-primary size-3.5 shrink-0' />
                )}
              </div>
              {item.breadcrumb && (
                <span className='text-muted-foreground truncate text-[11px]'>
                  {item.breadcrumb}
                </span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function findLabel(nodes: DeptTreeNode[], value: string): string | null {
  for (const node of nodes) {
    if (node.value === value) return node.label
    const found = findLabel(node.children, value)
    if (found) return found
  }
  return null
}

function findNodePath(
  nodes: DeptTreeNode[],
  targetValue: string
): DeptTreeNode[] {
  for (const node of nodes) {
    if (node.value === targetValue) return [node]
    if (node.children.length > 0) {
      const childPath = findNodePath(node.children, targetValue)
      if (childPath.length > 0) return [node, ...childPath]
    }
  }
  return []
}

function flatSearch(
  nodes: DeptTreeNode[],
  query: string,
  ancestors: string[] = []
): { node: DeptTreeNode; breadcrumb: string }[] {
  const results: { node: DeptTreeNode; breadcrumb: string }[] = []
  for (const node of nodes) {
    const currentPath = [...ancestors, node.label]
    if (node.label.toLowerCase().includes(query)) {
      results.push({
        node,
        breadcrumb: ancestors.join(' / '),
      })
    }
    if (node.children.length > 0) {
      results.push(...flatSearch(node.children, query, currentPath))
    }
  }
  return results
}
