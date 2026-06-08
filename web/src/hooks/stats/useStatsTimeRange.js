import { useCallback, useState } from 'react';
import dayjs from 'dayjs';

export const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'this_week', label: '本周' },
  { value: 'last_week', label: '上周' },
  { value: 'this_month', label: '本月' },
  { value: 'last_month', label: '上月' },
  { value: 'this_quarter', label: '本季度' },
  { value: 'last_quarter', label: '上季度' },
  { value: 'first_half', label: '上半年' },
  { value: 'second_half', label: '下半年' },
  { value: 'this_year', label: '本年' },
  { value: 'last_year', label: '去年' },
];

export const GRANULARITY_OPTIONS = TIME_RANGE_OPTIONS;

export function getTimeRange(rangeKey) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start;
  let end;

  switch (rangeKey) {
    case 'today':
      start = startOfDay;
      end = endOfToday;
      break;
    case 'yesterday': {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - 1);
      start = d;
      end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      break;
    }
    case 'this_week': {
      const day = now.getDay() || 7;
      start = new Date(startOfDay);
      start.setDate(start.getDate() - (day - 1));
      end = endOfToday;
      break;
    }
    case 'last_week': {
      const day = now.getDay() || 7;
      const thisMonday = new Date(startOfDay);
      thisMonday.setDate(thisMonday.getDate() - (day - 1));
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(lastSunday.getDate() - 1);
      start = new Date(thisMonday);
      start.setDate(start.getDate() - 7);
      end = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59);
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = endOfToday;
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = endOfToday;
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
      end = endOfToday;
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
      end = endOfToday;
  }

  return {
    start_time: Math.floor(start.getTime() / 1000),
    end_time: Math.floor(end.getTime() / 1000),
  };
}

export function formatTimeRangeDisplay(rangeKey) {
  const { start_time: startTime, end_time: endTime } = getTimeRange(rangeKey);
  const fmt = (ts) => {
    const d = new Date(ts * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${sec}`;
  };
  return `${fmt(startTime)} ~ ${fmt(endTime)}`;
}

export function getAggregationBucketSize(rangeKey) {
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

export function inferBucketSize(startTime, endTime) {
  const spanDays = (endTime - startTime) / 86400;
  if (spanDays <= 2) return 3600;
  if (spanDays <= 35) return 86400;
  if (spanDays <= 100) return 7 * 86400;
  return 30 * 86400;
}

export function inferGranularity(startDate, endDate) {
  const spanDays = dayjs(endDate).diff(dayjs(startDate), 'day');
  if (spanDays <= 1) return 'today';
  if (spanDays <= 6) return 'this_week';
  if (spanDays <= 31) return 'this_month';
  if (spanDays <= 92) return 'this_quarter';
  return 'this_year';
}

export function aggregateByGranularity(data, granularity, overrideBucketSize) {
  if (!data || data.length === 0) return [];

  const bucketSize = overrideBucketSize || getAggregationBucketSize(granularity);
  const buckets = new Map();

  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { created_at: bucketKey, quota: 0, count: 0, token_used: 0 });
    }
    const bucket = buckets.get(bucketKey);
    bucket.quota += item.quota || 0;
    bucket.count += item.count || 0;
    bucket.token_used += item.token_used || 0;
  }

  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

export function aggregateTrendByModel(data, granularity, overrideBucketSize) {
  if (!data || data.length === 0) return [];

  const bucketSize = overrideBucketSize || getAggregationBucketSize(granularity);
  const buckets = new Map();

  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    const key = `${bucketKey}_${item.model_name}`;
    if (!buckets.has(key)) {
      buckets.set(key, { created_at: bucketKey, model_name: item.model_name, quota: 0, count: 0, token_used: 0 });
    }
    const bucket = buckets.get(key);
    bucket.quota += item.quota || 0;
    bucket.count += item.count || 0;
    bucket.token_used += item.token_used || 0;
  }

  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

export function useStatsTimeRange(initialRange = 'this_month') {
  const [granularity, setGranularity] = useState(initialRange);

  const resolveTimeRange = useCallback((rangeKey = granularity) => {
    return getTimeRange(rangeKey);
  }, [granularity]);

  const aggregateTrendData = useCallback((data, rangeKey = granularity, bucketSize) => {
    return {
      trendAggregated: aggregateByGranularity(data, rangeKey, bucketSize),
      trendByModel: aggregateTrendByModel(data, rangeKey, bucketSize),
    };
  }, [granularity]);

  return {
    granularity,
    setGranularity,
    resolveTimeRange,
    aggregateTrendData,
  };
}
