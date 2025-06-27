import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Home() {
    const [roomId, setRoomId] = useState('');
    const router = useRouter();

    return (
        <div className="flex flex-col items-center mt-20">
            <h1 className="text-3xl mb-4">Next.js + WebRTC Video Call</h1>
            <input
                className="border p-2 mb-2"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => router.push(`/room/${roomId}`)}
            >
                Join Room
            </button>
        </div>
    );
}
