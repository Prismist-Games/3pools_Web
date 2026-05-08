import { WebSocketServer } from 'ws';
import { MultiplayerRoom } from './multiplayerEngine.js';

const PORT = Number(process.env.LAN_SERVER_PORT || 8787);
let room = new MultiplayerRoom();
const clients = new Map();

const server = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

const send = (socket, payload) => {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
};

const broadcast = () => {
    for (const [socket, playerId] of clients.entries()) {
        send(socket, { type: 'snapshot', snapshot: room.snapshot(playerId) });
    }
};

const sendError = (socket, message) => {
    send(socket, { type: 'error', message });
};

server.on('connection', (socket) => {
    if (clients.size === 0 && room.status !== 'lobby') {
        room = new MultiplayerRoom();
    }

    send(socket, { type: 'hello', message: 'connected' });
    send(socket, { type: 'snapshot', snapshot: room.snapshot(null) });

    socket.on('message', (raw) => {
        try {
            const message = JSON.parse(raw.toString());
            const playerId = clients.get(socket);

            if (message.type === 'join') {
                if (playerId) return;
                const newPlayerId = room.addPlayer(message.name);
                clients.set(socket, newPlayerId);
                send(socket, { type: 'joined', playerId: newPlayerId });
                broadcast();
                return;
            }

            if (!playerId) {
                throw new Error('请先加入房间');
            }

            if (message.type === 'start') room.start(playerId);
            if (message.type === 'choosePool') room.choosePool(playerId, message.poolId);
            if (message.type === 'chooseInteractive') room.chooseInteractive(playerId, message);
            if (message.type === 'handlePending') room.handlePending(playerId, message);
            if (message.type === 'moveItem') room.moveItem(playerId, message);
            if (message.type === 'recycleItems') room.recycleItems(playerId, message);
            if (message.type === 'submitOrder') room.submitOrder(playerId, message.orderId, message.itemUids);
            if (message.type === 'stopDrawing') room.stopDrawing(playerId);
            if (message.type === 'resetRoom') room.resetToLobby(playerId);

            broadcast();
        } catch (error) {
            sendError(socket, error.message || '操作失败');
            broadcast();
        }
    });

    socket.on('close', () => {
        const playerId = clients.get(socket);
        clients.delete(socket);
        if (playerId) {
            room.removePlayer(playerId);
            if (clients.size === 0) {
                room = new MultiplayerRoom();
            }
            broadcast();
        }
    });
});

console.log(`LAN multiplayer server listening on ws://0.0.0.0:${PORT}`);
