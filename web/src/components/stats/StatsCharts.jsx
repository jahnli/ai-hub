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
    case 'year':
      return `${d.getFullYear()}`;
    case 'quarter':
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    default:
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export const GRANULARITY_OPTIONS = [
  { value: 'day', label: '按天' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
  { value: 'quarter', label: '按季度' },
  { value: 'year', label: '按年' },
];

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
      [t('Token')]: d.token_used || 0,
    }));
  }, [data, granularity, t]);

  if (chartData.length === 0) return null;

  return (
    <VChart
      spec={{
        type: 'line',
        data: [{ id: 'data', values: chartData }],
        xField: 'Time',
        yField: t('Token'),
        point: { visible: false },
        title: { visible: true, text: t('Token 用量趋势') },
        tooltip: {
          mark: {
            content: [{ key: () => 'Token', value: (datum) => renderNumber(datum[t('Token')] || 0) }],
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
      style={{ height: 300 }}
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
