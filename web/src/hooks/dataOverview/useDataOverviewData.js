import { useState, useEffect, useCallback, useMemo } from 'react';
import { API, showError } from '../../helpers';

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
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDeptLabel, setSelectedDeptLabel] = useState('');
  const [leaderDeptIds, setLeaderDeptIds] = useState([]);

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
        }
      } else {
        showError(res?.data?.message || '获取部门树失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setTreeLoading(false);
    }
  }, [fetchDepartmentUsers]);

  const selectedPath = useMemo(() => {
    if (!selectedDeptId || treeData.length === 0) return undefined;
    return findPathToNode(treeData, selectedDeptId) || undefined;
  }, [selectedDeptId, treeData]);

  const handleDeptChange = useCallback(
    (value) => {
      if (value) {
        const deptId = Array.isArray(value) ? value[value.length - 1] : value;
        setSelectedDeptId(deptId);
        fetchDepartmentUsers(deptId);
      } else {
        setSelectedDeptId(null);
        setSelectedDeptLabel('');
        setUsers([]);
      }
    },
    [fetchDepartmentUsers],
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
  };
};
