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

const GRANULARITY_RANGES = {
  day: 30 * 86400,
  week: 12 * 7 * 86400,
  month: 365 * 86400,
  quarter: 2 * 365 * 86400,
  year: 5 * 365 * 86400,
};

function aggregateByGranularity(data, granularity) {
  if (!data || data.length === 0) return [];

  const bucketSize = {
    day: 86400,
    week: 7 * 86400,
    month: 30 * 86400,
    quarter: 91 * 86400,
    year: 365 * 86400,
  }[granularity] || 86400;

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

  const bucketSize = {
    day: 86400,
    week: 7 * 86400,
    month: 30 * 86400,
    quarter: 91 * 86400,
    year: 365 * 86400,
  }[granularity] || 86400;

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
  const [granularity, setGranularity] = useState('day');

  const fetchStats = useCallback(async (userId, gran) => {
    if (!userId) return;
    setLoading(true);
    try {
      const g = gran || granularity;
      const now = Math.floor(Date.now() / 1000);
      const range = GRANULARITY_RANGES[g] || GRANULARITY_RANGES.day;
      const startTime = now - range;

      const res = await API.get(`/api/user/${userId}/stats`, {
        params: { start_time: startTime, end_time: now },
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
