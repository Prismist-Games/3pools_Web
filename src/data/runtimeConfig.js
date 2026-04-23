/**
 * runtimeConfig.js — 游戏内可实时调整的数值。
 *
 * 初始值从 v2Config / matrixConfig 深拷贝而来。消费者（rollQuality /
 * pickWeightedTemplate / generateWall 等）在 call time 读 LIVE_CONFIG.X，
 * 而不是 import 静态常量——从而 ConfigPanel 的修改能立即生效于下一个
 * 订单 / 下一面墙 / 下一次抽取。
 *
 * 不持久化：F5 刷新回到初始默认。用于开发 / 调试。
 */

import { QUALITY_WEIGHTS, ORDER_TEMPLATES } from './v2Config';
import { MATRIX_CONFIG } from './matrixConfig';
import { TURN_CONFIG } from './constants';

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export const LIVE_CONFIG = {
    qualityWeights: { ...QUALITY_WEIGHTS },
    orderTemplates: deepClone(ORDER_TEMPLATES),
    cellSpawn: {
        doom:  MATRIX_CONFIG.doomCells.resolution.spawnChance,
        gold:  MATRIX_CONFIG.specialCells.gold.spawnChance,
        order: MATRIX_CONFIG.specialCells.order.spawnChance,
        bomb:  MATRIX_CONFIG.specialCells.bomb.spawnChance,
    },
    // AP per market entry.
    apPerTurn: TURN_CONFIG.apPerTurn,
    // Wall size (3 or 4). Mirrors MATRIX_CONFIG.gridSize so ConfigPanel can toggle.
    gridSize: MATRIX_CONFIG.gridSize,
};

const DEFAULTS = deepClone(LIVE_CONFIG);

const listeners = new Set();
let version = 0;

export function subscribeConfig(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function getConfigVersion() {
    return version;
}

/** 通知所有订阅者；在每次修改 LIVE_CONFIG 后调用。 */
function notify() {
    version++;
    listeners.forEach(fn => fn());
}

/** 外部修改 LIVE_CONFIG 后调一次，触发重渲。 */
export function bumpConfig() {
    notify();
}

export function resetConfig() {
    const fresh = deepClone(DEFAULTS);
    Object.keys(LIVE_CONFIG).forEach(k => { LIVE_CONFIG[k] = fresh[k]; });
    notify();
}

export function exportConfigJSON() {
    return JSON.stringify(LIVE_CONFIG, null, 2);
}

export function importConfigJSON(json) {
    const parsed = JSON.parse(json);
    Object.keys(parsed).forEach(k => {
        if (k in LIVE_CONFIG) LIVE_CONFIG[k] = parsed[k];
    });
    notify();
}
