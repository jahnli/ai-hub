import VChart from '@visactor/vchart'
import type { ISpec } from '@visactor/vchart'
import type { DailyStat, ModelDailyStat, ModelStat, SubDepartmentStat, UserRankingItem } from '../types'

const CHART_WIDTH = 600
const CHART_HEIGHT = 360

export async function renderChartToBase64(
  spec: ISpec,
  width = CHART_WIDTH,
  height = CHART_HEIGHT
): Promise<string> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  container.style.opacity = '0'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  try {
    const chart = new VChart(
      { ...spec, animation: false, background: 'white' },
      { dom: container, mode: 'desktop-browser' }
    )
    await chart.renderAsync()
    const dataUrl: string = await chart.getDataURL()
    chart.release()
    return dataUrl
  } catch (e) {
    console.warn('Chart render failed:', e)
    return ''
  } finally {
    document.body.removeChild(container)
  }
}

function fmtTokens(v: number): string {
  if (v === 0) return '0'
  if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(2) + ' 亿'
  if (v >= 1_0000) return (v / 1_0000).toFixed(2) + ' 万'
  return v.toLocaleString()
}

function fmtCny(v: number): string {
  if (v === 0) return '¥0'
  return '¥' + v.toFixed(2)
}

function fmtLargeNum(v: number): string {
  if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(2) + ' 亿'
  if (v >= 1_0000) return (v / 1_0000).toFixed(2) + ' 万'
  return v.toLocaleString()
}

