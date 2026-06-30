import ExcelJS from 'exceljs'
import { t } from 'i18next'
import dayjs from '@/lib/dayjs'
import {
  renderChartToBase64,
  buildSubDeptBarSpec,
  buildSubDeptPieSpec,
  buildQuotaTrendSpec,
  buildRequestTrendSpec,
  buildTokenTrendSpec,
  buildModelUsageTrendSpec,
  buildModelCallRankSpec,
  buildModelCostRankSpec,
  buildModelTokenDistSpec,
  buildUserRankBarSpec,
  buildUserRankPieSpec,
} from './chart-to-image'
import type {
  DepartmentStat,
  DepartmentUser,
  DeptTreeNode,
  SubDepartmentStat,
  UsageAnalysis,
  UserRankingItem,
} from '../types'

function quotaToCny(quota: number): number {
  return quota / 500000
}

function fmtCny(value: number): string {
  if (value === 0) return '¥0.00'
  return '¥' + value.toFixed(2)
}

function fmtTokens(tokens: number): string {
  if (tokens === 0) return '0'
  if (tokens >= 1_0000_0000) return (tokens / 1_0000_0000).toFixed(2) + ' 亿'
  if (tokens >= 1_0000) return (tokens / 1_0000).toFixed(2) + ' 万'
  return tokens.toLocaleString()
}

function fmtRequests(count: number): string {
  if (count >= 1_0000) return (count / 1_0000).toFixed(2) + ' 万'
  return count.toLocaleString()
}

export function formatTimeRangeForFilename(
  startTs: number,
  endTs: number
): string {
  if (!startTs && !endTs) return dayjs().format('YYYY-MM-DD')

  const s = dayjs.unix(startTs)
  const e = dayjs.unix(endTs)
  const sameDay = s.isSame(e, 'day')
  const startMidnight = s.hour() === 0 && s.minute() === 0
  const endEod = e.hour() === 23 && e.minute() >= 59

  if (sameDay) {
    if (startMidnight && endEod) return s.format('YYYY-MM-DD')
    return `${s.format('YYYY-MM-DD HH:mm')}~${e.format('HH:mm')}`
  }
  if (startMidnight && endEod) {
    return `${s.format('YYYY-MM-DD')}~${e.format('YYYY-MM-DD')}`
  }
  return `${s.format('YYYY-MM-DD HH:mm')}~${e.format('YYYY-MM-DD HH:mm')}`
}

export function sanitizeSheetName(name: string): string {
  let s = name.replace(/[/\\?*[\]]/g, '').trim()
  if (s.length > 31) s = s.substring(0, 31)
  return s || 'Sheet'
}

function ensureUniqueSheetNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((raw) => {
    const base = sanitizeSheetName(raw)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    if (count === 0) return base
    const suffix = ` (${count})`
    return base.substring(0, 31 - suffix.length) + suffix
  })
}

export function findNodeByValue(
  nodes: DeptTreeNode[],
  value: string
): DeptTreeNode | null {
  for (const node of nodes) {
    if (node.value === value) return node
    const found = findNodeByValue(node.children, value)
    if (found) return found
  }
  return null
}

// ── Style constants ───────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
}
const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E2F3' },
}
const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8F9FA' },
}
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 24
}

function styleDataRow(row: ExcelJS.Row, alt: boolean): void {
  row.eachCell((cell) => {
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle' }
    if (alt) cell.fill = ALT_ROW_FILL
  })
}

function addSectionTitle(
  ws: ExcelJS.Worksheet,
  title: string,
  colSpan: number
): void {
  ws.addRow([])
  const row = ws.addRow([title])
  const cell = row.getCell(1)
  cell.font = { bold: true, size: 12 }
  cell.fill = SECTION_FILL
  cell.border = THIN_BORDER
  cell.alignment = { vertical: 'middle' }
  if (colSpan > 1) ws.mergeCells(row.number, 1, row.number, colSpan)
  row.height = 28
}

function addStatsTable(ws: ExcelJS.Worksheet, stat: DepartmentStat): void {
  const hdr = ws.addRow([t('Metric'), t('Value')])
  styleHeaderRow(hdr)

  const rows: [string, string][] = [
    [t('Total Tokens'), fmtTokens(stat.total_tokens)],
    [t('Total Cost'), fmtCny(quotaToCny(stat.total_quota))],
    [
      t('Avg Price') + '/MT',
      stat.avg_price_per_mt === 0
        ? '¥0.00'
        : fmtCny(stat.avg_price_per_mt),
    ],
    [t('Total Requests'), fmtRequests(stat.total_requests)],
    [t('Registered Count'), stat.registered_users.toLocaleString()],
    [t('Unregistered Count'), stat.unregistered_users.toLocaleString()],
    [t('Avg Response Time'), stat.avg_use_time.toFixed(1) + 's'],
    [t('Error Rate'), stat.error_rate.toFixed(1) + '%'],
  ]
  rows.forEach(([label, value], i) => {
    const r = ws.addRow([label, value])
    styleDataRow(r, i % 2 === 1)
    r.getCell(1).font = { bold: true }
  })
}

