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

// ─── ICE Configuration ───────────────────────────────────────────────────────
// Multiple STUN servers + public TURN relay for NAT traversal on all networks
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.nextcloud.com:443" },
  // Public free TURN relay as fallback for symmetric NAT / corporate firewalls
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const PEER_CONFIG = {
  debug: 0,
  config: {
    iceServers: ICE_SERVERS,
    iceTransportPolicy: "all" as RTCIceTransportPolicy,
    bundlePolicy: "max-bundle" as RTCBundlePolicy, // Audio+video+data on ONE transport → fewer round-trips
    rtcpMuxPolicy: "require" as RTCRtcpMuxPolicy,  // Mux RTCP+RTP on same port
    iceCandidatePoolSize: 10,                       // Pre-gather ICE candidates to cut initial connect time
  },
};

// ─── Maximum quality — no throttling regardless of user count ────────────────
// User explicitly requested max quality at all times — data usage is not a concern
const MAX_CAMERA_BITRATE  = 2_500_000; // 2.5 Mbps — crisp HD 720p camera for every user
const MAX_SCREEN_BITRATE  = 5_000_000; // 5.0 Mbps — sharp 1080p screen share for every user



// ─── Playout delay minimizer ────────────────────────────────────────────────
// Browsers buffer 100-200ms by default to smooth jitter. Setting playoutDelayHint=0
// tells Chrome to use the absolute minimum buffer — biggest single latency win available.
function minimizePlayoutDelay(pc: RTCPeerConnection) {
  try {
    pc.getReceivers().forEach(receiver => {
      if ('playoutDelayHint' in receiver) {
        (receiver as any).playoutDelayHint = 0;
      }
    });
  } catch (_) {}
}

