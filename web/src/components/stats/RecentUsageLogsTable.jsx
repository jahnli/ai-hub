import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty } from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import CardTable from '../common/ui/CardTable';
import MessageDetailModal from '../table/usage-logs/modals/MessageDetailModal';
import { API, isRoot, showError } from '../../helpers';
import {
  DEFAULT_RECENT_USAGE_LOG_VISIBLE_COLUMNS,
  useRecentUsageLogsTable,
} from '../../hooks/stats/useRecentUsageLogsTable';

const noop = () => Promise.resolve(false);

const RecentUsageLogsTable = ({
  logs,
  t,
  copyText,
  visibleColumns = DEFAULT_RECENT_USAGE_LOG_VISIBLE_COLUMNS,
  loading = false,
  currentPage = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  pageSizeOptions = [10, 20, 50],
  showPagination = true,
  empty,
  scroll = { x: 'max-content' },
  size = 'small',
  billingDisplayMode = 'price',
  canViewMessages = isRoot(),
}) => {
  const [messageSummaries, setMessageSummaries] = useState({});
  const [showMessageDetailModal, setShowMessageDetailModal] = useState(false);
  const [messageDetailTarget, setMessageDetailTarget] = useState(null);
  const [messageDetailLoading, setMessageDetailLoading] = useState(false);

  useEffect(() => {
    if (!canViewMessages || !logs || logs.length === 0) {
      setMessageSummaries({});
      return;
    }

    const requestIds = logs
      .map((log) => log.request_id)
      .filter((id) => id && id !== '');

    if (requestIds.length === 0) {
      setMessageSummaries({});
      return;
    }

    let cancelled = false;
    const uniqueRequestIds = Array.from(new Set(requestIds));

    API.get(`/api/log/messages/batch?request_ids=${uniqueRequestIds.join(',')}`)
      .then((res) => {
        const { success, data } = res.data || {};
        if (!cancelled && success && data) {
          setMessageSummaries(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [canViewMessages, logs]);

  const logsWithMessages = useMemo(() => {
    if (!canViewMessages || !logs || logs.length === 0) return logs;
    return logs.map((log) => ({
      ...log,
      message_summary: messageSummaries[log.request_id] || log.message_summary || '',
    }));
  }, [canViewMessages, logs, messageSummaries]);

  const viewMessageDetail = useCallback(async (requestId) => {
    if (!canViewMessages || !requestId) return;

    setMessageDetailLoading(true);
    try {
      const res = await API.get(`/api/log/messages?request_id=${requestId}`);
      const { success, data } = res.data || {};
      if (success && data) {
        let messages = [];
        try {
          messages =
            typeof data.messages === 'string'
              ? JSON.parse(data.messages)
              : data.messages || [];
        } catch (e) {
          messages = [];
        }
        setMessageDetailTarget({
          requestId,
          summary: data.summary,
          messages,
        });
        setShowMessageDetailModal(true);
      }
    } catch (e) {
      showError(t('获取消息详情失败'));
    } finally {
      setMessageDetailLoading(false);
    }
  }, [canViewMessages, t]);

  const { columns, dataSource } = useRecentUsageLogsTable({
    logs: logsWithMessages,
    t,
    copyText: copyText || noop,
    visibleColumns,
    billingDisplayMode,
    canViewMessages,
    viewMessageDetail,
  });

  const pagination = showPagination
    ? {
        currentPage,
        pageSize,
        total,
        pageSizeOptions,
        showSizeChanger: true,
        onPageChange: (page) => onPageChange?.(page, pageSize),
        onPageSizeChange: (sizeValue) => onPageChange?.(1, sizeValue),
      }
    : false;

  return (
    <>
      {canViewMessages && (
        <MessageDetailModal
          showMessageDetailModal={showMessageDetailModal}
          setShowMessageDetailModal={setShowMessageDetailModal}
          messageDetailTarget={messageDetailTarget}
          messageDetailLoading={messageDetailLoading}
          t={t}
        />
      )}
      <CardTable
        columns={columns}
        dataSource={dataSource}
        rowKey='key'
        loading={loading}
        size={size}
        scroll={scroll}
        empty={
          empty || (
            <Empty
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              darkModeImage={<IllustrationNoResultDark style={{ width: 150, height: 150 }} />}
              description={t('暂无数据')}
              style={{ padding: 30 }}
            />
          )
        }
        pagination={pagination}
      />
    </>
  );
};

export default RecentUsageLogsTable;
