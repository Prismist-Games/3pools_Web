import { useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CHEF_EMOJIS = [
    '👨🏻‍🍳', '👨🏼‍🍳', '👨🏽‍🍳', '👨🏾‍🍳', '👨🏿‍🍳',
    '👩🏻‍🍳', '👩🏼‍🍳', '👩🏽‍🍳', '👩🏾‍🍳', '👩🏿‍🍳',
];

const Prologue = ({ onComplete }) => {
    const { t, language, toggleLanguage } = useLanguage();
    const [step, setStep] = useState('select');       // select | transition | name | hardship | opportunity
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [floatingStyle, setFloatingStyle] = useState(null);
    const [name, setName] = useState('');
    const [fadeIn, setFadeIn] = useState(false);

    const handleSelect = useCallback((emoji, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setSelectedEmoji(emoji);

        // Start floating emoji at clicked position
        setFloatingStyle({
            position: 'fixed',
            top: rect.top + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            fontSize: '2.5rem',
            transition: 'none',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        });

        setStep('transition');

        // Next frame: animate to target
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setFloatingStyle({
                    position: 'fixed',
                    top: '35vh',
                    left: '50vw',
                    width: '120px',
                    height: '120px',
                    fontSize: '5rem',
                    transform: 'translate(-50%, -50%)',
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                });
            });
        });

        setTimeout(() => {
            setStep('name');
            setFadeIn(false);
            setTimeout(() => setFadeIn(true), 50);
        }, 650);
    }, []);

    const handleToHardship = useCallback(() => {
        setFloatingStyle(null);
        setStep('hardship');
        setFadeIn(false);
        setTimeout(() => setFadeIn(true), 50);
    }, []);

    const handleToOpportunity = useCallback(() => {
        setStep('opportunity');
        setFadeIn(false);
        setTimeout(() => setFadeIn(true), 50);
    }, []);

    const handleContinue = useCallback(() => {
        onComplete({ emoji: selectedEmoji, name: name.trim() || t('无名厨师') });
    }, [selectedEmoji, name, onComplete, t]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center relative">

            {/* Page 1: Character select */}
            {step === 'select' && (
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold text-gray-700 mb-8">{t('自定义你的角色')}</h1>
                    <div className="grid grid-cols-5 gap-3">
                        {CHEF_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={(e) => handleSelect(emoji, e)}
                                className="w-16 h-16 text-3xl rounded-xl border-2 border-gray-200 bg-white
                                    hover:border-blue-400 hover:shadow-lg hover:scale-110
                                    active:scale-95 transition-all duration-150
                                    flex items-center justify-center"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating emoji (transition + page 2) */}
            {floatingStyle && (
                <div style={floatingStyle}>{selectedEmoji}</div>
            )}

            {/* Page 2: Name input — floating emoji stays as chef, content fixed below it */}
            {step === 'name' && (
                <div
                    className={`fixed left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
                    style={{ top: 'calc(35vh + 50px)' }}
                >
                    <div className="text-4xl mb-8">🏪</div>

                    <div className="flex flex-col items-center gap-2 px-4">
                        <p className="text-base text-gray-600">
                            {t('你是')}
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('输入你的名字')}
                                className="mx-1.5 px-2 py-0.5 border-b-2 border-gray-300 bg-transparent
                                    text-center text-base font-bold text-gray-800 w-32
                                    focus:border-blue-400 focus:outline-none transition-colors"
                                maxLength={12}
                                autoFocus
                            />
                        </p>
                        <p className="text-base text-gray-600 text-center max-w-md">
                            {t('怀揣着对烹饪的热情与执着，你成为了一名厨师，并经营着自己的小馆子。')}
                        </p>
                    </div>

                    <button
                        onClick={handleToHardship}
                        className="mt-8 px-8 py-2.5 bg-blue-500 text-white rounded-lg font-bold
                            hover:bg-blue-600 active:scale-95 transition-all duration-150"
                    >
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Page 3: Hardship */}
            {step === 'hardship' && (
                <div className={`flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-6xl mb-3">🫠</div>
                    <div className="text-4xl mb-8">🏚️</div>

                    <p className="text-base text-gray-600 text-center max-w-sm px-4 leading-relaxed">
                        {t('世事无常，行情不佳，餐厅在几经挣扎之后还是走到了倒闭的边缘。')}
                    </p>

                    <button
                        onClick={handleToOpportunity}
                        className="mt-8 px-8 py-2.5 bg-blue-500 text-white rounded-lg font-bold
                            hover:bg-blue-600 active:scale-95 transition-all duration-150"
                    >
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Page 4: Opportunity */}
            {step === 'opportunity' && (
                <div className={`flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-6xl mb-3">🍀</div>
                    <div className="text-4xl mb-8">📺</div>

                    <p className="text-base text-gray-600 text-center max-w-sm px-4 leading-relaxed">
                        {language === 'zh'
                            ? <>幸运的是，《梦想厨房》节目组联系了你。这档节目邀请没有得到足够关注的厨师，参与为期30天的挑战。</>
                            : <>Fortunately, the producers of <em>Dream Kitchen</em> reached out to you. The show invites overlooked chefs to take on a 30-day challenge.</>
                        }
                    </p>

                    <button
                        onClick={handleContinue}
                        className="mt-8 px-8 py-2.5 bg-blue-500 text-white rounded-lg font-bold
                            hover:bg-blue-600 active:scale-95 transition-all duration-150"
                    >
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Language toggle */}
            <button
                onClick={toggleLanguage}
                className="absolute bottom-6 text-sm font-bold px-3 py-1 rounded-md bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors"
            >
                {language === 'zh' ? 'EN' : '中文'}
            </button>
        </div>
    );
};

export default Prologue;
