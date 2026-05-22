import React from 'react';
import { useTranslation } from 'react-i18next';

const DataOverview = () => {
  const { t } = useTranslation();

  return (
    <div className='mt-[60px] px-2'>
      <h2>{t('数据总览')}</h2>
    </div>
  );
};

export default DataOverview;
