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

function getTimeRange(rangeKey) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start, end;

  switch (rangeKey) {
    case 'today':
      start = startOfDay;
      end = now;
      break;
    case 'yesterday': {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - 1);
      start = d;
      end = new Date(startOfDay.getTime() - 1);
      break;
    }
    case 'this_week': {
      const day = now.getDay() || 7;
      start = new Date(startOfDay);
      start.setDate(start.getDate() - (day - 1));
      end = now;
      break;
    }
    case 'last_week': {
      const day = now.getDay() || 7;
      const thisMonday = new Date(startOfDay);
      thisMonday.setDate(thisMonday.getDate() - (day - 1));
      end = new Date(thisMonday.getTime() - 1);
      start = new Date(thisMonday);
      start.setDate(start.getDate() - 7);
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = now;
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
      end = now;
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
      end = now;
  }

  return {
    start_time: Math.floor(start.getTime() / 1000),
    end_time: Math.floor(end.getTime() / 1000),
  };
}

function getAggregationBucketSize(rangeKey) {
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

function aggregateByGranularity(data, granularity) {
  if (!data || data.length === 0) return [];

  const bucketSize = getAggregationBucketSize(granularity);

  const buckets = new Map();
  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { created_at: bucketKey, quota: 0, count: 0, token_used: 0, model_name: item.model_name });
    }
    const b = buckets.get(bucketKey);
    b.quota += item.quota || 0;
    b.count += item.count || 0;
    b.token_used += item.token_used || 0;
  }
  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

function aggregateTrendByModel(data, granularity) {
  if (!data || data.length === 0) return [];

  const bucketSize = getAggregationBucketSize(granularity);

  const buckets = new Map();
  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    const key = `${bucketKey}_${item.model_name}`;
    if (!buckets.has(key)) {
      buckets.set(key, { created_at: bucketKey, model_name: item.model_name, quota: 0, count: 0, token_used: 0 });
    }
    const b = buckets.get(key);
    b.quota += item.quota || 0;
    b.count += item.count || 0;
    b.token_used += item.token_used || 0;
  }
  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

export const useUserStats = () => {
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [granularity, setGranularity] = useState('this_month');

  const fetchStats = useCallback(async (userId, gran) => {
    if (!userId) return;
    setLoading(true);
    try {
      const g = gran || granularity;
      const { start_time: startTime, end_time: endTime } = getTimeRange(g);

      const res = await API.get(`/api/user/${userId}/stats`, {
        params: { start_time: startTime, end_time: endTime },
      });
      if (res.data.success) {
        const raw = res.data.data;
        const trendRaw = raw.trend_data || [];
        const aggregated = aggregateByGranularity(trendRaw, g);
        const byModel = aggregateTrendByModel(trendRaw, g);

        setStatsData({
          overview: raw.overview,
          modelDistribution: raw.model_distribution || [],
          tokenDistribution: raw.token_distribution || [],
          trendAggregated: aggregated,
          trendByModel: byModel,
          recentLogs: raw.recent_logs || [],
        });
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [granularity]);

  const changeGranularity = useCallback((g, userId) => {
    setGranularity(g);
    if (userId) {
      fetchStats(userId, g);
    }
  }, [fetchStats]);

  return { loading, statsData, granularity, fetchStats, changeGranularity };
};
