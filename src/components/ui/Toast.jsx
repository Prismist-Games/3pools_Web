import React, { useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-[#2D2A26]';

    return (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] ${bgColor} text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 fade-in`}>
            {type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
            <span className="font-bold text-sm">{message}</span>
        </div>
    );
};
