# 限时订单难度配置说明

## 配置位置
`/src/data/constants.js` → `EMERGENCY_ORDER_CONFIG`

## 配置项说明

### 1. 顾客急躁值系统 (`impatience`)
```javascript
impatience: {
    enabled: true,           // 是否启用急躁值系统
    maxValue: 5,             // 最大急躁值（达到后游戏失败）
    increaseOnTimeout: 1     // 每次超时增加的急躁值
}
```

### 2. 难度系统 (`difficulty`)
```javascript
difficulty: {
    initial: 1,              // 初始难度
    increaseOnNewOrder: 1,   // 每个新限时订单难度增加值
    decreaseOnMainline: 1,   // 完成主线订单时难度减少值
    minDifficulty: 1,        // 最小难度
    maxDifficulty: 10        // 最大难度
}
```

### 3. 需求数量配置 (`difficultyReqCountWeights`)
为每个难度等级配置需求物品数量的概率分布：

```javascript
difficultyReqCountWeights: {
    1: { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 },  // 难度1: 50%是1个, 30%是2个...
    2: { 1: 0.4, 2: 0.35, 3: 0.2, 4: 0.05 },
    // ...
    10: { 1: 0.0, 2: 0.0, 3: 0.2, 4: 0.8 }    // 难度10: 必定3-4个物品
}
```

**说明：**
- 键（1, 2, 3, 4）代表需求物品数量
- 值代表该数量出现的概率（0-1之间，总和应为1）
- 可以设为0来禁止某个数量（如难度10禁止1-2个物品）

### 4. 品质权重配置 (`difficultyRarityWeights`)
为每个难度等级配置物品品质的概率分布：

```javascript
difficultyRarityWeights: {
    1: { 
        common: 0.5,      // 普通 50%
        uncommon: 0.3,    // 优秀 30%
        rare: 0.15,       // 稀有 15%
        epic: 0.04,       // 史诗 4%
        legendary: 0.01   // 传说 1%
    },
    // ...
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
- 概率值范围0-1，总和应为1
- 难度越高，高品质物品概率越大

## 配置示例

### 示例1：让难度5必定产出3-4个物品
```javascript
difficultyReqCountWeights: {
    5: { 1: 0, 2: 0, 3: 0.4, 4: 0.6 }
}
```

### 示例2：让难度7的限时订单只出现史诗和传说品质
```javascript
difficultyRarityWeights: {
    7: { 
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0.7,
        legendary: 0.3
    }
}
```

### 示例3：调整难度增长速度
```javascript
difficulty: {
    increaseOnNewOrder: 2,   // 完成限时订单难度+2（更快）
    decreaseOnMainline: 2    // 完成主线订单难度-2（降低更多）
}
```

### 示例4：降低急躁值容错
```javascript
impatience: {
    maxValue: 3,             // 3次超时就失败（更严格）
    increaseOnTimeout: 2     // 每次超时+2急躁值
}
```

## 机制流程

1. **游戏开始**：限时订单难度 = `difficulty.initial`（默认1）
2. **限时订单超时**：
   - 急躁值 += `impatience.increaseOnTimeout`
   - 难度 += `difficulty.increaseOnNewOrder`
   - 如果急躁值 >= `impatience.maxValue` → 游戏失败
3. **完成限时订单**：
   - 难度 += `difficulty.increaseOnNewOrder`
   - 获得耐心值奖励（不给进度）
4. **完成主线订单**：
   - 难度 -= `difficulty.decreaseOnMainline`
   - 获得耐心值和进度奖励
