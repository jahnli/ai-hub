import React, { useState } from 'react';
import {
  Modal,
  Empty,
  Typography,
  Tag,
  Spin,
  Collapse,
  Button,
  Tooltip,
} from '@douyinfe/semi-ui';
import { IconCopy, IconBell } from '@douyinfe/semi-icons';
import { copy, showError, showSuccess } from '../../../../helpers';

const { Text } = Typography;

const stringifyMessageContent = (content) => {
  if (content === undefined || content === null) {
    return '';
  }
  if (typeof content === 'string') {
    return content;
  }
  return JSON.stringify(content, null, 2);
};

const MessageDetailModal = ({
  showMessageDetailModal,
  setShowMessageDetailModal,
  messageDetailTarget,
  messageDetailLoading,
  notifyViolation,
  t,
}) => {
  const [notifyConfirmVisible, setNotifyConfirmVisible] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const messages = messageDetailTarget?.messages || [];
  const defaultActiveKeys = messages.map((_, index) => `${index}`);

  const handleCopy = async (event, content) => {
    event.stopPropagation();
    const text = stringifyMessageContent(content);
    if (!text) return;
    if (await copy(text)) {
      showSuccess(t('消息已复制到剪贴板'));
      return;
    }
    showError(t('无法复制到剪贴板，请手动复制'));
  };

  const handleNotifyConfirm = async () => {
    if (!messageDetailTarget || notifying) return;
    setNotifying(true);
    try {
      await notifyViolation?.(messageDetailTarget);
    } finally {
      setNotifying(false);
      setNotifyConfirmVisible(false);
    }
  };

  return (
    <>
      <Modal
        title={t('请求内容详情')}
        visible={showMessageDetailModal}
        onCancel={() => setShowMessageDetailModal(false)}
        footer={null}
        centered
        closable
        maskClosable
        width='50%'
      >
        <div style={{ padding: '8px 20px 20px' }}>
          {messageDetailTarget?.requestId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text type='tertiary' size='small'>
                Request ID: {messageDetailTarget.requestId}
              </Text>
              {messageDetailTarget?.userId && (
                <Button
                  icon={<IconBell />}
                  type='danger'
                  theme='light'
                  size='small'
                  onClick={() => setNotifyConfirmVisible(true)}
                  disabled={messageDetailLoading}
                >
                  {t('通知违规')}
                </Button>
              )}
            </div>
          )}

          {messageDetailLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Spin />
            </div>
          ) : messages.length === 0 ? (
            <Empty
              description={t('暂无提问记录')}
              style={{ padding: '24px 0 8px' }}
            />
          ) : (
            <div style={{ maxHeight: '56vh', overflowY: 'auto', paddingRight: 2 }}>
              <Collapse defaultActiveKey={defaultActiveKeys} accordion={false}>
                {messages.map((msg, index) => (
                  <Collapse.Panel
                    key={index}
                    itemKey={`${index}`}
                    header={
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          minWidth: 0,
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <Tag color='blue' shape='circle' size='small'>
                            {msg.role || 'user'}
                          </Tag>
                          <Text size='small' type='tertiary'>
                            #{index + 1}
                          </Text>
                        </div>
                        <Tooltip content={t('复制')}>
                          <Button
                            icon={<IconCopy style={{ color: 'var(--semi-color-text-2)', fontSize: 13 }} />}
                            theme='borderless'
                            type='tertiary'
                            size='small'
                            style={{ color: 'var(--semi-color-text-2)', height: 22, width: 22, padding: 0 }}
                            aria-label={t('复制')}
                            onClick={(event) => handleCopy(event, msg.content)}
                            disabled={!stringifyMessageContent(msg.content)}
                          />
                        </Tooltip>
                      </div>
                    }
                  >
                    <Text
                      style={{
                        display: 'block',
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'var(--semi-color-text-0)',
                      }}
                    >
                      {stringifyMessageContent(msg.content)}
                    </Text>
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={t('确认发送违规通知')}
        visible={notifyConfirmVisible}
        onCancel={() => setNotifyConfirmVisible(false)}
        onOk={handleNotifyConfirm}
        okText={t('确认发送')}
        cancelText={t('取消')}
        okButtonProps={{ type: 'danger', loading: notifying }}
        centered
        width={420}
      >
        <p style={{ margin: 0 }}>
          {t('确定要向该用户发送飞书违规提醒通知吗？')}
        </p>
      </Modal>
    </>
  );
};

export default MessageDetailModal;
