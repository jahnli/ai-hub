/*
Copyright (C) 2025 QuantumNous

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

import React, { useEffect, useMemo } from 'react';
import {
  SideSheet,
  Space,
  Tag,
  Typography,
  Card,
  Spin,
  RadioGroup,
  Radio,
  Table,
  Descriptions,
} from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { initVChartSemiTheme } from '@visactor/vchart-semi-theme';
import { renderQuota, renderNumber, modelColorMap, modelToColor } from '../../../../helpers';
import { useUserStats } from '../../../../hooks/users/useUserStats';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';

initVChartSemiTheme();

const { Text, Title } = Typography;

function formatTimestamp(ts) {
  if (!ts || ts === 0) return '-';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatBucketTime(ts, granularity) {
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

const OverviewCards = ({ overview, t }) => {
  if (!overview) return null;
  const errorRate = overview.consume_count > 0
    ? ((overview.error_count / (overview.consume_count + overview.error_count)) * 100).toFixed(1)
    : '0.0';

  const items = [
    { key: t('累计消耗'), value: renderQuota(overview.total_quota) },
    { key: t('提示 Token'), value: renderNumber(overview.total_prompt) },
    { key: t('完成 Token'), value: renderNumber(overview.total_completion) },
    { key: t('总请求次数'), value: renderNumber(overview.total_requests) },
    { key: t('平均响应时间'), value: `${(overview.avg_response_time || 0).toFixed(1)}s` },
    { key: t('错误率'), value: `${errorRate}%` },
    { key: t('令牌数'), value: renderNumber(overview.token_count) },
  ];

  if (overview.sub_quota_total > 0) {
    items.push({
      key: t('订阅额度'),
      value: `${renderQuota(overview.sub_quota_used)} / ${renderQuota(overview.sub_quota_total)}`,
    });
  }

  return (
    <Descriptions
      data={items}
      row
      size='small'
      className='mb-4'
    />
  );
};

const QuotaTrendChart = ({ data, granularity, t }) => {
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

const RequestTrendChart = ({ data, granularity, t }) => {
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

const TokenTrendChart = ({ data, granularity, t }) => {
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

const ModelTrendChart = ({ data, granularity, t }) => {
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

const ModelPieChart = ({ data, t }) => {
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

const ModelRankChart = ({ data, t }) => {
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

const TokenDistChart = ({ data, t }) => {
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

const RecentLogsTable = ({ logs, t }) => {
  if (!logs || logs.length === 0) return null;

  const columns = [
    { title: t('时间'), dataIndex: 'created_at', width: 140, render: (v) => formatTimestamp(v) },
    { title: t('类型'), dataIndex: 'type', width: 70, render: (v) => {
      const map = { 1: t('充值'), 2: t('消费'), 3: t('管理'), 4: t('系统'), 5: t('错误'), 6: t('退款') };
      const colorMap = { 1: 'green', 2: 'blue', 3: 'orange', 5: 'red', 6: 'purple' };
      return <Tag color={colorMap[v] || 'grey'} size='small'>{map[v] || t('未知')}</Tag>;
    }},
    { title: t('模型'), dataIndex: 'model_name', width: 160, ellipsis: true },
    { title: 'Token', width: 100, render: (_, r) => renderNumber((r.prompt_tokens || 0) + (r.completion_tokens || 0)) },
    { title: t('额度'), dataIndex: 'quota', width: 100, render: (v) => renderQuota(v || 0) },
    { title: t('耗时'), dataIndex: 'use_time', width: 70, render: (v) => v ? `${v}s` : '-' },
  ];

  return (
    <div>
      <Title heading={6} className='mb-2'>{t('最近调用记录')}</Title>
      <Table
        columns={columns}
        dataSource={logs}
        pagination={false}
        size='small'
        rowKey='id'
      />
    </div>
  );
};

const GRANULARITY_OPTIONS = [
  { value: 'day', label: '按天' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
  { value: 'quarter', label: '按季度' },
  { value: 'year', label: '按年' },
];

const UserStatsModal = ({ visible, onCancel, user, t }) => {
  const isMobile = useIsMobile();
  const { loading, statsData, granularity, fetchStats, changeGranularity } = useUserStats();

  useEffect(() => {
    if (visible && user?.id) {
      fetchStats(user.id);
    }
  }, [visible, user?.id]);

  const handleGranularityChange = (e) => {
    changeGranularity(e.target.value, user?.id);
  };

  return (
    <SideSheet
      visible={visible}
      placement='right'
      width={isMobile ? '100%' : 960}
      bodyStyle={{ padding: '16px', overflowY: 'auto' }}
      onCancel={onCancel}
      title={
        <Space>
          <Tag color='cyan' shape='circle'>{t('详情')}</Tag>
          <Text>{user?.username}</Text>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {statsData && (
          <div className='flex flex-col gap-4'>
            <OverviewCards overview={statsData.overview} t={t} />

            <div className='flex items-center gap-2'>
              <Text strong>{t('时间粒度')}:</Text>
              <RadioGroup
                type='button'
                size='small'
                value={granularity}
                onChange={handleGranularityChange}
              >
                {GRANULARITY_OPTIONS.map(opt => (
                  <Radio key={opt.value} value={opt.value}>{t(opt.label)}</Radio>
                ))}
              </RadioGroup>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              <Card bodyStyle={{ padding: 12 }}>
                <QuotaTrendChart data={statsData.trendAggregated} granularity={granularity} t={t} />
              </Card>
              <Card bodyStyle={{ padding: 12 }}>
                <RequestTrendChart data={statsData.trendAggregated} granularity={granularity} t={t} />
              </Card>
              <Card bodyStyle={{ padding: 12 }}>
                <TokenTrendChart data={statsData.trendAggregated} granularity={granularity} t={t} />
              </Card>
              <Card bodyStyle={{ padding: 12 }}>
                <ModelTrendChart data={statsData.trendByModel} granularity={granularity} t={t} />
              </Card>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              <Card bodyStyle={{ padding: 12 }}>
                <ModelPieChart data={statsData.modelDistribution} t={t} />
              </Card>
              <Card bodyStyle={{ padding: 12 }}>
                <ModelRankChart data={statsData.modelDistribution} t={t} />
              </Card>
            </div>

            <Card bodyStyle={{ padding: 12 }}>
              <TokenDistChart data={statsData.tokenDistribution} t={t} />
            </Card>

            <Card bodyStyle={{ padding: 12 }}>
              <RecentLogsTable logs={statsData.recentLogs} t={t} />
            </Card>
          </div>
        )}
      </Spin>
    </SideSheet>
  );
};

export default UserStatsModal;
