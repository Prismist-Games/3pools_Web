import React, { useState, useCallback, useMemo } from 'react';
import { X, ChefHat, Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { OUT_OF_GAME_ITEMS } from '../../data/v2Config';

const INGREDIENTS = OUT_OF_GAME_ITEMS;

// --- Customer templates ---
// Structure: dish name (→ knowledge required) + category hint (→ protein/veggie) + flavor/life context (→ remaining ingredients)
// ~1/3 life-context modifiers, ~2/3 flavor-word modifiers
const CUSTOMERS = [
    { name: '意大利商人',   emoji: '🇮🇹', request: '来份Carbonara，要浓郁' },
    { name: '日本游客',     emoji: '🇯🇵', request: '来碗豚骨拉面，感冒了想暖一点' },
    { name: '加班白领',     emoji: '👔', request: '来份扬州炒饭，要家常味' },
    { name: '法国美食家',   emoji: '🇫🇷', request: '做份Bisque，要丝滑' },
    { name: '健身教练',     emoji: '💪', request: '来份凯撒沙拉，要清爽解腻' },
    { name: '墨西哥大叔',   emoji: '🇲🇽', request: '做份肉Burrito，要酸辣' },
    { name: '约会情侣',     emoji: '💕', request: '来份惠灵顿牛排，要醇厚' },
    { name: '饿极的学生',   emoji: '😩', request: '来份海鲜Aglio e Olio' },
    { name: '印度工程师',   emoji: '🇮🇳', request: '做份Tikka Masala配饭，要下饭' },
    { name: '妈妈带小孩',   emoji: '👩‍👦', request: '来碗艇仔粥，小孩也能吃的' },
    { name: '宿醉青年',     emoji: '🥴', request: '来份海鲜Risotto，要浓郁' },
    { name: '素食主义者',   emoji: '🌱', request: '做份Ratatouille，要清香' },
    { name: '英国绅士',     emoji: '🇬🇧', request: '来份Fish & Chips，要酥脆' },
    { name: '韩国女生',     emoji: '🇰🇷', request: '做份Sundubu Jjigae，要微辣' },
    { name: '泰国背包客',   emoji: '🇹🇭', request: '来碗Tom Yum Goong' },
    { name: '美国大叔',     emoji: '🇺🇸', request: '做份海鲜浓汤，要鲜甜' },
];

export const pickRandomCustomer = () => CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];

