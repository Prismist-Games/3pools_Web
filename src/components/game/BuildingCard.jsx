import React from 'react';
import { Hammer, Play, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORY_LABELS = {
  fruit: '水果', medicine: '药物', stationery: '文具',
  kitchenware: '厨具', electronics: '电器',
};

const RARITY_LABELS = {
  common: '普通', uncommon: '优秀', rare: '稀有',
  epic: '史诗', legendary: '传说', mythic: '神话',
};

const formatRequirement = (req, t) => {
  const category = req.anyCategory ? t('任意') : t(CATEGORY_LABELS[req.category] || req.category);
  const rarity = req.minRarity && req.minRarity !== 'common' ? t(RARITY_LABELS[req.minRarity]) : '';
  return `${rarity}${category}x${req.count || 1}`;
};

const formatOutput = (output, t) => {
  const parts = [];
  if (output.prosperity) parts.push(`+${output.prosperity} ${t('繁荣')}`);
  if (output.satisfaction) parts.push(`+${output.satisfaction} ${t('满意度')}`);
  if (output.currency) parts.push(`+${output.currency} ${t('金币')}`);
  return parts.join(', ');
};

export const BuildingCard = ({ building, isBuilt, onBuild, onUse, onDemolish, disabled, isActive }) => {
  const { t } = useLanguage();
  const reqs = Array.isArray(building.buildCost) ? building.buildCost : [building.buildCost];
  const useReqs = Array.isArray(building.useCondition) ? building.useCondition : [building.useCondition];

  return (
    <div className={`rounded-lg border-2 p-3 text-sm transition-all text-gray-900 ${
      isBuilt
        ? isActive ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'
        : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-base">{t(building.name)}</span>
        {isBuilt && (
          <button onClick={onDemolish} className="text-red-400 hover:text-red-600 p-1" title={t('拆除')}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {isBuilt ? (
        <>
          <div className="text-gray-500 mb-1">
            {t('使用')}: {useReqs.map(r => formatRequirement(r, t)).join(' + ')}
          </div>
          <div className="text-green-700 font-medium mb-2">
            {formatOutput(building.useOutput, t)}
          </div>
          <button
            onClick={onUse}
            disabled={disabled}
            className="w-full py-1.5 rounded bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Play size={14} /> {t('使用')}
          </button>
        </>
      ) : (
        <>
          <div className="text-gray-500 mb-1">
            {t('建造')}: {reqs.map(r => formatRequirement(r, t)).join(' + ')}
          </div>
          <div className="text-green-700 font-medium text-xs mb-2">
            {t('使用效果')}: {formatOutput(building.useOutput, t)}
          </div>
          <button
            onClick={onBuild}
            disabled={disabled}
            className="w-full py-1.5 rounded bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Hammer size={14} /> {t('建造')}
          </button>
        </>
      )}
    </div>
  );
};
