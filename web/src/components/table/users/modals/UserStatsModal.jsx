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

import React, { useEffect, useCallback } from 'react';
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
  TIME_RANGE_OPTIONS,
} from '../../../stats/StatsCharts';
import RecentUsageLogsTable from '../../../stats/RecentUsageLogsTable';
import { useUserStats } from '../../../../hooks/users/useUserStats';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import { copy } from '../../../../helpers';

const { Text } = Typography;

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

  const copyText = useCallback((event, text) => {
    event?.stopPropagation?.();
    return copy(text);
  }, []);

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

          <Card bodyStyle={{ padding: 12 }}>
            <Text strong className='mb-2 block'>{t('最近调用记录')}</Text>
            <RecentUsageLogsTable
              logs={statsData.recentLogs}
              t={t}
              copyText={copyText}
              loading={logsLoading}
              currentPage={logsPage}
              pageSize={logsPageSize}
              total={logsTotal}
              onPageChange={handleLogsPageChange}
            />
          </Card>
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
