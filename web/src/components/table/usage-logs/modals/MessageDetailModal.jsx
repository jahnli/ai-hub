import React from 'react';
import { Modal, Empty, Typography, Tag, Spin } from '@douyinfe/semi-ui';

const { Text } = Typography;

const MessageDetailModal = ({
  showMessageDetailModal,
  setShowMessageDetailModal,
  messageDetailTarget,
  messageDetailLoading,
  t,
}) => {
  const messages = messageDetailTarget?.messages || [];

  return (
    <Modal
      title={t('请求内容详情')}
      visible={showMessageDetailModal}
      onCancel={() => setShowMessageDetailModal(false)}
      footer={null}
      centered
      closable
      maskClosable
      width={640}
    >
      <div style={{ padding: '8px 20px 20px' }}>
        {messageDetailTarget?.requestId && (
          <div style={{ marginBottom: 12 }}>
            <Text type='tertiary' size='small'>
              Request ID: {messageDetailTarget.requestId}
            </Text>
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: '56vh',
              overflowY: 'auto',
              paddingRight: 2,
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--semi-color-border)',
                  background: 'var(--semi-color-fill-0)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: '0 0 auto' }}>
                  <Tag color='blue' shape='circle' size='small'>
                    {msg.role || 'user'}
                  </Tag>
                </div>
                <Text
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--semi-color-text-0)',
                  }}
                >
                  {msg.content || ''}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MessageDetailModal;
