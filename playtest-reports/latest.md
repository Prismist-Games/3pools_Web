# Playtest Report

## Summary

| Player | Row choices | Column choices | Column rate | Reason types | Submissions |
|---|---:|---:|---:|---:|---:|
| intuitive | 94 | 0 | 0% | 6 | 11 |
| cautious | 81 | 22 | 21% | 10 | 10 |
| quality | 10 | 76 | 88% | 12 | 5 |
| strategic | 79 | 24 | 23% | 10 | 8 |

## Sample: intuitive / seed 101

- T1 肉铺: 行 牛 -> doom
  Reason: 追 牛 摊位，优先补当前需求
- T1 肉铺: 行 牛 -> ingredient (牛:3)
  Reason: 追 牛 摊位，优先补当前需求
- T1 肉铺: 行 牛 -> ingredient (牛:1)
  Reason: 追 牛 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (水果:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (青菜:2)
  Reason: 追 青菜 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (青菜:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T3 肉铺: 行 羊 -> ingredient (羊:3)
  Reason: 追 羊 摊位，优先补当前需求
- T3 肉铺: 行 鸡 -> doom
  Reason: 追 鸡 摊位，优先补当前需求
- T3 肉铺: 行 鸡 -> order
  Reason: 追 鸡 摊位，优先补当前需求
- T4 蔬菜店: 行 青菜 -> doom
  Reason: 追 青菜 摊位，优先补当前需求
- T4 蔬菜店: 行 青菜 -> ingredient (青菜:2)
  Reason: 追 青菜 摊位，优先补当前需求
- T4 蔬菜店: 行 青菜 -> ingredient (青菜:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T5 蔬菜店: 行 根茎 -> ingredient (根茎:2)
  Reason: 追 根茎 摊位，优先补当前需求
- T5 蔬菜店: 行 根茎 -> ingredient (青菜:3)
  Reason: 追 根茎 摊位，优先补当前需求

Submissions:
- T2: 青菜+水果 -> 鱼
- T3: 羊+牛 -> 蟹

## Sample: cautious / seed 101

- T1 肉铺: 行 牛 -> doom
  Reason: 追 牛 摊位，优先补当前需求
- T1 肉铺: 行 牛 -> ingredient (牛:3)
  Reason: 追 牛 摊位，优先补当前需求
- T1 肉铺: 行 牛 -> ingredient (牛:1)
  Reason: 追 牛 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (水果:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (青菜:2)
  Reason: 追 青菜 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (青菜:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T3 肉铺: 行 羊 -> ingredient (羊:3)
  Reason: 追 羊 摊位，优先补当前需求
- T3 肉铺: 行 鸡 -> doom
  Reason: 追 鸡 摊位，优先补当前需求
- T3 肉铺: 行 鸡 -> order
  Reason: 追 鸡 摊位，优先补当前需求
- T4 蔬菜店: 行 青菜 -> doom
  Reason: 追 青菜 摊位，优先补当前需求
- T4 蔬菜店: 列 绕路 -> ingredient (青菜:2)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算
- T4 蔬菜店: 列 绕路 -> ingredient (水果:1)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算
- T5 粮食店: 列 绕路 -> ingredient (米:1)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算
- T5 粮食店: 列 绕路 -> ingredient (面包:2)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算

Submissions:
- T2: 青菜+水果 -> 鱼
- T3: 羊+牛 -> 蟹
- T4: 水果+青菜+鱼 -> 奶酪
- T7: 面包+鸡+根茎 -> 蛋

## Sample: quality / seed 101

- T1 肉铺: 列 精挑 -> ingredient (牛:3)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T1 肉铺: 列 精挑 -> order
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T1 肉铺: 列 精挑 -> ingredient (牛:2)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T2 粮食店: 列 精挑 -> ingredient (米:2)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T2 粮食店: 列 精挑 -> ingredient (米:2)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T2 粮食店: 列 精挑 -> ingredient (米:2)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T3 粮食店: 列 精挑 -> ingredient (豆:3)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T3 粮食店: 列 精挑 -> ingredient (面包:5)
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T3 粮食店: 列 精挑 -> doom
  Reason: 走 精挑 采购法：抽中食材时，品质至少为精选
- T4 粮食店: 列 抢鲜 -> ingredient (面:4)
  Reason: 走 抢鲜 采购法：抽中食材时品质+1，但人群压力+1
- T4 粮食店: 列 抢鲜 -> ingredient (面包:5)
  Reason: 走 抢鲜 采购法：抽中食材时品质+1，但人群压力+1
- T4 粮食店: 列 抢鲜 -> ingredient (米:3)
  Reason: 走 抢鲜 采购法：抽中食材时品质+1，但人群压力+1
- T5 肉铺: 列 抢鲜 -> ingredient (羊:2)
  Reason: 走 抢鲜 采购法：抽中食材时品质+1，但人群压力+1
- T5 肉铺: 列 抢鲜 -> ingredient (鸡:5)
  Reason: 走 抢鲜 采购法：抽中食材时品质+1，但人群压力+1

Submissions:
- T5: 羊+牛 -> 蟹

## Sample: strategic / seed 101

- T1 肉铺: 行 牛 -> doom
  Reason: 追 牛 摊位，优先补当前需求
- T1 肉铺: 行 牛 -> ingredient (牛:3)
  Reason: 追 牛 摊位，优先补当前需求
- T1 肉铺: 行 牛 -> ingredient (牛:1)
  Reason: 追 牛 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (水果:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (青菜:2)
  Reason: 追 青菜 摊位，优先补当前需求
- T2 蔬菜店: 行 青菜 -> ingredient (青菜:1)
  Reason: 追 青菜 摊位，优先补当前需求
- T3 肉铺: 行 羊 -> ingredient (羊:3)
  Reason: 追 羊 摊位，优先补当前需求
- T3 肉铺: 行 鸡 -> doom
  Reason: 追 鸡 摊位，优先补当前需求
- T3 肉铺: 行 鸡 -> order
  Reason: 追 鸡 摊位，优先补当前需求
- T4 蔬菜店: 行 青菜 -> doom
  Reason: 追 青菜 摊位，优先补当前需求
- T4 蔬菜店: 列 绕路 -> ingredient (青菜:2)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算
- T4 蔬菜店: 列 绕路 -> ingredient (水果:1)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算
- T5 粮食店: 列 绕路 -> ingredient (米:1)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算
- T5 粮食店: 列 绕路 -> ingredient (面包:2)
  Reason: 走 绕路 采购法：抽中抢菜人时取消人挤人结算

Submissions:
- T2: 青菜+水果 -> 鱼
- T3: 羊+牛 -> 蟹
- T4: 水果+青菜+鱼 -> 奶酪
- T7: 面包+鸡+根茎 -> 蛋
