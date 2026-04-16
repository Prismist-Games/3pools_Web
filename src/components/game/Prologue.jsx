import { useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CHEF_EMOJIS = [
    '👨🏻‍🍳', '👨🏼‍🍳', '👨🏽‍🍳', '👨🏾‍🍳', '👨🏿‍🍳',
    '👩🏻‍🍳', '👩🏼‍🍳', '👩🏽‍🍳', '👩🏾‍🍳', '👩🏿‍🍳',
];

// Shared button + text classes to match the kitchen theme
const PRIMARY_BTN = `mt-8 px-8 py-2.5 rounded-xl font-bold text-white
    bg-gradient-to-b from-kitchen-gold to-kitchen-gold-deep
    border-2 border-kitchen-gold-deep shadow-[0_3px_0_#A67820]
    hover:from-kitchen-gold-deep hover:to-kitchen-gold-deep
    active:translate-y-0.5 active:shadow-[0_1px_0_#A67820]
    transition-all duration-100`;

const BODY_TEXT = 'text-base text-kitchen-text-body text-center max-w-sm px-4 leading-relaxed';

const Prologue = ({ onComplete }) => {
    const { t, language, toggleLanguage } = useLanguage();
    const [step, setStep] = useState('select');
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [floatingStyle, setFloatingStyle] = useState(null);
    const [name, setName] = useState('');
    const [fadeIn, setFadeIn] = useState(false);

    const handleSelect = useCallback((emoji, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setSelectedEmoji(emoji);

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

    const goto = (nextStep) => {
        if (nextStep === 'hardship') setFloatingStyle(null);
        setStep(nextStep);
        setFadeIn(false);
        setTimeout(() => setFadeIn(true), 50);
    };

    const handleContinue = useCallback(() => {
        onComplete({ emoji: selectedEmoji, name: name.trim() || t('无名厨师') });
    }, [selectedEmoji, name, onComplete, t]);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center relative"
            style={{
                background: 'linear-gradient(180deg, #FFF3E0 0%, #FFE6C8 100%)',
                backgroundImage: 'radial-gradient(circle, rgba(180,140,80,0.06) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            }}
        >
            {/* Page 1: Character select */}
            {step === 'select' && (
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-black text-kitchen-text-title mb-2">{t('自定义你的角色')}</h1>
                    <p className="text-sm text-kitchen-text-muted mb-8">{t('选一位厨师，开始你的故事')}</p>
                    <div className="grid grid-cols-5 gap-3 p-4 bg-kitchen-card rounded-2xl border-2 border-kitchen-gold-border-muted shadow-[0_3px_0_#D4B896]">
                        {CHEF_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={(e) => handleSelect(emoji, e)}
                                className="w-16 h-16 text-3xl rounded-xl border-2 border-kitchen-gold-border-muted
                                    bg-gradient-to-b from-[#FFF8E0] to-kitchen-card
                                    hover:border-kitchen-gold hover:shadow-[0_0_12px_rgba(232,168,48,0.3)] hover:scale-110
                                    active:scale-95 transition-all duration-150
                                    flex items-center justify-center"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {floatingStyle && (
                <div style={floatingStyle}>{selectedEmoji}</div>
            )}

            {/* Page 2: Name input */}
            {step === 'name' && (
                <div
                    className={`fixed left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
                    style={{ top: 'calc(35vh + 50px)' }}
                >
                    <div className="text-4xl mb-8">🏪</div>

                    <div className="flex flex-col items-center gap-2 px-4">
                        <p className="text-base text-kitchen-text-body">
                            {t('你是')}
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('输入你的名字')}
                                className="mx-1.5 px-2 py-0.5 border-b-2 border-kitchen-gold-border-muted bg-transparent
                                    text-center text-sm font-bold text-kitchen-text-title w-40
                                    placeholder:text-xs placeholder:font-normal placeholder:text-kitchen-text-muted
                                    focus:border-kitchen-gold focus:outline-none transition-colors"
                                maxLength={12}
                                autoFocus
                            />
                        </p>
                        <p className={BODY_TEXT}>
                            {t('怀揣着对烹饪的热情与执着，你成为了一名厨师，并经营着自己的小馆子。')}
                        </p>
                    </div>

                    <button onClick={() => goto('hardship')} className={PRIMARY_BTN}>
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Page 3: Hardship */}
            {step === 'hardship' && (
                <div className={`flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-6xl mb-3">🫠</div>
                    <div className="text-4xl mb-8">🏚️</div>
                    <p className={BODY_TEXT}>
                        {t('世事无常，行情不佳，餐厅在几经挣扎之后还是走到了倒闭的边缘。')}
                    </p>
                    <button onClick={() => goto('opportunity')} className={PRIMARY_BTN}>
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Page 4: Opportunity */}
            {step === 'opportunity' && (
                <div className={`flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-6xl mb-3">🍀</div>
                    <div className="text-4xl mb-8">📺</div>
                    <p className={BODY_TEXT}>
                        {language === 'zh'
                            ? <>幸运的是，《梦想厨房》节目组联系了你。这档节目邀请没有得到足够关注的厨师，参与为期30天的挑战。</>
                            : <>Fortunately, the producers of <em>Dream Kitchen</em> reached out to you. The show invites overlooked chefs to take on a 30-day challenge.</>
                        }
                    </p>
                    <button onClick={() => goto('challenge')} className={PRIMARY_BTN}>
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Page 5: Challenge rules */}
            {step === 'challenge' && (
                <div className={`flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-6xl mb-3">🎯</div>
                    <div className="text-4xl mb-8">🍳</div>
                    <p className={BODY_TEXT}>
                        {language === 'zh'
                            ? '挑战的内容是：节目组每天会抽取一位随机观众，提出对菜品的要求。你需要使用在节目中获取的有限食材，尽可能满足观众的需求，获得更高的评价。'
                            : 'Each day, the show sends a random audience member to your restaurant with specific requests. Using only the limited ingredients you win from the show, you must do your best to satisfy their demands and earn their approval.'
                        }
                    </p>
                    <button onClick={() => goto('resolve')} className={PRIMARY_BTN}>
                        {t('继续')}
                    </button>
                </div>
            )}

            {/* Page 6: Resolve */}
            {step === 'resolve' && (
                <div className={`flex flex-col items-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-6xl mb-3">{selectedEmoji}</div>
                    <div className="text-4xl mb-8">🏪</div>
                    <p className={BODY_TEXT}>
                        {language === 'zh'
                            ? '于是你满怀着希望参加了节目，为了心爱的餐厅努力着。'
                            : 'And so, filled with hope, you joined the show — fighting for the restaurant you love.'
                        }
                    </p>
                    <button onClick={handleContinue} className={PRIMARY_BTN}>
                        {t('开始游戏')}
                    </button>
                </div>
            )}

            {/* Language toggle */}
            <button
                onClick={toggleLanguage}
                className="absolute bottom-6 text-sm font-bold px-3 py-1 rounded-md bg-kitchen-card text-kitchen-gold-deep border-2 border-kitchen-gold-border-muted hover:border-kitchen-gold hover:bg-[#FFF8E0] transition-colors"
            >
                {language === 'zh' ? 'EN' : '中文'}
            </button>
        </div>
    );
};

export default Prologue;
