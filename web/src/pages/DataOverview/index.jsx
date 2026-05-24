import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cascader, Table, Card, Spin, Empty, Tag } from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { useDataOverviewData } from '../../hooks/dataOverview/useDataOverviewData';

const DataOverview = () => {
  const { t } = useTranslation();
  const {
    treeData,
    treeLoading,
    users,
    usersLoading,
    selectedDeptId,
    handleDeptChange,
  } = useDataOverviewData();

  const columns = useMemo(
    () => [
      {
        title: t('用户名'),
        dataIndex: 'username',
        width: 140,
      },
      {
        title: t('显示名称'),
        dataIndex: 'display_name',
        width: 140,
      },
      {
        title: t('邮箱'),
        dataIndex: 'email',
        width: 200,
      },
      {
        title: t('分组'),
        dataIndex: 'group',
        width: 100,
        render: (text) => <Tag>{text || 'default'}</Tag>,
      },
      {
        title: t('额度'),
        dataIndex: 'quota',
        width: 100,
        render: (text) => (text / 500000).toFixed(2),
      },
      {
        title: t('已用额度'),
        dataIndex: 'used_quota',
        width: 100,
        render: (text) => (text / 500000).toFixed(2),
      },
      {
        title: t('请求次数'),
        dataIndex: 'request_count',
        width: 100,
      },
      {
        title: t('角色'),
        dataIndex: 'role',
        width: 80,
        render: (role) => {
          if (role >= 100) return <Tag color="red">{t('超级管理员')}</Tag>;
          if (role >= 10) return <Tag color="orange">{t('管理员')}</Tag>;
          return <Tag>{t('普通用户')}</Tag>;
        },
      },
    ],
    [t],
  );

  return (
    <div className="mt-[60px] px-2">
      <Card
        title={
          <div className="flex items-center gap-3">
            <span>{t('数据总览')}</span>
            <Cascader
              treeData={treeData}
              placeholder={t('选择部门')}
              changeOnSelect
              onChange={handleDeptChange}
              loading={treeLoading}
              style={{ width: 320 }}
              showClear
            />
          </div>
        }
      >
        {usersLoading ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : selectedDeptId ? (
          users.length > 0 ? (
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOpts: [10, 20, 50, 100],
              }}
              size="small"
              bordered
            />
          ) : (
            <Empty
              image={<IllustrationNoResult />}
              darkModeImage={<IllustrationNoResultDark />}
              description={t('该部门下暂无用户')}
            />
          )
        ) : (
          <Empty
            image={<IllustrationNoResult />}
            darkModeImage={<IllustrationNoResultDark />}
            description={t('请选择一个部门查看用户数据')}
          />
        )}
      </Card>
    </div>
  );
};

export default DataOverview;
