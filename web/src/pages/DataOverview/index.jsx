import React, { useState, useMemo, useCallback } from 'react';
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
  SideSheet,
  Modal,
} from '@douyinfe/semi-ui';
import { IconRefresh, IconHistory } from '@douyinfe/semi-icons';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { renderQuota, renderNumber, timestamp2string, copy } from '../../helpers';
import { useDataOverviewData } from '../../hooks/dataOverview/useDataOverviewData';
import {
  OverviewCards,
  QuotaTrendChart,
  RequestTrendChart,
  TokenTrendChart,
  ModelTrendChart,
  ModelPieChart,
  ModelRankChart,
  GRANULARITY_OPTIONS,
} from '../../components/stats/StatsCharts';
import { getLogsColumns } from '../../components/table/usage-logs/UsageLogsColumnDefs';
import CardTable from '../../components/common/ui/CardTable';

const { Text } = Typography;

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

const DataOverview = () => {
  const { t } = useTranslation();
  const {
    treeData,
    treeLoading,
    users,
    usersLoading,
    selectedDeptId,
    selectedPath,
    handleDeptChange,
    statsData,
    statsLoading,
    granularity,
    changeGranularity,
    logs,
    logsTotal,
    logsLoading,
    logsPage,
    logsPageSize,
    handleLogsPageChange,
    fetchDepartmentLogs,
    fetchDepartmentStats,
    fetchDepartmentUsers,
  } = useDataOverviewData();

  const [showLogs, setShowLogs] = useState(false);

  const handleGranularityChange = (e) => {
    changeGranularity(e.target.value, selectedDeptId);
  };

  const refreshStats = useCallback(() => {
    if (selectedDeptId) fetchDepartmentStats(selectedDeptId);
  }, [selectedDeptId, fetchDepartmentStats]);

  const refreshUsers = useCallback(() => {
    if (selectedDeptId) fetchDepartmentUsers(selectedDeptId);
  }, [selectedDeptId, fetchDepartmentUsers]);

  const refreshLogs = useCallback(() => {
    if (selectedDeptId) fetchDepartmentLogs(selectedDeptId, logsPage, logsPageSize);
  }, [selectedDeptId, logsPage, logsPageSize, fetchDepartmentLogs]);

  const copyText = useCallback((event, text) => {
    event.stopPropagation();
    if (copy(text)) {
      Toast.success(t('已复制'));
    }
  }, [t]);

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
    return { registered, total: users.length, totalQuota, usedQuota, totalConsumed, totalPrompt, totalCompletion, totalRequests };
  }, [users]);

  const columns = useMemo(
    () => [
      {
        title: t('姓名'),
        dataIndex: 'name',
        width: 80,
      },
      {
        title: t('已用额度/总额度'),
        dataIndex: 'sub_quota_total',
        width: 160,
        sorter: (a, b) => (parseInt(a.sub_quota_used) || 0) - (parseInt(b.sub_quota_used) || 0),
        render: (text, record) => {
          if (!record.registered) return '-';
          const total = parseInt(record.sub_quota_total) || 0;
          const used = parseInt(record.sub_quota_used) || 0;
          if (total === 0 && used === 0) return '-';
          const remain = total - used;
          const percent = total > 0 ? (used / total) * 100 : 0;
          const popoverContent = (
            <div className="text-xs p-2">
              <div>{t('已用额度')}: {renderQuota(used)} ({percent.toFixed(0)}%)</div>
              <div>{t('剩余额度')}: {renderQuota(remain)}</div>
              <div>{t('总额度')}: {renderQuota(total)}</div>
            </div>
          );
          return (
            <Popover content={popoverContent} position="top">
              <div className="flex flex-col items-end">
                <span className="text-xs leading-none">{`${renderQuota(used)} / ${renderQuota(total)}`}</span>
                <Progress
                  percent={percent}
                  stroke={
                    percent >= 90
                      ? 'var(--semi-color-danger)'
                      : percent >= 70
                        ? 'var(--semi-color-warning)'
                        : 'var(--semi-color-success)'
                  }
                  aria-label="quota usage"
                  format={() => `${percent.toFixed(0)}%`}
                  style={{ width: '100%', height: '8px', borderRadius: '4px', marginTop: '4px', marginBottom: 0 }}
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
        sorter: (a, b) => (parseInt(a.total_consumed_quota) || 0) - (parseInt(b.total_consumed_quota) || 0),
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
          const aTotal = (parseInt(a.total_prompt_tokens) || 0) + (parseInt(a.total_completion_tokens) || 0);
          const bTotal = (parseInt(b.total_prompt_tokens) || 0) + (parseInt(b.total_completion_tokens) || 0);
          return aTotal - bTotal;
        },
        render: (text, record) => {
          if (!record.registered) return '-';
          const prompt = parseInt(record.total_prompt_tokens) || 0;
          const completion = parseInt(record.total_completion_tokens) || 0;
          const total = prompt + completion;
          if (total === 0) return '-';
          return renderNumber(total);
        },
      },
      {
        title: t('请求次数'),
        dataIndex: 'request_count',
        width: 90,
        sorter: (a, b) => (parseInt(a.request_count) || 0) - (parseInt(b.request_count) || 0),
        render: (text, record) => {
          if (!record.registered) return '-';
          return renderNumber(parseInt(record.request_count) || 0);
        },
      },
      {
        title: t('常用模型'),
        dataIndex: 'top_model',
        width: 140,
        render: (text, record) => {
          if (!record.registered || !text) return '-';
          return (
            <Tooltip content={text} position="top">
              <Tag size="small" color="blue" style={{ maxWidth: 130 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
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
          if (count <= 0) return <span className="text-gray-400">-</span>;
          return <Tag color="blue" shape="circle" size="small">{count}</Tag>;
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
          if (!record.registered || !text || text.startsWith('0001')) return '-';
          const d = new Date(text);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
      },
      {
        title: t('注册状态'),
        dataIndex: 'registered',
        width: 100,
        render: (registered) =>
          registered ? (
            <Tag color="green">{t('已注册')}</Tag>
          ) : (
            <Tag color="grey">{t('未注册')}</Tag>
          ),
      },
    ],
    [t],
  );

  return (
    <div className="mt-[60px] px-4">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Cascader
          treeData={treeData}
          value={selectedPath}
          placeholder={t('选择部门')}
          changeOnSelect
          onChange={handleDeptChange}
          loading={treeLoading}
          style={{ width: 480 }}
          showClear
        />
        {selectedDeptId && (
          <RadioGroup
            type="button"
            size="small"
            value={granularity}
            onChange={handleGranularityChange}
          >
            {GRANULARITY_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                {t(opt.label)}
              </Radio>
            ))}
          </RadioGroup>
        )}
      </div>

      {selectedDeptId ? (
        <div className="flex flex-col gap-4">
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <Text strong>{t('数据统计')}</Text>
                <Button
                  icon={<IconRefresh />}
                  theme="borderless"
                  size="small"
                  onClick={refreshStats}
                  loading={statsLoading}
                />
              </div>
            }
            bodyStyle={{ padding: 12 }}
          >
            {statsLoading ? (
              <div className="flex justify-center py-10">
                <Spin size="large" />
              </div>
            ) : (
              statsData && <OverviewCards overview={statsData.overview} t={t} />
            )}
          </Card>

          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <Text strong>{t('部门用户列表')} <Tag color="blue" size="small">{users.length}</Tag></Text>
                <div className="flex items-center gap-1">
                  <Button
                    icon={<IconHistory />}
                    theme="borderless"
                    size="small"
                    onClick={() => { setShowLogs(true); if (selectedDeptId) fetchDepartmentLogs(selectedDeptId, 1, logsPageSize); }}
                  >
                    {t('调用记录')}
                  </Button>
                  <Button
                    icon={<IconRefresh />}
                    theme="borderless"
                    size="small"
                    onClick={refreshUsers}
                    loading={usersLoading}
                  />
                </div>
              </div>
            }
            bodyStyle={{ padding: 0 }}
          >
            {usersLoading ? (
              <div className="flex justify-center py-6">
                <Spin size="large" />
              </div>
            ) : users.length > 0 ? (
              <Table
                columns={columns}
                dataSource={users}
                rowKey="open_id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  pageSizeOpts: [10, 20, 50, 100],
                }}
                size="small"
                style={{ width: '100%' }}
                footer={usersSummary ? (
                  <div className="flex items-center gap-6 px-3 py-2 text-sm font-medium" style={{ background: 'var(--semi-color-fill-0)' }}>
                    <span>{t('合计')}: {usersSummary.total} {t('人')}</span>
                    <span>{t('已注册')}: {usersSummary.registered}</span>
                    <span>Token: {((usersSummary.totalPrompt + usersSummary.totalCompletion) / 1e8).toFixed(2)} {t('亿')}</span>
                    <span>{t('总消耗')}: {renderQuota(usersSummary.totalConsumed)}</span>
                    <span>{t('均价')}: {renderQuota(
                      (usersSummary.totalPrompt + usersSummary.totalCompletion) > 0
                        ? Math.round(usersSummary.totalConsumed / ((usersSummary.totalPrompt + usersSummary.totalCompletion) / 1e6))
                        : 0
                    )}/M Tokens</span>
                    <span>{t('已用/总额度')}: {renderQuota(usersSummary.usedQuota)} / {renderQuota(usersSummary.totalQuota)}</span>
                    <span>{t('请求次数')}: {renderNumber(usersSummary.totalRequests)}</span>
                  </div>
                ) : null}
              />
            ) : (
              <Empty
                image={<IllustrationNoResult />}
                darkModeImage={<IllustrationNoResultDark />}
                description={t('该部门下暂无用户')}
              />
            )}
          </Card>

          {statsData && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card bodyStyle={{ padding: 12 }}>
                  <ModelPieChart data={statsData.modelDistribution} t={t} />
                </Card>
                <Card bodyStyle={{ padding: 12 }}>
                  <ModelRankChart data={statsData.modelDistribution} t={t} />
                </Card>
              </div>
            </div>
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
        title={<div className="flex items-center gap-2">{t('最近调用记录')}<Button icon={<IconRefresh />} theme="borderless" size="small" onClick={refreshLogs} loading={logsLoading} /></div>}
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
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              darkModeImage={<IllustrationNoResultDark style={{ width: 150, height: 150 }} />}
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
    </div>
  );
};

export default DataOverview;
