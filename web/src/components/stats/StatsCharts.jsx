import React, { useMemo } from 'react';
import { Typography, Descriptions } from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { initVChartSemiTheme } from '@visactor/vchart-semi-theme';
import { renderQuota, renderNumber, modelColorMap } from '../../helpers';
import RecentUsageLogsTable from './RecentUsageLogsTable';
import {
  GRANULARITY_OPTIONS,
  TIME_RANGE_OPTIONS,
  formatTimeRangeDisplay,
  getAggregationBucketSize,
  getTimeRange,
} from '../../hooks/stats/useStatsTimeRange';

initVChartSemiTheme();

const { Title } = Typography;

export {
  GRANULARITY_OPTIONS,
  TIME_RANGE_OPTIONS,
  formatTimeRangeDisplay,
  getAggregationBucketSize,
  getTimeRange,
};

const chartFontStyle = {
  axes: [
    { orient: 'bottom', label: { style: { fontSize: 13 } } },
    { orient: 'left', label: { style: { fontSize: 13 } } },
  ],
  legends: { item: { label: { style: { fontSize: 13 } } } },
};

export function formatTimestamp(ts) {
  if (!ts || ts === 0) return '-';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatBucketTime(ts, granularity) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  switch (granularity) {
    case 'this_year':
    case 'last_year':
    case 'first_half':
    case 'second_half':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'today':
    case 'yesterday':
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    default:
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export const OverviewCards = ({ overview, t }) => {
  if (!overview) return null;
  const errorRate = overview.consume_count > 0
    ? ((overview.error_count / (overview.consume_count + overview.error_count)) * 100).toFixed(1)
    : '0.0';

  const totalTokens = (overview.total_prompt || 0) + (overview.total_completion || 0);
  const costPerMToken = totalTokens > 0
    ? Math.round(overview.total_quota / (totalTokens / 1e6))
    : 0;

  const items = [
    { key: t('总 Token'), value: `${(totalTokens / 1e8).toFixed(2)} ${t('亿')}` },
    { key: t('累计消耗'), value: renderQuota(overview.total_quota) },
    { key: t('均价'), value: `${renderQuota(costPerMToken)} / M Tokens` },
    { key: t('总请求次数'), value: overview.total_requests >= 10000 ? `${(overview.total_requests / 10000).toFixed(1)} 万次` : (overview.total_requests || 0).toLocaleString() },
    { key: t('平均响应时间'), value: `${(overview.avg_response_time || 0).toFixed(1)}s` },
    { key: t('错误率'), value: `${errorRate}%` },
  ];

  return (
    <Descriptions
      data={items}
      row
      size='large'
      style={{ padding: '8px 0' }}
      className='[&_.semi-descriptions-key]:!text-[16px] [&_.semi-descriptions-value]:!text-[22px] [&_.semi-descriptions-value]:!font-semibold'
    />
  );
};

export const QuotaTrendChart = React.memo(React.forwardRef(({ data, granularity, t }, ref) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      [t('额度')]: d.quota || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <div ref={ref}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('额度消耗趋势')}</div>
      <VChart
        spec={{
          type: 'area',
          data: [{ id: 'data', values: chartData }],
          xField: 'Time',
          yField: t('额度'),
          area: { style: { fillOpacity: 0.3 } },
          point: { visible: false },
          ...chartFontStyle,
          tooltip: {
            mark: {
              content: [{ key: () => t('额度'), value: (datum) => renderQuota(datum[t('额度')] || 0) }],
            },
          },
        }}
        style={{ height: 260 }}
      />
    </div>
  );
}));

export const RequestTrendChart = React.memo(React.forwardRef(({ data, granularity, t }, ref) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      [t('请求次数')]: d.count || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <div ref={ref}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('请求次数趋势')}</div>
      <VChart
        spec={{
          type: 'area',
          data: [{ id: 'data', values: chartData }],
          xField: 'Time',
          yField: t('请求次数'),
          area: { style: { fillOpacity: 0.3 } },
          point: { visible: false },
          ...chartFontStyle,
          tooltip: {
            mark: {
              content: [{ key: () => t('请求次数'), value: (datum) => renderNumber(datum[t('请求次数')] || 0) }],
            },
          },
        }}
        style={{ height: 260 }}
      />
    </div>
  );
}));

export const TokenTrendChart = React.memo(React.forwardRef(({ data, granularity, t }, ref) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      [t('Token（亿）')]: Number(((d.token_used || 0) / 1e8).toFixed(4)),
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <div ref={ref}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('Token 用量趋势')}</div>
      <VChart
        spec={{
          type: 'area',
          data: [{ id: 'data', values: chartData }],
          xField: 'Time',
          yField: t('Token（亿）'),
          area: { style: { fillOpacity: 0.3 } },
          point: { visible: false },
          ...chartFontStyle,
          tooltip: {
            mark: {
              content: [{ key: () => `Token（${t('亿')}）`, value: (datum) => `${(datum[t('Token（亿）')] || 0).toFixed(2)} ${t('亿')}` }],
            },
          },
        }}
        style={{ height: 260 }}
      />
    </div>
  );
}));

