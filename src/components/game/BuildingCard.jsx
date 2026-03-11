import React from 'react';
import { Hammer, Play, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ITEM_LOOKUP, INITIAL_RARITY_CONFIG } from '../../data/prototypeConstants';

const RARITY_LABELS = {
  common: '普通', uncommon: '优秀', rare: '稀有',
  epic: '史诗', legendary: '传说', mythic: '神话',
};

const getRarityConfig = (rarityId) =>
  INITIAL_RARITY_CONFIG.find(r => r.id === rarityId) || INITIAL_RARITY_CONFIG[0];

const getRarityIndex = (rarityId, rarityConfig) =>
  rarityConfig ? rarityConfig.findIndex(r => r.id === rarityId) : 0;

const OutputDisplay = ({ output, t }) => {
  if (output.item) {
    const itemInfo = ITEM_LOOKUP[output.item.name];
    const rarityConf = getRarityConfig(output.item.rarity || 'common');
    return (
      <span className={`inline-flex items-center gap-0.5 h-[28px] px-2 rounded-full border-2 border-solid text-xs pointer-events-none select-none ${rarityConf.color}`}>
        <span className={`w-2 h-2 rounded-full shadow-sm border border-white/50 shrink-0 ${rarityConf.dotColor}`}
              title={t(RARITY_LABELS[output.item.rarity || 'common'])} />
        <span>{itemInfo?.icon}</span>
        <span className="font-medium">{t(output.item.name)}</span>
      </span>
    );
  }
  const parts = [];
  if (output.prosperity) parts.push(
    <span key="p" className="inline-flex items-center gap-0.5 text-emerald-700">
      <span className="text-xs">&#9733;</span>+{output.prosperity} {t('繁荣')}
    </span>
  );
  if (output.currency) parts.push(
    <span key="c" className="inline-flex items-center gap-0.5 text-yellow-700">
      +{output.currency} {t('金币')}
    </span>
  );
  return <>{parts.reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep${i}`} className="text-gray-400 mx-0.5">,</span>, el], [])}</>;
};

const ReqCapsule = ({ req, highlighted, hoveredItemName, matchedItem, t }) => {
  const itemInfo = ITEM_LOOKUP[req.name];
  const isPoolHighlighted = highlighted?.has(req.name);
  const isItemHighlighted = hoveredItemName && req.name === hoveredItemName;
  const isHighlighted = isPoolHighlighted || isItemHighlighted;

  const reqRarity = getRarityConfig(req.minRarity || 'common');
  const hasMatch = !!matchedItem;

  // Border/bg: use matched item's rarity color if matched, else dashed gray
  const borderStyle = hasMatch ? 'border-solid' : 'border-dashed';
  const colorClasses = hasMatch
    ? matchedItem.rarity.color
    : 'border-slate-300 bg-slate-50 text-slate-600';

  return (
    <span className={`relative inline-flex items-center gap-0.5 h-[28px] px-2 rounded-full border-2 text-xs transition-all ${borderStyle} ${colorClasses} ${
      isHighlighted ? 'scale-110 z-30 shadow-xl ring-2 ring-slate-200' : ''
    }`}>
      <span className={`w-2 h-2 rounded-full shadow-sm border border-white/50 shrink-0 ${reqRarity.dotColor}`}
            title={t(RARITY_LABELS[req.minRarity || 'common'])} />
      <span>{itemInfo?.icon}</span>
      <span className={`font-medium ${hasMatch ? '' : 'opacity-50'}`}>{t(req.name)}</span>
      {/* Checkmark when matched */}
      {hasMatch && (
        <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-0.5 shadow">
          <Check size={8} strokeWidth={4} />
        </div>
      )}
    </span>
  );
};

// Star rating display
const Stars = ({ count }) => (
  <span className="text-amber-500 text-xs tracking-tight" title={`效率 ${'★'.repeat(count)}`}>
    {'★'.repeat(count)}
  </span>
);

// Recipe row for transformation buildings (used in both built and preview states)
const RecipeRow = ({ recipe, highlighted, hoveredItemName, inventory, rarityConfig, onUse, disabled, isActive, isBuilt, t }) => {
  // Match inventory items against recipe useCondition
  const reqs = Array.isArray(recipe.useCondition) ? recipe.useCondition : [recipe.useCondition];
  const matches = React.useMemo(() => {
    if (!inventory || !isBuilt) return new Map();
    const used = new Set();
    const result = new Map();
    for (let ri = 0; ri < reqs.length; ri++) {
      const req = reqs[ri];
      const minIdx = req.minRarity ? getRarityIndex(req.minRarity, rarityConfig) : 0;
      for (let i = 0; i < inventory.length; i++) {
        if (used.has(i)) continue;
        const item = inventory[i];
        if (!item) continue;
        if (item.name !== req.name) continue;
        if (getRarityIndex(item.rarity.id, rarityConfig) < minIdx) continue;
        result.set(ri, item);
        used.add(i);
        break;
      }
    }
    return result;
  }, [reqs, inventory, rarityConfig, isBuilt]);

  return (
    <div className={`flex items-center gap-1.5 py-1 ${isActive ? 'bg-blue-100/50 rounded px-1 -mx-1' : ''}`}>
      <Stars count={recipe.stars} />
      <div className="flex flex-wrap items-center gap-1">
        {reqs.map((r, i) => (
          <ReqCapsule key={i} req={r} highlighted={highlighted} hoveredItemName={hoveredItemName}
                      matchedItem={matches.get(i)} t={t} />
        ))}
      </div>
      <span className="text-gray-400 text-xs">&rarr;</span>
      <OutputDisplay output={recipe.useOutput} t={t} />
      {isBuilt && onUse && (
        <button
          onClick={onUse}
          disabled={disabled}
          className="ml-auto shrink-0 px-2 py-1 rounded bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5"
        >
          <Play size={12} />
        </button>
      )}
    </div>
  );
};

export const BuildingCard = ({ building, isBuilt, onBuild, onUse, disabled, isActive, highlightedItems, hoveredItemName, inventory, rarityConfig, activeRecipeIndex }) => {
  const { t } = useLanguage();
  const reqs = Array.isArray(building.buildCost) ? building.buildCost : [building.buildCost];
  const isTransformation = building.type === 'transformation';

  // Match inventory items against buildCost (unbuilt only; built uses RecipeRow matching)
  const matches = React.useMemo(() => {
    if (!inventory || isBuilt) return new Map();
    const used = new Set();
    const result = new Map();
    for (let ri = 0; ri < reqs.length; ri++) {
      const req = reqs[ri];
      const minIdx = req.minRarity ? getRarityIndex(req.minRarity, rarityConfig) : 0;
      for (let i = 0; i < inventory.length; i++) {
        if (used.has(i)) continue;
        const item = inventory[i];
        if (!item) continue;
        if (item.name !== req.name) continue;
        if (getRarityIndex(item.rarity.id, rarityConfig) < minIdx) continue;
        result.set(ri, item);
        used.add(i);
        break;
      }
    }
    return result;
  }, [reqs, inventory, rarityConfig, isBuilt]);

  return (
    <div className={`rounded-lg border-2 p-3 text-sm transition-all text-gray-900 ${
      isBuilt
        ? isActive ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'
        : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-base">{t(building.name)}</span>
        {isTransformation && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{t('转化')}</span>
        )}
      </div>

      {isBuilt ? (
        /* Built building: show each recipe with use button */
        <div className="mt-1 rounded-md bg-white/80 border border-gray-300/60 px-2 py-1.5 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">{t('配方')}:</span>
          <div className="flex flex-col gap-0.5">
            {building.recipes.map((recipe, ri) => (
              <RecipeRow
                key={ri}
                recipe={recipe}
                highlighted={highlightedItems}
                hoveredItemName={hoveredItemName}
                inventory={inventory}
                rarityConfig={rarityConfig}
                onUse={() => onUse(ri)}
                disabled={disabled}
                isActive={isActive && activeRecipeIndex === ri}
                isBuilt={true}
                t={t}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Unbuilt building: show buildCost + recipe preview */
        <>
          <div className="flex flex-wrap gap-1.5 mb-1">
            <span className="text-gray-500 text-xs leading-7">{t('建造')}:</span>
            {reqs.map((r, i) => (
              <ReqCapsule key={i} req={r} highlighted={highlightedItems} hoveredItemName={hoveredItemName}
                          matchedItem={matches.get(i)} t={t} />
            ))}
          </div>
          <div className="mt-1 mb-1 rounded-md bg-white/70 border border-gray-300/60 px-2 py-1.5 shadow-sm opacity-70">
            <span className="text-xs text-gray-500 font-medium">{t('配方')}:</span>
            <div className="flex flex-col gap-0.5">
              {building.recipes.map((recipe, ri) => (
                <RecipeRow key={ri} recipe={recipe} isBuilt={false} t={t} />
              ))}
            </div>
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
