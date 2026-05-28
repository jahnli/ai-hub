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
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cascader,
  Table,
  Card,
  Spin,
  Empty,
  Tag,
  Typography,
  RadioGroup,
  Radio,
  Toast,
  Button,
  Tooltip,
  Popover,
  Progress,
  Modal,
  Space,
  Checkbox,
} from '@douyinfe/semi-ui';
import { IconRefresh, IconHistory, IconSearch, IconDownload } from '@douyinfe/semi-icons';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import {
  renderQuota,
  renderNumber,
  timestamp2string,
  copy,
  API,
  showError,
  isAdmin,
} from '../../helpers';
import { useDataOverviewData } from '../../hooks/dataOverview/useDataOverviewData';
import {
  OverviewCards,
  QuotaTrendChart,
  RequestTrendChart,
  TokenTrendChart,
  ModelTrendChart,
  ModelPieChart,
  ModelRankChart,
  TIME_RANGE_OPTIONS,
  getTimeRange,
  getAggregationBucketSize,
  formatTimeRangeDisplay,
} from '../../components/stats/StatsCharts';
import { getLogsColumns } from '../../components/table/usage-logs/UsageLogsColumnDefs';
import { VChart } from '@visactor/react-vchart';
import CardTable from '../../components/common/ui/CardTable';
import UserStatsModal from '../../components/table/users/modals/UserStatsModal';
import {
  exportDataOverview,
} from './exportUtils';

const { Text } = Typography;

function renderRequestCount(num) {
  if (!num || num <= 0) return '-';
  if (num < 10000) return num.toLocaleString();
  return (num / 10000).toFixed(1) + ' 万次';
}

const ChildrenRankChart = React.memo(React.forwardRef(({ data }, ref) => {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => (b.total_quota || 0) - (a.total_quota || 0))
      .slice(0, 15)
      .map((d) => ({ dept: d.dept_name, quota: d.total_quota || 0 }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div ref={ref}>
      <VChart
        spec={{
        type: 'bar',
        data: [{ id: 'data', values: chartData }],
        xField: 'quota',
        yField: 'dept',
        direction: 'horizontal',
        seriesField: 'dept',
        title: { visible: false },
        bar: { state: { hover: { stroke: '#000', lineWidth: 1 } } },
        tooltip: {
          mark: {
            content: [
              {
                key: (datum) => datum['dept'],
                value: (datum) => renderQuota(datum['quota']),
              },
            ],
          },
        },
        legends: { visible: false },
      }}
      style={{ height: Math.max(200, chartData.length * 30 + 60) }}
    />
    </div>
  );
}));

const ChildrenPieChart = React.memo(React.forwardRef(({ data, t }, ref) => {
  const chartData = useMemo(() => {
    return data
      .filter((d) => (d.total_quota || 0) > 0)
      .map((d) => ({ type: d.dept_name, value: d.total_quota || 0 }));
  }, [data]);

  if (chartData.length === 0) return null;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>
        {t('子部门消耗占比')} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--semi-color-text-2)' }}>{t('总计')}: {renderQuota(total)}</span>
      </div>
      <VChart
        spec={{
          type: 'pie',
          data: [{ id: 'data', values: chartData }],
          outerRadius: 0.8,
          innerRadius: 0.5,
          padAngle: 0.6,
          valueField: 'value',
          categoryField: 'type',
          pie: {
            style: { cornerRadius: 10 },
            state: { hover: { outerRadius: 0.85 } },
          },
          title: { visible: false },
          legends: { visible: true, orient: 'left' },
          label: { visible: true },
          tooltip: {
            mark: {
              content: [
                {
                  key: (datum) => datum['type'],
                  value: (datum) => renderQuota(datum['value']),
                },
              ],
            },
          },
        }}
        style={{ flex: 1, minHeight: 300 }}
      />
    </div>
  );
}));

