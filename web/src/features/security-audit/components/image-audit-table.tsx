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
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'

import { getImageAudit } from '../api'
import type { ImageAuditItem, ImageAuditPreviewTarget } from '../types'
import { useImageAuditColumns } from './image-audit-columns'
import { ImageAuditDetailDialog } from './image-audit-detail-dialog'
import { ImageAuditPreviewDialog } from './image-audit-preview-dialog'

const route = getRouteApi('/_authenticated/security-audit/$section')

interface ImageAuditTableProps {
  startTimestamp: number
  endTimestamp: number
  username: string
}

export function ImageAuditTable(props: ImageAuditTableProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = route.useParams()
  const search = route.useSearch()

  const pagination: PaginationState = {
    pageIndex: (search.page ?? 1) - 1,
    pageSize: search.pageSize ?? 20,
  }

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      void navigate({
        to: '/security-audit/$section',
        params,
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        }),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, params, pagination.pageIndex, pagination.pageSize]
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'security-audit',
      'image-studio',
      props.startTimestamp,
      props.endTimestamp,
      props.username,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      getImageAudit({
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        start_timestamp: props.startTimestamp,
        end_timestamp: props.endTimestamp,
        username: props.username || undefined,
      }),
    staleTime: 60 * 1000,
  })

  const items = useMemo(() => data?.data?.items ?? [], [data])
  const total = data?.data?.total ?? 0

  const [previewTarget, setPreviewTarget] =
    useState<ImageAuditPreviewTarget | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<ImageAuditItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handlePreview = useCallback((item: ImageAuditItem, index: number) => {
    setPreviewTarget({ item, index })
    setPreviewOpen(true)
  }, [])
  const handleViewDetail = useCallback((item: ImageAuditItem) => {
    setDetailItem(item)
    setDetailOpen(true)
  }, [])

  const columns = useImageAuditColumns(handlePreview, handleViewDetail)

  const { table } = useDataTable({
    data: items,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    pagination,
    onPaginationChange,
    manualPagination: true,
    manualFiltering: true,
    totalCount: total,
  })

  return (
    <>
      <DataTablePage
        table={table}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyTitle={t('No image generations')}
        emptyDescription={t(
          'No image generation records were found in this time range.'
        )}
        skeletonKeyPrefix='security-audit-image-studio'
        toolbarProps={null}
      />
      <ImageAuditPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        target={previewTarget}
      />
      <ImageAuditDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
        onPreview={handlePreview}
      />
    </>
  )
}
