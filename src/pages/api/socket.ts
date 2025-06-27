import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { Server as HTTPServer } from 'http';
import type { NextApiResponseServerIO } from '@/types/next';

export const config = {
    api: { bodyParser: false },
};

declare global {
    var io: Server | undefined;
}

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
    if (!global.io) {
        console.log('🧠 Initializing new Socket.IO server...');

        const io = new Server(res.socket.server as HTTPServer, {
            path: '/api/socketio',
        });

        global.io = io;

        io.on('connection', (socket) => {
            console.log('✅ Socket connected:', socket.id);

            socket.on('join', (roomId) => {
                socket.join(roomId);
                console.log(`➡️ ${socket.id} joined room ${roomId}`);

                socket.to(roomId).emit('user-joined', socket.id);
            });

            socket.on('signal', ({ roomId, data }) => {
                socket.to(roomId).emit('signal', { from: socket.id, data });
            });

            socket.on('chat-message', ({ roomId, message }) => {
                console.log(`💬 Chat from ${socket.id} → room ${roomId}:`, message);

                socket.to(roomId).emit('chat-message', {
                    senderId: socket.id,
                    content: message,
                });
            });

            socket.on('disconnect', () => {
                console.log('❌ Disconnected:', socket.id);
            });
        });
    }

    res.end();
}