export function usePeerConnection() {
  const [myName, setMyName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'setting-up' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error'
  >('idle');
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
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const participantsRef = useRef<Participant[]>([]);

  const myNameRef = useRef("");
  useEffect(() => { myNameRef.current = myName; }, [myName]);

  const screenSharingRef = useRef(false);
  useEffect(() => { screenSharingRef.current = screenSharing; }, [screenSharing]);

  const isHostRef = useRef(false);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  const timerSecondsRef = useRef(0);
  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);

  useEffect(() => { localScreenStreamRef.current = localScreenStream; }, [localScreenStream]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  // Mesh connection registry — each peer has a reliable signaling channel
  // and a separate unreliable channel for low-priority real-time messages
  const connectionsRef = useRef<Map<string, {
    dataConn: DataConnection;       // reliable: true — for critical signaling
    rtDataConn?: DataConnection;    // reliable: false, maxRetransmits:0 — for chat/state/celebrate
    mediaCall?: MediaConnection;
    screenCall?: MediaConnection;
    name: string;
  }>>(new Map());

  useEffect(() => { return () => { cleanup(); }; }, []);

  const cleanup = useCallback(() => {
    if (isHostRef.current) {
      connectionsRef.current.forEach(item => {
        if (item.dataConn.open) {
          try { item.dataConn.send({ type: "host-ended" }); } catch (_) {}
        }
      });
    }

    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }


    connectionsRef.current.forEach(item => {
      if (item.mediaCall) item.mediaCall.close();
      if (item.screenCall) item.screenCall.close();
      item.dataConn.close();
    });
    connectionsRef.current.clear();

    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); }
    if (localScreenStreamRef.current) { localScreenStreamRef.current.getTracks().forEach(t => t.stop()); }

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
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'System', text, type: 'system', isMe: false, timestamp: Date.now()
    }]);
  }, []);

  const addChatMsg = useCallback((sender: string, text: string, isMe: boolean) => {
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      sender, text, type: 'chat', isMe, timestamp: Date.now()
    }]);
  }, []);

  // ─── Apply fixed MAX quality encoding parameters — no adaptive scaling ────────
  // Every sender always gets the highest possible bitrate regardless of peer count
  const applyEncodingParams = useCallback((pc: RTCPeerConnection, isScreen: boolean) => {
    pc.getSenders().forEach(async sender => {
      if (!sender.track) return;
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      const enc = params.encodings[0];

      if (sender.track.kind === 'video') {
        if (isScreen) {
          enc.maxBitrate = MAX_SCREEN_BITRATE;  // 5 Mbps — full sharp 1080p screen
          enc.maxFramerate = 30;
          enc.scaleResolutionDownBy = 1.0;
          enc.priority = 'high';
          enc.networkPriority = 'high';
          (params as any).degradationPreference = 'maintain-resolution'; // keep text sharp
        } else {
          enc.maxBitrate = MAX_CAMERA_BITRATE;  // 2.5 Mbps — HD 720p camera always
          enc.maxFramerate = 30;
          enc.scaleResolutionDownBy = 1.0;
          enc.priority = 'high';
          enc.networkPriority = 'high';
          (params as any).degradationPreference = 'maintain-framerate'; // keep motion smooth
        }
      }

      if (sender.track.kind === 'audio') {
        enc.priority = 'high';
        enc.networkPriority = 'high';
      }

      try { await sender.setParameters(params); } catch (_) {}
    });
  }, []);



  // ─── Wire ICE connection state → encoding params ────────────────────────────
  // ICE must reach 'connected'/'completed' before setParameters is valid
  const wireIceOptimizations = useCallback((call: MediaConnection, isScreen: boolean) => {
    const pc = call.peerConnection;
    if (!pc) return;



    const tryApply = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        applyEncodingParams(pc, isScreen);
      }
    };

    pc.addEventListener('iceconnectionstatechange', tryApply);
    // Delayed fallback: 500ms is sufficient for fast local networks
    setTimeout(() => applyEncodingParams(pc, isScreen), 500);
  }, [applyEncodingParams]);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => { setTimerSeconds(prev => prev + 1); }, 1000);
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
    } catch (_) {}
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
      cleanup();
      setModal({
        title: "Watch Party Ended",
        message: "The host has ended the watch party. Thanks for joining!",
        confirmText: "Back to Lobby",
        onConfirm: () => setModal(null)
      });
    } else {
      addSystemMsg(`${info?.name || "A participant"} left the watch party.`);
    }
  }, [cleanup, addSystemMsg, setModal]);

  const wireMediaCall = useCallback((call: MediaConnection) => {
    const peerId = call.peer;
    const info = connectionsRef.current.get(peerId);
    if (info) info.mediaCall = call;

    call.on("stream", (remoteStream) => {
      setParticipants(prev => {
        const exists = prev.some(p => p.peerId === peerId);
        if (exists) {
          return prev.map(p => p.peerId === peerId ? { ...p, stream: remoteStream } : p);
        } else {
          return [...prev, {
            peerId,
            name: info?.name || "Friend",
            stream: remoteStream,
            screenStream: null,
            micMuted: false,
            camDisabled: false,
            screenSharing: false
          }];
        }
      });
      wireIceOptimizations(call, false);
      // Minimize jitter buffer — biggest single latency reduction available in Chrome
      minimizePlayoutDelay(call.peerConnection);
    });

    call.on("close", () => {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, stream: null } : p));
    });

    call.on("error", (err) => { console.error("Media call error", err); });
  }, [wireIceOptimizations]);

  const wireScreenCall = useCallback((call: MediaConnection) => {
    const peerId = call.peer;
    const info = connectionsRef.current.get(peerId);
    if (info) info.screenCall = call;

    call.on("stream", (remoteStream) => {
      setParticipants(prev => {
        const exists = prev.some(p => p.peerId === peerId);
        if (exists) {
          return prev.map(p => p.peerId === peerId ? { ...p, screenStream: remoteStream, screenSharing: true } : p);
        } else {
          return [...prev, {
            peerId,
            name: info?.name || "Friend",
            stream: null,
            screenStream: remoteStream,
            micMuted: false,
            camDisabled: false,
            screenSharing: true
          }];
        }
      });
      wireIceOptimizations(call, true);
      // Minimize jitter buffer on screen share stream too
      minimizePlayoutDelay(call.peerConnection);
    });

    call.on("close", () => {
      setParticipants(prev => prev.map(p => p.peerId === peerId
        ? { ...p, screenStream: null, screenSharing: false } : p));
    });

    call.on("error", (err) => { console.error("Screen call error", err); });
  }, [wireIceOptimizations]);

  const handleData = useCallback((peerId: string, msg: any) => {
    if (msg.type === "ping") {
      try {
        connectionsRef.current.get(peerId)?.dataConn.send({ type: "pong" });
      } catch (_) {}
      return;
    }
    if (msg.type === "pong") {
      return;
    }

    if (msg.type === "hello") {
      const info = connectionsRef.current.get(peerId);
      if (info) info.name = msg.name || "Friend";

      setParticipants(prev => {
        const exists = prev.some(p => p.peerId === peerId);
        if (exists) return prev.map(p => p.peerId === peerId ? { ...p, name: msg.name || "Friend" } : p);
        return [...prev, {
          peerId, name: msg.name || "Friend",
          stream: null, screenStream: null,
          micMuted: false, camDisabled: false, screenSharing: false
        }];
      });

      addSystemMsg(`${msg.name || "A friend"} joined the watch party ⚽`);
      startTimer();

      // Send the current timer seconds to the newly joined peer
      try {
        connectionsRef.current.get(peerId)?.dataConn.send({
          type: "timer-sync",
          seconds: timerSecondsRef.current
        });
      } catch (_) {}

      // Coordinate mesh topology if host
      if (isHostRef.current) {
        const currentPeers = Array.from(connectionsRef.current.entries())
          .filter(([id]) => id !== peerId)
          .map(([id, item]) => ({ peerId: id, name: item.name }));

        connectionsRef.current.get(peerId)?.dataConn.send({ type: "peer-list", peers: currentPeers });

        connectionsRef.current.forEach((item, id) => {
          if (id !== peerId && item.dataConn.open) {
            item.dataConn.send({ type: "new-peer", peerId, name: msg.name || "Friend" });
          }
        });
      }
    } else if (msg.type === "peer-list") {
      msg.peers.forEach((p: { peerId: string; name: string }) => {
        if (peerRef.current && !connectionsRef.current.has(p.peerId)) {
          const conn = peerRef.current.connect(p.peerId, { reliable: true, serialization: "json" });
          wireDataConnection(conn, p.name, true);
        }
      });
    } else if (msg.type === "new-peer") {
      setParticipants(prev => {
        if (prev.some(p => p.peerId === msg.peerId)) return prev;
        return [...prev, {
          peerId: msg.peerId, name: msg.name || "Friend",
          stream: null, screenStream: null,
          micMuted: false, camDisabled: false, screenSharing: false
        }];
      });
    } else if (msg.type === "chat") {
      addChatMsg(msg.name, msg.text, false);
    } else if (msg.type === "celebrate") {
      localTriggerCelebration(msg.kind);
      addSystemMsg(`${msg.name || "Friend"} hit ${msg.kind.toUpperCase()}!`);
    } else if (msg.type === "screen-share-state") {
      setParticipants(prev => prev.map(p => p.peerId === peerId ? { ...p, screenSharing: msg.active } : p));
      addSystemMsg(msg.active
        ? `${msg.name || "Friend"} started screen sharing.`
        : `${msg.name || "Friend"} stopped screen sharing.`);
    } else if (msg.type === "state-update") {
      setParticipants(prev => prev.map(p => p.peerId === peerId
        ? { ...p, micMuted: msg.micMuted, camDisabled: msg.camDisabled } : p));
    } else if (msg.type === "host-ended") {
      cleanup();
      setModal({
        title: "Watch Party Ended",
        message: "The host has ended the watch party. Thanks for joining!",
        confirmText: "Back to Lobby",
        onConfirm: () => setModal(null)
      });
    } else if (msg.type === "timer-sync") {
      setTimerSeconds(msg.seconds);
      startTimer();
    }
  }, [addSystemMsg, addChatMsg, localTriggerCelebration, startTimer, cleanup, wireMediaCall, setModal]);

  // ─── Helper: route low-priority messages through unreliable channel ────────────
  // Falls back to reliable dataConn if rtDataConn not yet open
  const sendRt = useCallback((peerId: string, msg: object) => {
    const item = connectionsRef.current.get(peerId);
    if (!item) return;
    const ch = (item.rtDataConn?.open ? item.rtDataConn : item.dataConn);
    if (ch.open) ch.send(msg);
  }, []);

  const wireDataConnection = useCallback((conn: DataConnection, initialName = "", isInitiator = false) => {
    const isRt = conn.label === "rt";

    if (isRt) {
      const entry = connectionsRef.current.get(conn.peer);
      if (entry) {
        entry.rtDataConn = conn;
      } else {
        connectionsRef.current.set(conn.peer, {
          dataConn: conn,
          rtDataConn: conn,
          name: initialName || "Friend"
        });
      }
      conn.on("data", (data) => { handleData(conn.peer, data); });
      conn.on("close", () => { handlePeerDisconnect(conn.peer); });
      conn.on("error", (err) => {
        console.error("RT Data connection error", err);
        handlePeerDisconnect(conn.peer);
      });
      return;
    }

    if (!connectionsRef.current.has(conn.peer)) {
      connectionsRef.current.set(conn.peer, { dataConn: conn, name: initialName });
    } else {
      connectionsRef.current.get(conn.peer)!.dataConn = conn;
    }

    conn.on("open", () => {
      setIsInRoom(true);
      setConnectionStatus('connected');
      conn.send({ type: "hello", name: myNameRef.current });
      if (screenSharingRef.current) {
        conn.send({ type: "screen-share-state", name: myNameRef.current, active: true });
      }

      // Initiate uni-directional camera stream call to this peer
      if (localStreamRef.current && peerRef.current) {
        const call = peerRef.current.call(conn.peer, localStreamRef.current);
        wireMediaCall(call);
      }

      // Initiate screen share stream call to this peer if currently sharing screen
      if (screenSharingRef.current && localScreenStreamRef.current && peerRef.current) {
        const call = peerRef.current.call(conn.peer, localScreenStreamRef.current, {
          metadata: { type: "screen-share" }
        });
        const entry = connectionsRef.current.get(conn.peer);
        if (entry) entry.screenCall = call;
        wireIceOptimizations(call, true);
      }

      if (isInitiator && peerRef.current) {
        try {
          const rtConn = peerRef.current.connect(conn.peer, {
            reliable: false,
            serialization: "json",
            label: "rt",
          });
          rtConn.on("open", () => {
            const entry = connectionsRef.current.get(conn.peer);
            if (entry) entry.rtDataConn = rtConn;
          });
          rtConn.on("data", (data) => { handleData(conn.peer, data); });
          rtConn.on("close", () => { handlePeerDisconnect(conn.peer); });
          rtConn.on("error", () => { handlePeerDisconnect(conn.peer); });
        } catch (_) {}
      }
    });

    conn.on("data", (data) => { handleData(conn.peer, data); });
    conn.on("close", () => { handlePeerDisconnect(conn.peer); });
    conn.on("error", (err) => {
      console.error("Data connection error", err);
      handlePeerDisconnect(conn.peer);
    });
  }, [handleData, handlePeerDisconnect, wireIceOptimizations]);

  // ─── Local media setup with contentHint and latency-optimized constraints ────
  const setupLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,   // Mono for voice — saves bandwidth
          sampleRate: 48000, // Opus codec sweet spot
        }
      });

      // Content hints guide browser encoder for better quality per bitrate
      stream.getVideoTracks().forEach(track => { (track as any).contentHint = 'motion'; });
      stream.getAudioTracks().forEach(track => { (track as any).contentHint = 'speech'; });

      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("HD getUserMedia failed, trying fallback:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getVideoTracks().forEach(t => { (t as any).contentHint = 'motion'; });
        stream.getAudioTracks().forEach(t => { (t as any).contentHint = 'speech'; });
        setLocalStream(stream);
        return stream;
      } catch (err2) {
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
      await setupLocalMedia();
      const newPeer = new Peer(ROOM_PREFIX + code + "-HOST", PEER_CONFIG);
      peerRef.current = newPeer;

      newPeer.on("disconnected", () => {
        console.warn("PeerJS signaling disconnected. Reconnecting host...");
        newPeer.reconnect();
      });

      newPeer.on("open", () => {
        setConnectionStatus('waiting');
        setIsInRoom(true);
        startTimer();
      });

      newPeer.on("connection", (conn) => { wireDataConnection(conn); });

      newPeer.on("call", (call) => {
        if ((call.metadata as any)?.type === "screen-share") {
          call.answer();
          wireScreenCall(call);
        } else {
          call.answer(); // Answer with no stream (uni-directional pattern)
          wireMediaCall(call);
        }
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        setErrorMsg("Connection error. Please try again.");
        setConnectionStatus('error');
      });
    } catch (err) {
      console.error("Room creation failed:", err);
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
      await setupLocalMedia();
      const newPeer = new Peer(PEER_CONFIG);
      peerRef.current = newPeer;

      newPeer.on("disconnected", () => {
        console.warn("PeerJS signaling disconnected. Reconnecting client...");
        newPeer.reconnect();
      });

      newPeer.on("open", () => {
        const hostId = ROOM_PREFIX + cleanCode + "-HOST";
        const conn = newPeer.connect(hostId, { reliable: true, serialization: "json" });
        wireDataConnection(conn, "Host", true);
      });

      newPeer.on("connection", (conn) => { wireDataConnection(conn); });

      newPeer.on("call", (call) => {
        if ((call.metadata as any)?.type === "screen-share") {
          call.answer();
          wireScreenCall(call);
        } else {
          call.answer(); // Answer with no stream (uni-directional pattern)
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
    // Route chat through unreliable channel — no retransmit, no HOL blocking
    connectionsRef.current.forEach((_, peerId) => {
      sendRt(peerId, { type: "chat", name: myNameRef.current, text });
    });
  }, [addChatMsg, sendRt]);

  const triggerCelebration = useCallback((kind: string) => {
    localTriggerCelebration(kind);
    // Route celebration through unreliable channel
    connectionsRef.current.forEach((_, peerId) => {
      sendRt(peerId, { type: "celebrate", name: myNameRef.current, kind });
    });
  }, [localTriggerCelebration, sendRt]);

  const toggleMic = useCallback(() => {
    const next = !micMuted;
    setMicMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    // State updates are unreliable — fine to drop, next update will correct it
    connectionsRef.current.forEach((_, peerId) => {
      sendRt(peerId, { type: "state-update", name: myNameRef.current, micMuted: next, camDisabled });
    });
  }, [micMuted, camDisabled, sendRt]);

  const toggleCam = useCallback(() => {
    const next = !camDisabled;
    setCamDisabled(next);
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !next; });
    connectionsRef.current.forEach((_, peerId) => {
      sendRt(peerId, { type: "state-update", name: myNameRef.current, micMuted, camDisabled: next });
    });
  }, [micMuted, camDisabled, sendRt]);

  const revertToCamera = useCallback(() => {
    connectionsRef.current.forEach(item => {
      if (item.screenCall) { item.screenCall.close(); item.screenCall = undefined; }
    });
    localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
    setLocalScreenStream(null);
    setScreenSharing(false);
    addSystemMsg("Screen share ended.");
    connectionsRef.current.forEach(item => {
      if (item.dataConn.open) item.dataConn.send({ type: "screen-share-state", name: myNameRef.current, active: false });
    });
  }, [addSystemMsg]);

  const toggleScreenShare = useCallback(async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });

        // Content hint: 'detail' → encoder prioritizes resolution/text clarity
        screenStream.getVideoTracks().forEach(t => { (t as any).contentHint = 'detail'; });

        setLocalScreenStream(screenStream);
        setScreenSharing(true);
        addSystemMsg("Screen share started.");

        if (peerRef.current) {
          connectionsRef.current.forEach((item, friendId) => {
            const call = peerRef.current!.call(friendId, screenStream, {
              metadata: { type: "screen-share" }
            });
            item.screenCall = call;
            wireIceOptimizations(call, true);
          });
        }

        connectionsRef.current.forEach(item => {
          if (item.dataConn.open) item.dataConn.send({ type: "screen-share-state", name: myNameRef.current, active: true });
        });

        screenStream.getVideoTracks()[0].onended = () => { revertToCamera(); };
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    } else {
      revertToCamera();
    }
  }, [screenSharing, revertToCamera, addSystemMsg, wireIceOptimizations]);

  // ─── Heartbeat Keepalive Interval ──────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Keep WebRTC data connections warm (prevents NAT timeout) and broadcast host timer sync
      connectionsRef.current.forEach((connItem) => {
        if (connItem.dataConn && connItem.dataConn.open) {
          try {
            connItem.dataConn.send({ type: "ping" });
            if (isHostRef.current) {
              connItem.dataConn.send({ type: "timer-sync", seconds: timerSecondsRef.current });
            }
          } catch (_) {}
        }
        if (connItem.rtDataConn && connItem.rtDataConn.open) {
          try {
            connItem.rtDataConn.send({ type: "ping" });
          } catch (_) {}
        }
      });

      // 2. Keep PeerJS Signaling WebSocket alive and auto-reconnect if dropped
      if (peerRef.current) {
        if (peerRef.current.disconnected) {
          console.warn("PeerJS signaling disconnected. Reconnecting...");
          try {
            peerRef.current.reconnect();
          } catch (_) {}
        } else if ((peerRef.current as any).socket && !(peerRef.current as any).socket.closed) {
          try {
            (peerRef.current as any).socket.send({ type: "HEARTBEAT" });
          } catch (_) {}
        }
      }
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    myName,
    friendName: participants.map(p => p.name).join(", ") || "Friend",
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
    remoteScreenSharing: participants.some(p => p.screenSharing),
    remoteScreenStream: participants.find(p => p.screenSharing)?.screenStream || null,
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
    modal,
    leaveRoom: () => {
      setModal({
        title: "Leave Watch Party?",
        message: isHostRef.current
          ? "Are you sure you want to end the watch party? This will disconnect all participants."
          : "Are you sure you want to leave the watch party?",
        confirmText: isHostRef.current ? "End Party" : "Leave Party",
        cancelText: "Cancel",
        onConfirm: () => {
          cleanup();
          setModal(null);
        },
        onCancel: () => setModal(null)
      });
    },
  };
}
