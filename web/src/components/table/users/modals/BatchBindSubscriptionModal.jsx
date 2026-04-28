import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Select, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { API, showError, showSuccess, renderQuota } from '../../../../helpers';

const BatchBindSubscriptionModal = ({
  visible,
  onCancel,
  selectedUsers,
  onConfirm,
  onSuccess,
  t,
}) => {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  const planOptions = useMemo(() => {
    return (plans || []).map((p) => ({
      label: `${p?.plan?.title || ''} ( ${
        Number(p?.plan?.total_amount || 0) > 0
          ? renderQuota(p.plan.total_amount)
          : t('不限')
      } )`,
      value: p?.plan?.id,
    }));
  }, [plans]);

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/plans');
      if (res.data?.success) {
        setPlans(res.data.data || []);
      } else {
        showError(res.data?.message || t('加载套餐失败'));
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSelectedPlanId(null);
    setResults(null);
    loadPlans();
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      showError(t('请选择订阅套餐'));
      return;
    }
    const userIds = selectedUsers.map((u) => u.id);
    setSubmitting(true);
    try {
      const data = await onConfirm(userIds, selectedPlanId);
      if (data) {
        setResults(data);
        onSuccess?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResults(null);
    setSelectedPlanId(null);
    onCancel();
  };

  const footer = results ? (
    <Button onClick={handleClose}>{t('关闭')}</Button>
  ) : (
    <Space>
      <Button onClick={handleClose}>{t('取消')}</Button>
      <Button
        theme='solid'
        type='primary'
        loading={submitting}
        onClick={handleSubmit}
        disabled={!selectedPlanId || selectedUsers.length === 0}
      >
        {t('确认分配')}
      </Button>
    </Space>
  );

  return (
    <Modal
      title={t('批量分配订阅')}
      visible={visible}
      onCancel={handleClose}
      maskClosable={false}
      centered={true}
      size='small'
      footer={footer}
      className='!rounded-lg'
    >
      {results ? (
        <div className='space-y-3'>
          <div className='flex gap-4'>
            <Tag color='green' shape='circle' size='large'>
              {t('成功')} {results.succeeded}
            </Tag>
            {results.failed > 0 && (
              <Tag color='red' shape='circle' size='large'>
                {t('失败')} {results.failed}
              </Tag>
            )}
          </div>
          {results.failed > 0 && (
            <div className='max-h-60 overflow-y-auto'>
              <Typography.Text type='danger' strong>
                {t('失败详情')}:
              </Typography.Text>
              <ul className='mt-1 space-y-1'>
                {results.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <li key={r.user_id} className='text-sm'>
                      <Typography.Text type='danger'>
                        {t('用户 ID')}: {r.user_id} — {r.message}
                      </Typography.Text>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className='space-y-4'>
          <div>
            <Typography.Text type='secondary'>
              {t('已选择 ${count} 个用户').replace(
                '${count}',
                selectedUsers.length,
              )}
            </Typography.Text>
          </div>
          <Select
            placeholder={t('选择订阅套餐')}
            optionList={planOptions}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            loading={plansLoading}
            filter
            style={{ width: '100%' }}
          />
        </div>
      )}
    </Modal>
  );
};

export default BatchBindSubscriptionModal;
