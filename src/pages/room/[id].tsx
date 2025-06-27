'use client';

import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

const Room = () => {
    const router = useRouter();
    const { id: roomId } = router.query;

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);

    const [chatMessages, setChatMessages] = useState<{ senderId: string; content: string }[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [mySocketId, setMySocketId] = useState('');

    useEffect(() => {
        if (!roomId) return;

        const setupPeerConnection = () => {
            peerRef.current = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });

            peerRef.current.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit('signal', { roomId, data: { candidate: e.candidate } });
                }
            };

            peerRef.current.ontrack = (e) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = e.streams[0];
                }
            };

            const stream = localVideoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach((track) =>
                peerRef.current?.addTrack(track, stream)
            );
        };

        const createPeer = (initiator: boolean) => {
            setupPeerConnection();

            if (initiator) {
                peerRef.current?.createOffer().then((offer) => {
                    peerRef.current?.setLocalDescription(offer);
                    socket.emit('signal', { roomId, data: offer });
                });
            }
        };

        socket = io({ path: '/api/socketio' });

        socket.on('connect', () => {
            console.log('🔌 Connected as', socket.id);
            setMySocketId(socket.id!);
            socket.emit('join', roomId);
        });

        socket.on('chat-message', ({ senderId, content }) => {
            console.log('📩 Chat from', senderId, ':', content);
            setChatMessages((prev) => [...prev, { senderId, content }]);
        });

        socket.on('user-joined', () => {
            console.log('🧑‍🤝‍🧑 User joined room');
            if (localVideoRef.current?.srcObject) {
                createPeer(true);
            }
        });

        socket.on('signal', async ({ data }) => {
            if (!peerRef.current) {
                setupPeerConnection();
            }

            const pc = peerRef.current!;
            if (data.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('signal', { roomId, data: answer });
            } else if (data.type === 'answer') {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                } else {
                    console.warn('⚠️ Unexpected answer: state =', pc.signalingState);
                }
            } else if (data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId]);

    const sendMessage = () => {
        const msg = messageInput.trim();
        if (!msg) return;

        socket.emit('chat-message', { roomId, message: msg });
        setChatMessages((prev) => [...prev, { senderId: mySocketId, content: msg }]);
        setMessageInput('');
    };

    return (
        <div className="flex flex-col items-center p-4">
            <h1 className="text-xl font-bold mb-4">Room: {roomId}</h1>

            <div className="flex gap-4 mb-4">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-1/2 border rounded" />
                <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2 border rounded" />
            </div>

            <div className="w-full max-w-2xl">
                <div className="border rounded p-3 h-64 overflow-y-scroll bg-white">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className="text-sm mb-1">
                            <span className="font-semibold">
                                {msg.senderId === mySocketId ? 'You' : 'Partner'}
                            </span>: {msg.content}
                        </div>
                    ))}
                </div>

                <div className="flex mt-2">
                    <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-grow border px-2 py-1 rounded-l"
                    />
                    <button
                        onClick={sendMessage}
                        className="bg-blue-600 text-white px-4 py-1 rounded-r"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Room;