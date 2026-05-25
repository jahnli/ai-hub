import React, { useMemo } from 'react';
import { Tag, Typography, Table, Descriptions } from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { initVChartSemiTheme } from '@visactor/vchart-semi-theme';
import { renderQuota, renderNumber, modelColorMap } from '../../helpers';

initVChartSemiTheme();

const { Title } = Typography;

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

export const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'this_week', label: '本周' },
  { value: 'last_week', label: '上周' },
  { value: 'this_month', label: '本月' },
  { value: 'last_month', label: '上月' },
  { value: 'this_quarter', label: '本季度' },
  { value: 'last_quarter', label: '上季度' },
  { value: 'first_half', label: '上半年' },
  { value: 'second_half', label: '下半年' },
  { value: 'this_year', label: '本年' },
  { value: 'last_year', label: '去年' },
];

export const GRANULARITY_OPTIONS = TIME_RANGE_OPTIONS;

export function getTimeRange(rangeKey) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start, end;

  switch (rangeKey) {
    case 'today':
      start = startOfDay;
      end = endOfToday;
      break;
    case 'yesterday': {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - 1);
      start = d;
      end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      break;
    }
    case 'this_week': {
      const day = now.getDay() || 7;
      start = new Date(startOfDay);
      start.setDate(start.getDate() - (day - 1));
      end = endOfToday;
      break;
    }
    case 'last_week': {
      const day = now.getDay() || 7;
      const thisMonday = new Date(startOfDay);
      thisMonday.setDate(thisMonday.getDate() - (day - 1));
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(lastSunday.getDate() - 1);
      start = new Date(thisMonday);
      start.setDate(start.getDate() - 7);
      end = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59);
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = endOfToday;
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = endOfToday;
      break;
    }
    case 'last_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), (q - 1) * 3, 1);
      end = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
      break;
    }
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = endOfToday;
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;
    case 'first_half':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 5, 30, 23, 59, 59);
      break;
    case 'second_half':
      start = new Date(now.getFullYear(), 6, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = endOfToday;
  }

  return {
    start_time: Math.floor(start.getTime() / 1000),
    end_time: Math.floor(end.getTime() / 1000),
  };
}

