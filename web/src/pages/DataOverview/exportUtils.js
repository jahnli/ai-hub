import ExcelJS from 'exceljs';
import { VChart } from '@visactor/vchart';
import { renderQuota, modelColorMap, API } from '../../helpers';
import { formatBucketTime } from '../../components/stats/StatsCharts';

function quotaNum(quota) {
  if (!quota || quota <= 0) return 0;
  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit'));
  const displayType = localStorage.getItem('quota_display_type') || 'USD';
  if (displayType === 'TOKENS') return quota;
  const usd = quota / quotaPerUnit;
  if (displayType === 'CNY') {
    let rate = 1;
    try { rate = JSON.parse(localStorage.getItem('status'))?.usd_exchange_rate || 1; } catch (e) {}
    return Number((usd * rate).toFixed(2));
  }
  if (displayType === 'CUSTOM') {
    let rate = 1;
    try { rate = JSON.parse(localStorage.getItem('status'))?.custom_currency_exchange_rate || 1; } catch (e) {}
    return Number((usd * rate).toFixed(2));
  }
  return Number(usd.toFixed(2));
}

function getQuotaFmt() {
  const displayType = localStorage.getItem('quota_display_type') || 'USD';
  if (displayType === 'TOKENS') return '#,##0';
  if (displayType === 'CNY') return '¥#,##0.00';
  if (displayType === 'CUSTOM') {
    let symbol = '¤';
    try { symbol = JSON.parse(localStorage.getItem('status'))?.custom_currency_symbol || '¤'; } catch (e) {}
    return `${symbol}#,##0.00`;
  }
  return '$#,##0.00';
}

function fmtRequest(num) {
  if (!num || num <= 0) return '-';
  if (num < 10000) return num.toLocaleString() + ' 次';
  return (num / 10000).toFixed(1) + ' 万';
}

