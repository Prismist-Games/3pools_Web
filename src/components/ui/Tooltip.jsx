import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const OFFSET_X = 14;
const OFFSET_Y = 18;

const Tooltip = ({ content, children, delay = 100 }) => {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const timerRef = useRef(null);

    const onEnter = useCallback((e) => {
        setPos({ x: e.clientX, y: e.clientY });
        timerRef.current = setTimeout(() => setVisible(true), delay);
    }, [delay]);

    const onMove = useCallback((e) => {
        setPos({ x: e.clientX, y: e.clientY });
    }, []);

    const onLeave = useCallback(() => {
        clearTimeout(timerRef.current);
        setVisible(false);
    }, []);

    return (
        <div onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}>
            {children}
            {visible && createPortal(
                <div
                    style={{ position: 'fixed', top: pos.y + OFFSET_Y, left: pos.x + OFFSET_X }}
                    className="w-48 px-3 py-2.5 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg z-[9999] pointer-events-none shadow-xl border border-gray-700/50"
                >
                    {content}
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
