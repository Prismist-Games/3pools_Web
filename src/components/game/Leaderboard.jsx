import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Trophy, Send, Loader2, AlertCircle } from 'lucide-react';

const Leaderboard = ({ currentScore, onRestart }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        console.log("Leaderboard Component v2.1 Mounted");
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            setFetchError(null);
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('draw_count', { ascending: true })
                .limit(10);

            if (error) throw error;
            setScores(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            const msg = error.message || JSON.stringify(error);
            setFetchError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('leaderboard')
                .insert([
                    { player_name: name.trim(), draw_count: currentScore }
                ]);

            if (error) throw error;

            setSubmitted(true);
            fetchLeaderboard();
            // alert('提交成功！'); 
        } catch (error) {
            console.error('Error submitting score:', error);
            const msg = error.message || JSON.stringify(error);
            alert(`提交失败！请截图发给开发者:\n\nError: ${msg}\nCode: ${error.code || 'N/A'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
                <Trophy size={24} />
                <h3 className="text-xl font-black">排行榜 (最少抽奖)</h3>
            </div>

            {/* Current Game Submission */}
            {!submitted && currentScore !== undefined && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm font-bold text-yellow-800">
                        <span>你的成绩:</span>
                        <span className="text-xl">{currentScore} 次</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="输入名字上榜"
                            className="flex-1 px-3 py-2 rounded-lg border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-bold text-slate-700 placeholder:font-normal"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={10}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !name.trim()}
                            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors font-bold"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message Display */}
            {fetchError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-800 text-sm font-bold animate-pulse">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div className="flex flex-col text-left">
                        <span>无法连接排行榜</span>
                        <span className="font-mono text-xs opacity-80 mt-1">{fetchError}</span>
                        {fetchError.includes('404') && (
                            <span className="text-xs text-red-600 mt-1">⚠️ 提示：数据库表没找到。请检查 Supabase 表名是否为 "leaderboard" (全小写)。</span>
                        )}
                    </div>
                </div>
            )}

            {/* Leaderboard List */}
            {!fetchError && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto shadow-inner">
                    {loading ? (
                        <div className="p-8 flex justify-center text-slate-400">
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0">
                                <tr>
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">玩家</th>
                                    <th className="p-3 text-right">次数</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {scores.map((score, idx) => (
                                    <tr key={score.id} className={`${score.player_name === name && submitted ? 'bg-yellow-50 animate-pulse' : ''} hover:bg-slate-50`}>
                                        <td className="p-3 text-center font-black text-slate-300">
                                            {idx + 1 === 1 ? '🥇' : idx + 1 === 2 ? '🥈' : idx + 1 === 3 ? '🥉' : idx + 1}
                                        </td>
                                        <td className="p-3 font-bold text-slate-700 truncate max-w-[120px]">{score.player_name}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-600">{score.draw_count}</td>
                                    </tr>
                                ))}
                                {scores.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-slate-400 italic">暂无记录，快来抢沙发！</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Restart Button */}
            <button
                onClick={onRestart}
                className="mt-2 w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors shadow-lg active:scale-95"
            >
                {submitted ? "再来一局" : "跳过并重开"}
            </button>
        </div>
    );
};

export default Leaderboard;