const UsersRankChart = React.memo(({ data, t }) => {
  const chartData = useMemo(() => {
    return [...data]
      .filter(
        (u) => u.registered && (parseInt(u.total_consumed_quota) || 0) > 0,
      )
      .sort(
        (a, b) =>
          (parseInt(b.total_consumed_quota) || 0) -
          (parseInt(a.total_consumed_quota) || 0),
      )
      .slice(0, 10)
      .map((d) => ({
        user: d.name,
        quota: parseInt(d.total_consumed_quota) || 0,
      }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <VChart
      spec={{
        type: 'bar',
        data: [{ id: 'data', values: chartData }],
        xField: 'quota',
        yField: 'user',
        direction: 'horizontal',
        seriesField: 'user',
        title: { visible: true, text: t('用户消耗排行 Top 10') },
        bar: { state: { hover: { stroke: '#000', lineWidth: 1 } } },
        tooltip: {
          mark: {
            content: [
              {
                key: (datum) => datum['user'],
                value: (datum) => renderQuota(datum['quota']),
              },
            ],
          },
        },
        legends: { visible: false },
      }}
      style={{ height: '100%', minHeight: 300 }}
    />
  );
});

const UsersPieChart = React.memo(({ data, t }) => {
  const chartData = useMemo(() => {
    const sorted = [...data]
      .filter(
        (u) => u.registered && (parseInt(u.total_consumed_quota) || 0) > 0,
      )
      .sort(
        (a, b) =>
          (parseInt(b.total_consumed_quota) || 0) -
          (parseInt(a.total_consumed_quota) || 0),
      );
    return sorted
      .slice(0, 10)
      .map((d) => ({
        type: d.name,
        value: parseInt(d.total_consumed_quota) || 0,
      }));
  }, [data, t]);

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
        pie: {
          style: { cornerRadius: 10 },
          state: { hover: { outerRadius: 0.85 } },
        },
        title: {
          visible: true,
          text: t('用户消耗占比 Top 10'),
          subtext: `${t('总计')}: ${renderQuota(total)}`,
        },
        legends: { visible: true, orient: 'left' },
        label: { visible: true },
        tooltip: {
          mark: {
            content: [
              {
                key: (datum) => datum['type'],
                value: (datum) => renderQuota(datum['value']),
              },
            ],
          },
        },
      }}
      style={{ height: '100%', minHeight: 300 }}
    />
  );
});

const COLUMN_KEYS = {
  TIME: 'time',
  CHANNEL: 'channel',
  USERNAME: 'username',
  TOKEN: 'token',
  GROUP: 'group',
  TYPE: 'type',
  MODEL: 'model',
  USE_TIME: 'use_time',
  PROMPT: 'prompt',
  COMPLETION: 'completion',
  COST: 'cost',
  RETRY: 'retry',
  IP: 'ip',
  DETAILS: 'details',
};

const VISIBLE_COLUMNS = {
  [COLUMN_KEYS.TIME]: true,
  [COLUMN_KEYS.USERNAME]: true,
  [COLUMN_KEYS.MODEL]: true,
  [COLUMN_KEYS.USE_TIME]: true,
  [COLUMN_KEYS.PROMPT]: true,
  [COLUMN_KEYS.COMPLETION]: true,
  [COLUMN_KEYS.COST]: true,
  [COLUMN_KEYS.TYPE]: true,
  [COLUMN_KEYS.TOKEN]: true,
  [COLUMN_KEYS.GROUP]: true,
  [COLUMN_KEYS.IP]: true,
  [COLUMN_KEYS.DETAILS]: true,
  [COLUMN_KEYS.CHANNEL]: false,
  [COLUMN_KEYS.RETRY]: false,
};