export const ModelTrendChart = React.memo(React.forwardRef(({ data, granularity, t }, ref) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      Model: d.model_name || 'unknown',
      Quota: d.quota || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <div ref={ref}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('模型使用趋势')}</div>
      <VChart
        spec={{
          type: 'area',
          data: [{ id: 'data', values: chartData }],
          xField: 'Time',
          yField: 'Quota',
          seriesField: 'Model',
          stack: true,
          area: { style: { fillOpacity: 0.6 } },
          point: { visible: false },
          legends: { visible: true, selectMode: 'single', item: { label: { style: { fontSize: 13 } } } },
          ...chartFontStyle,
          tooltip: {
            mark: {
              content: [{ key: (datum) => datum['Model'], value: (datum) => renderQuota(datum['Quota'] || 0) }],
            },
          },
          color: { specified: modelColorMap },
        }}
        style={{ height: 280 }}
      />
    </div>
  );
}));

export const ModelPieChart = React.memo(React.forwardRef(({ data, t }, ref) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      type: d.model_name,
      value: d.request_count,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('模型调用分布')} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--semi-color-text-2)' }}>{t('总计')}: {renderNumber(total)}</span></div>
      <VChart
        spec={{
          type: 'pie',
          data: [{ id: 'data', values: chartData }],
          outerRadius: 0.55,
          innerRadius: 0.3,
          padAngle: 0.6,
          valueField: 'value',
          categoryField: 'type',
          pie: { style: { cornerRadius: 10 }, state: { hover: { outerRadius: 0.85 } } },
          legends: { visible: true, orient: 'left', item: { label: { style: { fontSize: 13 } } } },
          label: { visible: true, style: { fontSize: 13 } },
          tooltip: {
            mark: {
              content: [{ key: (datum) => datum['type'], value: (datum) => renderNumber(datum['value']) }],
            },
          },
          color: { specified: modelColorMap },
        }}
        style={{ flex: 1, minHeight: 300 }}
      />
    </div>
  );
}));

export const ModelRankChart = React.memo(React.forwardRef(({ data, t }, ref) => {
  const chartData = useMemo(() => {
    return (data || []).slice(0, 15).map(d => ({
      Model: d.model_name,
      Quota: d.total_quota,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div ref={ref}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('模型消耗排行')}</div>
      <VChart
        spec={{
          type: 'bar',
          data: [{ id: 'data', values: chartData }],
          xField: 'Quota',
          yField: 'Model',
          direction: 'horizontal',
          seriesField: 'Model',
          ...chartFontStyle,
          bar: { state: { hover: { stroke: '#000', lineWidth: 1 } } },
          tooltip: {
            mark: {
              content: [{ key: (datum) => datum['Model'], value: (datum) => renderQuota(datum['Quota'] || 0) }],
            },
          },
          color: { specified: modelColorMap },
          legends: { visible: false },
        }}
        style={{ height: Math.max(200, chartData.length * 30 + 60) }}
      />
    </div>
  );
}));

export const TokenDistChart = ({ data, t }) => {
  const chartData = useMemo(() => {
    return (data || []).slice(0, 20).map(d => ({
      Token: d.token_name || `ID:${d.token_id}`,
      [t('额度')]: d.total_quota,
      [t('请求次数')]: d.request_count,
    }));
  }, [data, t]);

  if (chartData.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('令牌使用分布')}</div>
      <VChart
        spec={{
          type: 'bar',
          data: [{ id: 'data', values: chartData }],
          xField: 'Token',
          yField: t('额度'),
          seriesField: 'Token',
          ...chartFontStyle,
          bar: { state: { hover: { stroke: '#000', lineWidth: 1 } } },
          tooltip: {
            mark: {
              content: [
                { key: () => t('额度'), value: (datum) => renderQuota(datum[t('额度')] || 0) },
                { key: () => t('请求次数'), value: (datum) => renderNumber(datum[t('请求次数')] || 0) },
              ],
            },
          },
          legends: { visible: false },
        }}
        style={{ height: 260 }}
      />
    </div>
  );
};

export const RecentLogsTable = ({ logs, t, total, currentPage, pageSize, onPageChange, loading }) => {
  if (!onPageChange && (!logs || logs.length === 0)) return null;

  return (
    <div>
      <Title heading={6} className='mb-2'>{t('最近调用记录')}</Title>
      <RecentUsageLogsTable
        logs={logs}
        t={t}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={onPageChange}
        loading={loading}
        showPagination={Boolean(onPageChange)}
      />
    </div>
  );
};