function fmtToken(token) {
  if (!token || token <= 0) return '-';
  return (token / 1e8).toFixed(2) + ' 亿';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getChartCanvas(ref) {
  if (!ref?.current) return null;
  const chart = ref.current;
  if (typeof chart.getStage === 'function') {
    const stage = chart.getStage();
    if (stage && typeof stage.toCanvas === 'function') {
      const canvas = stage.toCanvas();
      if (canvas) return canvas;
    }
  }
  if (typeof chart.getCanvas === 'function') {
    const canvas = chart.getCanvas();
    if (canvas) return canvas;
  }
  if (typeof chart.getCompiler === 'function') {
    const compiler = chart.getCompiler();
    const stage = compiler?.getStage?.() || compiler?.getVGrammarView?.()?.renderer?.stage?.();
    if (stage && typeof stage.toCanvas === 'function') {
      const canvas = stage.toCanvas();
      if (canvas) return canvas;
    }
  }
  const container = chart._container || chart._option?.dom || chart.getContainer?.();
  if (container && container.querySelector) {
    const canvas = container.querySelector('canvas');
    if (canvas) return canvas;
  }
  return null;
}

async function getChartImage(ref, title) {
  if (!ref?.current) return null;
  try {
    const chart = ref.current;
    let chartCanvas = null;

    // If ref points to a DOM element directly, find canvas within it
    if (chart instanceof HTMLElement) {
      chartCanvas = chart.querySelector('canvas');
      if (!chartCanvas) return null;
    } else {
      // Priority 1: get canvas from DOM (already rendered at devicePixelRatio)
      const container = chart._container || chart._option?.dom || chart.getContainer?.();
      if (container && container.querySelector) {
        chartCanvas = container.querySelector('canvas');
      }

      // Priority 2: stage.toCanvas()
      if (!chartCanvas && typeof chart.getStage === 'function') {
        const stage = chart.getStage();
        if (stage && typeof stage.toCanvas === 'function') {
          chartCanvas = stage.toCanvas();
        }
      }

      // Priority 3: other methods
      if (!chartCanvas) chartCanvas = getChartCanvas(ref);

      // Priority 4: exportImg fallback
      if (!chartCanvas && typeof chart.exportImg === 'function') {
        const dataUrl = await chart.exportImg();
        if (dataUrl) {
          const img = new Image();
          await new Promise((resolve) => { img.onload = resolve; img.src = dataUrl; });
          chartCanvas = document.createElement('canvas');
          chartCanvas.width = img.width;
          chartCanvas.height = img.height;
          chartCanvas.getContext('2d').drawImage(img, 0, 0);
        }
      }

      if (!chartCanvas && typeof chart.getDataURL === 'function') {
        const dataUrl = await chart.getDataURL();
        if (dataUrl) {
          return { base64: dataUrl.split(',')[1], aspect: 16 / 9 };
        }
      }
    }

    if (!chartCanvas) return null;

    const srcW = chartCanvas.width;
    const srcH = chartCanvas.height;
    const titleScale = srcW / 600;
    const titleHeight = title ? Math.round(48 * titleScale) : 0;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = srcW;
    compositeCanvas.height = srcH + titleHeight;
    const ctx = compositeCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

    if (title) {
      ctx.fillStyle = '#1f2329';
      ctx.font = `bold ${Math.round(22 * titleScale)}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(title, Math.round(20 * titleScale), titleHeight / 2);
    }

    ctx.drawImage(chartCanvas, 0, titleHeight);
    const base64 = compositeCanvas.toDataURL('image/png').split(',')[1];
    const aspect = compositeCanvas.width / compositeCanvas.height;
    return { base64, aspect };
  } catch (e) {
    console.warn('Failed to get chart image', e);
    return null;
  }
}

async function addChartImages(wb, ws, chartRefs, startRow, startCol, sectionTitle) {
  let currentRow = startRow;
  if (sectionTitle) {
    const colStart = startCol + 1;
    const colEnd = startCol + 10;
    ws.mergeCells(currentRow, colStart, currentRow, colEnd);
    const cell = ws.getCell(currentRow, colStart);
    cell.value = sectionTitle;
    cell.font = { bold: true, size: 11, color: { argb: 'FF126DF5' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } };
    cell.alignment = { vertical: 'middle' };
    ws.getRow(currentRow).height = 22;
    currentRow += 2;
  }
  for (const { name, ref } of chartRefs) {
    const result = await getChartImage(ref, name);
    if (!result) continue;
    const { base64, aspect } = result;
    const imgWidth = 680;
    const imgHeight = Math.round(imgWidth / aspect);
    const imageId = wb.addImage({ base64, extension: 'png' });
    ws.addImage(imageId, {
      tl: { col: startCol, row: currentRow - 1 },
      ext: { width: imgWidth, height: imgHeight },
    });
    currentRow += Math.ceil(imgHeight / 18) + 2;
  }
  return currentRow;
}

function styleTitle(ws, row, col, text, colSpan) {
  if (colSpan > 1) ws.mergeCells(row, col, row, col + colSpan - 1);
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF126DF5' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(row).height = 30;
}

function styleSectionHeader(ws, row, col, text, colSpan) {
  if (colSpan > 1) ws.mergeCells(row, col, row, col + colSpan - 1);
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true, size: 11, color: { argb: 'FF126DF5' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } };
  cell.alignment = { vertical: 'middle' };
  ws.getRow(row).height = 22;
}

function styleTableHeader(ws, row, startCol, cols) {
  for (let i = 0; i < cols.length; i++) {
    const cell = ws.getCell(row, startCol + i);
    cell.value = cols[i];
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FA' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD6E4F0' } } };
  }
}

function sanitizeSheetName(name, existingNames = []) {
  let sanitized = name.replace(/[/\\?*[\]]/g, '').trim();
  if (!sanitized) sanitized = 'Sheet';
  sanitized = sanitized.slice(0, 31);
  let finalName = sanitized;
  let counter = 1;
  while (existingNames.includes(finalName)) {
    const suffix = `(${counter})`;
    finalName = sanitized.slice(0, 31 - suffix.length) + suffix;
    counter++;
  }
  return finalName;
}

async function fetchDeptStats(deptId, startTime, endTime) {
  try {
    const res = await API.get('/api/department/stats', {
      params: { dept_id: deptId, start_time: startTime, end_time: endTime },
    });
    if (res.data.success) return res.data.data;
  } catch (e) {
    console.warn(`Failed to fetch stats for dept ${deptId}`, e);
  }
  return null;
}

async function batchFetchDeptStats(deptIds, startTime, endTime, concurrency = 3) {
  const results = [];
  for (let i = 0; i < deptIds.length; i += concurrency) {
    const batch = deptIds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(id => fetchDeptStats(id, startTime, endTime))
    );
    results.push(...batchResults);
  }
  return results;
}

async function renderOffscreenChart(spec, width = 680, height = 400) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${width}px;height:${height}px;`;
    document.body.appendChild(container);

    const chart = new VChart(spec, { dom: container, animation: false });
    chart.renderSync();

    setTimeout(() => {
      try {
        const canvas = container.querySelector('canvas');
        if (!canvas) {
          chart.release();
          document.body.removeChild(container);
          resolve(null);
          return;
        }
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        const aspect = canvas.width / canvas.height;
        chart.release();
        document.body.removeChild(container);
        resolve({ base64, aspect });
      } catch (e) {
        console.warn('Offscreen chart render failed', e);
        try { chart.release(); } catch (_) {}
        try { document.body.removeChild(container); } catch (_) {}
        resolve(null);
      }
    }, 300);
  });
}

function getAggregationBucketSize(rangeKey) {
  switch (rangeKey) {
    case 'today':
    case 'yesterday':
      return 3600;
    case 'this_week':
    case 'last_week':
    case 'this_month':
    case 'last_month':
      return 86400;
    case 'this_quarter':
    case 'last_quarter':
      return 7 * 86400;
    case 'this_year':
    case 'last_year':
    case 'first_half':
    case 'second_half':
      return 30 * 86400;
    default:
      return 86400;
  }
}

function aggregateByGranularity(data, granularity) {
  if (!data || data.length === 0) return [];
  const bucketSize = getAggregationBucketSize(granularity);
  const buckets = new Map();
  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { created_at: bucketKey, quota: 0, count: 0, token_used: 0 });
    }
    const b = buckets.get(bucketKey);
    b.quota += item.quota || 0;
    b.count += item.count || 0;
    b.token_used += item.token_used || 0;
  }
  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

