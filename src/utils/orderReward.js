/**
 * orderReward.js — 订单奖励品质计算工具
 *
 * 奖励品质在提交时动态计算：将所有交付食材的 scoreValue 求和，
 * 取不超过该总分的最高品质档。上限 q5（传说）。
 */

import { QUALITY_CONFIG } from '../data/v2Config';

/**
 * 根据提交的食材列表计算奖励品质。
 * @param {Array<{ quality: number }>} items - 玩家选择交付的食材（每件含 quality 字段）
 * @returns {number} 品质 id（1-5）
 *
 * 示例：
 *   白+白 = 1+1 = 2 → q2（绿）
 *   蓝+白 = 3+1 = 4 → q3（蓝，q4 需 scoreValue 5）
 *   蓝+白+白 = 3+1+1 = 5 → q4（紫）
 *   紫+紫 = 5+5 = 10 → 封顶 q5（传说）
 */
export function computeRewardQuality(items) {
    const sum = items.reduce((s, it) => {
        const entry = QUALITY_CONFIG.find(q => q.id === it.quality);
        return s + (entry?.scoreValue ?? 0);
    }, 0);
    // 找到 scoreValue <= sum 的最高档
    let result = QUALITY_CONFIG[0].id;
    for (const q of QUALITY_CONFIG) {
        if (q.scoreValue <= sum) result = q.id;
    }
    return result;
}
