import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: 'chat' | 'system';
  isMe: boolean;
  timestamp: number;
}

export interface CelebrationEvent {
  kind: string;
  triggerTime: number;
}

const ROOM_PREFIX = "matchday-wc26-";

export function usePeerConnection() {
  const [myName, setMyName] = useState("");
  const [friendName, setFriendName] = useState("Friend");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'setting-up' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [micMuted, setMicMuted] = useState(false);
  const [camDisabled, setCamDisabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const mediaCallRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync localStreamRef
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaCallRef.current) {
      mediaCallRef.current.close();
      mediaCallRef.current = null;
    }
    if (dataConnRef.current) {
      dataConnRef.current.close();
      dataConnRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionStatus('idle');
    setChatMessages([]);
    setTimerSeconds(0);
    setIsInRoom(false);
    setMicMuted(false);
    setCamDisabled(false);
    setScreenSharing(false);
  }, []);

  const addSystemMsg = useCallback((text: string) => {
    setChatMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'System',
        text,
        type: 'system',
        isMe: false,
        timestamp: Date.now()
      }
    ]);
  }, []);

  const addChatMsg = useCallback((sender: string, text: string, isMe: boolean) => {
    setChatMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        sender,
        text,
        type: 'chat',
        isMe,
        timestamp: Date.now()
      }
    ]);
  }, []);

  const boostBitrate = useCallback((call: MediaConnection) => {
    try {
      const pc = call.peerConnection;
      if (!pc) return;
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === "video") {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = 4000000; // ~4 Mbps
          sender.setParameters(params).catch(() => {});
        }
      });
    } catch (e) {
      console.warn("Bitrate boost failed", e);
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const playSound = useCallback((kind: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;
      if (kind === "goal" || kind === "trophy") {
        [0, 1, 2].forEach(i => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(220 + i * 40, now);
          osc.frequency.exponentialRampToValueAtTime(440 + i * 40, now + 0.5);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.95);
        });
      } else {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  }, []);

  const localTriggerCelebration = useCallback((kind: string) => {
    setActiveCelebration({ kind, triggerTime: Date.now() });
    playSound(kind);
  }, [playSound]);

  const handleData = useCallback((msg: any) => {
    if (msg.type === "hello") {
      setFriendName(msg.name || "Friend");
      addSystemMsg(`${msg.name || "Your friend"} joined the watch party ⚽`);
      startTimer();
    } else if (msg.type === "chat") {
      addChatMsg(msg.name, msg.text, false);
    } else if (msg.type === "celebrate") {
      localTriggerCelebration(msg.kind);
      // Log the celebration in the system messages
      const label = msg.kind.toUpperCase();
      addSystemMsg(`${msg.name || "Friend"} hit ${label}!`);
    }
  }, [addSystemMsg, addChatMsg, localTriggerCelebration, startTimer]);

  const setupLocalMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const wireDataConnection = useCallback((conn: DataConnection) => {
    dataConnRef.current = conn;
    
    conn.on("open", () => {
      setIsInRoom(true);
      setConnectionStatus('connected');
      conn.send({ type: "hello", name: myName });
    });

    conn.on("data", handleData);

    conn.on("close", () => {
      setConnectionStatus('disconnected');
      addSystemMsg("Your friend disconnected.");
      setRemoteStream(null);
    });

    conn.on("error", (err) => {
      console.error("Data connection error", err);
      setConnectionStatus('error');
      addSystemMsg("Connection error encountered.");
    });
  }, [myName, handleData, addSystemMsg]);

  const wireMediaCall = useCallback((call: MediaConnection) => {
    mediaCallRef.current = call;

    call.on("stream", (remoteStream) => {
      setRemoteStream(remoteStream);
      boostBitrate(call);
      setConnectionStatus('connected');
    });

    call.on("close", () => {
      setConnectionStatus('disconnected');
      setRemoteStream(null);
    });

    call.on("error", (err) => {
      console.error("Media call error", err);
    });
  }, [boostBitrate]);

  const createRoom = useCallback(async (username: string) => {
    const name = username.trim() || "Host";
    setMyName(name);
    setIsHost(true);
    setConnectionStatus('setting-up');
    setErrorMsg("");

    // Generate room code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setRoomCode(code);

    try {
      const stream = await setupLocalMedia();
      
      const newPeer = new Peer(ROOM_PREFIX + code);
      peerRef.current = newPeer;

      newPeer.on("open", () => {
        setConnectionStatus('waiting');
        setIsInRoom(true);
      });

      newPeer.on("connection", (conn) => {
        wireDataConnection(conn);
      });

      newPeer.on("call", (call) => {
        call.answer(stream);
        wireMediaCall(call);
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        if (err.type === "unavailable-id") {
          setErrorMsg("Room code collision. Please try again.");
          cleanup();
        } else {
          setErrorMsg(`Connection error: ${err.type}`);
          setConnectionStatus('error');
        }
      });

    } catch (e: any) {
      console.error("Media setup failed", e);
      setErrorMsg(`Could not access camera/mic: ${e.message}`);
      setConnectionStatus('idle');
    }
  }, [setupLocalMedia, wireDataConnection, wireMediaCall, cleanup]);

  const joinRoom = useCallback(async (username: string, code: string) => {
    const name = username.trim() || "Friend";
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg("Please enter a room code.");
      return;
    }
    
    setMyName(name);
    setIsHost(false);
    setRoomCode(cleanCode);
    setConnectionStatus('connecting');
    setErrorMsg("");

    try {
      const stream = await setupLocalMedia();
      
      const newPeer = new Peer();
      peerRef.current = newPeer;

      newPeer.on("open", () => {
        const targetId = ROOM_PREFIX + cleanCode;
        const conn = newPeer.connect(targetId, { reliable: true });
        wireDataConnection(conn);

        const call = newPeer.call(targetId, stream);
        wireMediaCall(call);
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        setErrorMsg("Couldn't reach that room. Check the code and try again.");
        setConnectionStatus('error');
        cleanup();
      });

    } catch (e: any) {
      console.error("Media setup failed", e);
      setErrorMsg(`Could not access camera/mic: ${e.message}`);
      setConnectionStatus('idle');
    }
  }, [setupLocalMedia, wireDataConnection, wireMediaCall, cleanup]);

  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    addChatMsg(myName, text, true);
    
    if (dataConnRef.current && dataConnRef.current.open) {
      dataConnRef.current.send({
        type: "chat",
        name: myName,
        text
      });
    }
  }, [myName, addChatMsg]);

  const triggerCelebration = useCallback((kind: string) => {
    localTriggerCelebration(kind);
    
    // Log the celebration in the system messages locally
    const label = kind.toUpperCase();
    addSystemMsg(`You hit ${label}!`);

    if (dataConnRef.current && dataConnRef.current.open) {
      dataConnRef.current.send({
        type: "celebrate",
        name: myName,
        kind
      });
    }
  }, [myName, localTriggerCelebration, addSystemMsg]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setMicMuted(!newEnabled);

        // Direct RTCRtpSender fallback modification for active WebRTC pipeline
        if (mediaCallRef.current && mediaCallRef.current.peerConnection) {
          const senders = mediaCallRef.current.peerConnection.getSenders();
          const audioSender = senders.find(s => s.track && s.track.kind === "audio");
          if (audioSender && audioSender.track) {
            audioSender.track.enabled = newEnabled;
          }
        }
      }
    }
  }, []);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const newEnabled = !videoTrack.enabled;
        videoTrack.enabled = newEnabled;
        setCamDisabled(!newEnabled);

        // Direct RTCRtpSender fallback modification for active WebRTC pipeline
        if (mediaCallRef.current && mediaCallRef.current.peerConnection) {
          const senders = mediaCallRef.current.peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender && videoSender.track) {
            videoSender.track.enabled = newEnabled;
          }
        }
      }
    }
  }, []);

  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
    if (mediaCallRef.current && mediaCallRef.current.peerConnection) {
      const sender = mediaCallRef.current.peerConnection.getSenders().find(s => s.track && s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(newTrack).catch(err => console.error("Replace video track error:", err));
      }
    }
    
    const stream = localStreamRef.current;
    if (stream) {
      const oldTrack = stream.getVideoTracks()[0];
      if (oldTrack) {
        stream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      stream.addTrack(newTrack);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        replaceVideoTrack(screenTrack);
        setScreenSharing(true);
        addSystemMsg("Screen share started. Tip: If windows (like Brave) are missing, make sure they are NOT minimized.");

        screenTrack.onended = () => {
          revertToCamera();
        };
      } catch (err) {
        console.warn("Screen share cancelled or failed", err);
      }
    } else {
      revertToCamera();
    }
  }, [screenSharing, replaceVideoTrack, addSystemMsg]);

  const revertToCamera = useCallback(async () => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      const camTrack = camStream.getVideoTracks()[0];
      replaceVideoTrack(camTrack);
      setScreenSharing(false);
      addSystemMsg("Screen share ended. Reverted to camera.");
    } catch (err) {
      console.error("Revert to camera failed", err);
    }
  }, [replaceVideoTrack, addSystemMsg]);

  return {
    myName,
    friendName,
    roomCode,
    isHost,
    isInRoom,
    connectionStatus,
    errorMsg,
    localStream,
    remoteStream,
    micMuted,
    camDisabled,
    screenSharing,
    chatMessages,
    activeCelebration,
    timerSeconds,
    createRoom,
    joinRoom,
    sendChatMessage,
    triggerCelebration,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leaveRoom: cleanup
  };
}
