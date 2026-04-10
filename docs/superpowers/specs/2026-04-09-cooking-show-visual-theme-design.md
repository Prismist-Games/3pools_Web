# 美食综艺视觉主题设计

**方向**：温馨厨房风格 + 现代综艺框架 + CRT 复古点缀
**游戏名**：梦想厨房 (Dream Kitchen)

---

## 1. 设计方向

### 核心视觉隐喻

"木砧板上的抽奖墙"——把抽象的策略游戏 UI 包裹在一个温馨家庭厨房/美食综艺节目的视觉语言中。

### 三重视角混合

| 视角 | 体现方式 |
|------|----------|
| 观众视角（透过电视看节目） | CRT 特效在特殊时刻叠加 |
| 舞台视角（在演播厅里） | 聚光灯行列高亮、舞台式布局 |
| 节目品牌视角（节目 UI） | Header 标题栏、场次/回合徽章、字幕条 |

### 风格关键词

温馨、手作、暖色调、圆角、木质质感。现代综艺为主体，CRT/复古效果仅作为特殊时刻的戏剧性点缀。

---

## 2. 色彩系统

### 2.1 基础色（页面底色 & 容器）

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面底色 | `#FDF6EC` | 奶油白 |
| 卡片/面板 | `#FFFDF8` | 近白暖色 |
| 木纹容器 | `#F5E6D0 → #EDD8BC`（渐变） | 砧板、软木板等 |
| 次要背景 | `#FAEBD7` | 区域分隔 |

### 2.2 强调色（交互 & 高亮）

| 用途 | 色值 | 说明 |
|------|------|------|
| 主强调/金 | `#E8A830` | 按钮边框、选中高亮、核心强调 |
| 按钮底边阴影 | `#D4952A` | 按钮 3D 厚度感 |
| 深强调 | `#C87A20` | 选中文字、活跃状态 |
| 正文文字 | `#8B5E20` | 代替黑色，暖棕色 |

### 2.3 语义色（状态反馈）

降饱和处理，融入暖色调。

| 用途 | 色值 |
|------|------|
| 危险/厄运 | `#E09080`（底）/ `#C07060`（边框） |
| 生命值 | `#C05050` |
| 成功/完成 | `#80B890`（底）/ `#60A070`（边框） |
| 信息/订单 | `#7EB8D0`（底）/ `#5EA0B8`（边框） |

### 2.4 文字层级

| 层级 | 色值 |
|------|------|
| 标题 | `#5A3A10` |
| 正文 | `#8B5E20` |
| 次要文字 | `#A08040` |
| 禁用/提示 | `#C8B080` |

### 2.5 背景纹理

页面底色上叠加微妙的厨房瓷砖圆点纹理：

```css
background-color: #FDF6EC;
background-image: radial-gradient(circle at 20px 20px, rgba(210,160,80,0.06) 2px, transparent 2px);
background-size: 40px 40px;
```

---

## 3. 全局组件风格

### 3.1 容器

- **主容器**（卡片、面板）：`bg: #FFFDF8`，`border: 2px solid #E8C878`，`border-radius: 12-14px`，`box-shadow: 0 3px 0 #D4B896`（底部阴影线，像小牌子立在桌面上）
- **次要容器**（提示、备注）：`border: 1px dashed #E8C878`，`border-radius: 8px`
- **木纹容器**（砧板、软木板）：`background: linear-gradient(135deg, #F5E6D0, #EDD8BC)`，`border: 2-3px solid #D4B896`

### 3.2 按钮

- **主要按钮**：`bg: #FFFAF2`，`border: 2px solid #E8A830`，`border-radius: 10px`，`box-shadow: 0 2px 0 #D4952A`，文字 `#8B5E20` 加粗
- **次要按钮**：`bg: #FFF3E0`，`border: 1px solid #E8C878`，文字 `#A08040`
- **危险按钮**：`bg: #FFF0F0`，`border: 1px solid #E09080`，文字 `#C05050`

### 3.3 标签/徽章（药丸形）

资源指示器、状态标签统一用圆角药丸：`border-radius: 20px`，`padding: 4px 10px`

