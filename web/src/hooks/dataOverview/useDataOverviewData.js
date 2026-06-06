import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { API, showError } from '../../helpers';

function getTimeRange(rangeKey) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start, end;

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

function findPathToNode(tree, targetValue) {
  for (const node of tree) {
    if (node.value === targetValue) {
      return [node.value];
    }
    if (node.children && node.children.length > 0) {
      const childPath = findPathToNode(node.children, targetValue);
      if (childPath) {
        return [node.value, ...childPath];
      }
    }
  }
  return null;
}

function getAggregationBucketSize(rangeKey) {
  switch (rangeKey) {
    case 'today':
    case 'yesterday':
      return 3600; // 1 hour
    case 'this_week':
    case 'last_week':
      return 86400; // 1 day
    case 'this_month':
    case 'last_month':
      return 86400; // 1 day
    case 'this_quarter':
    case 'last_quarter':
      return 7 * 86400; // 1 week
    case 'this_year':
    case 'last_year':
    case 'first_half':
    case 'second_half':
      return 30 * 86400; // ~1 month
    default:
      return 86400;
  }
}

function inferBucketSize(startTime, endTime) {
  const spanDays = (endTime - startTime) / 86400;
  if (spanDays <= 2) return 3600;        // ≤ 2天 → 1小时
  if (spanDays <= 35) return 86400;      // ≤ 35天 → 1天
  if (spanDays <= 100) return 7 * 86400; // ≤ 100天 → 1周
  return 30 * 86400;                     // > 100天 → ~1月
}

function inferGranularity(startDate, endDate) {
  const spanDays = dayjs(endDate).diff(dayjs(startDate), 'day');
  if (spanDays <= 1) return 'today';
  if (spanDays <= 6) return 'this_week';
  if (spanDays <= 31) return 'this_month';
  if (spanDays <= 92) return 'this_quarter';
  return 'this_year';
}

function aggregateByGranularity(data, granularity, overrideBucketSize) {
  if (!data || data.length === 0) return [];

  const bucketSize = overrideBucketSize || getAggregationBucketSize(granularity);

  const buckets = new Map();
  for (const item of data) {
    const bucketKey = Math.floor(item.created_at / bucketSize) * bucketSize;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { created_at: bucketKey, quota: 0, count: 0, token_used: 0 });
    }
    const b = buckets.get(bucketKey);
    b.quota += item.quota || 0;
    b.count += item.count || 0;
    b.token_used += item.token_used || 0;
  }
  return Array.from(buckets.values()).sort((a, b) => a.created_at - b.created_at);
}

