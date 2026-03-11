import React, { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BuildingCard } from './BuildingCard';

export const BuildingSelectionModal = ({ candidates, onSelect }) => {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(false);

  return (
    <>
      {/* Modal - hidden when peeking */}
      {!hidden && (
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
      )}

      {/* Peek button - centered below modal */}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[60]">
        <button
          onMouseDown={() => setHidden(true)}
          onMouseUp={() => setHidden(false)}
          onMouseLeave={() => setHidden(false)}
          className="flex items-center gap-1 text-xs text-white px-3 py-2 rounded-lg bg-slate-700/80 hover:bg-slate-600 border border-slate-500 transition-colors select-none shadow-lg"
          title={t('按住隐藏，查看场上局面')}
        >
          <EyeOff size={14} />
          {t('按住查看局面')}
        </button>
      </div>
    </>
  );
};