const SCORE_DISPLAY = {
    '-2': { emoji: '🤮', label: '非常不满', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    '-1': { emoji: '😕', label: '不太满意', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
    '0':  { emoji: '😐', label: '一般般',   color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' },
    '1':  { emoji: '😊', label: '挺满意的', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    '2':  { emoji: '🤩', label: '超级满意', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/30' },
};

const AICooking = ({ onClose, expeditionScores = [], onUpdateStorage, customer, onNewCustomer }) => {
    const [selectedItems, setSelectedItems] = useState([]);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || '');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Build storage count from all expedition items
    const storageCount = useMemo(() => {
        const counts = {};
        for (const exp of expeditionScores) {
            for (const item of (exp.items || [])) {
                counts[item.id] = (counts[item.id] || 0) + 1;
            }
        }
        return counts;
    }, [expeditionScores]);

    const getStock = (id) => storageCount[id] || 0;

    const toggleItem = useCallback((item) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) return prev.filter(i => i.id !== item.id);
            // Check stock
            const alreadySelected = prev.filter(i => i.id === item.id).length;
            if (alreadySelected >= (storageCount[item.id] || 0)) return prev;
            return [...prev, item];
        });
    }, [storageCount]);

    const saveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('claude_api_key', key);
    };

    const handleNewCustomer = () => {
        if (onNewCustomer) onNewCustomer();
        setResult(null);
        setSelectedItems([]);
    };

    const callAPI = async (messages) => {
        const response = await fetch('/api/claude/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 400,
                temperature: 1,
                messages,
            }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `API error: ${response.status}`);
        }
        const data = await response.json();
        return data.content[0].text.trim();
    };

    const parseJSON = (text) => {
        const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        return null;
    };

    const cook = async () => {
        if (selectedItems.length === 0 || !apiKey) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const ingredientList = selectedItems.map(i => `${i.icon} ${i.name}`).join(', ');
        const allAvailable = INGREDIENTS.map(i => i.name).join('、');

        try {
            // Step 1: Generate dish (aware of customer's dish direction)
            const dishText = await callAPI([{
                role: 'user',
                content: `客人说："${customer.request}"
玩家选了这些食材：${ingredientList}

请判断：用这些食材能否做出客人想要的那类菜？
- 如果食材合理（比如客人要卷饼，玩家选了面粉），就做出客人要的那类菜，具体风味由食材决定。
- 如果食材明显不对（比如客人要卷饼，玩家选了面条），就用这些食材做一道别的合理的菜，不要硬凑。
严格限制：只能用玩家选的食材，不能加入没选的。菜必须是现实中存在的。
描述用上菜时服务员的一句简短解说，突出亮点或口感，不要说做法。
只回复JSON：{"dishName":"菜名","description":"上菜解说","emoji":"🍽️"}`
            }]);

            const dish = parseJSON(dishText);
            if (!dish) throw new Error('菜品生成失败');

            // Step 2: Customer feedback
            const feedbackText = await callAPI([{
                role: 'user',
                content: `你是"${customer.name}"${customer.emoji}，你对厨师说了："${customer.request}"。

这个游戏里只存在以下食材：${allAvailable}
厨师从中选了：${ingredientList}
做出来的菜是：${dish.emoji} ${dish.dishName}（${dish.description}）

请严格评价，但只能基于游戏里存在的食材来评判：
1. 在上面的食材列表范围内，这道菜还缺什么关键食材？（不要提游戏里不存在的食材，比如酸奶油、莎莎酱等）
2. 缺少关键食材要扣分（比如炸鱼薯条没有面粉就没有炸衣）
3. 食材搭配不合理也要扣分
4. 风味要求没满足也要扣分（比如要酸辣但没放任何酸或辣的食材）
5. 所有食材都到位且搭配合理才给高分

评分标准：2=完美 1=基本对但有小瑕疵 0=凑合 -1=有明显问题 -2=完全不对
以角色身份给出1-2句简短反馈，要具体指出好在哪或差在哪。

只回复JSON：{"feedback":"反馈内容","score":0}`
            }]);

            const feedback = parseJSON(feedbackText);
            if (!feedback) throw new Error('反馈生成失败');

            // Clamp score
            const score = Math.max(-2, Math.min(2, Math.round(feedback.score)));

            setResult({ dish, feedback: feedback.feedback, score });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const scoreInfo = result ? SCORE_DISPLAY[String(result.score)] : null;

    // Group by score: 1=调料, 2=蔬果&主食, 3=优质食材, 5=珍稀食材
    const tiers = [
        { label: '调料 & 酱料', key: 1, items: INGREDIENTS.filter(i => i.score === 1) },
        { label: '蔬果 & 主食', key: 2, items: INGREDIENTS.filter(i => i.score === 2) },
        { label: '优质食材',    key: 3, items: INGREDIENTS.filter(i => i.score === 3) },
        { label: '珍稀食材',    key: 5, items: INGREDIENTS.filter(i => i.score === 5) },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500 p-1.5 rounded-lg">
                            <ChefHat size={18} className="text-white" />
                        </div>
                        <h2 className="text-lg font-black text-white">AI 炼菜</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* API Key */}
                    <div className="flex items-center gap-2">
                        <input
                            type="password"
                            placeholder="Claude API Key (sk-ant-...)"
                            value={apiKey}
                            onChange={(e) => saveApiKey(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                        />
                        {apiKey && <span className="text-green-400 text-xs font-bold">OK</span>}
                    </div>

                    {/* Customer Card */}
                    <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <span className="text-4xl">{customer.emoji}</span>
                        <div className="flex-1">
                            <div className="text-sm font-black text-white">{customer.name}</div>
                            <div className="text-sm text-blue-300 mt-1">"{customer.request}"</div>
                        </div>
                        <button
                            onClick={handleNewCustomer}
                            className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                            title="换一个客人"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {/* Debug: give one of each */}
                    {onUpdateStorage && (
                        <button
                            onClick={() => onUpdateStorage(INGREDIENTS.map(i => ({ id: i.id, name: i.name, icon: i.icon, score: i.score, isOutOfGame: true, uid: Math.random().toString(36).substr(2, 9) })))}
                            className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-900 transition-colors"
                        >
                            🛠 调试：每种食材发一份
                        </button>
                    )}

                    {/* Ingredient Grid */}
                    {tiers.map(tier => (
                        <div key={tier.key}>
                            <h3 className="text-[10px] font-bold text-gray-500 mb-1.5">{tier.label}</h3>
                            <div className="grid grid-cols-6 gap-1.5">
                                {tier.items.map(item => {
                                    const isSelected = selectedItems.some(i => i.id === item.id);
                                    const stock = getStock(item.id);
                                    const outOfStock = stock === 0;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => !outOfStock && toggleItem(item)}
                                            className={`
                                                relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border-2 transition-all duration-150
                                                ${outOfStock
                                                    ? 'bg-gray-900 border-gray-800 opacity-35 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-orange-500/20 border-orange-500 shadow-md shadow-orange-500/20'
                                                        : 'bg-gray-800 border-gray-700 hover:border-gray-500'}
                                            `}
                                        >
                                            <span className="text-xl leading-none">{item.icon}</span>
                                            <span className={`text-[10px] font-bold leading-none ${outOfStock ? 'text-gray-600' : isSelected ? 'text-orange-300' : 'text-gray-400'}`}>
                                                {item.name}
                                            </span>
                                            <span className={`text-[9px] font-mono leading-none ${stock > 0 ? 'text-green-500' : 'text-gray-600'}`}>
                                                x{stock}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Selected Summary */}
                    {selectedItems.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 font-bold">已选：</span>
                            {selectedItems.map(item => (
                                <span key={item.id} className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 text-xs font-bold px-2 py-1 rounded-full">
                                    {item.icon} {item.name}
                                    <button onClick={() => toggleItem(item)} className="hover:text-white ml-0.5"><X size={10} /></button>
                                </span>
                            ))}
                            <button onClick={() => setSelectedItems([])} className="text-gray-500 hover:text-red-400 text-xs flex items-center gap-1">
                                <Trash2 size={10} /> 清空
                            </button>
                        </div>
                    )}

                    {/* Cook Button */}
                    <button
                        onClick={cook}
                        disabled={selectedItems.length === 0 || !apiKey || loading}
                        className={`
                            w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all
                            ${selectedItems.length > 0 && apiKey && !loading
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 active:scale-[0.98]'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        {loading ? (
                            <><Loader2 size={16} className="animate-spin" /> 烹饪中...</>
                        ) : (
                            <><Sparkles size={16} /> 开始烹饪 ({selectedItems.length} 样食材)</>
                        )}
                    </button>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
                    )}

                    {/* Result: Dish + Customer Feedback */}
                    {result && (
                        <div className="space-y-3">
                            {/* Dish */}
                            <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl p-5 text-center space-y-2">
                                <div className="text-5xl">{result.dish.emoji}</div>
                                <h3 className="text-xl font-black text-orange-300">{result.dish.dishName}</h3>
                                <p className="text-xs text-gray-400">{result.dish.description}</p>
                            </div>

                            {/* Customer Feedback */}
                            <div className={`rounded-2xl p-5 border ${scoreInfo.bg} space-y-3`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{customer.emoji}</span>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white">{customer.name}的评价</div>
                                        <p className="text-sm text-gray-300 mt-1">{result.feedback}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/10">
                                    <span className="text-4xl">{scoreInfo.emoji}</span>
                                    <div className="flex flex-col items-center">
                                        <span className={`text-2xl font-black ${scoreInfo.color}`}>
                                            {result.score > 0 ? '+' : ''}{result.score}
                                        </span>
                                        <span className="text-xs text-gray-500">{scoreInfo.label}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AICooking;
