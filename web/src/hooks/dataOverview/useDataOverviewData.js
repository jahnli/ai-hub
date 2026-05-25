import { useState, useEffect, useCallback, useMemo } from 'react';
import { API, showError } from '../../helpers';

const GRANULARITY_RANGES = {
  day: 30 * 86400,
  week: 12 * 7 * 86400,
  month: 365 * 86400,
  quarter: 2 * 365 * 86400,
  year: 5 * 365 * 86400,
};

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
      buckets.set(bucketKey, { created_at: bucketKey, quota: 0, count: 0, token_used: 0 });
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

export const useDataOverviewData = () => {
  const [treeData, setTreeData] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDeptLabel, setSelectedDeptLabel] = useState('');
  const [leaderDeptIds, setLeaderDeptIds] = useState([]);

  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [granularity, setGranularity] = useState('day');

  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);

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

  const fetchDepartmentStats = useCallback(async (deptId, gran) => {
    if (!deptId) {
      setStatsData(null);
      return;
    }
    setStatsLoading(true);
    try {
      const g = gran || granularity;
      const now = Math.floor(Date.now() / 1000);
      const range = GRANULARITY_RANGES[g] || GRANULARITY_RANGES.day;
      const startTime = now - range;

      const res = await API.get('/api/department/stats', {
        params: { dept_id: deptId, start_time: startTime, end_time: now },
      });
      if (res?.data?.success) {
        const raw = res.data.data;
        const trendRaw = raw.trend_data || [];
        const aggregated = aggregateByGranularity(trendRaw, g);
        const byModel = aggregateTrendByModel(trendRaw, g);

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
  }, [granularity]);

  const changeGranularity = useCallback((g, deptId) => {
    setGranularity(g);
    if (deptId) {
      fetchDepartmentStats(deptId, g);
    }
  }, [fetchDepartmentStats]);

  const fetchDepartmentUsers = useCallback(async (deptId) => {
    if (!deptId) {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    try {
      const res = await API.get('/api/department/users', {
        params: { dept_id: deptId, include_children: 'true' },
      });
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
  }, []);

  const fetchDepartmentTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await API.get('/api/department/tree');
      if (res?.data?.success) {
        const tree = res.data.data || [];
        const leaderIds = res.data.leader_dept_ids || [];
        setTreeData(tree);
        setLeaderDeptIds(leaderIds);

        if (leaderIds.length > 0) {
          const firstLeaderId = leaderIds[0];
          setSelectedDeptId(firstLeaderId);
          fetchDepartmentUsers(firstLeaderId);
          fetchDepartmentStats(firstLeaderId);
          fetchDepartmentLogs(firstLeaderId, 1, 10);
        }
      } else {
        showError(res?.data?.message || '获取部门树失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setTreeLoading(false);
    }
  }, [fetchDepartmentUsers, fetchDepartmentStats, fetchDepartmentLogs]);

  const selectedPath = useMemo(() => {
    if (!selectedDeptId || treeData.length === 0) return undefined;
    return findPathToNode(treeData, selectedDeptId) || undefined;
  }, [selectedDeptId, treeData]);

  const handleDeptChange = useCallback(
    (value) => {
      if (value) {
        const deptId = Array.isArray(value) ? value[value.length - 1] : value;
        setSelectedDeptId(deptId);
        setLogsPage(1);
        fetchDepartmentUsers(deptId);
        fetchDepartmentStats(deptId);
        fetchDepartmentLogs(deptId, 1, logsPageSize);
      } else {
        setSelectedDeptId(null);
        setSelectedDeptLabel('');
        setUsers([]);
        setStatsData(null);
        setLogs([]);
        setLogsTotal(0);
      }
    },
    [fetchDepartmentUsers, fetchDepartmentStats, fetchDepartmentLogs, logsPageSize],
  );

  useEffect(() => {
    fetchDepartmentTree();
  }, [fetchDepartmentTree]);

  return {
    treeData,
    treeLoading,
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
    changeGranularity,
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