export function formatTimeRangeDisplay(rangeKey) {
  const { start_time, end_time } = getTimeRange(rangeKey);
  const fmt = (ts) => {
    const d = new Date(ts * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${sec}`;
  };
  return `${fmt(start_time)} ~ ${fmt(end_time)}`;
}

export function getAggregationBucketSize(rangeKey) {
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
    { key: t('均价'), value: `${renderQuota(costPerMToken)}/M Tokens` },
    { key: t('总请求次数'), value: renderNumber(overview.total_requests) },
    { key: t('平均响应时间'), value: `${(overview.avg_response_time || 0).toFixed(1)}s` },
    { key: t('错误率'), value: `${errorRate}%` },
  ];

  return (
    <Descriptions
      data={items}
      row
      size='small'
      className='mb-4'
    />
  );
};

export const QuotaTrendChart = ({ data, granularity, t }) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      [t('额度')]: d.quota || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <VChart
      spec={{
        type: 'area',
        data: [{ id: 'data', values: chartData }],
        xField: 'Time',
        yField: t('额度'),
        area: { style: { fillOpacity: 0.3 } },
        point: { visible: false },
        title: { visible: true, text: t('额度消耗趋势') },
        tooltip: {
          mark: {
            content: [{ key: () => t('额度'), value: (datum) => renderQuota(datum[t('额度')] || 0) }],
          },
        },
      }}
      style={{ height: 260 }}
    />
  );
};

export const RequestTrendChart = ({ data, granularity, t }) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      [t('请求次数')]: d.count || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <VChart
      spec={{
        type: 'line',
        data: [{ id: 'data', values: chartData }],
        xField: 'Time',
        yField: t('请求次数'),
        point: { visible: false },
        title: { visible: true, text: t('请求次数趋势') },
        tooltip: {
          mark: {
            content: [{ key: () => t('请求次数'), value: (datum) => renderNumber(datum[t('请求次数')] || 0) }],
          },
        },
      }}
      style={{ height: 260 }}
    />
  );
};

export const TokenTrendChart = ({ data, granularity, t }) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      [t('Token（亿）')]: Number(((d.token_used || 0) / 1e8).toFixed(4)),
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <VChart
      spec={{
        type: 'line',
        data: [{ id: 'data', values: chartData }],
        xField: 'Time',
        yField: t('Token（亿）'),
        point: { visible: false },
        title: { visible: true, text: t('Token 用量趋势') },
        tooltip: {
          mark: {
            content: [{ key: () => `Token（${t('亿')}）`, value: (datum) => `${(datum[t('Token（亿）')] || 0).toFixed(2)} ${t('亿')}` }],
          },
        },
      }}
      style={{ height: 260 }}
    />
  );
};

export const ModelTrendChart = ({ data, granularity, t }) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      Time: formatBucketTime(d.created_at, granularity),
      Model: d.model_name || 'unknown',
      Quota: d.quota || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
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
        legends: { visible: true, selectMode: 'single' },
        title: { visible: true, text: t('模型使用趋势') },
        tooltip: {
          mark: {
            content: [{ key: (datum) => datum['Model'], value: (datum) => renderQuota(datum['Quota'] || 0) }],
          },
        },
        color: { specified: modelColorMap },
      }}
      style={{ height: 280 }}
    />
  );
};

export const ModelPieChart = ({ data, t }) => {
  const chartData = useMemo(() => {
    return (data || []).map(d => ({
      type: d.model_name,
      value: d.request_count,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <VChart
      spec={{
        type: 'pie',
        data: [{ id: 'data', values: chartData }],
        outerRadius: 0.8,
        innerRadius: 0.5,
        padAngle: 0.6,
        valueField: 'value',
        categoryField: 'type',
        pie: { style: { cornerRadius: 10 }, state: { hover: { outerRadius: 0.85 } } },
        title: { visible: true, text: t('模型调用分布'), subtext: `${t('总计')}: ${renderNumber(total)}` },
        legends: { visible: true, orient: 'left' },
        label: { visible: true },
        tooltip: {
          mark: {
            content: [{ key: (datum) => datum['type'], value: (datum) => renderNumber(datum['value']) }],
          },
        },
        color: { specified: modelColorMap },
      }}
      style={{ height: '100%', minHeight: 300 }}
    />
  );
};

export const ModelRankChart = ({ data, t }) => {
  const chartData = useMemo(() => {
    return (data || []).slice(0, 15).map(d => ({
      Model: d.model_name,
      Quota: d.total_quota,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <VChart
      spec={{
        type: 'bar',
        data: [{ id: 'data', values: chartData }],
        xField: 'Quota',
        yField: 'Model',
        direction: 'horizontal',
        seriesField: 'Model',
        title: { visible: true, text: t('模型消耗排行') },
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
  );
};

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
    <VChart
      spec={{
        type: 'bar',
        data: [{ id: 'data', values: chartData }],
        xField: 'Token',
        yField: t('额度'),
        seriesField: 'Token',
        title: { visible: true, text: t('令牌使用分布') },
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
  );
};

export const RecentLogsTable = ({ logs, t, showUsername = false, showType = true, total, currentPage, pageSize, onPageChange, loading }) => {
  if (!onPageChange && (!logs || logs.length === 0)) return null;

  const columns = [
    { title: t('时间'), dataIndex: 'created_at', width: 140, render: (v) => formatTimestamp(v) },
    ...(showUsername ? [{ title: t('用户'), dataIndex: 'username', width: 100, ellipsis: true }] : []),
    ...(showType ? [{ title: t('类型'), dataIndex: 'type', width: 70, render: (v) => {
      const map = { 1: t('充值'), 2: t('消费'), 3: t('管理'), 4: t('系统'), 5: t('错误'), 6: t('退款') };
      const colorMap = { 1: 'green', 2: 'blue', 3: 'orange', 5: 'red', 6: 'purple' };
      return <Tag color={colorMap[v] || 'grey'} size='small'>{map[v] || t('未知')}</Tag>;
    }}] : []),
    { title: t('模型'), dataIndex: 'model_name', width: 180, ellipsis: true },
    { title: t('用时'), dataIndex: 'use_time', width: 70, render: (v) => {
      if (!v) return '-';
      const time = parseInt(v);
      const color = time < 101 ? 'green' : time < 300 ? 'orange' : 'red';
      return <Tag color={color} size='small'>{time}s</Tag>;
    }},
    { title: t('输入'), dataIndex: 'prompt_tokens', width: 80, render: (v) => v > 0 ? renderNumber(v) : '-' },
    { title: t('输出'), dataIndex: 'completion_tokens', width: 80, render: (v) => v > 0 ? renderNumber(v) : '-' },
    { title: t('花费'), dataIndex: 'quota', width: 100, render: (v) => renderQuota(v || 0, 6) },
  ];

  const pagination = onPageChange
    ? {
        currentPage: currentPage || 1,
        pageSize: pageSize || 10,
        total: total || 0,
        showSizeChanger: true,
        pageSizeOpts: [10, 20, 50],
        onPageChange: (page) => onPageChange(page, pageSize || 10),
        onPageSizeChange: (size) => onPageChange(1, size),
      }
    : false;

  return (
    <div>
      <Title heading={6} className='mb-2'>{t('最近调用记录')}</Title>
      <Table
        columns={columns}
        dataSource={logs}
        pagination={pagination}
        loading={loading}
        size='small'
        rowKey='id'
      />
    </div>
  );
};
