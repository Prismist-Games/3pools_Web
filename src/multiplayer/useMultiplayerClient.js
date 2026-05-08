import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const getSocketUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('server');
    if (override) return override;
    return `ws://${window.location.hostname || 'localhost'}:8787`;
};

export function useMultiplayerClient() {
    const socketRef = useRef(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [snapshot, setSnapshot] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const socket = new WebSocket(getSocketUrl());
        socketRef.current = socket;

        socket.addEventListener('open', () => setConnectionStatus('connected'));
        socket.addEventListener('close', () => setConnectionStatus('closed'));
        socket.addEventListener('error', () => setConnectionStatus('error'));
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'joined') setPlayerId(message.playerId);
            if (message.type === 'snapshot') setSnapshot(message.snapshot);
            if (message.type === 'error') setError(message.message);
        });

        return () => {
            socket.close();
        };
    }, []);

    const send = useCallback((payload) => {
        setError('');
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setError('服务器未连接');
            return;
        }
        socket.send(JSON.stringify(payload));
    }, []);

    const self = useMemo(() => {
        return snapshot?.players?.find((player) => player.id === snapshot.viewerId) || null;
    }, [snapshot]);

    return {
        connectionStatus,
        snapshot,
        self,
        playerId,
        error,
        actions: {
            join: (name) => send({ type: 'join', name }),
            start: () => send({ type: 'start' }),
            choosePool: (poolId) => send({ type: 'choosePool', poolId }),
            chooseInteractive: (payload) => send({ type: 'chooseInteractive', ...payload }),
            handlePending: (payload) => send({ type: 'handlePending', ...payload }),
            moveItem: (payload) => send({ type: 'moveItem', ...payload }),
            recycleItems: (indices) => send({ type: 'recycleItems', indices }),
            submitOrder: (orderId, itemUids = []) => send({ type: 'submitOrder', orderId, itemUids }),
        },
    };
}