| 类型 | 底色 | 边框 | 文字 |
|------|------|------|------|
| 生命 ❤️ | `#FFF0F0` | `#E8A0A0` | `#C05050` |
| 金币 💰 | `#FFF8E0` | `#E8C860` | `#A08020` |
| 厄运 💀 | `#F5F0E8` | `#C8B898` | `#706040` |
| 背包 🎒 | `#F0FFF8` | `#80C8A0` | `#408060` |
| 得分 ⭐ | `#FFF8E0` | `#E8C860` | `#A08020` |

---

## 4. 奖品墙（核心游戏区）

### 4.1 砧板容器

整个 5×5 网格放在一个木纹渐变的大圆角容器中：

- `background: linear-gradient(135deg, #F5E6D0, #EDD8BC)`
- `border: 3px solid #D4B896`
- `border-radius: 14px`
- `box-shadow: 0 4px 0 #C8A880, 0 6px 12px rgba(0,0,0,0.1)`

顶部有虚线分隔的标题行，显示当前墙的名称和修饰器标签。

### 4.2 行/列选择器 — 箭头按钮

行列选择是玩家的核心操作，使用独立按钮确保可点击感（affordance）。

- **位置**：列按钮在网格上方，行按钮在网格左侧
- **未选中**：`bg: #FFFAF2`，`border: 2px solid #DCC8A0`，`border-radius: 8px`，`box-shadow: 0 2px 0 #D4B896`，箭头图标（列 `⬇`，行 `➡`），文字 `#A08040`
- **选中**：`bg: linear-gradient(#FFF3E0, #FFE8CC)`，`border: 2px solid #E8A830`，`box-shadow: 0 2px 0 #D4952A, 0 0 10px rgba(232,168,48,0.25)`，文字 `#C87A20` 加粗
- **悬停**：轻微亮色变化

### 4.3 格子类型色系

| 格子类型 | 底色 | 边框 |
|----------|------|------|
| 普通 sticker | `#FFFDF8` | `#DCC8A0` |
| export item（食材，按稀有度分色） | 保留现有稀有度底色，适配暖色系 | 按稀有度边框色 |
| 💀 厄运解析 | `#FFF0EE` | `#E09080` |
| ⬆️ 厄运升级 | `#FFF8F0` | `#E8B860` |
| 💰 金币 | `#FFFCE8` | `#E8C860` |
| 📋 订单 | `#F0F8FF` | `#7EB8D0` |
| ❤️‍🩹 治疗 | `#F0FFF8` | `#80C8A0` |
| 隐藏格 | 条纹花纹（kitchen towel 感） | `#DCC8A0` |
| ⬜ 空格 | `#F8F4EC` | `#D4C8B0` |

### 4.4 格子交互

- 悬停：`scale(1.05)` + 轻微阴影增强
- 抽中：翻转动画（像翻开食谱卡片）
- 已抽取：灰化 + 收缩
- 选中行/列内的格子：`bg` 叠加 `rgba(232,168,48,0.08)`，`border` 变为 `#E8A830`，`box-shadow: 0 0 8px rgba(232,168,48,0.15)`

### 4.5 抽取按钮

砧板底部居中，主要按钮风格，显示 `🎰 抽取！(💰 ×5)`。

---

## 5. 墙选择（3 选 1）

设计成"菜单卡"风格——像从餐厅菜单里点今日特供。

- 每张卡片：白底 + 棕色边框 + 底部阴影 + `border-radius: 12px`
- 顶部木纹色区域显示墙名称和图标
- 下方显示 sticker 类型和简要说明
- 选中卡片：金色边框 + 外发光 + 轻微上浮

---

## 6. Header — 节目标题栏

模拟综艺节目画面顶部的信息条。

- 容器：`bg: linear-gradient(180deg, #FFFAF2, #FFF3E0)`，金色边框，大圆角 + 底部阴影
- **上排**：🍳 logo + "梦想厨房" + "美食挑战赛" 副标题 + 场次/回合药丸徽章
- **下排**：资源药丸标签（❤️💰💀🎒⭐） + 右侧工具按钮（❓🌐⚙️）

---

## 7. 侧边栏

### 7.1 货架（左侧，原公告牌）

软木公告板风格：

- 容器：木纹渐变底 + 圆点纹理（`radial-gradient` 模拟软木质感）
- `border: 2px solid #D4B896`，`border-radius: 12px`，`box-shadow: 0 3px 0 #C8A880`
- 标题带 📌 图标
- 订单卡片：白底，微微旋转（`transform: rotate(±1deg)`），像钉在公告板上
- 未揭示订单：虚线边框 + 半透明 + 🔒 图标