// ── Sheet builders ────────────────────────────────────

function buildMainSheet(wb: ExcelJS.Workbook, p: ExportParams): void {
  const ws = wb.addWorksheet(t('Data Overview'))

  const titleRow = ws.addRow([`${p.departmentName} - ${t('Data Overview')}`])
  titleRow.getCell(1).font = { bold: true, size: 16 }
  titleRow.height = 30

  const timeRange = formatTimeRangeForFilename(p.startTimestamp, p.endTimestamp)
  const tr = ws.addRow([`${t('Statistical Time')}: ${timeRange}`])
  tr.getCell(1).font = { size: 11, color: { argb: 'FF666666' } }
  ws.addRow([])

  addSectionTitle(ws, t('Overview'), 2)
  addStatsTable(ws, p.stats)
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 26

  if (p.subStats.length > 0) {
    addSectionTitle(ws, t('Sub-department Statistics'), 6)
    const hdr = ws.addRow([
      t('Department'),
      t('Registered Count'),
      t('Total Users'),
      t('Total Tokens'),
      t('Total Cost'),
      t('Request Count'),
    ])
    styleHeaderRow(hdr)

    ;[...p.subStats]
      .sort((a, b) => b.total_quota - a.total_quota)
      .forEach((sub, i) => {
        const r = ws.addRow([
          sub.department_name,
          sub.registered_users,
          sub.total_users,
          fmtTokens(sub.total_tokens),
          fmtCny(quotaToCny(sub.total_quota)),
          fmtRequests(sub.total_requests),
        ])
        styleDataRow(r, i % 2 === 1)
      })

    ws.getColumn(1).width = 25
    ws.getColumn(3).width = 12
    ws.getColumn(4).width = 18
    ws.getColumn(5).width = 15
    ws.getColumn(6).width = 15
  }
}

function buildSubDeptSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  detail: SubDepartmentDetail,
  timeRange: string
): void {
  const ws = wb.addWorksheet(sheetName)

  const titleRow = ws.addRow([
    `${detail.departmentName} - ${t('Data Overview')}`,
  ])
  titleRow.getCell(1).font = { bold: true, size: 16 }
  titleRow.height = 30

  const tr = ws.addRow([`${t('Statistical Time')}: ${timeRange}`])
  tr.getCell(1).font = { size: 11, color: { argb: 'FF666666' } }
  ws.addRow([])

  addSectionTitle(ws, t('Overview'), 2)
  addStatsTable(ws, detail.stats)
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 26

  if (detail.subStats.length > 0) {
    addSectionTitle(ws, t('Sub-department Statistics'), 6)
    const hdr = ws.addRow([
      t('Department'),
      t('Registered Count'),
      t('Total Users'),
      t('Total Tokens'),
      t('Total Cost'),
      t('Request Count'),
    ])
    styleHeaderRow(hdr)

    ;[...detail.subStats]
      .sort((a, b) => b.total_quota - a.total_quota)
      .forEach((sub, i) => {
        const r = ws.addRow([
          sub.department_name,
          sub.registered_users,
          sub.total_users,
          fmtTokens(sub.total_tokens),
          fmtCny(quotaToCny(sub.total_quota)),
          fmtRequests(sub.total_requests),
        ])
        styleDataRow(r, i % 2 === 1)
      })

    ws.getColumn(1).width = 25
    ws.getColumn(3).width = 12
    ws.getColumn(4).width = 18
    ws.getColumn(5).width = 15
    ws.getColumn(6).width = 15
  }
}

