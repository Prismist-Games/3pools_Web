import React from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORY_ICONS = {
  fruit: '🍎', medicine: '💊', stationery: '✏️',
  kitchenware: '🍳', electronics: '⚡',
};
const CATEGORY_LABELS = {
  fruit: '水果', medicine: '药物', stationery: '文具',
  kitchenware: '厨具', electronics: '电器',
};
const RARITY_LABELS = {
  common: '普通', uncommon: '优秀', rare: '稀有',
  epic: '史诗', legendary: '传说', mythic: '神话',
};

export const DemandCard = ({ demand, onFulfill, disabled, canFulfill }) => {
  const { t } = useLanguage();
  const isUrgent = demand.remainingTime <= 1;

  return (
    <div className={`rounded-lg border-2 p-3 text-sm transition-all text-gray-900 ${
      isUrgent ? 'border-red-400 bg-red-50 animate-pulse' : 'border-orange-300 bg-orange-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold">{t(demand.name)}</span>
        <div className="flex items-center gap-1 text-xs">
          <Clock size={12} />
          <span className={isUrgent ? 'text-red-600 font-bold' : 'text-gray-600'}>
            {demand.remainingTime} {t('回合')}
          </span>
        </div>
      </div>

      <div className="text-xs text-red-500 mb-1">
        {demand.satisfactionPerRound}/{t('回合')} {t('满意度')}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {demand.requires.map((req, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border text-xs">
            {CATEGORY_ICONS[req.category]}
            {req.minRarity && req.minRarity !== 'common' && (
              <span className="text-purple-600">{t(RARITY_LABELS[req.minRarity])}</span>
            )}
            {t(CATEGORY_LABELS[req.category])}x{req.count}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-green-700 text-xs font-medium">
          {t('奖励')}: +{demand.reward.currency} {t('金币')}
        </span>
        <button
          onClick={onFulfill}
          disabled={disabled}
          className={`px-3 py-1 rounded text-xs font-medium ${
            canFulfill
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t('满足')}
        </button>
      </div>
    </div>
  );
};