function aggregateTrendByModel(data, granularity) {
  if (!data || data.length === 0) return [];
  const bucketSize = getAggregationBucketSize(granularity);
  const buckets = new Map();
  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    const key = `${bucketKey}_${item.model_name}`;
    if (!buckets.has(key)) {
      buckets.set(key, { created_at: bucketKey, model_name: item.model_name, quota: 0, count: 0, token_used: 0 });
    }
    const b = buckets.get(key);
    b.quota += item.quota || 0;
    b.count += item.count || 0;
    b.token_used += item.token_used || 0;
  }
  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

function buildChartSpecs(statsData, granularity) {
  const specs = [];
  const rawTrendData = statsData.trend_data || [];
  const trendData = aggregateByGranularity(rawTrendData, granularity);
  const modelTrendAggregated = aggregateTrendByModel(rawTrendData, granularity);
  const modelDist = statsData.model_distribution || [];

  if (trendData.length > 0) {
    const quotaData = trendData.map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      额度: d.quota || 0,
    }));
    specs.push({
      name: '额度消耗趋势',
      spec: {
        type: 'area',
        data: [{ id: 'data', values: quotaData }],
        xField: 'Time', yField: '额度',
        area: { style: { fillOpacity: 0.3 } },
        point: { visible: false },
        width: 680, height: 400,
      },
    });

    const requestData = trendData.map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      请求次数: d.count || 0,
    }));
    specs.push({
      name: '请求次数趋势',
      spec: {
        type: 'area',
        data: [{ id: 'data', values: requestData }],
        xField: 'Time', yField: '请求次数',
        area: { style: { fillOpacity: 0.3 } },
        point: { visible: false },
        width: 680, height: 400,
      },
    });

    const tokenData = trendData.map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      'Token（亿）': Number(((d.token_used || 0) / 1e8).toFixed(4)),
    }));
    specs.push({
      name: 'Token用量趋势',
      spec: {
        type: 'area',
        data: [{ id: 'data', values: tokenData }],
        xField: 'Time', yField: 'Token（亿）',
        area: { style: { fillOpacity: 0.3 } },
        point: { visible: false },
        width: 680, height: 400,
      },
    });

    const modelTrendData = modelTrendAggregated.map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      Model: d.model_name || 'unknown',
      Quota: d.quota || 0,
    }));
    specs.push({
      name: '模型使用趋势',
      spec: {
        type: 'area',
        data: [{ id: 'data', values: modelTrendData }],
        xField: 'Time', yField: 'Quota', seriesField: 'Model',
        stack: true,
        area: { style: { fillOpacity: 0.6 } },
        point: { visible: false },
        legends: { visible: true, selectMode: 'single' },
        color: { specified: modelColorMap },
        width: 680, height: 400,
      },
    });
  }

  if (modelDist.length > 0) {
    const pieData = modelDist.map(d => ({
      type: d.model_name,
      value: d.request_count,
    }));
    specs.push({
      name: '模型调用分布',
      spec: {
        type: 'pie',
        data: [{ id: 'data', values: pieData }],
        outerRadius: 0.55, innerRadius: 0.3, padAngle: 0.6,
        valueField: 'value', categoryField: 'type',
        pie: { style: { cornerRadius: 10 } },
        legends: { visible: true, orient: 'left' },
        label: { visible: true },
        color: { specified: modelColorMap },
        width: 680, height: 400,
      },
    });

    const rankData = modelDist.slice(0, 15).map(d => ({
      Model: d.model_name,
      Quota: d.total_quota || d.quota || 0,
    }));
    specs.push({
      name: '模型消耗排行',
      spec: {
        type: 'bar',
        data: [{ id: 'data', values: rankData }],
        xField: 'Quota', yField: 'Model',
        direction: 'horizontal', seriesField: 'Model',
        bar: { state: { hover: { stroke: '#000', lineWidth: 1 } } },
        color: { specified: modelColorMap },
        legends: { visible: false },
        width: 680, height: Math.max(200, rankData.length * 30 + 60),
      },
    });
  }

  return specs;
}

