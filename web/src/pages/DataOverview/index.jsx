import React, { useMemo, useCallback } from 'react';
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
} from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { renderQuota, timestamp2string, copy } from '../../helpers';
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

  const columns = useMemo(
    () => [
      {
        title: t('姓名'),
        dataIndex: 'name',
        width: 80,
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
      {
        title: t('用户名'),
        dataIndex: 'username',
        width: 140,
        render: (text) => text || '-',
      },
      {
        title: t('额度'),
        dataIndex: 'sub_quota_total',
        width: 100,
        render: (text, record) =>
          record.registered ? renderQuota(text || 0) : '-',
      },
      {
        title: t('已用额度'),
        dataIndex: 'sub_quota_used',
        width: 100,
        render: (text, record) =>
          record.registered ? renderQuota(text || 0) : '-',
      },
      {
        title: t('请求次数'),
        dataIndex: 'request_count',
        width: 100,
        render: (text, record) => (record.registered ? text : '-'),
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
              statsData && (
                <div className="flex flex-col gap-4">
                  <OverviewCards overview={statsData.overview} t={t} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card bodyStyle={{ padding: 12 }}>
                      <QuotaTrendChart
                        data={statsData.trendAggregated}
                        granularity={granularity}
                        t={t}
                      />
                    </Card>
                    <Card bodyStyle={{ padding: 12 }}>
                      <RequestTrendChart
                        data={statsData.trendAggregated}
                        granularity={granularity}
                        t={t}
                      />
                    </Card>
                    <Card bodyStyle={{ padding: 12 }}>
                      <TokenTrendChart
                        data={statsData.trendAggregated}
                        granularity={granularity}
                        t={t}
                      />
                    </Card>
                    <Card bodyStyle={{ padding: 12 }}>
                      <ModelTrendChart
                        data={statsData.trendByModel}
                        granularity={granularity}
                        t={t}
                      />
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card bodyStyle={{ padding: 12 }}>
                      <ModelPieChart
                        data={statsData.modelDistribution}
                        t={t}
                      />
                    </Card>
                    <Card bodyStyle={{ padding: 12 }}>
                      <ModelRankChart
                        data={statsData.modelDistribution}
                        t={t}
                      />
                    </Card>
                  </div>
                </div>
              )
            )}
          </Card>

          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <Text strong>{t('部门用户列表')} ({users.length})</Text>
                <Button
                  icon={<IconRefresh />}
                  theme="borderless"
                  size="small"
                  onClick={refreshUsers}
                  loading={usersLoading}
                />
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
                bordered
              />
            ) : (
              <Empty
                image={<IllustrationNoResult />}
                darkModeImage={<IllustrationNoResultDark />}
                description={t('该部门下暂无用户')}
              />
            )}
          </Card>

          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <Text strong>{t('最近调用记录')}</Text>
                <Button
                  icon={<IconRefresh />}
                  theme="borderless"
                  size="small"
                  onClick={refreshLogs}
                  loading={logsLoading}
                />
              </div>
            }
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
          </Card>
        </div>
      ) : (
        <Empty
          image={<IllustrationNoResult />}
          darkModeImage={<IllustrationNoResultDark />}
          description={t('请选择一个部门查看用户数据')}
        />
      )}
    </div>
  );
};

export default DataOverview;
