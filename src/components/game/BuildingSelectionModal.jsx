import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BuildingCard } from './BuildingCard';

export const BuildingSelectionModal = ({ candidates, onSelect }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl text-gray-900">
        <h2 className="text-xl font-bold text-center mb-1">{t('新建筑可用')}</h2>
        <p className="text-sm text-gray-500 text-center mb-4">{t('选择一个建筑加入可建列表')}</p>
        <div className="flex flex-col gap-3">
          {candidates.map(building => (
            <div
              key={building.id}
              onClick={() => onSelect(building.id)}
              className="cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <BuildingCard building={building} isBuilt={false} disabled={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