function buildUserListSheet(wb: ExcelJS.Workbook, p: ExportParams): void {
  const ws = wb.addWorksheet(t('Department User List'))

  const titleRow = ws.addRow([t('Department User List')])
  titleRow.getCell(1).font = { bold: true, size: 16 }
  titleRow.height = 30

  const timeRange = formatTimeRangeForFilename(p.startTimestamp, p.endTimestamp)
  const tr = ws.addRow([
    `${t('Department')}: ${p.departmentName}  |  ${t('Statistical Time')}: ${timeRange}`,
  ])
  tr.getCell(1).font = { size: 11, color: { argb: 'FF666666' } }
  ws.addRow([])

  const statusLabel = (s: number) =>
    s === 1 ? t('Enabled') : s === 2 ? t('Disabled') : String(s)
  const roleLabel = (r: number) => {
    if (r >= 100) return t('Super Admin')
    if (r >= 10) return t('Admin')
    return t('User')
  }

  addSectionTitle(ws, t('User List'), 10)
  const hdr = ws.addRow([
    t('ID'),
    t('Username'),
    t('Display Name'),
    t('Department'),
    t('Total Cost'),
    t('Total Tokens'),
    t('Requests'),
    t('Common Model'),
    t('Status'),
    t('Role'),
  ])
  styleHeaderRow(hdr)

  p.users.forEach((u, i) => {
    const r = ws.addRow([
      u.id,
      u.username,
      u.display_name || '',
      u.department_name || '',
      fmtCny(u.total_amount_cny ?? 0),
      fmtTokens(u.total_tokens ?? 0),
      fmtRequests(u.total_requests ?? 0),
      u.common_model || '',
      statusLabel(u.status),
      roleLabel(u.role),
    ])
    styleDataRow(r, i % 2 === 1)
  })

  const colWidths = [8, 18, 18, 25, 15, 18, 12, 28, 10, 12]
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  if (p.userRankings.length > 0) {
    const sorted = [...p.userRankings].sort(
      (a, b) => b.total_cost - a.total_cost
    )
    const top10 = sorted.slice(0, 10)
    const totalCost = sorted.reduce((s, u) => s + u.total_cost, 0)

    addSectionTitle(ws, t('User Consumption Ranking Top 10'), 4)
    const hdr1 = ws.addRow([
      t('Rank'),
      t('User'),
      t('Total Cost'),
      t('Total Tokens'),
    ])
    styleHeaderRow(hdr1)
    top10.forEach((u, i) => {
      const r = ws.addRow([
        i + 1,
        u.display_name || u.username,
        fmtCny(u.total_cost),
        fmtTokens(u.total_tokens),
      ])
      styleDataRow(r, i % 2 === 1)
    })

    addSectionTitle(ws, t('User Consumption Share Top 10'), 4)
    const hdr2 = ws.addRow([
      t('Rank'),
      t('User'),
      t('Total Cost'),
      t('Share'),
    ])
    styleHeaderRow(hdr2)
    top10.forEach((u, i) => {
      const pct =
        totalCost > 0
          ? ((u.total_cost / totalCost) * 100).toFixed(1) + '%'
          : '0%'
      const r = ws.addRow([
        i + 1,
        u.display_name || u.username,
        fmtCny(u.total_cost),
        pct,
      ])
      styleDataRow(r, i % 2 === 1)
    })
  }
}

// ── Public API ────────────────────────────────────────

export interface SubDepartmentDetail {
  departmentId: string
  departmentName: string
  stats: DepartmentStat
  subStats: SubDepartmentStat[]
  usage: UsageAnalysis
}

export interface ExportParams {
  departmentName: string
  startTimestamp: number
  endTimestamp: number
  stats: DepartmentStat
  subStats: SubDepartmentStat[]
  usage: UsageAnalysis
  userRankings: UserRankingItem[]
  includeSubDepartments: boolean
  subDepartmentDetails: SubDepartmentDetail[]
  includeUserList: boolean
  users: DepartmentUser[]
}

