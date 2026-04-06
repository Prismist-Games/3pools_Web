import React, { createContext, useContext, useState, useEffect } from 'react';
import { EN_TRANSLATIONS } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Default to 'zh' (Chinese)
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('game_language') || 'zh';
    });

    useEffect(() => {
        localStorage.setItem('game_language', language);
    }, [language]);

    // Update document title based on language
    useEffect(() => {
        document.title = language === 'zh' ? '幸运之墙' : 'Wall of Fortune';
    }, [language]);

    // The translation function
    const t = (text) => {
        if (language === 'zh') return text; // Chinese is the source of truth

        // If text is not a string (e.g. number), return as is
        if (typeof text !== 'string') return text;

        // Lookup
        const translated = EN_TRANSLATIONS[text];

        // Return translation or fallback to original if missing
        return translated || text;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
