import { useState, useEffect, useCallback } from 'react';
import { API, showError } from '../../helpers';

export const useDataOverviewData = () => {
  const [treeData, setTreeData] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDeptLabel, setSelectedDeptLabel] = useState('');

  const fetchDepartmentTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await API.get('/api/department/tree');
      if (res?.data?.success) {
        setTreeData(res.data.data || []);
      } else {
        showError(res?.data?.message || '获取部门树失败');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setTreeLoading(false);
    }
  }, []);

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
    selectedDeptLabel,
    setSelectedDeptLabel,
    handleDeptChange,
    fetchDepartmentTree,
    fetchDepartmentUsers,
  };
};
