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

import { useState, useCallback } from 'react';
import { API, showError } from '../../helpers';
import { useStatsTimeRange } from '../stats/useStatsTimeRange';

export const useUserStats = (apiPrefix) => {
  const baseUrl = apiPrefix || '/api/user';
  const {
    granularity,
    setGranularity,
    resolveTimeRange,
    aggregateTrendData,
  } = useStatsTimeRange('this_month');
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchStats = useCallback(async (userId, gran, logPage, logPageSize) => {
    if (!userId) return;
    setLoading(true);
    try {
      const g = gran || granularity;
      const { start_time: startTime, end_time: endTime } = resolveTimeRange(g);
      const page = logPage || 1;
      const size = logPageSize || logsPageSize;

      const url = apiPrefix
        ? `${baseUrl}/${userId}`
        : `${baseUrl}/${userId}/stats`;
      const res = await API.get(url, {
        params: { start_time: startTime, end_time: endTime, log_page: page, log_page_size: size },
      });
      if (res.data.success) {
        const raw = res.data.data;
        const trendRaw = raw.trend_data || [];
        const { trendAggregated, trendByModel } = aggregateTrendData(trendRaw, g);

        setStatsData({
          overview: raw.overview,
          modelDistribution: raw.model_distribution || [],
          tokenDistribution: raw.token_distribution || [],
          trendAggregated,
          trendByModel,
          recentLogs: raw.recent_logs || [],
        });
        setLogsTotal(raw.logs_total ?? (raw.recent_logs || []).length);
        setLogsPage(page);
        setLogsPageSize(size);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [aggregateTrendData, apiPrefix, baseUrl, granularity, logsPageSize, resolveTimeRange]);

  const fetchLogs = useCallback(async (userId, page, pageSize) => {
    if (!userId) return;
    setLogsLoading(true);
    try {
      const g = granularity;
      const { start_time: startTime, end_time: endTime } = resolveTimeRange(g);
      const url = apiPrefix
        ? `${baseUrl}/${userId}`
        : `${baseUrl}/${userId}/stats`;
      const res = await API.get(url, {
        params: { start_time: startTime, end_time: endTime, log_page: page, log_page_size: pageSize },
      });
      if (res.data.success) {
        const raw = res.data.data;
        setStatsData(prev => prev ? { ...prev, recentLogs: raw.recent_logs || [] } : prev);
        setLogsTotal(raw.logs_total ?? (raw.recent_logs || []).length);
        setLogsPage(page);
        setLogsPageSize(pageSize);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLogsLoading(false);
    }
  }, [granularity, baseUrl, apiPrefix, resolveTimeRange]);

  const changeGranularity = useCallback((g, userId) => {
    setGranularity(g);
    setLogsPage(1);
    if (userId) {
      fetchStats(userId, g);
    }
  }, [fetchStats]);

  return { loading, statsData, granularity, fetchStats, changeGranularity, logsPage, logsPageSize, logsTotal, logsLoading, fetchLogs };
};
