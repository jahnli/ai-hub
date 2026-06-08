import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { API, showError } from '../../helpers';
import {
  aggregateByGranularity,
  aggregateTrendByModel,
  getAggregationBucketSize,
  getTimeRange,
  inferBucketSize,
  inferGranularity,
} from '../stats/useStatsTimeRange';

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
