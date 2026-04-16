import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import chefBackhome from '../../../assets/chef_backhome.png';

const SPRITE_ASSETS = [
    { name: 'chef_backhome', label: '厨师回家', src: chefBackhome, frames: 4, frameWidth: 633, frameHeight: 1377 },
];

const SpritePreview = ({ onClose }) => {
    const { t } = useLanguage();
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [fps, setFps] = useState(6);
    const [frame, setFrame] = useState(0);
    const [playing, setPlaying] = useState(true);

    const sprite = SPRITE_ASSETS[selectedIdx];

    // Frame stepper
    useEffect(() => {
        if (!playing) return;
        const timer = setInterval(() => {
            setFrame(f => (f + 1) % sprite.frames);
        }, 1000 / fps);
        return () => clearInterval(timer);
    }, [fps, playing, sprite.frames]);

    // Reset frame when switching sprite
    useEffect(() => { setFrame(0); }, [selectedIdx]);

    // Fit display: scale so the frame fits within a max box
    const maxH = 400;
    const scale = Math.min(1, maxH / sprite.frameHeight);
    const displayW = Math.round(sprite.frameWidth * scale);
    const displayH = Math.round(sprite.frameHeight * scale);

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-auto flex flex-col md:flex-row">

                {/* Left: Controls */}
                <div className="w-full md:w-56 flex-shrink-0 p-5 border-b md:border-b-0 md:border-r border-gray-700">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-white">{t('动画预览')}</h2>
                        <button onClick={onClose}
                            className="text-gray-400 hover:text-white text-xl leading-none transition-colors">
                            &times;
                        </button>
                    </div>

                    {/* Sprite list */}
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-400 mb-2">{t('素材列表')}</h3>
                        <div className="space-y-1">
                            {SPRITE_ASSETS.map((s, i) => (
                                <button key={s.name}
                                    onClick={() => setSelectedIdx(i)}
                                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                                        i === selectedIdx
                                            ? 'bg-cyan-800 text-cyan-200 border border-cyan-600'
                                            : 'text-gray-300 hover:bg-gray-800'
                                    }`}>
                                    {t(s.label)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FPS */}
                    <div className="mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-400 mb-2">FPS</h3>
                        <div className="flex items-center gap-2">
                            <input type="range" min="1" max="24" step="1"
                                value={fps} onChange={e => setFps(Number(e.target.value))}
                                className="flex-1 h-1.5 accent-cyan-500" />
                            <span className="text-xs font-bold text-cyan-400 w-6 text-right">{fps}</span>
                        </div>
                    </div>

                    {/* Play / Pause */}
                    <button onClick={() => setPlaying(p => !p)}
                        className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${
                            playing
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-cyan-500 text-gray-900 hover:bg-cyan-400'
                        }`}>
                        {playing ? '⏸ ' + t('暂停') : '▶ ' + t('播放')}
                    </button>

                    {/* Frame scrubber (when paused) */}
                    {!playing && (
                        <div className="mt-3">
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max={sprite.frames - 1} step="1"
                                    value={frame} onChange={e => setFrame(Number(e.target.value))}
                                    className="flex-1 h-1.5 accent-cyan-500" />
                                <span className="text-xs font-bold text-cyan-400 w-10 text-right">
                                    {frame + 1}/{sprite.frames}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="mt-5 text-[10px] text-gray-500 space-y-0.5">
                        <div>{sprite.frameWidth} × {sprite.frameHeight} px / {t('帧')}</div>
                        <div>{sprite.frames} {t('帧')}</div>
                    </div>

                    <button onClick={onClose}
                        className="w-full mt-4 py-2 rounded-lg font-bold text-xs text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-colors">
                        {t('关闭')}
                    </button>
                </div>

                {/* Right: Animation display */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[450px]">
                    {/* Checkerboard background to show transparency */}
                    <div className="rounded-lg overflow-hidden border border-gray-700"
                        style={{
                            width: displayW,
                            height: displayH,
                            backgroundImage: `repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)`,
                            backgroundSize: '16px 16px',
                        }}>
                        <div style={{
                            width: displayW,
                            height: displayH,
                            backgroundImage: `url(${sprite.src})`,
                            backgroundPosition: `-${frame * displayW}px 0`,
                            backgroundSize: `${displayW * sprite.frames}px ${displayH}px`,
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated',
                        }} />
                    </div>

                    {/* Frame indicator dots */}
                    <div className="flex gap-2 mt-4">
                        {Array.from({ length: sprite.frames }, (_, i) => (
                            <div key={i}
                                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                    i === frame ? 'bg-cyan-400' : 'bg-gray-600'
                                }`} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpritePreview;
