import ExcelJS from 'exceljs';
import { renderQuota } from '../../helpers';

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
    let chartCanvas = getChartCanvas(ref);

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
      if (dataUrl) return dataUrl.split(',')[1];
    }

    if (!chartCanvas) return null;

    const scale = 2;
    const targetWidth = 1200 * scale;
    const ratio = targetWidth / chartCanvas.width;
    const scaledChartHeight = Math.round(chartCanvas.height * ratio);
    const titleHeight = title ? 48 * scale : 0;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = targetWidth;
    compositeCanvas.height = scaledChartHeight + titleHeight;
    const ctx = compositeCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

    if (title) {
      ctx.fillStyle = '#1f2329';
      ctx.font = `bold ${22 * scale}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 20 * scale, titleHeight / 2);
    }

    ctx.drawImage(chartCanvas, 0, titleHeight, targetWidth, scaledChartHeight);
    return compositeCanvas.toDataURL('image/png').split(',')[1];
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
    const base64 = await getChartImage(ref, name);
    if (!base64) continue;
    const imageId = wb.addImage({ base64, extension: 'png' });
    ws.addImage(imageId, {
      tl: { col: startCol, row: currentRow - 1 },
      ext: { width: 680, height: 360 },
    });
    currentRow += 20;
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

export async function exportDataOverview({
  statsData, childrenStats, chartRefs, childrenChartRefs, deptName, timeRangeLabel,
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
        const base64 = await getChartImage(ref, name);
        if (!base64) continue;
        const imageId = wb.addImage({ base64, extension: 'png' });
        ws.addImage(imageId, {
          tl: { col: 0, row: row - 1 },
          ext: { width: 680, height: 360 },
        });
        row += 20;
      }
    }
  }

  // --- 右侧图表区域 ---
  if (chartRefs?.length > 0) {
    await addChartImages(wb, ws, chartRefs, 3, 6, '使用分析');
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${deptName}_数据总览_${timeRangeLabel}.xlsx`);
}