async function addDeptSheet(wb, { deptName, statsData, quotaFmt, timeRangeLabel, granularity, existingNames }) {
  const sheetName = sanitizeSheetName(deptName, existingNames);
  existingNames.push(sheetName);
  const ws = wb.addWorksheet(sheetName);
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 4;

  let row = 1;
  styleTitle(ws, row, 1, `数据总览 — ${deptName}（${timeRangeLabel}）`, 16);
  row += 2;

  if (statsData?.overview) {
    const ov = statsData.overview;
    const totalTokens = (ov.total_prompt || 0) + (ov.total_completion || 0);
    const costPerMToken = totalTokens > 0 ? Math.round(ov.total_quota / (totalTokens / 1e6)) : 0;
    const errorRate = ov.consume_count > 0
      ? ((ov.error_count / (ov.consume_count + ov.error_count)) * 100).toFixed(1) : '0.0';

    styleSectionHeader(ws, row, 1, '数据分析', 5);
    row++;
    styleTableHeader(ws, row, 1, ['指标', '值']);
    row++;
    const items = [
      ['总 Token', fmtToken(totalTokens), null],
      ['累计消耗', quotaNum(ov.total_quota), quotaFmt],
      ['均价', `${renderQuota(costPerMToken)} / M Tokens`, null],
      ['总请求次数', fmtRequest(ov.total_requests), null],
      ['平均响应时间', `${(ov.avg_response_time || 0).toFixed(1)}s`, null],
      ['错误率', Number(errorRate) / 100, '0.0%'],
    ];
    for (const [label, val, fmt] of items) {
      const r = ws.getRow(row);
      r.getCell(1).value = label;
      r.getCell(1).alignment = { horizontal: 'left' };
      const cell = r.getCell(2);
      cell.value = val;
      cell.numFmt = fmt || '@';
      cell.alignment = { horizontal: 'left' };
      row++;
    }
    row += 2;
  }

  const chartSpecs = buildChartSpecs(statsData, granularity);
  if (chartSpecs.length > 0) {
    styleSectionHeader(ws, row, 1, '使用分析', 5);
    row += 2;
    for (const { name, spec } of chartSpecs) {
      const result = await renderOffscreenChart(spec);
      if (!result) continue;
      const { base64, aspect } = result;
      const imgWidth = 680;
      const imgHeight = Math.round(imgWidth / aspect);

      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = imgWidth * 2;
      const titleHeight = 48;
      titleCanvas.height = (imgHeight + titleHeight) * 2;
      const ctx = titleCanvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, imgWidth, imgHeight + titleHeight);
      ctx.fillStyle = '#1f2329';
      ctx.font = 'bold 18px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 16, titleHeight / 2);

      const chartImg = new Image();
      await new Promise((resolve) => { chartImg.onload = resolve; chartImg.src = `data:image/png;base64,${base64}`; });
      ctx.drawImage(chartImg, 0, titleHeight, imgWidth, imgHeight);

      const compositeBase64 = titleCanvas.toDataURL('image/png').split(',')[1];
      const compositeAspect = titleCanvas.width / titleCanvas.height;
      const finalHeight = Math.round(imgWidth / compositeAspect);

      const imageId = wb.addImage({ base64: compositeBase64, extension: 'png' });
      ws.addImage(imageId, {
        tl: { col: 0, row: row - 1 },
        ext: { width: imgWidth, height: finalHeight },
      });
      row += Math.ceil(finalHeight / 18) + 2;
    }
  }
}