export async function exportDataOverview(params: ExportParams): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'New API'
  wb.created = new Date()

  buildMainSheet(wb, params)

  const mainWs = wb.getWorksheet(t('Data Overview'))!

  if (params.subStats.length > 0) {
    await embedSubDeptCharts(wb, mainWs, params.subStats)
  }

  if (params.userRankings.length > 0) {
    await embedUserRankingCharts(wb, mainWs, params.userRankings)
  }

  await embedUsageAnalysisCharts(wb, mainWs, params.usage)

  if (params.includeSubDepartments && params.subDepartmentDetails.length > 0) {
    const rawNames = params.subDepartmentDetails.map((d) => d.departmentName)
    const sheetNames = ensureUniqueSheetNames(rawNames)
    const timeRange = formatTimeRangeForFilename(
      params.startTimestamp,
      params.endTimestamp
    )
    for (let i = 0; i < params.subDepartmentDetails.length; i++) {
      const detail = params.subDepartmentDetails[i]
      buildSubDeptSheet(wb, sheetNames[i], detail, timeRange)
      const ws = wb.getWorksheet(sheetNames[i])!
      if (detail.subStats.length > 0) {
        await embedSubDeptCharts(wb, ws, detail.subStats)
      }
      await embedUsageAnalysisCharts(wb, ws, detail.usage)
    }
  }

  if (params.includeUserList) {
    buildUserListSheet(wb, params)
    if (params.userRankings.length > 0) {
      const ws = wb.getWorksheet(t('Department User List'))!
      await embedUserRankingCharts(wb, ws, params.userRankings)
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const timeRange = formatTimeRangeForFilename(
    params.startTimestamp,
    params.endTimestamp
  )
  const fileName = `${params.departmentName}_${t('Data Overview')}_${timeRange}.xlsx`
  triggerDownload(buffer as ArrayBuffer, fileName)
}

async function embedSubDeptCharts(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  subStats: SubDepartmentStat[]
): Promise<void> {
  const barSpec = buildSubDeptBarSpec(subStats)
  const barImg = await renderChartToBase64(barSpec, 560, Math.max(240, subStats.length * 34))
  const pieSpec = buildSubDeptPieSpec(subStats)
  const pieImg = await renderChartToBase64(pieSpec, 480, 360)

  const startRow = ws.rowCount + 2
  addImageToSheet(wb, ws, barImg, startRow, 0, 560, Math.max(240, subStats.length * 34))
  addImageToSheet(wb, ws, pieImg, startRow, 4, 480, 360)
}

async function embedUsageAnalysisCharts(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  usage: UsageAnalysis
): Promise<void> {
  const W = 560
  const H = 300
  let row = ws.rowCount + 2
  const dailyStats = usage.daily_stats ?? []
  const modelStats = usage.model_stats ?? []
  const modelDailyStats = usage.model_daily_stats ?? []

  if (dailyStats.length > 0) {
    const img1 = await renderChartToBase64(buildQuotaTrendSpec(dailyStats), W, H)
    addImageToSheet(wb, ws, img1, row, 0, W, H)
    const img2 = await renderChartToBase64(buildRequestTrendSpec(dailyStats), W, H)
    addImageToSheet(wb, ws, img2, row, 4, W, H)
    row += Math.ceil(H / 15) + 2

    const img3 = await renderChartToBase64(buildTokenTrendSpec(dailyStats), W, H)
    addImageToSheet(wb, ws, img3, row, 0, W, H)

    const modelTrendSpec = buildModelUsageTrendSpec(modelDailyStats)
    if (modelTrendSpec) {
      const img4 = await renderChartToBase64(modelTrendSpec, W, H)
      addImageToSheet(wb, ws, img4, row, 4, W, H)
    }
    row += Math.ceil(H / 15) + 2
  }

  if (modelStats.length > 0) {
    const barH = Math.max(240, Math.min(modelStats.length, 15) * 30)
    const img5 = await renderChartToBase64(buildModelCallRankSpec(modelStats), W, barH)
    addImageToSheet(wb, ws, img5, row, 0, W, barH)
    const img6 = await renderChartToBase64(buildModelCostRankSpec(modelStats), W, barH)
    addImageToSheet(wb, ws, img6, row, 4, W, barH)
    row += Math.ceil(barH / 15) + 2

    const distSpec = buildModelTokenDistSpec(modelStats)
    if (distSpec) {
      const img7 = await renderChartToBase64(distSpec, 480, 360)
      addImageToSheet(wb, ws, img7, row, 0, 480, 360)
    }
  }
}

async function embedUserRankingCharts(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  rankings: UserRankingItem[]
): Promise<void> {
  const barSpec = buildUserRankBarSpec(rankings)
  const barImg = await renderChartToBase64(barSpec, 560, Math.max(240, Math.min(rankings.length, 10) * 34))
  const pieSpec = buildUserRankPieSpec(rankings)
  const pieImg = await renderChartToBase64(pieSpec, 480, 360)

  const startRow = ws.rowCount + 2
  addImageToSheet(wb, ws, barImg, startRow, 0, 560, Math.max(240, Math.min(rankings.length, 10) * 34))
  addImageToSheet(wb, ws, pieImg, startRow, 4, 480, 360)
}

function addImageToSheet(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  dataUrl: string,
  row: number,
  col: number,
  width: number,
  height: number
): void {
  if (!dataUrl) return
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const imageId = wb.addImage({ base64, extension: 'png' })
  ws.addImage(imageId, {
    tl: { col, row },
    ext: { width, height },
  })
}

function triggerDownload(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