const cardShadowStyle = { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' };
const cardTitleStyle = {
  fontSize: 18,
  color: 'var(--semi-color-primary)',
  fontWeight: 600,
};

const DataOverview = () => {
  const { t } = useTranslation();
  const {
    treeData,
    treeLoading,
    tenantInfo,
    users,
    usersLoading,
    selectedDeptId,
    selectedPath,
    handleDeptChange,
    statsData,
    statsLoading,
    granularity,
    changeGranularity,
    childrenStats,
    childrenStatsLoading,
    fetchChildrenStats,
    logs,
    logsTotal,
    logsLoading,
    logsPage,
    logsPageSize,
    handleLogsPageChange,
    fetchDepartmentLogs,
    fetchDepartmentStats,
    fetchDepartmentUsers,
    queryData,
  } = useDataOverviewData();

  const [showLogs, setShowLogs] = useState(false);
  const [registeredFilter, setRegisteredFilter] = useState(['true', 'false']);
  const [statsUser, setStatsUser] = useState(null);
  const [showUserStats, setShowUserStats] = useState(false);

  const [deptStatsVisible, setDeptStatsVisible] = useState(false);
  const [selectedChildDept, setSelectedChildDept] = useState(null);
  const [deptStatsData, setDeptStatsData] = useState(null);
  const [deptStatsLoading, setDeptStatsLoading] = useState(false);

  const quotaTrendRef = useRef(null);
  const requestTrendRef = useRef(null);
  const tokenTrendRef = useRef(null);
  const modelTrendRef = useRef(null);
  const modelPieRef = useRef(null);
  const modelRankRef = useRef(null);

  const [exportLoading, setExportLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const displayTreeData = useMemo(() => {
    if (!tenantInfo || treeData.length === 0) return treeData;
    return treeData.map((node) => {
      if (node.value === '__tenant_root__') {
        return {
          ...node,
          label: (
            <span className='inline-flex items-center gap-1.5'>
              <img
                src={tenantInfo.avatar?.avatar_240}
                alt=''
                className='w-5 h-5 rounded-full object-cover'
              />
              <span>{tenantInfo.name}</span>
            </span>
          ),
          searchText: tenantInfo.name,
        };
      }
      return node;
    });
  }, [treeData, tenantInfo]);
  const [exportIncludeChildren, setExportIncludeChildren] = useState(false);
  const [exportIncludeUsers, setExportIncludeUsers] = useState(true);

  const childrenRankRef = useRef(null);
  const childrenPieRef = useRef(null);

  const getDeptName = useCallback(() => {
    if (!selectedPath || selectedPath.length === 0) return '部门';
    let nodes = treeData;
    let label = '部门';
    for (const seg of selectedPath) {
      const node = (nodes || []).find(n => n.value === seg);
      if (!node) break;
      label = node.label;
      nodes = node.children;
    }
    return label;
  }, [treeData, selectedPath]);

  const handleExportConfirm = useCallback(async () => {
    setExportModalVisible(false);
    setExportIncludeChildren(false);
    setExportIncludeUsers(true);
    setExportLoading(true);
    try {
      const deptName = getDeptName();
      const timeLabel = TIME_RANGE_OPTIONS.find(o => o.value === granularity)?.label || granularity;
      await exportDataOverview({
        statsData,
        childrenStats,
        chartRefs: [
          { name: '额度消耗趋势', ref: quotaTrendRef },
          { name: '请求次数趋势', ref: requestTrendRef },
          { name: 'Token用量趋势', ref: tokenTrendRef },
          { name: '模型使用趋势', ref: modelTrendRef },
          { name: '模型调用分布', ref: modelPieRef },
          { name: '模型消耗排行', ref: modelRankRef },
        ],
        childrenChartRefs: [
          { name: '子部门消耗排行', ref: childrenRankRef },
          { name: '子部门消耗占比', ref: childrenPieRef },
        ],
        deptName,
        timeRangeLabel: timeLabel,
        granularity,
        getTimeRange,
        includeChildrenSheets: exportIncludeChildren,
        includeUsersSheet: exportIncludeUsers,
        users,
      });
      Toast.success(t('导出成功'));
    } catch (e) {
      console.error('Export failed', e);
      Toast.error(t('导出失败'));
    } finally {
      setExportLoading(false);
    }
  }, [getDeptName, granularity, statsData, childrenStats, exportIncludeChildren, exportIncludeUsers, users, t]);

  const handleExportClick = useCallback(() => {
    if (!statsData && childrenStats.length === 0) {
      Toast.warning(t('暂无数据可导出'));
      return;
    }
    if (childrenStats.length === 0 && users.length === 0) {
      handleExportConfirm();
    } else {
      setExportModalVisible(true);
    }
  }, [statsData, childrenStats, users, t, handleExportConfirm]);

  const handleGranularityChange = (e) => {
    changeGranularity(e.target.value);
  };

  const handleQuery = useCallback(() => {
    if (selectedDeptId) {
      queryData(selectedDeptId, granularity);
    }
  }, [selectedDeptId, granularity, queryData]);

  const refreshStats = useCallback(() => {
    if (selectedDeptId) fetchDepartmentStats(selectedDeptId);
  }, [selectedDeptId, fetchDepartmentStats]);

  const [fullUserCounts, setFullUserCounts] = useState(null);

  useEffect(() => {
    if (registeredFilter.length === 2 && users && users.length > 0) {
      const registered = users.filter((u) => u.registered).length;
      setFullUserCounts({ total: users.length, registered });
    }
  }, [users, registeredFilter]);

  const handleTableChange = useCallback(({ filters, extra }) => {
    // 只在筛选条件变化时重新获取数据，分页和排序由 Table 内部处理
    if (extra?.changeType !== 'filter') return;
    if (!filters) return;
    const regFilter = filters.find((f) => f.dataIndex === 'registered');
    let values = ['true', 'false'];
    if (regFilter?.filteredValue && regFilter.filteredValue.length > 0) {
      values = regFilter.filteredValue;
    }
    const isBothSelected = values.length === 2 || values.length === 0;
    const apiParam = isBothSelected ? '' : values[0];
    setRegisteredFilter(values.length === 0 ? ['true', 'false'] : values);
    if (selectedDeptId) fetchDepartmentUsers(selectedDeptId, undefined, { registered: apiParam });
  }, [selectedDeptId, fetchDepartmentUsers]);

  const refreshUsers = useCallback(() => {
    if (selectedDeptId) {
      const apiParam = registeredFilter.length === 2 ? '' : registeredFilter[0] || '';
      fetchDepartmentUsers(selectedDeptId, undefined, { registered: apiParam });
    }
  }, [selectedDeptId, fetchDepartmentUsers, registeredFilter]);

  const refreshLogs = useCallback(() => {
    if (selectedDeptId)
      fetchDepartmentLogs(selectedDeptId, logsPage, logsPageSize);
  }, [selectedDeptId, logsPage, logsPageSize, fetchDepartmentLogs]);

  const refreshChildrenStats = useCallback(() => {
    if (selectedDeptId) fetchChildrenStats(selectedDeptId);
  }, [selectedDeptId, fetchChildrenStats]);

  const fetchDeptStatsForChild = useCallback(
    async (dept) => {
      if (!dept) return;
      setDeptStatsLoading(true);
      try {
        const g = granularity;
        const { start_time: startTime, end_time: endTime } = getTimeRange(g);
        const res = await API.get('/api/department/stats', {
          params: {
            dept_id: dept.dept_id,
            start_time: startTime,
            end_time: endTime,
          },
        });
        if (res?.data?.success) {
          const raw = res.data.data;
          const trendRaw = raw.trend_data || [];
          const bucketSize = getAggregationBucketSize(g);
          const buckets = new Map();
          for (const item of trendRaw) {
            const bk = Math.floor(item.created_at / bucketSize) * bucketSize;
            if (!buckets.has(bk))
              buckets.set(bk, {
                created_at: bk,
                quota: 0,
                count: 0,
                token_used: 0,
              });
            const b = buckets.get(bk);
            b.quota += item.quota || 0;
            b.count += item.count || 0;
            b.token_used += item.token_used || 0;
          }
          const trendAggregated = Array.from(buckets.values()).sort(
            (a, b) => a.created_at - b.created_at,
          );
          const modelBuckets = new Map();
          for (const item of trendRaw) {
            const bk = Math.floor(item.created_at / bucketSize) * bucketSize;
            const key = `${bk}_${item.model_name}`;
            if (!modelBuckets.has(key))
              modelBuckets.set(key, {
                created_at: bk,
                model_name: item.model_name,
                quota: 0,
                count: 0,
                token_used: 0,
              });
            const b = modelBuckets.get(key);
            b.quota += item.quota || 0;
            b.count += item.count || 0;
            b.token_used += item.token_used || 0;
          }
          const trendByModel = Array.from(modelBuckets.values()).sort(
            (a, b) => a.created_at - b.created_at,
          );
          setDeptStatsData({
            overview: raw.overview,
            modelDistribution: raw.model_distribution || [],
            trendAggregated,
            trendByModel,
          });
        }
      } catch (error) {
        showError(error.message);
      } finally {
        setDeptStatsLoading(false);
      }
    },
    [granularity],
  );

  const openChildDeptStats = useCallback(
    (record) => {
      setSelectedChildDept(record);
      setDeptStatsVisible(true);
      fetchDeptStatsForChild(record);
    },
    [fetchDeptStatsForChild],
  );

  const childrenColumns = useMemo(
    () => [
      { title: t('部门名称'), dataIndex: 'dept_name', width: 140 },
      {
        title: t('已注册/总人数'),
        dataIndex: 'member_count',
        width: 100,
        render: (text, record) =>
          `${record.registered_count} / ${record.member_count}`,
      },
      {
        title: t('总消耗'),
        dataIndex: 'total_quota',
        width: 120,
        sorter: (a, b) => (a.total_quota || 0) - (b.total_quota || 0),
        render: (text) => renderQuota(text || 0),
      },
      {
        title: 'Token',
        dataIndex: 'total_prompt',
        width: 120,
        sorter: (a, b) =>
          (a.total_prompt || 0) +
          (a.total_completion || 0) -
          ((b.total_prompt || 0) + (b.total_completion || 0)),
        render: (text, record) => {
          const total =
            (record.total_prompt || 0) + (record.total_completion || 0);
          return total > 0 ? `${(total / 1e8).toFixed(2)} ${t('亿')}` : '-';
        },
      },
      {
        title: t('请求次数'),
        dataIndex: 'total_requests',
        width: 100,
        sorter: (a, b) => (a.total_requests || 0) - (b.total_requests || 0),
        render: (text) => renderRequestCount(text),
      },
      {
        title: t('操作'),
        dataIndex: 'action',
        width: 60,
        render: (_, record) => (
          <Button
            type='primary'
            size='small'
            onClick={() => openChildDeptStats(record)}
          >
            {t('统计')}
          </Button>
        ),
      },
    ],
    [t, openChildDeptStats],
  );

  const copyText = useCallback(
    (event, text) => {
      event.stopPropagation();
      if (copy(text)) {
        Toast.success(t('已复制'));
      }
    },
    [t],
  );

  const formattedLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    return logs.map((log) => ({
      ...log,
      timestamp2string: timestamp2string(log.created_at),
      key: log.id,
    }));
  }, [logs]);

  const logsColumns = useMemo(() => {
    const allCols = getLogsColumns({
      t,
      COLUMN_KEYS,
      copyText,
      showUserInfoFunc: () => {},
      openChannelAffinityUsageCacheModal: () => {},
      isAdminUser: true,
      billingDisplayMode: 'price',
    });
    return allCols.filter((col) => VISIBLE_COLUMNS[col.key]);
  }, [t, copyText]);

  const usersSummary = useMemo(() => {
    if (!users || users.length === 0) return null;
    const registered = users.filter((u) => u.registered).length;
    let totalQuota = 0;
    let usedQuota = 0;
    let totalConsumed = 0;
    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalRequests = 0;
    users.forEach((u) => {
      if (!u.registered) return;
      totalQuota += parseInt(u.sub_quota_total) || 0;
      usedQuota += parseInt(u.sub_quota_used) || 0;
      totalConsumed += parseInt(u.total_consumed_quota) || 0;
      totalPrompt += parseInt(u.total_prompt_tokens) || 0;
      totalCompletion += parseInt(u.total_completion_tokens) || 0;
      totalRequests += parseInt(u.request_count) || 0;
    });
    return {
      registered,
      total: users.length,
      totalQuota,
      usedQuota,
      totalConsumed,
      totalPrompt,
      totalCompletion,
      totalRequests,
    };
  }, [users]);

  const columns = useMemo(
    () => [
      {
        title: t('姓名'),
        dataIndex: 'name',
        width: 120,
      },
      {
        title: t('已用额度/总额度'),
        dataIndex: 'sub_quota_total',
        width: 130,
        sorter: (a, b) => {
          const aVal = a.registered ? (parseInt(a.sub_quota_used) || 0) : -1;
          const bVal = b.registered ? (parseInt(b.sub_quota_used) || 0) : -1;
          return aVal - bVal;
        },
        defaultSortOrder: 'descend',
        defaultSortOrder: 'descend',
        render: (text, record) => {
          if (!record.registered) return '-';
          const total = parseInt(record.sub_quota_total) || 0;
          const used = parseInt(record.sub_quota_used) || 0;
          if (total === 0 && used === 0) return '-';
          const remain = total - used;
          const percent = total > 0 ? (used / total) * 100 : 0;
          const popoverContent = (
            <div className='text-xs p-2'>
              <div>
                {t('已用额度')}: {renderQuota(used)} ({percent.toFixed(0)}%)
              </div>
              <div>
                {t('剩余额度')}: {renderQuota(remain)}
              </div>
              <div>
                {t('总额度')}: {renderQuota(total, 0)}
              </div>
            </div>
          );
          return (
            <Popover content={popoverContent} position='top'>
              <div className='flex flex-col items-end'>
                <span className='text-xs leading-none'>{`${renderQuota(used)} / ${renderQuota(total, 0)}`}</span>
                <Progress
                  percent={percent}
                  stroke={
                    percent >= 90
                      ? 'var(--semi-color-danger)'
                      : percent >= 70
                        ? 'var(--semi-color-warning)'
                        : 'var(--semi-color-success)'
                  }
                  aria-label='quota usage'
                  format={() => `${percent.toFixed(0)}%`}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                />
              </div>
            </Popover>
          );
        },
      },
      {
        title: t('总消耗'),
        dataIndex: 'total_consumed_quota',
        width: 100,
        sorter: (a, b) => {
          const aVal = a.registered ? (parseInt(a.total_consumed_quota) || 0) : -1;
          const bVal = b.registered ? (parseInt(b.total_consumed_quota) || 0) : -1;
          return aVal - bVal;
        },
        render: (text, record) => {
          if (!record.registered) return '-';
          const quota = parseInt(record.total_consumed_quota) || 0;
          return renderQuota(quota);
        },
      },
      {
        title: 'Token',
        dataIndex: 'total_prompt_tokens',
        width: 100,
        sorter: (a, b) => {
          const aTotal = a.registered
            ? (parseInt(a.total_prompt_tokens) || 0) + (parseInt(a.total_completion_tokens) || 0)
            : -1;
          const bTotal = b.registered
            ? (parseInt(b.total_prompt_tokens) || 0) + (parseInt(b.total_completion_tokens) || 0)
            : -1;
          return aTotal - bTotal;
        },
        render: (text, record) => {
          if (!record.registered) return '-';
          const prompt = parseInt(record.total_prompt_tokens) || 0;
          const completion = parseInt(record.total_completion_tokens) || 0;
          const total = prompt + completion;
          if (total === 0) return '-';
          return `${(total / 1e8).toFixed(2)} ${t('亿')}`;
        },
      },
      {
        title: t('请求次数'),
        dataIndex: 'request_count',
        width: 90,
        sorter: (a, b) => {
          const aVal = a.registered ? (parseInt(a.request_count) || 0) : -1;
          const bVal = b.registered ? (parseInt(b.request_count) || 0) : -1;
          return aVal - bVal;
        },
        render: (text, record) => {
          if (!record.registered) return '-';
          return renderRequestCount(parseInt(record.request_count) || 0);
        },
      },
      {
        title: t('常用模型'),
        dataIndex: 'top_model',
        width: 180,
        render: (text, record) => {
          if (!record.registered || !text) return '-';
          return (
            <Tooltip content={text} position='top'>
              <Tag size='small' color='blue' style={{ maxWidth: 130 }}>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {text}
                </span>
              </Tag>
            </Tooltip>
          );
        },
      },
      {
        title: t('重置次数'),
        dataIndex: 'subscription_reset_count',
        width: 90,
        render: (text, record) => {
          if (!record.registered) return '-';
          const count = parseInt(record.subscription_reset_count) || 0;
          if (count <= 0) return <span className='text-gray-400'>-</span>;
          return (
            <Tag color='blue' shape='circle' size='small'>
              {count}
            </Tag>
          );
        },
      },
      {
        title: t('最后登录'),
        dataIndex: 'last_login_at',
        width: 150,
        render: (text, record) => {
          if (!record.registered || !text || text === 0) return '-';
          const d = new Date(text * 1000);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
      },
      {
        title: t('创建时间'),
        dataIndex: 'created_at',
        width: 150,
        render: (text, record) => {
          if (!record.registered || !text || text.startsWith('0001'))
            return '-';
          const d = new Date(text);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
      },
      {
        title: t('注册状态'),
        dataIndex: 'registered',
        width: 80,
        filters: [
          { text: t('已注册'), value: 'true' },
          { text: t('未注册'), value: 'false' },
        ],
        filteredValue: registeredFilter,
        onFilter: (value, record) => {
          if (value === 'true') return record.registered === true;
          if (value === 'false') return record.registered === false;
          return true;
        },
        render: (registered) =>
          registered ? (
            <Tag color='green'>{t('已注册')}</Tag>
          ) : (
            <Tag color='grey'>{t('未注册')}</Tag>
          ),
      },
      {
        title: t('操作'),
        dataIndex: 'action',
        width: 80,
        render: (_, record) => {
          if (!record.registered) return null;
          return (
            <Button
              type='primary'
              size='small'
              onClick={() => {
                setStatsUser(record);
                setShowUserStats(true);
              }}
            >
              {t('统计')}
            </Button>
          );
        },
      },
    ],
    [t, registeredFilter],
  );

  return (
    <div className='mt-[60px] px-4'>
      <div className='mb-2'>
        <Cascader
          treeData={displayTreeData}
          value={selectedPath}
          placeholder={t('选择部门')}
          changeOnSelect
          filterTreeNode
          showNext='hover'
          dropdownClassName='[&_.semi-cascader-option-lists]:!min-h-[560px]'
          onChange={handleDeptChange}
          loading={treeLoading}
          style={{ width: 'fit-content', minWidth: 280 }}
          showClear={isAdmin()}
        />
      </div>
      {selectedDeptId && (
        <div className='flex items-center gap-3 flex-wrap mb-4'>
          <RadioGroup
            type='button'
            size='small'
            value={granularity}
            onChange={handleGranularityChange}
          >
            {TIME_RANGE_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                {t(opt.label)}
              </Radio>
            ))}
          </RadioGroup>
          <Text type='tertiary' size='normal'>
            {formatTimeRangeDisplay(granularity)}
          </Text>
          <Button
            type='primary'
            icon={<IconSearch />}
            onClick={handleQuery}
            loading={statsLoading || usersLoading || childrenStatsLoading}
            className='ml-auto'
          >
            {t('查询')}
          </Button>
          <Button
            icon={<IconDownload />}
            onClick={handleExportClick}
            loading={exportLoading}
            disabled={!statsData && childrenStats.length === 0}
          >
            {t('导出')}
          </Button>
        </div>
      )}

      {selectedDeptId ? (
        <div className='flex flex-col' style={{ gap: 14 }}>
          <Card
            style={cardShadowStyle}
            title={
              <div className='flex items-center justify-between w-full'>
                <Text strong style={cardTitleStyle}>
                  {t('数据统计')}
                </Text>
                <Button
                  icon={<IconRefresh />}
                  theme='borderless'
                  size='small'
                  onClick={refreshStats}
                  loading={statsLoading}
                />
              </div>
            }
            bodyStyle={{ padding: 12, display: 'flex', alignItems: 'center' }}
          >
            <Spin spinning={statsLoading} size='large'>
              {statsData && <OverviewCards overview={statsData.overview} t={t} />}
            </Spin>
          </Card>

          {(childrenStats.length > 0 || childrenStatsLoading) && (
            <Card
              style={cardShadowStyle}
              title={
                <div className='flex items-center justify-between w-full'>
                  <Text strong style={cardTitleStyle}>
                    {t('子部门统计')}{' '}
                    <Tag color='blue' size='small'>
                      {childrenStats.length}
                    </Tag>
                  </Text>
                  <Button
                    icon={<IconRefresh />}
                    theme='borderless'
                    size='small'
                    onClick={refreshChildrenStats}
                    loading={childrenStatsLoading}
                  />
                </div>
              }
              bodyStyle={{ padding: 0 }}
            >
              {childrenStatsLoading && childrenStats.length === 0 ? (
                <div className='flex justify-center py-6'>
                  <Spin size='large' />
                </div>
              ) : (
                <Spin spinning={childrenStatsLoading}>
                  <Table
                    columns={childrenColumns}
                    dataSource={childrenStats}
                    rowKey='dept_id'
                    pagination={false}
                    size='small'
                    style={{ width: '100%' }}
                  />
                  {childrenStats.length > 0 && (
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4'>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginLeft: 16, color: 'var(--semi-color-text-0)' }}>{t('子部门消耗排行')}</div>
                        <ChildrenRankChart ref={childrenRankRef} data={childrenStats} />
                      </div>
                      <ChildrenPieChart ref={childrenPieRef} data={childrenStats} t={t} />
                    </div>
                  )}
                </Spin>
              )}
            </Card>
          )}

          <Card
            style={cardShadowStyle}
            title={
              <div className='flex items-center justify-between w-full'>
                <div className='flex items-center gap-3'>
                  <Text strong style={cardTitleStyle}>
                    {t('部门用户列表')}
                  </Text>
                  {fullUserCounts && (
                    <span className='flex items-center gap-1.5' style={{ fontSize: 13 }}>
                      <Tag size='small' color='blue'>{fullUserCounts.total} {t('人')}</Tag>
                      <Tag size='small' color='green'>{t('已注册')} {fullUserCounts.registered}</Tag>
                      <Tag size='small' color='orange'>{t('未注册')} {fullUserCounts.total - fullUserCounts.registered}</Tag>
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-1'>
                  <Button
                    icon={<IconHistory />}
                    theme='borderless'
                    size='small'
                    onClick={() => {
                      setShowLogs(true);
                      if (selectedDeptId)
                        fetchDepartmentLogs(selectedDeptId, 1, logsPageSize);
                    }}
                  >
                    {t('最近调用记录')}
                  </Button>
                  <Button
                    icon={<IconRefresh />}
                    theme='borderless'
                    size='small'
                    onClick={refreshUsers}
                    loading={usersLoading}
                  />
                </div>
              </div>
            }
            bodyStyle={{ padding: 0 }}
          >
            {usersLoading && users.length === 0 ? (
              <div className='flex justify-center py-6'>
                <Spin size='large' />
              </div>
            ) : users.length > 0 ? (
              <Spin spinning={usersLoading}>
                <Table
                  columns={columns}
                  dataSource={users}
                  rowKey='open_id'
                  onChange={handleTableChange}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOpts: [10, 20, 50, 100],
                    formatPageText: ({ currentStart, currentEnd, total }) =>
                      `${t('显示第')} ${currentStart} ${t('条')}-${t('第')} ${currentEnd} ${t('条')}，${t('共')} ${total} ${t('条')}`,
                  }}
                  size='small'
                  style={{ width: '100%' }}
                />
                {users.filter((u) => u.registered).length > 0 && (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4'>
                    <UsersRankChart data={users} t={t} />
                    <UsersPieChart data={users} t={t} />
                  </div>
                )}
              </Spin>
            ) : (
              <Empty
                image={<IllustrationNoResult />}
                darkModeImage={<IllustrationNoResultDark />}
                description={t('该部门下暂无用户')}
              />
            )}
          </Card>

          {statsData && !statsLoading && (
            <Card
              style={cardShadowStyle}
              title={
                <Text strong style={cardTitleStyle}>
                  {t('使用分析')}
                </Text>
              }
              bodyStyle={{ padding: 12 }}
            >
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <QuotaTrendChart
                  ref={quotaTrendRef}
                  data={statsData.trendAggregated}
                  granularity={granularity}
                  t={t}
                />
                <RequestTrendChart
                  ref={requestTrendRef}
                  data={statsData.trendAggregated}
                  granularity={granularity}
                  t={t}
                />
                <TokenTrendChart
                  ref={tokenTrendRef}
                  data={statsData.trendAggregated}
                  granularity={granularity}
                  t={t}
                />
                <ModelTrendChart
                  ref={modelTrendRef}
                  data={statsData.trendByModel}
                  granularity={granularity}
                  t={t}
                />
                <ModelPieChart ref={modelPieRef} data={statsData.modelDistribution} t={t} />
                <ModelRankChart ref={modelRankRef} data={statsData.modelDistribution} t={t} />
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Empty
          image={<IllustrationNoResult />}
          darkModeImage={<IllustrationNoResultDark />}
          description={t('请选择一个部门查看用户数据')}
        />
      )}

      <Modal
        title={
          <div className='flex items-center gap-2'>
            {t('最近调用记录')}
            <Button
              icon={<IconRefresh />}
              theme='borderless'
              size='small'
              onClick={refreshLogs}
              loading={logsLoading}
            />
          </div>
        }
        visible={showLogs}
        onCancel={() => setShowLogs(false)}
        footer={null}
        width={1800}
        bodyStyle={{ padding: 12 }}
      >
        <CardTable
          columns={logsColumns}
          dataSource={formattedLogs}
          rowKey='key'
          loading={logsLoading}
          size='small'
          scroll={{ x: 'max-content' }}
          empty={
            <Empty
              image={
                <IllustrationNoResult style={{ width: 150, height: 150 }} />
              }
              darkModeImage={
                <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
              }
              description={t('暂无数据')}
              style={{ padding: 30 }}
            />
          }
          pagination={{
            currentPage: logsPage,
            pageSize: logsPageSize,
            total: logsTotal,
            pageSizeOptions: [10, 20, 50],
            showSizeChanger: true,
            onPageChange: (page) => handleLogsPageChange(page, logsPageSize),
            onPageSizeChange: (size) => handleLogsPageChange(1, size),
          }}
        />
      </Modal>

      <UserStatsModal
        visible={showUserStats}
        onCancel={() => setShowUserStats(false)}
        user={statsUser}
        t={t}
        apiPrefix='/api/department/user-stats'
        mode='modal'
      />

      <Modal
        visible={deptStatsVisible}
        onCancel={() => {
          setDeptStatsVisible(false);
          setDeptStatsData(null);
          setSelectedChildDept(null);
        }}
        footer={null}
        width={1400}
        bodyStyle={{ padding: 16, maxHeight: '80vh', overflowY: 'auto' }}
        title={
          <Space>
            <Tag color='cyan' shape='circle'>
              {t('统计')}
            </Tag>
            <Text>{selectedChildDept?.dept_name}</Text>
          </Space>
        }
      >
        <Spin spinning={deptStatsLoading}>
          {deptStatsData && (
            <div className='flex flex-col gap-4'>
              <OverviewCards overview={deptStatsData.overview} t={t} />

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <Card bodyStyle={{ padding: 12 }}>
                  <QuotaTrendChart
                    data={deptStatsData.trendAggregated}
                    granularity={granularity}
                    t={t}
                  />
                </Card>
                <Card bodyStyle={{ padding: 12 }}>
                  <RequestTrendChart
                    data={deptStatsData.trendAggregated}
                    granularity={granularity}
                    t={t}
                  />
                </Card>
                <Card bodyStyle={{ padding: 12 }}>
                  <TokenTrendChart
                    data={deptStatsData.trendAggregated}
                    granularity={granularity}
                    t={t}
                  />
                </Card>
                <Card bodyStyle={{ padding: 12 }}>
                  <ModelTrendChart
                    data={deptStatsData.trendByModel}
                    granularity={granularity}
                    t={t}
                  />
                </Card>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <Card
                  bodyStyle={{ padding: 12, height: '100%' }}
                  style={{ height: '100%' }}
                >
                  <ModelPieChart data={deptStatsData.modelDistribution} t={t} />
                </Card>
                <Card bodyStyle={{ padding: 12 }}>
                  <ModelRankChart
                    data={deptStatsData.modelDistribution}
                    t={t}
                  />
                </Card>
              </div>
            </div>
          )}
        </Spin>
      </Modal>

      <Modal
        visible={exportModalVisible}
        onCancel={() => { setExportModalVisible(false); setExportIncludeChildren(false); setExportIncludeUsers(false); }}
        onOk={handleExportConfirm}
        title={t('导出设置')}
        okText={t('导出')}
        cancelText={t('取消')}
        width={420}
      >
        {childrenStats.length > 0 && (
          <>
            <Checkbox
              checked={exportIncludeChildren}
              onChange={(e) => setExportIncludeChildren(e.target.checked)}
            >
              {t('为子部门单独创建 Sheet')}
            </Checkbox>
            <div style={{ marginTop: 8, marginBottom: 16, color: 'var(--semi-color-text-2)', fontSize: 12 }}>
              {t('勾选后将为每个子部门单独生成一个 Sheet 页，包含详细的统计数据和图表')}
            </div>
          </>
        )}
        {users.length > 0 && (
          <>
            <Checkbox
              checked={exportIncludeUsers}
              onChange={(e) => setExportIncludeUsers(e.target.checked)}
            >
              {t('导出部门用户列表')}
            </Checkbox>
            <div style={{ marginTop: 8, color: 'var(--semi-color-text-2)', fontSize: 12 }}>
              {t('勾选后将生成用户列表 Sheet 页，包含用户数据、消耗排行 Top 10 和消耗占比 Top 10')}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DataOverview;
