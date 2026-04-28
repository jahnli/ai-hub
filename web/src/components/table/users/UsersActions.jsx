import React from 'react';
import { Button, Switch, Typography } from '@douyinfe/semi-ui';

const UsersActions = ({
  setShowAddUser,
  enableBatchSelect,
  setEnableBatchSelect,
  selectedUsers,
  setShowBatchBindModal,
  t,
}) => {
  const handleAddUser = () => {
    setShowAddUser(true);
  };

  return (
    <div className='flex flex-wrap items-center gap-2 w-full md:w-auto order-2 md:order-1'>
      <Button className='w-full md:w-auto' onClick={handleAddUser} size='small'>
        {t('添加用户')}
      </Button>
      {enableBatchSelect && (
        <Button
          className='w-full md:w-auto'
          size='small'
          type='primary'
          theme='solid'
          disabled={selectedUsers.length === 0}
          onClick={() => setShowBatchBindModal(true)}
        >
          {t('批量分配订阅')}
          {selectedUsers.length > 0 && ` (${selectedUsers.length})`}
        </Button>
      )}
      <div className='flex items-center gap-1'>
        <Typography.Text strong className='text-xs'>
          {t('批量选择')}
        </Typography.Text>
        <Switch
          size='small'
          checked={enableBatchSelect}
          onChange={(v) => {
            localStorage.setItem('enable-batch-select', v + '');
            setEnableBatchSelect(v);
          }}
        />
      </div>
    </div>
  );
};

export default UsersActions;