function aggregateTrendByModel(data, granularity, overrideBucketSize) {
  if (!data || data.length === 0) return [];

  const bucketSize = overrideBucketSize || getAggregationBucketSize(granularity);

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

export const useDataOverviewData = () => {
  const [treeData, setTreeData] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDeptLabel, setSelectedDeptLabel] = useState('');
  const [leaderDeptIds, setLeaderDeptIds] = useState([]);

  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [granularity, setGranularity] = useState('this_month');
  const granularityRef = useRef(granularity);

  const defaultDateRange = useMemo(() => [
    dayjs().startOf('month').toDate(),
    dayjs().endOf('month').toDate(),
  ], []);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const dateRangeRef = useRef(dateRange);

  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);

  const [childrenStats, setChildrenStats] = useState([]);
  const [childrenStatsLoading, setChildrenStatsLoading] = useState(false);

  const fetchDepartmentLogs = useCallback(async (deptId, page, pageSize) => {
    if (!deptId) {
      setLogs([]);
      setLogsTotal(0);
      return;
    }
    setLogsLoading(true);
    try {
      const res = await API.get('/api/department/logs', {
        params: { dept_id: deptId, page, page_size: pageSize },
      });
      if (res?.data?.success) {
        setLogs(res.data.data?.logs || []);
        setLogsTotal(res.data.data?.total || 0);
      } else {
        showError(res?.data?.message || '获取调用记录失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleLogsPageChange = useCallback((page, pageSize) => {
    setLogsPage(page);
    setLogsPageSize(pageSize);
    if (selectedDeptId) {
      fetchDepartmentLogs(selectedDeptId, page, pageSize);
    }
  }, [selectedDeptId, fetchDepartmentLogs]);

  const resolveTimeRange = useCallback((timeRangeOrGran) => {
    if (typeof timeRangeOrGran === 'object' && timeRangeOrGran) {
      return timeRangeOrGran;
    }
    const dr = dateRangeRef.current;
    if (dr && dr[0] && dr[1]) {
      return {
        start_time: Math.floor(new Date(dr[0]).getTime() / 1000),
        end_time: Math.floor(new Date(dr[1]).getTime() / 1000),
      };
    }
    return getTimeRange(timeRangeOrGran || granularityRef.current);
  }, []);

  const fetchChildrenStats = useCallback(async (deptId, timeRangeOrGran) => {
    if (!deptId) {
      setChildrenStats([]);
      return;
    }
    setChildrenStatsLoading(true);
    try {
      const { start_time: startTime, end_time: endTime } = resolveTimeRange(timeRangeOrGran);
      const res = await API.get('/api/department/children-stats', {
        params: { dept_id: deptId, start_time: startTime, end_time: endTime },
      });
      if (res?.data?.success) {
        setChildrenStats(res.data.data?.children || []);
      } else {
        setChildrenStats([]);
      }
    } catch (error) {
      setChildrenStats([]);
    } finally {
      setChildrenStatsLoading(false);
    }
  }, [resolveTimeRange]);

  const fetchDepartmentStats = useCallback(async (deptId, timeRangeOrGran) => {
    if (!deptId) {
      setStatsData(null);
      return;
    }
    setStatsLoading(true);
    try {
      const resolved = resolveTimeRange(timeRangeOrGran);
      const { start_time: startTime, end_time: endTime } = resolved;
      const bucketSize = resolved.bucketSize || getAggregationBucketSize(granularityRef.current);
      const g = inferGranularity(new Date(startTime * 1000), new Date(endTime * 1000));

      const res = await API.get('/api/department/stats', {
        params: { dept_id: deptId, start_time: startTime, end_time: endTime },
      });
      if (res?.data?.success) {
        const raw = res.data.data;
        const trendRaw = raw.trend_data || [];
        const aggregated = aggregateByGranularity(trendRaw, g, bucketSize);
        const byModel = aggregateTrendByModel(trendRaw, g, bucketSize);

        setStatsData({
          overview: raw.overview,
          modelDistribution: raw.model_distribution || [],
          trendAggregated: aggregated,
          trendByModel: byModel,
        });
      } else {
        showError(res?.data?.message || '获取部门统计失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setStatsLoading(false);
    }
  }, [resolveTimeRange]);

  const fetchDepartmentUsers = useCallback(async (deptId, timeRangeOrGran, options = {}) => {
    if (!deptId) {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    try {
      const { start_time: startTime, end_time: endTime } = resolveTimeRange(timeRangeOrGran);
      const params = { dept_id: deptId, include_children: 'true', start_time: startTime, end_time: endTime };
      if (options.registered !== undefined && options.registered !== '') {
        params.registered = options.registered;
      }
      const res = await API.get('/api/department/users', { params });
      if (res?.data?.success) {
        setUsers(res.data.data || []);
      } else {
        showError(res?.data?.message || '获取部门用户失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setUsersLoading(false);
    }
  }, [resolveTimeRange]);

  const presetClickedRef = useRef(false);
  const pendingGranularityRef = useRef(null);

  const handlePresetClick = useCallback((item) => {
    presetClickedRef.current = true;
    pendingGranularityRef.current = item.granularity || null;
  }, []);

  const changeDateRange = useCallback((range) => {
    if (range && range[0] && range[1]) {
      setDateRange(range);
      dateRangeRef.current = range;
      if (presetClickedRef.current && pendingGranularityRef.current) {
        granularityRef.current = pendingGranularityRef.current;
        setGranularity(pendingGranularityRef.current);
        presetClickedRef.current = false;
        pendingGranularityRef.current = null;
      } else {
        const g = inferGranularity(range[0], range[1]);
        granularityRef.current = g;
        setGranularity(g);
      }
    }
  }, []);

  const queryByDateRange = useCallback((deptId, startDate, endDate) => {
    if (!deptId) return;
    const startTime = Math.floor(new Date(startDate).getTime() / 1000);
    const endTime = Math.floor(new Date(endDate).getTime() / 1000);
    const bucketSize = inferBucketSize(startTime, endTime);
    const timeRange = { start_time: startTime, end_time: endTime, bucketSize };
    fetchDepartmentUsers(deptId, timeRange);
    fetchDepartmentStats(deptId, timeRange);
    fetchChildrenStats(deptId, timeRange);
  }, [fetchDepartmentUsers, fetchDepartmentStats, fetchChildrenStats]);

  const fetchDepartmentTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await API.get('/api/department/tree');
      if (res?.data?.success) {
        const tree = res.data.data || [];
        const leaderIds = res.data.leader_dept_ids || [];
        const tenant = res.data.tenant_info || null;
        setTenantInfo(tenant);

        const disableRoot = res.data.disable_root || false;
        const finalTree = tenant
          ? [{ value: '__tenant_root__', label: tenant.name, children: tree, isLeaf: false, disabled: disableRoot }]
          : tree;
        setTreeData(finalTree);
        setLeaderDeptIds(leaderIds);

        if (leaderIds.length > 0) {
          const firstLeaderId = leaderIds[0];
          setSelectedDeptId(firstLeaderId);
          fetchDepartmentUsers(firstLeaderId);
          fetchDepartmentStats(firstLeaderId);
          fetchChildrenStats(firstLeaderId);
        }
      } else {
        showError(res?.data?.message || '获取部门树失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setTreeLoading(false);
    }
  }, [fetchDepartmentUsers, fetchDepartmentStats, fetchChildrenStats]);

  const selectedPath = useMemo(() => {
    if (!selectedDeptId || treeData.length === 0) return undefined;
    const searchId = selectedDeptId === '0' ? '__tenant_root__' : selectedDeptId;
    return findPathToNode(treeData, searchId) || undefined;
  }, [selectedDeptId, treeData]);

  const handleDeptChange = useCallback(
    (value) => {
      if (value) {
        let deptId = Array.isArray(value) ? value[value.length - 1] : value;
        if (deptId === '__tenant_root__') deptId = '0';
        setSelectedDeptId(deptId);
        setLogsPage(1);
        setLogs([]);
        setLogsTotal(0);
      } else {
        setSelectedDeptId(null);
        setSelectedDeptLabel('');
        setUsers([]);
        setStatsData(null);
        setChildrenStats([]);
        setLogs([]);
        setLogsTotal(0);
      }
    },
    [],
  );

  useEffect(() => {
    fetchDepartmentTree();
  }, [fetchDepartmentTree]);

  return {
    treeData,
    treeLoading,
    tenantInfo,
    users,
    usersLoading,
    selectedDeptId,
    selectedPath,
    selectedDeptLabel,
    setSelectedDeptLabel,
    leaderDeptIds,
    handleDeptChange,
    fetchDepartmentTree,
    fetchDepartmentUsers,
    statsData,
    statsLoading,
    granularity,
    dateRange,
    changeDateRange,
    handlePresetClick,
    queryByDateRange,
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
  };
};