### 7.2 已接订单 & 厄运面板（右侧）

- 白底面板，金色边框
- 已接订单：显示名称、需求、进度条（金色渐变填充）
- 厄运面板：5×2 小格子网格，已填充格用 `#E09080`，空格用 `#F5F0E8`

---

## 8. CRT 复古特效系统

**原则**：平时完全不出现，保持温馨厨房的干净画面。只在关键时刻叠加，制造戏剧感。

### 8.1 特效分级

| 等级 | 触发时机 | 效果 | 持续时间 |
|------|----------|------|----------|
| 轻度 | 🎰 抽奖瞬间 | 淡 CRT 扫描线 + 边缘暗角 | ~0.5s |
| 轻度 | 🏃 撤离结算 | 角落 VHS 时间戳 `REC ●` + 轻微 RGB 偏移 | 结算期间持续 |
| 重度 | 💀 厄运触发 | 画面变暗 + 红色扫描线 + 强暗角 + 信号抖动 | ~1s |
| 转场 | 🎬 回合/场次切换 | 短暂黑屏 + 静电噪点 + 频道切换感，回合号从中央淡入 | ~0.8s |

### 8.2 CRT 扫描线实现

```css
/* 轻度 - 叠加在内容上 */
.crt-light::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
  );
  pointer-events: none;
}

/* 重度（厄运）- 红色扫描线 */
.crt-heavy::after {
  background: repeating-linear-gradient(
    0deg, transparent, transparent 1px,
    rgba(255,100,80,0.06) 1px, rgba(255,100,80,0.06) 2px
  );
}
```

### 8.3 暗角 (Vignette)

```css
.vignette::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%);
  pointer-events: none;
}
/* 强暗角（厄运） */
.vignette-heavy::before {
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%);
}
```

### 8.4 VHS 时间戳

```css
.vhs-timestamp::after {
  content: 'REC ● ' attr(data-time);
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-family: monospace;
  font-size: 10px;
  color: rgba(200,134,10,0.4);
}
```

---

## 9. 动画清单

| 动画 | 触发 | 效果 |
|------|------|------|
| 格子翻转 | 抽中格子时 | Y 轴 3D 翻转，像翻开食谱卡片 |
| 格子悬停 | 鼠标悬停 | `scale(1.05)` + 阴影增强 |
| 行列高亮 | 选择行/列 | 金色边框 + `box-shadow` 发光过渡 |
| 墙卡选中 | 3 选 1 点击 | 上浮 + 金色边框 + 外发光 |
| 回合转场 | 回合切换 | 黑屏 + 静电 → 回合号淡入（0.8s） |
| 厄运触发 | 💀 抽中 | 变暗 + 红扫描线 + 抖动（1s） |
| 撤离结算 | 撤离时 | VHS 时间戳出现 + RGB 偏移 |
| 抽奖闪烁 | 抽取瞬间 | 淡扫描线 + 暗角闪现（0.5s） |
| 飞入背包 | 物品获取 | 保留现有 `fly-to-inventory` 动画，视觉风格适配新主题 |
| 重力下落 | ⬇️ 激活后 | 保留现有 `gravity-fall` 动画 |

---

## 10. 实现范围

### 需要修改的文件

| 文件 | 改动 |
|------|------|
| `tailwind.config.js` | 扩展自定义色板（kitchen 主题色） |
| `src/index.css` | 全局背景纹理、CRT 特效类、新动画 keyframes |
| `src/GameCore.jsx` | Header 重新设计、布局容器样式 |
| `src/components/game/ResourceMatrix.jsx` | 砧板容器、格子色系、行列按钮重构 |
| `src/components/game/BulletinBoard.jsx` | 软木板风格货架 |
| `src/components/game/WallPicker.jsx` | 菜单卡风格 |
| `src/components/game/PoolCard.jsx` | 适配新色系 |
| `src/components/game/InventorySlot.jsx` | 适配新色系 |
| `src/components/game/ScoreBoard.jsx` | 适配新面板风格 |
| `src/components/game/OrderCard.jsx` | 适配新卡片风格 |
| `src/data/constants.js` | 稀有度颜色映射更新 |

### 不在范围内

- 自定义图形资产（SVG/PNG）——继续使用 emoji
- 音效系统
- 字体更换（保持系统字体）
- Prologue 页面视觉重构（可作为后续任务）
