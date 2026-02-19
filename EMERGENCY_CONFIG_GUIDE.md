# 🎯 限时订单难度配置指南

## 📍 配置位置
文件：`/src/data/constants.js`  
对象：`EMERGENCY_ORDER_CONFIG`

---

## ✅ 已实现功能

### 1️⃣ **每个难度的需求数量概率配置**
在 `difficultyReqCountWeights` 中配置：

```javascript
difficultyReqCountWeights: {
    1: { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 },   // 难度1
    2: { 1: 0.4, 2: 0.35, 3: 0.2, 4: 0.05 },   // 难度2
    3: { 1: 0.3, 2: 0.35, 3: 0.25, 4: 0.1 },   // 难度3
    // ... 可以配置难度1-10
    10: { 1: 0.0, 2: 0.0, 3: 0.2, 4: 0.8 }     // 难度10
}
```

**说明：**
- 键（1, 2, 3, 4）= 需求物品数量
- 值（0.0-1.0）= 该数量的概率
- 所有概率加起来应该等于 1.0

**示例修改：**
```javascript
// 让难度5必定产出3-4个物品
5: { 1: 0, 2: 0, 3: 0.3, 4: 0.7 }

// 让难度8平均分配2-4个
8: { 1: 0, 2: 0.33, 3: 0.33, 4: 0.34 }
```

---

### 2️⃣ **每个难度的品质概率配置**
在 `difficultyRarityWeights` 中配置：

```javascript
difficultyRarityWeights: {
    1: { 
        common: 0.5,      // 普通 50%
        uncommon: 0.3,    // 优秀 30%
        rare: 0.15,       // 稀有 15%
        epic: 0.04,       // 史诗 4%
        legendary: 0.01   // 传说 1%
    },
    2: { 
        common: 0.45, 
        uncommon: 0.3, 
        rare: 0.18, 
        epic: 0.06, 
        legendary: 0.01 
    },
    // ... 可以配置难度1-10
    10: { 
        common: 0.05,     // 普通 5%
        uncommon: 0.1,    // 优秀 10%
        rare: 0.35,       // 稀有 35%
        epic: 0.3,        // 史诗 30%
        legendary: 0.2    // 传说 20%
    }
}
```

**说明：**
- 每个难度可以独立配置5种品质的概率
- 所有品质概率加起来应该等于 1.0
- 可用品质：`common`, `uncommon`, `rare`, `epic`, `legendary`

**示例修改：**
```javascript
// 让难度7只出现高品质
7: { 
    common: 0,
    uncommon: 0,
    rare: 0.3,
    epic: 0.5,
    legendary: 0.2
}

// 让难度3更容易（更多普通品质）
3: { 
    common: 0.7,
    uncommon: 0.2,
    rare: 0.08,
    epic: 0.02,
    legendary: 0
}
```

---

## 🎮 快速修改示例

### 场景1：让游戏更难
```javascript
// 1. 降低急躁值容错
impatience: {
    maxValue: 3  // 改为3次超时就失败
}

// 2. 提高难度递增速度
difficulty: {
    increaseOnNewOrder: 2  // 每次完成难度+2而非+1
}

// 3. 让高难度更变态
difficultyReqCountWeights: {
    8: { 1: 0, 2: 0, 3: 0, 4: 1.0 },  // 难度8必定4个物品
    9: { 1: 0, 2: 0, 3: 0, 4: 1.0 },
    10: { 1: 0, 2: 0, 3: 0, 4: 1.0 }
}

difficultyRarityWeights: {
    8: { common: 0, uncommon: 0, rare: 0.2, epic: 0.5, legendary: 0.3 },
    9: { common: 0, uncommon: 0, rare: 0.1, epic: 0.4, legendary: 0.5 },
    10: { common: 0, uncommon: 0, rare: 0, epic: 0.3, legendary: 0.7 }
}
```

### 场景2：让游戏更简单
```javascript
// 1. 增加急躁值容错
impatience: {
    maxValue: 8  // 允许8次超时
}

// 2. 降低难度递增
difficulty: {
    increaseOnNewOrder: 0,  // 难度不再增长
    decreaseOnMainline: 2   // 完成主线降低2点难度
}

// 3. 让所有难度都较简单
difficultyReqCountWeights: {
    // 所有难度最多2个物品
    1: { 1: 0.7, 2: 0.3, 3: 0, 4: 0 },
    2: { 1: 0.6, 2: 0.4, 3: 0, 4: 0 },
    // ...以此类推
    10: { 1: 0.4, 2: 0.6, 3: 0, 4: 0 }
}
```

### 场景3：平滑难度曲线
```javascript
// 让难度1-5很简单，6-10逐渐变难
difficultyReqCountWeights: {
    1: { 1: 0.8, 2: 0.2, 3: 0, 4: 0 },
    2: { 1: 0.7, 2: 0.3, 3: 0, 4: 0 },
    3: { 1: 0.6, 2: 0.3, 3: 0.1, 4: 0 },
    4: { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 },
    5: { 1: 0.4, 2: 0.3, 3: 0.2, 4: 0.1 },
    6: { 1: 0.2, 2: 0.3, 3: 0.3, 4: 0.2 },
    7: { 1: 0.1, 2: 0.2, 3: 0.4, 4: 0.3 },
    8: { 1: 0, 2: 0.2, 3: 0.4, 4: 0.4 },
    9: { 1: 0, 2: 0.1, 3: 0.4, 4: 0.5 },
    10: { 1: 0, 2: 0, 3: 0.3, 4: 0.7 }
}
```

---

## 🔍 当前配置工作原理

1. **生成限时订单时**：
   - 读取当前难度值（如难度5）
   - 从 `difficultyReqCountWeights[5]` 获取需求数量权重
   - 根据权重随机决定需要几个物品（1-4个）
   - 为每个物品从 `difficultyRarityWeights[5]` 随机品质

2. **难度变化**：
   - 完成限时订单 → 难度 +1
   - 限时订单超时 → 难度 +1
   - 完成主线订单 → 难度 -1

3. **急躁值机制**：
   - 限时订单超时 → 急躁值 +1
   - 急躁值达到5 → 游戏失败
   - 完成限时订单 → 急躁值不变

---

## ✨ 配置完全生效

你的配置**已经在工作**！代码会：
- ✅ 读取 `difficultyReqCountWeights[当前难度]` 决定需求数量
- ✅ 读取 `difficultyRarityWeights[当前难度]` 决定物品品质
- ✅ 如果某个难度未配置，会fallback到基础配置

现在就可以在 `/src/data/constants.js` 中调整数值来测试效果！
