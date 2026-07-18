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

export interface Participant {
  peerId: string;
  name: string;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  micMuted: boolean;
  camDisabled: boolean;
  screenSharing: boolean;
}

const ROOM_PREFIX = "matchday-wc26-";

export function usePeerConnection() {
  const [myName, setMyName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'setting-up' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [micMuted, setMicMuted] = useState(false);
  const [camDisabled, setCamDisabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myNameRef = useRef("");
  useEffect(() => {
    myNameRef.current = myName;
  }, [myName]);

  const screenSharingRef = useRef(false);
  useEffect(() => {
    screenSharingRef.current = screenSharing;
  }, [screenSharing]);

  const isHostRef = useRef(false);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    localScreenStreamRef.current = localScreenStream;
  }, [localScreenStream]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Maintain connections to all other peers in the mesh
  const connectionsRef = useRef<Map<string, {
    dataConn: DataConnection;
    mediaCall?: MediaConnection;
    screenCall?: MediaConnection;
    name: string;
  }>>(new Map());

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (isHostRef.current) {
      connectionsRef.current.forEach(item => {
        if (item.dataConn.open) {
          try {
            item.dataConn.send({ type: "host-ended" });
          } catch (e) {}
        }
      });
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    connectionsRef.current.forEach(item => {
      if (item.mediaCall) item.mediaCall.close();
      if (item.screenCall) item.screenCall.close();
      item.dataConn.close();
    });
    connectionsRef.current.clear();

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setLocalScreenStream(null);
    setParticipants([]);
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

  const boostBitrate = useCallback((call: MediaConnection, isScreen: boolean = false) => {
    try {
      const pc = call.peerConnection;
      if (!pc) return;
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === "video") {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          
          // Sweet spot configuration to avoid buffer cues and latency, but keep high quality
          if (isScreen) {
            params.encodings[0].maxBitrate = 5000000; // 5 Mbps for crisp 60fps casting
          } else {
            params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps for HD cameras
          }
          
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
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(kind === 'goal' ? 880 : 440, now);
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

  const handlePeerDisconnect = useCallback((peerId: string) => {
    const info = connectionsRef.current.get(peerId);
    if (info) {
      if (info.mediaCall) info.mediaCall.close();
      if (info.screenCall) info.screenCall.close();
      info.dataConn.close();
    }
    connectionsRef.current.delete(peerId);
    setParticipants(prev => prev.filter(p => p.peerId !== peerId));

    if (peerId.endsWith("-HOST")) {
      alert("The host has ended the watch party.");
      cleanup();
    } else {
      addSystemMsg(`${info?.name || "A participant"} left the watch party.`);
    }
  }, [cleanup, addSystemMsg]);

  const wireMediaCall = useCallback((call: MediaConnection) => {
    const peerId = call.peer;
    const info = connectionsRef.current.get(peerId);
    if (info) {
      info.mediaCall = call;
    }

    call.on("stream", (remoteStream) => {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, stream: remoteStream } : p));
      setTimeout(() => boostBitrate(call, false), 1000);
    });

    call.on("close", () => {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, stream: null } : p));
    });

    call.on("error", (err) => {
      console.error("Media call error", err);
    });
  }, [boostBitrate]);

  const wireScreenCall = useCallback((call: MediaConnection) => {
    const peerId = call.peer;
    const info = connectionsRef.current.get(peerId);
    if (info) {
      info.screenCall = call;
    }

    call.on("stream", (remoteStream) => {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, screenStream: remoteStream, screenSharing: true } : p));
      setTimeout(() => boostBitrate(call, true), 1000);
    });

    call.on("close", () => {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, screenStream: null, screenSharing: false } : p));
    });

    call.on("error", (err) => {
      console.error("Screen call error", err);
    });
  }, [boostBitrate]);

  const handleData = useCallback((peerId: string, msg: any) => {
    if (msg.type === "hello") {
      const info = connectionsRef.current.get(peerId);
      if (info) {
        info.name = msg.name || "Friend";
      }

      setParticipants(prev => {
        const exists = prev.some(p => p.peerId === peerId);
        if (exists) {
          return prev.map(p => p.peerId === peerId ? { ...p, name: msg.name || "Friend" } : p);
        } else {
          return [...prev, {
            peerId,
            name: msg.name || "Friend",
            stream: null,
            screenStream: null,
            micMuted: false,
            camDisabled: false,
            screenSharing: false
          }];
        }
      });

      addSystemMsg(`${msg.name || "A friend"} joined the watch party ⚽`);
      startTimer();

      // Coordinate mesh connection if host
      if (isHostRef.current) {
        const currentPeers = Array.from(connectionsRef.current.entries())
          .filter(([id]) => id !== peerId)
          .map(([id, item]) => ({ peerId: id, name: item.name }));
        
        connectionsRef.current.get(peerId)?.dataConn.send({
          type: "peer-list",
          peers: currentPeers
        });

        connectionsRef.current.forEach((item, id) => {
          if (id !== peerId && item.dataConn.open) {
            item.dataConn.send({
              type: "new-peer",
              peerId,
              name: msg.name || "Friend"
            });
          }
        });
      }
    } else if (msg.type === "peer-list") {
      msg.peers.forEach((p: { peerId: string, name: string }) => {
        if (peerRef.current && !connectionsRef.current.has(p.peerId)) {
          const conn = peerRef.current.connect(p.peerId, { reliable: true });
          wireDataConnection(conn, p.name);
          
          if (localStreamRef.current) {
            const call = peerRef.current.call(p.peerId, localStreamRef.current);
            wireMediaCall(call);
          }
        }
      });
    } else if (msg.type === "new-peer") {
      setParticipants(prev => {
        if (prev.some(p => p.peerId === msg.peerId)) return prev;
        return [...prev, {
          peerId: msg.peerId,
          name: msg.name || "Friend",
          stream: null,
          screenStream: null,
          micMuted: false,
          camDisabled: false,
          screenSharing: false
        }];
      });
    } else if (msg.type === "chat") {
      addChatMsg(msg.name, msg.text, false);
    } else if (msg.type === "celebrate") {
      localTriggerCelebration(msg.kind);
      addSystemMsg(`${msg.name || "Friend"} hit ${msg.kind.toUpperCase()}!`);
    } else if (msg.type === "screen-share-state") {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, screenSharing: msg.active } : p));
      addSystemMsg(`${msg.active ? (msg.name || "Friend") + " started screen sharing." : (msg.name || "Friend") + " stopped screen sharing."}`);
    } else if (msg.type === "state-update") {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, micMuted: msg.micMuted, camDisabled: msg.camDisabled } : p));
    } else if (msg.type === "host-ended") {
      alert("The host has ended the watch party.");
      cleanup();
    }
  }, [addSystemMsg, addChatMsg, localTriggerCelebration, startTimer, cleanup, wireMediaCall]);

  const wireDataConnection = useCallback((conn: DataConnection, initialName: string = "") => {
    if (!connectionsRef.current.has(conn.peer)) {
      connectionsRef.current.set(conn.peer, { dataConn: conn, name: initialName });
    }
    
    conn.on("open", () => {
      setIsInRoom(true);
      setConnectionStatus('connected');
      conn.send({ type: "hello", name: myNameRef.current });
      if (screenSharingRef.current) {
        conn.send({ type: "screen-share-state", name: myNameRef.current, active: true });
      }
    });

    conn.on("data", (data) => {
      handleData(conn.peer, data);
    });

    conn.on("close", () => {
      handlePeerDisconnect(conn.peer);
    });

    conn.on("error", (err) => {
      console.error("Data connection error", err);
      handlePeerDisconnect(conn.peer);
    });
  }, [handleData, handlePeerDisconnect]);

  const setupLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("Standard resolution getUserMedia failed, attempting generic fallback:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        return stream;
      } catch (err2) {
        console.error("All getUserMedia attempts failed:", err2);
        throw err2;
      }
    }
  }, []);

  const createRoom = useCallback(async (username: string) => {
    setMyName(username);
    setConnectionStatus('setting-up');
    setErrorMsg("");
    setIsHost(true);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);

    try {
      const stream = await setupLocalMedia();
      const newPeer = new Peer(ROOM_PREFIX + code + "-HOST");
      peerRef.current = newPeer;

      newPeer.on("open", () => {
        setConnectionStatus('waiting');
        setIsInRoom(true);
      });

      newPeer.on("connection", (conn) => {
        wireDataConnection(conn);
      });

      newPeer.on("call", (call) => {
        if (call.metadata && call.metadata.type === "screen-share") {
          call.answer();
          wireScreenCall(call);
        } else {
          call.answer(stream);
          wireMediaCall(call);
        }
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        setErrorMsg("Connection error setup failed.");
        setConnectionStatus('error');
      });
    } catch (err) {
      console.error("Room creation media setup failed:", err);
      setErrorMsg("Failed to access camera/mic.");
      setConnectionStatus('error');
    }
  }, [setupLocalMedia, wireDataConnection, wireScreenCall, wireMediaCall]);

  const joinRoom = useCallback(async (username: string, code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setMyName(username);
    setRoomCode(cleanCode);
    setConnectionStatus('connecting');
    setIsHost(false);
    setErrorMsg("");

    try {
      const stream = await setupLocalMedia();
      const newPeer = new Peer();
      peerRef.current = newPeer;

      newPeer.on("open", () => {
        const hostId = ROOM_PREFIX + cleanCode + "-HOST";
        const conn = newPeer.connect(hostId, { reliable: true });
        wireDataConnection(conn, "Host");

        const call = newPeer.call(hostId, stream);
        wireMediaCall(call);
      });

      newPeer.on("connection", (conn) => {
        wireDataConnection(conn);
      });

      newPeer.on("call", (call) => {
        if (call.metadata && call.metadata.type === "screen-share") {
          call.answer();
          wireScreenCall(call);
        } else {
          call.answer(stream);
          wireMediaCall(call);
        }
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        setErrorMsg("Couldn't reach that room. Check the code.");
        setConnectionStatus('error');
      });
    } catch (err) {
      console.error("Room join failed:", err);
      setErrorMsg("Camera access needed to join party.");
      setConnectionStatus('error');
    }
  }, [setupLocalMedia, wireDataConnection, wireMediaCall, wireScreenCall]);

  const sendChatMessage = useCallback((text: string) => {
    addChatMsg(myNameRef.current, text, true);
    connectionsRef.current.forEach(item => {
      if (item.dataConn.open) {
        item.dataConn.send({ type: "chat", name: myNameRef.current, text });
      }
    });
  }, [addChatMsg]);

  const triggerCelebration = useCallback((kind: string) => {
    localTriggerCelebration(kind);
    connectionsRef.current.forEach(item => {
      if (item.dataConn.open) {
        item.dataConn.send({ type: "celebrate", name: myNameRef.current, kind });
      }
    });
  }, [localTriggerCelebration]);

  const toggleMic = useCallback(() => {
    const nextState = !micMuted;
    setMicMuted(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    connectionsRef.current.forEach(item => {
      if (item.dataConn.open) {
        item.dataConn.send({ type: "state-update", name: myNameRef.current, micMuted: nextState, camDisabled });
      }
    });
  }, [micMuted, camDisabled]);

  const toggleCam = useCallback(() => {
    const nextState = !camDisabled;
    setCamDisabled(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    connectionsRef.current.forEach(item => {
      if (item.dataConn.open) {
        item.dataConn.send({ type: "state-update", name: myNameRef.current, micMuted, camDisabled: nextState });
      }
    });
  }, [micMuted, camDisabled]);

  const revertToCamera = useCallback(() => {
    connectionsRef.current.forEach(item => {
      if (item.screenCall) {
        item.screenCall.close();
        item.screenCall = undefined;
      }
    });
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setLocalScreenStream(null);
    setScreenSharing(false);
    addSystemMsg("Screen share ended.");

    connectionsRef.current.forEach(item => {
      if (item.dataConn.open) {
        item.dataConn.send({ type: "screen-share-state", name: myNameRef.current, active: false });
      }
    });
  }, [addSystemMsg]);

  const toggleScreenShare = useCallback(async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        setLocalScreenStream(screenStream);
        setScreenSharing(true);
        addSystemMsg("Screen share started.");

        if (peerRef.current) {
          connectionsRef.current.forEach((item, friendId) => {
            const call = peerRef.current!.call(friendId, screenStream, {
              metadata: { type: "screen-share" }
            });
            item.screenCall = call;
            setTimeout(() => boostBitrate(call, true), 1000);
          });
        }

        connectionsRef.current.forEach(item => {
          if (item.dataConn.open) {
            item.dataConn.send({ type: "screen-share-state", name: myNameRef.current, active: true });
          }
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => {
          revertToCamera();
        };
      } catch (err) {
        console.warn("Screen share cancelled or failed", err);
      }
    } else {
      revertToCamera();
    }
  }, [screenSharing, revertToCamera, addSystemMsg, boostBitrate]);

  // Derived properties for backwards compatibility
  const remoteScreenSharing = participants.some(p => p.screenSharing);
  const remoteScreenStream = participants.find(p => p.screenSharing)?.screenStream || null;
  const friendName = participants.map(p => p.name).join(", ") || "Friend";

  return {
    myName,
    friendName,
    roomCode,
    isHost,
    isInRoom,
    connectionStatus,
    errorMsg,
    localStream,
    localScreenStream,
    participants,
    micMuted,
    camDisabled,
    screenSharing,
    remoteScreenSharing,
    remoteScreenStream,
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
