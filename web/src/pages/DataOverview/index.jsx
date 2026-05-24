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
    selectedPath,
    handleDeptChange,
  } = useDataOverviewData();

  const columns = useMemo(
    () => [
      {
        title: t('姓名'),
        dataIndex: 'name',
        width: 120,
      },
      {
        title: t('注册状态'),
        dataIndex: 'registered',
        width: 100,
        render: (registered) =>
          registered ? (
            <Tag color="green">{t('已注册')}</Tag>
          ) : (
            <Tag color="grey">{t('未注册')}</Tag>
          ),
      },
      {
        title: t('用户名'),
        dataIndex: 'username',
        width: 140,
        render: (text) => text || '-',
      },
      {
        title: t('额度'),
        dataIndex: 'quota',
        width: 100,
        render: (text, record) =>
          record.registered ? (text / 500000).toFixed(2) : '-',
      },
      {
        title: t('已用额度'),
        dataIndex: 'used_quota',
        width: 100,
        render: (text, record) =>
          record.registered ? (text / 500000).toFixed(2) : '-',
      },
      {
        title: t('请求次数'),
        dataIndex: 'request_count',
        width: 100,
        render: (text, record) => (record.registered ? text : '-'),
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
              value={selectedPath}
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
              rowKey="open_id"
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
