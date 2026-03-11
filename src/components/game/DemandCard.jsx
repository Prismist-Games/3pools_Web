import React from 'react';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ITEM_LOOKUP, INITIAL_RARITY_CONFIG } from '../../data/prototypeConstants';

const getRarityConfig = (rarityId) =>
  INITIAL_RARITY_CONFIG.find(r => r.id === rarityId) || INITIAL_RARITY_CONFIG[0];

const getRarityIndex = (rarityId) =>
  INITIAL_RARITY_CONFIG.findIndex(r => r.id === rarityId);

const SHOWN_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// Build category → items map from ITEM_LOOKUP
const CATEGORY_ITEMS = (() => {
  const map = {};
  for (const [name, info] of Object.entries(ITEM_LOOKUP)) {
    if (!map[info.category]) map[info.category] = [];
    map[info.category].push({ name, icon: info.icon });
  }
  return map;
})();

// Capsule matching BuildingCard's ReqCapsule style
const ItemCapsule = ({ item, t }) => {
  const hasMatch = !!item;
  const borderStyle = hasMatch ? 'border-solid' : 'border-dashed';
  const colorClasses = hasMatch
    ? item.rarity.color
    : 'border-slate-300 bg-slate-50 text-slate-600';

  return (
    <span className={`relative inline-flex items-center gap-0.5 h-[28px] px-2 rounded-full border-2 text-xs transition-all ${borderStyle} ${colorClasses}`}>
      {hasMatch ? (
        <>
          <span className={`w-2 h-2 rounded-full shadow-sm border border-white/50 shrink-0 ${item.rarity.dotColor}`}
                title={t(item.rarity.name)} />
          <span>{ITEM_LOOKUP[item.name]?.icon}</span>
          <span className="font-medium">{t(item.name)}</span>
          <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-0.5 shadow">
            <Check size={8} strokeWidth={4} />
          </div>
        </>
      ) : (
        <span className="font-medium opacity-50">?</span>
      )}
    </span>
  );
};

export const DemandCard = ({ demand, onFulfill, disabled, canFulfill, inventory, bonusItems = [], qualityValues = {}, bonusExtra = 2 }) => {
  const { t } = useLanguage();

  const validCategories = new Set(demand.categories);
  const bonusSet = new Set(bonusItems);

  const progressPct = Math.min(100, (demand.progress / demand.target) * 100);
  const isUrgent = demand.remainingRounds <= 1;

  // Find matching inventory items, sorted by rarity (highest first), bonus items prioritized
  const matchingItems = React.useMemo(() => {
    if (!inventory) return [];
    const items = [];
    for (const item of inventory) {
      if (!item) continue;
      const itemInfo = ITEM_LOOKUP[item.name];
      if (itemInfo && validCategories.has(itemInfo.category)) {
        items.push(item);
      }
    }
    items.sort((a, b) => {
      const aBonus = bonusSet.has(a.name) ? 1 : 0;
      const bBonus = bonusSet.has(b.name) ? 1 : 0;
      if (aBonus !== bBonus) return bBonus - aBonus;
      return getRarityIndex(b.rarity.id) - getRarityIndex(a.rarity.id);
    });
    return items;
  }, [inventory, demand.categories, bonusItems]);

  // Show up to 4 matched items, then +N for the rest
  const shownItems = matchingItems.slice(0, 4);
  const extraCount = Math.max(0, matchingItems.length - 4);

  return (
    <div className={`rounded-lg border-2 p-3 text-sm transition-all text-gray-900 ${
      isUrgent ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
    }`}>
      {/* Row 1: title + remaining rounds + button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">{t(demand.name)}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isUrgent ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            <Clock size={10} />
            {demand.remainingRounds} {t('回合')}
          </span>
          {isUrgent && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
              <AlertTriangle size={10} />
              -{demand.penalty}
            </span>
          )}
        </div>
        <button
          onClick={onFulfill}
          disabled={disabled}
          className={`shrink-0 px-3 py-1 rounded text-xs font-medium ${
            canFulfill
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t('提交')}
        </button>
      </div>

      {/* Row 2: progress bar */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500 font-medium">{t('进度')}</span>
          <span className="font-mono font-bold text-gray-700">{demand.progress}/{demand.target}</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              demand.progress >= demand.target ? 'bg-green-500' : isUrgent ? 'bg-red-400' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] mt-0.5">
          <span className="text-gray-400">{t('失败惩罚')}: <span className="text-red-500 font-bold">-{demand.penalty} {t('满意度')}</span></span>
        </div>
      </div>

      {/* Row 3: accepted categories with item icons, bonus items labeled */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-2.5">
        {demand.categories.map((catId, i) => {
          const catItems = CATEGORY_ITEMS[catId] || [];
          return (
            <div key={catId} className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500 font-medium">{t(demand.categoryNames[i])}:</span>
              {catItems.map(ci => {
                const isBonus = bonusSet.has(ci.name);
                return (
                  <span key={ci.name}
                    className={`inline-flex items-center gap-0.5 ${isBonus ? 'bg-amber-100 rounded-md px-1.5 py-0.5' : ''}`}
                    title={t(ci.name)}>
                    <span className="text-base">{ci.icon}</span>
                    {isBonus && <span className="text-xs text-amber-600 font-bold">+{bonusExtra}</span>}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Row 4: matched items → quality contribution values */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          {shownItems.length > 0 ? (
            <>
              {shownItems.map((item, i) => (
                <ItemCapsule key={i} item={item} t={t} />
              ))}
              {extraCount > 0 && (
                <span className="text-sm text-gray-400">+{extraCount}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">{t('无匹配物品')}</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">&rarr;</span>
        <div className="flex items-center gap-2.5">
          {SHOWN_RARITIES.map(rarityId => {
            const value = qualityValues[rarityId];
            if (value === undefined) return null;
            const conf = getRarityConfig(rarityId);
            return (
              <span key={rarityId} className="inline-flex items-center gap-1 text-sm" title={t(conf.name)}>
                <span className={`w-3 h-3 rounded-full shrink-0 ${conf.dotColor}`} />
                <span className="text-gray-700 font-bold">+{value}</span>
              </span>
            );
          })}
          <span className="text-gray-500 text-sm">{t('进度')}</span>
        </div>
      </div>
    </div>
  );
};