export function buildSubDeptBarSpec(subStats: SubDepartmentStat[]): ISpec {
  const sorted = [...subStats].sort((a, b) => b.total_tokens - a.total_tokens)
  return {
    type: 'bar',
    data: [{ values: sorted.map((s) => ({ name: s.department_name, value: s.total_tokens })) }],
    direction: 'horizontal',
    xField: 'value',
    yField: 'name',
    label: { visible: true, position: 'outside', formatMethod: (v: number) => fmtTokens(v) },
    bar: { style: { cornerRadius: [4, 4, 4, 4] } },
    axes: [
      { orient: 'left', type: 'band', label: { style: { fontSize: 11 }, formatMethod: (v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v } },
      { orient: 'bottom', type: 'linear', label: { formatMethod: (v: number) => fmtTokens(v) } },
    ],
    theme: 'light',
    background: 'white',
  } as unknown as ISpec
}

export function buildSubDeptPieSpec(subStats: SubDepartmentStat[]): ISpec {
  const sorted = [...subStats].sort((a, b) => b.total_quota - a.total_quota)
  const total = sorted.reduce((s, i) => s + i.total_quota / 500000, 0)
  return {
    type: 'pie',
    data: [{ values: sorted.filter((i) => i.total_quota > 0).map((i) => ({ name: i.department_name, value: i.total_quota / 500000 })) }],
    valueField: 'value',
    categoryField: 'name',
    outerRadius: 0.75,
    innerRadius: 0.45,
    label: { visible: true, position: 'outside', formatMethod: (_: unknown, d: { name?: string; value?: number }) => { const pct = total > 0 ? (((d.value ?? 0) / total) * 100).toFixed(1) + '%' : ''; return pct ? `${d.name} ${pct}` : d.name ?? '' } },
    legends: { visible: true, orient: 'bottom', type: 'discrete' },
    theme: 'light',
    background: 'white',
  } as unknown as ISpec
}

export function buildQuotaTrendSpec(dailyStats: DailyStat[]): ISpec {
  const values = dailyStats.map((d) => ({ date: d.date, value: d.total_quota / 500000 }))
  return {
    type: 'area',
    data: [{ values }],
    xField: 'date',
    yField: 'value',
    point: { visible: false },
    line: { style: { curveType: 'monotone' } },
    area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fontSize: 10 }, autoHide: true } },
      { orient: 'left', type: 'linear', label: { formatMethod: (v: number) => fmtCny(v) } },
    ],
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildRequestTrendSpec(dailyStats: DailyStat[]): ISpec {
  const values = dailyStats.map((d) => ({ date: d.date, value: d.total_requests }))
  return {
    type: 'area',
    data: [{ values }],
    xField: 'date',
    yField: 'value',
    point: { visible: false },
    line: { style: { curveType: 'monotone' } },
    area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fontSize: 10 }, autoHide: true } },
      { orient: 'left', type: 'linear', label: { formatMethod: (v: number) => fmtLargeNum(v) } },
    ],
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildTokenTrendSpec(dailyStats: DailyStat[]): ISpec {
  const values = dailyStats.map((d) => ({ date: d.date, value: d.total_tokens }))
  return {
    type: 'area',
    data: [{ values }],
    xField: 'date',
    yField: 'value',
    point: { visible: false },
    line: { style: { curveType: 'monotone' } },
    area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fontSize: 10 }, autoHide: true } },
      { orient: 'left', type: 'linear', label: { formatMethod: (v: number) => fmtTokens(v) } },
    ],
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildModelUsageTrendSpec(modelDailyStats: ModelDailyStat[]): ISpec | null {
  if (modelDailyStats.length === 0) return null
  return {
    type: 'line',
    data: [{ values: modelDailyStats.map((item) => ({ date: item.date, model: item.model_name, tokens: item.total_tokens })) }],
    xField: 'date',
    yField: 'tokens',
    seriesField: 'model',
    point: { visible: false },
    line: { style: { curveType: 'monotone' } },
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fontSize: 10 }, autoHide: true } },
      { orient: 'left', type: 'linear', label: { formatMethod: (v: number) => fmtTokens(v) } },
    ],
    legends: { visible: true, orient: 'bottom', type: 'discrete' },
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildModelCallRankSpec(modelStats: ModelStat[]): ISpec {
  const sorted = [...modelStats].sort((a, b) => a.total_requests - b.total_requests).slice(-15)
  return {
    type: 'bar',
    data: [{ values: sorted.map((m) => ({ name: m.model_name, value: m.total_requests })) }],
    direction: 'horizontal',
    xField: 'value',
    yField: 'name',
    label: { visible: true, position: 'outside', formatMethod: (v: number) => fmtLargeNum(v) },
    bar: { style: { cornerRadius: [0, 4, 4, 0] } },
    axes: [
      { orient: 'left', type: 'band', label: { style: { fontSize: 10 }, formatMethod: (v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v } },
      { orient: 'bottom', type: 'linear', label: { formatMethod: (v: number) => fmtLargeNum(v) } },
    ],
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildModelCostRankSpec(modelStats: ModelStat[]): ISpec {
  const sorted = [...modelStats].sort((a, b) => a.total_quota - b.total_quota).slice(-15)
  return {
    type: 'bar',
    data: [{ values: sorted.map((m) => ({ name: m.model_name, value: m.total_quota / 500000 })) }],
    direction: 'horizontal',
    xField: 'value',
    yField: 'name',
    label: { visible: true, position: 'outside', formatMethod: (v: number) => fmtCny(v) },
    bar: { style: { cornerRadius: [0, 4, 4, 0] } },
    axes: [
      { orient: 'left', type: 'band', label: { style: { fontSize: 10 }, formatMethod: (v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v } },
      { orient: 'bottom', type: 'linear', label: { formatMethod: (v: number) => fmtCny(v) } },
    ],
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildModelTokenDistSpec(modelStats: ModelStat[]): ISpec | null {
  const filtered = modelStats.filter((i) => i.total_tokens > 0)
  if (filtered.length === 0) return null
  const total = filtered.reduce((s, i) => s + i.total_tokens, 0)
  return {
    type: 'pie',
    data: [{ values: filtered.map((i) => ({ name: i.model_name, value: i.total_tokens })) }],
    valueField: 'value',
    categoryField: 'name',
    outerRadius: 0.75,
    innerRadius: 0.45,
    label: { visible: true, position: 'outside', formatMethod: (_: unknown, d: { name?: string; value?: number }) => { const pct = total > 0 ? (((d.value ?? 0) / total) * 100).toFixed(1) + '%' : ''; return pct ? `${d.name} ${pct}` : d.name ?? '' } },
    legends: { visible: true, orient: 'bottom', type: 'discrete' },
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildUserRankBarSpec(rankings: UserRankingItem[]): ISpec {
  const sorted = [...rankings].sort((a, b) => b.total_cost - a.total_cost).slice(0, 10)
  return {
    type: 'bar',
    data: [{ values: sorted.map((u) => ({ name: u.display_name || u.username, value: u.total_cost })) }],
    direction: 'horizontal',
    xField: 'value',
    yField: 'name',
    label: { visible: true, position: 'outside', formatMethod: (v: number) => fmtCny(v) },
    bar: { style: { cornerRadius: [4, 4, 4, 4] } },
    axes: [
      { orient: 'left', type: 'band', label: { style: { fontSize: 11 }, formatMethod: (v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v } },
      { orient: 'bottom', type: 'linear', label: { formatMethod: (v: number) => fmtCny(v) } },
    ],
    theme: 'light', background: 'white',
  } as unknown as ISpec
}

export function buildUserRankPieSpec(rankings: UserRankingItem[]): ISpec {
  const sorted = [...rankings].sort((a, b) => b.total_cost - a.total_cost).slice(0, 10)
  const total = sorted.reduce((s, u) => s + u.total_cost, 0)
  return {
    type: 'pie',
    data: [{ values: sorted.filter((u) => u.total_cost > 0).map((u) => ({ name: u.display_name || u.username, value: u.total_cost })) }],
    valueField: 'value',
    categoryField: 'name',
    outerRadius: 0.75,
    innerRadius: 0.45,
    label: { visible: true, position: 'outside', formatMethod: (_: unknown, d: { name?: string; value?: number }) => { const pct = total > 0 ? (((d.value ?? 0) / total) * 100).toFixed(1) + '%' : ''; return pct ? `${d.name} ${pct}` : d.name ?? '' } },
    legends: { visible: true, orient: 'bottom', type: 'discrete' },
    theme: 'light', background: 'white',
  } as unknown as ISpec
}
