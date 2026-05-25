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

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  SideSheet,
  Modal,
  Space,
  Tag,
  Typography,
  Card,
  Spin,
  RadioGroup,
  Radio,
} from '@douyinfe/semi-ui';
import {
  OverviewCards,
  QuotaTrendChart,
  RequestTrendChart,
  TokenTrendChart,
  ModelTrendChart,
  ModelPieChart,
  ModelRankChart,
  TokenDistChart,
  RecentLogsTable,
  GRANULARITY_OPTIONS,
  TIME_RANGE_OPTIONS,
} from '../../../stats/StatsCharts';
import { getLogsColumns } from '../../usage-logs/UsageLogsColumnDefs';
import CardTable from '../../../common/ui/CardTable';
import { useUserStats } from '../../../../hooks/users/useUserStats';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import { timestamp2string, copy } from '../../../../helpers';

const { Text } = Typography;

const MODAL_COLUMN_KEYS = {
  TIME: 'time', CHANNEL: 'channel', USERNAME: 'username', TOKEN: 'token',
  GROUP: 'group', TYPE: 'type', MODEL: 'model', USE_TIME: 'use_time',
  PROMPT: 'prompt', COMPLETION: 'completion', COST: 'cost', RETRY: 'retry',
  IP: 'ip', DETAILS: 'details',
};

const MODAL_VISIBLE_COLUMNS = {
  time: true, username: false, model: true, use_time: true,
  prompt: true, completion: true, cost: true, type: true,
  token: true, group: true, ip: true, details: true,
  channel: false, retry: false,
};

const UserStatsModal = ({ visible, onCancel, user, t, apiPrefix, mode }) => {
  const isMobile = useIsMobile();
  const { loading, statsData, granularity, fetchStats, changeGranularity, logsPage, logsPageSize, logsTotal, logsLoading, fetchLogs } = useUserStats(apiPrefix);

  useEffect(() => {
    if (visible && user?.id) {
      fetchStats(user.id);
    }
  }, [visible, user?.id]);

  const handleGranularityChange = (e) => {
    changeGranularity(e.target.value, user?.id);
  };

  const handleLogsPageChange = useCallback((page, pageSize) => {
    if (user?.id) {
      fetchLogs(user.id, page, pageSize);
    }
  }, [user?.id, fetchLogs]);

  const copyText = useCallback((text) => {
    copy(text, t('已复制'));
  }, [t]);

  const modalLogsColumns = useMemo(() => {
    if (mode !== 'modal') return [];
    const allCols = getLogsColumns({
      t,
      COLUMN_KEYS: MODAL_COLUMN_KEYS,
      copyText,
      showUserInfoFunc: () => {},
      openChannelAffinityUsageCacheModal: () => {},
      isAdminUser: true,
      billingDisplayMode: 'price',
    });
    return allCols.filter((col) => MODAL_VISIBLE_COLUMNS[col.key]);
  }, [t, copyText, mode]);

  const formattedLogs = useMemo(() => {
    if (!statsData?.recentLogs || statsData.recentLogs.length === 0) return [];
    return statsData.recentLogs.map((log) => ({
      ...log,
      timestamp2string: timestamp2string(log.created_at),
      key: log.id,
    }));
  }, [statsData?.recentLogs]);

  const content = (
    <Spin spinning={loading}>
      {statsData && (
        <div className='flex flex-col gap-4'>
          {mode !== 'modal' && <OverviewCards overview={statsData.overview} t={t} />}

          <div className='flex items-center gap-2'>
            <Text strong>{t('时间范围')}:</Text>
            <RadioGroup
              type='button'
              size='small'
              value={granularity}
              onChange={handleGranularityChange}
            >
              {TIME_RANGE_OPTIONS.map(opt => (
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

          {mode === 'modal' ? (
            <Card bodyStyle={{ padding: 12 }}>
              <Text strong className='mb-2 block'>{t('最近调用记录')}</Text>
              <CardTable
                columns={modalLogsColumns}
                dataSource={formattedLogs}
                rowKey='key'
                loading={logsLoading}
                size='small'
                scroll={{ x: 'max-content' }}
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
          ) : (
            <Card bodyStyle={{ padding: 12 }}>
              <RecentLogsTable logs={statsData.recentLogs} t={t} />
            </Card>
          )}
        </div>
      )}
    </Spin>
  );

  if (mode === 'modal') {
    return (
      <Modal
        visible={visible}
        onCancel={onCancel}
        footer={null}
        width={isMobile ? '100%' : 1400}
        bodyStyle={{ padding: '16px', maxHeight: '80vh', overflowY: 'auto' }}
        title={user?.name || user?.username}
        fullScreen={isMobile}
      >
        {content}
      </Modal>
    );
  }

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
      {content}
    </SideSheet>
  );
};

export default UserStatsModal;