export async function exportDataOverview({
  statsData, childrenStats, chartRefs, childrenChartRefs, deptName, timeRangeLabel,
  granularity, getTimeRange, includeChildrenSheets = true,
}) {
  const wb = new ExcelJS.Workbook();
  const quotaFmt = getQuotaFmt();

  const ws = wb.addWorksheet('数据总览');
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 4;

  let row = 1;
  styleTitle(ws, row, 1, `数据总览 — ${deptName}（${timeRangeLabel}）`, 16);
  row += 2;

  // --- Section 1: 数据分析 ---
  if (statsData?.overview) {
    const ov = statsData.overview;
    const totalTokens = (ov.total_prompt || 0) + (ov.total_completion || 0);
    const costPerMToken = totalTokens > 0 ? Math.round(ov.total_quota / (totalTokens / 1e6)) : 0;
    const errorRate = ov.consume_count > 0
      ? ((ov.error_count / (ov.consume_count + ov.error_count)) * 100).toFixed(1) : '0.0';

    styleSectionHeader(ws, row, 1, '数据分析', 5);
    row++;
    styleTableHeader(ws, row, 1, ['指标', '值']);
    row++;
    const items = [
      ['总 Token', fmtToken(totalTokens), null],
      ['累计消耗', quotaNum(ov.total_quota), quotaFmt],
      ['均价', `${renderQuota(costPerMToken)} / M Tokens`, null],
      ['总请求次数', fmtRequest(ov.total_requests), null],
      ['平均响应时间', `${(ov.avg_response_time || 0).toFixed(1)}s`, null],
      ['错误率', Number(errorRate) / 100, '0.0%'],
    ];
    for (const [label, val, fmt] of items) {
      const r = ws.getRow(row);
      r.getCell(1).value = label;
      r.getCell(1).alignment = { horizontal: 'left' };
      const cell = r.getCell(2);
      cell.value = val;
      cell.numFmt = fmt || '@';
      cell.alignment = { horizontal: 'left' };
      row++;
    }
    row += 2;
  }

  // --- Section 2: 子部门统计（表格 + 图表）---
  if (childrenStats?.length > 0) {
    styleSectionHeader(ws, row, 1, '子部门统计', 5);
    row++;
    styleTableHeader(ws, row, 1, ['部门名称', '已注册/总人数', '总消耗', 'Token', '请求次数']);
    row++;
    for (const d of childrenStats) {
      const totalToken = (d.total_prompt || 0) + (d.total_completion || 0);
      const r = ws.getRow(row);
      r.getCell(1).value = d.dept_name;
      r.getCell(2).value = `${d.registered_count || 0} / ${d.member_count || 0}`;
      r.getCell(3).value = quotaNum(d.total_quota || 0);
      r.getCell(3).numFmt = quotaFmt;
      r.getCell(4).value = Number((totalToken / 1e8).toFixed(4));
      r.getCell(5).value = fmtRequest(d.total_requests || 0);
      for (let c = 1; c <= 5; c++) {
        r.getCell(c).alignment = { horizontal: 'left' };
      }
      row++;
    }
    row += 2;

    if (childrenChartRefs?.length > 0) {
      styleSectionHeader(ws, row, 1, '子部门图表', 5);
      row += 2;
      for (const { name, ref } of childrenChartRefs) {
        const result = await getChartImage(ref, name);
        if (!result) continue;
        const { base64, aspect } = result;
        const imgWidth = 680;
        const imgHeight = Math.round(imgWidth / aspect);
        const imageId = wb.addImage({ base64, extension: 'png' });
        ws.addImage(imageId, {
          tl: { col: 0, row: row - 1 },
          ext: { width: imgWidth, height: imgHeight },
        });
        row += Math.ceil(imgHeight / 18) + 2;
      }
    }
  }

  // --- 右侧图表区域 ---
  if (chartRefs?.length > 0) {
    await addChartImages(wb, ws, chartRefs, 3, 6, '使用分析');
  }

  // --- 子部门独立 Sheet ---
  if (includeChildrenSheets && childrenStats?.length > 0 && granularity && getTimeRange) {
    const { start_time, end_time } = getTimeRange(granularity);
    const childStatsResults = await batchFetchDeptStats(
      childrenStats.map(c => c.dept_id),
      start_time,
      end_time,
    );
    const existingNames = ['数据总览'];
    for (let i = 0; i < childrenStats.length; i++) {
      if (!childStatsResults[i]) continue;
      await addDeptSheet(wb, {
        deptName: childrenStats[i].dept_name,
        statsData: childStatsResults[i],
        quotaFmt,
        timeRangeLabel,
        granularity,
        existingNames,
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${deptName}_数据总览_${timeRangeLabel}.xlsx`);
}
