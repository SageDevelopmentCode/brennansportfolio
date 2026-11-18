"use client";

import { createClient } from "@/lib/supabase/client";
import {
  HILLRUSH_GAME,
  HILLRUSH_PAGE,
  type HillRushMode,
  type HillRushOption,
  type HillRushPlayer,
  type HillRushRoom,
  type HillRushSnapshot,
  createHillRushRoom,
  ensureHillRushAuth,
  hillRushChannelTopic,
  hillRushDistance,
  hillRushError,
  hillRushForfeit,
  hillRushOut,
  hillRushSnapshot,
  hillRushTag,
  joinHillRushRoom,
  leaveHillRushRoom,
  loadHillRushNick,
  reopenHillRushRoom,
  saveHillRushNick,
  setHillRushRole,
  setHillRushRoom,
  setHillRushVehicle,
  startHillRushRoom,
} from "@/lib/hillrush-multiplayer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phase = "closed" | "gate" | "lobby" | "countdown" | "racing" | "results";

type Pose = {
  x: number;
  y: number;
  a: number;
  alive: boolean;
  dist: number;
};

type ChatLine = { id: number; nickname: string; text: string };

function cleanChatText(value: string, max: number) {
  return value.replace(/[\u0000-\u001F]/g, "").trim().slice(0, max);
}

const EMPTY_CATALOG = {
  vehicles: [{ id: "jeep", name: "Jeep" }] as HillRushOption[],
  stages: [{ id: "countryside", name: "Countryside" }] as HillRushOption[],
};

function postToGame(iframe: HTMLIFrameElement | null, payload: Record<string, unknown>) {
  iframe?.contentWindow?.postMessage(
    { source: HILLRUSH_PAGE, ...payload },
    window.location.origin,
  );
}

function winnerLine(room: HillRushRoom, players: HillRushPlayer[]) {
  const winner = players.find((player) => player.userId === room.winnerId);
  const name = winner?.nickname ?? "Nobody";
  if (room.mode === "chase") {
    const runnersStillGoing = players.filter(
      (player) => player.role === "runner" && player.alive,
    ).length;
    if (winner?.role === "hunter") return `${name} caught everyone`;
    if (runnersStillGoing > 1) return "The runners got away";
    return `${name} got away`;
  }
  return `${name} lasted the longest`;
}

export function HillRushMultiplayer() {
  const supabase = useMemo(() => createClient(), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const roomRef = useRef<HillRushRoom | null>(null);
  const playersRef = useRef<HillRushPlayer[]>([]);
  const userIdRef = useRef<string | null>(null);
  const nickRef = useRef("");
  const posesRef = useRef<Record<string, Pose>>({});
  const phaseRef = useRef<Phase>("closed");
  const startedRef = useRef(false);
  const droveRef = useRef(false);
  const outSentRef = useRef(false);
  const tagsRef = useRef(new Set<string>());
  const forfeitedRef = useRef(new Set<string>());
  const missingSinceRef = useRef<Record<string, number>>({});
  const presenceRef = useRef(new Set<string>());
  const lastDistRef = useRef(0);
  const aliveRef = useRef(true);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatSeq = useRef(0);

  const [phase, setPhase] = useState<Phase>("closed");
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<HillRushMode>("survive");
  const [stageId, setStageId] = useState("countryside");
  const [vehicleId, setVehicleId] = useState("jeep");
  const [catalog, setCatalog] = useState(EMPTY_CATALOG);
  const [room, setRoom] = useState<HillRushRoom | null>(null);
  const [players, setPlayers] = useState<HillRushPlayer[]>([]);
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);
  useEffect(() => {
    nickRef.current = nickname;
  }, [nickname]);

  const pushPeers = useCallback(() => {
    const me = userIdRef.current;
    const current = roomRef.current;
    if (!me || !current) return;
    const peers = playersRef.current
      .filter((player) => player.userId !== me)
      .map((player) => {
        const pose = posesRef.current[player.userId];
        return {
          id: player.userId,
          nickname: player.nickname,
          color: player.color,
          vehicleId: player.vehicleId || "jeep",
          role: player.role,
          alive: player.alive && (pose ? pose.alive : true),
          seen: !!pose,
          x: pose?.x ?? 0,
          y: pose?.y ?? 2,
          a: pose?.a ?? 0,
        };
      });
    postToGame(iframeRef.current, { type: "peers", peers });
  }, []);

  const applySnapshot = useCallback(
    (snapshot: HillRushSnapshot) => {
      if (!snapshot.ok) {
        if (snapshot.code !== "not_member") setError(hillRushError(snapshot.code, snapshot.message));
        return;
      }
      if (!snapshot.room) return;
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setMode(snapshot.room.mode);
      setStageId(snapshot.room.stageId);
      roomRef.current = snapshot.room;
      playersRef.current = snapshot.players;
      const me = snapshot.players.find((player) => player.userId === userIdRef.current);
      if (me) {
        aliveRef.current = me.alive;
        if (me.vehicleId) setVehicleId(me.vehicleId);
      }

      if (snapshot.room.status === "racing" && !startedRef.current) {
        startedRef.current = true;
        setCount(3);
        setPhase("countdown");
      }
      if (snapshot.room.status === "done") {
        startedRef.current = false;
        droveRef.current = false;
        setPhase("results");
      }
      if (
        snapshot.room.status === "lobby" &&
        (phaseRef.current === "results" ||
          phaseRef.current === "racing" ||
          phaseRef.current === "countdown")
      ) {
        phaseRef.current = "lobby";
        startedRef.current = false;
        droveRef.current = false;
        outSentRef.current = false;
        tagsRef.current = new Set();
        setPhase("lobby");
        postToGame(iframeRef.current, { type: "stop" });
      }
      if (phaseRef.current === "racing" || phaseRef.current === "countdown") {
        pushPeers();
      }
    },
    [pushPeers],
  );

  const refresh = useCallback(async () => {
    const current = roomRef.current;
    if (!current) return;
    applySnapshot(await hillRushSnapshot(supabase, current.id));
  }, [applySnapshot, supabase]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const nick = loadHillRushNick();
    if (nick) setNickname(nick);
  }, []);

  const appendChat = useCallback((name: string, text: string) => {
    const clean = cleanChatText(text, 80);
    const nickname = cleanChatText(name, 16) || "Driver";
    if (!clean) return;
    setChat((lines) => [...lines.slice(-39), { id: ++chatSeq.current, nickname, text: clean }]);
  }, []);

  useEffect(() => {
    setChat([]);
    setDraft("");
  }, [room?.id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as {
        source?: string;
        type?: string;
        vehicles?: HillRushOption[];
        stages?: HillRushOption[];
        x?: number;
        y?: number;
        a?: number;
        alive?: boolean;
        dist?: number;
        reason?: string;
        targetId?: string;
      };
      if (!data || data.source !== HILLRUSH_GAME) return;

      if (data.type === "ready" || data.type === "catalog") {
        if (Array.isArray(data.vehicles) && data.vehicles.length) {
          setCatalog({
            vehicles: data.vehicles,
            stages: data.stages?.length ? data.stages : EMPTY_CATALOG.stages,
          });
        }
        return;
      }

      const current = roomRef.current;
      const me = userIdRef.current;
      if (!current || !me) return;

      if (data.type === "pose") {
        const dist = Math.max(0, Math.floor(Number(data.dist) || 0));
        lastDistRef.current = dist;
        const channel = channelRef.current;
        if (channel && (phaseRef.current === "racing" || phaseRef.current === "countdown")) {
          void channel.send({
            type: "broadcast",
            event: "pose",
            payload: {
              userId: me,
              x: Number(data.x) || 0,
              y: Number(data.y) || 0,
              a: Number(data.a) || 0,
              alive: data.alive !== false,
              dist,
            },
          });
        }
        return;
      }

      if (data.type === "out" && !outSentRef.current) {
        outSentRef.current = true;
        aliveRef.current = false;
        void hillRushOut(
          supabase,
          current.id,
          Number(data.dist) || lastDistRef.current,
          data.reason || "crash",
        ).then(applySnapshot);
        return;
      }

      if (data.type === "tag" && data.targetId && !tagsRef.current.has(data.targetId)) {
        tagsRef.current.add(data.targetId);
        const targetPose = posesRef.current[data.targetId];
        void hillRushTag(
          supabase,
          current.id,
          data.targetId,
          targetPose?.dist ?? 0,
        ).then(applySnapshot);
        void channelRef.current?.send({
          type: "broadcast",
          event: "tagged",
          payload: { targetId: data.targetId },
        });
        return;
      }

      if (data.type === "leave") {
        if (current.status === "racing" && aliveRef.current && !outSentRef.current) {
          outSentRef.current = true;
          aliveRef.current = false;
          void hillRushOut(
            supabase,
            current.id,
            lastDistRef.current,
            "left",
          ).then(applySnapshot);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [applySnapshot, supabase]);

  const roomId = room?.id;
  useEffect(() => {
    if (!roomId || !userId) return;
    let gone = false;
    const client = supabase;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: sessionData } = await client.auth.getSession();
      await client.realtime.setAuth(sessionData.session?.access_token ?? null);
      if (gone) return;
      channel = client.channel(hillRushChannelTopic(roomId), {
        config: {
          private: true,
          broadcast: { self: false },
          presence: { key: userId },
        },
      });
      channelRef.current = channel;
      channel
        .on("broadcast", { event: "pose" }, ({ payload }) => {
          const body = payload as Pose & { userId?: string };
          if (!body?.userId || body.userId === userIdRef.current) return;
          posesRef.current[body.userId] = {
            x: Number(body.x) || 0,
            y: Number(body.y) || 0,
            a: Number(body.a) || 0,
            alive: body.alive !== false,
            dist: Number(body.dist) || 0,
          };
          if (phaseRef.current === "racing" || phaseRef.current === "countdown") {
            pushPeers();
          }
        })
        .on("broadcast", { event: "start" }, () => {
          if (startedRef.current) return;
          startedRef.current = true;
          setCount(3);
          setPhase("countdown");
        })
        .on("broadcast", { event: "tagged" }, ({ payload }) => {
          const body = payload as { targetId?: string };
          if (body?.targetId && body.targetId === userIdRef.current) {
            postToGame(iframeRef.current, { type: "tagged" });
          }
        })
        .on("broadcast", { event: "chat" }, ({ payload }) => {
          const body = payload as { nickname?: string; text?: string };
          if (!body?.text) return;
          appendChat(body.nickname || "Driver", body.text);
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState() ?? {};
          presenceRef.current = new Set(Object.keys(state));
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "hillrush_players",
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            void refreshRef.current();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hillrush_rooms",
            filter: `id=eq.${roomId}`,
          },
          () => {
            void refreshRef.current();
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel?.track({ nickname: nickRef.current || "Driver" });
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setError("Could not connect to the room. Check that the Hill Rush migration is applied.");
          }
        });
    })();

    return () => {
      gone = true;
      channelRef.current = null;
      if (channel) void client.removeChannel(channel);
    };
  }, [appendChat, pushPeers, roomId, supabase, userId]);

  useEffect(() => {
    if (phase !== "lobby" && phase !== "countdown" && phase !== "racing" && phase !== "results") return;
    const timer = window.setInterval(() => {
      void refreshRef.current();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      const current = roomRef.current;
      const me = playersRef.current.find((player) => player.userId === userIdRef.current);
      if (current && me && !droveRef.current) {
        droveRef.current = true;
        postToGame(iframeRef.current, {
          type: "start",
          stageId: current.stageId,
          vehicleId: me.vehicleId || "jeep",
          mode: current.mode,
          role: me.role,
          color: me.color,
          nickname: me.nickname,
        });
        iframeRef.current?.focus();
        iframeRef.current?.contentWindow?.focus();
      }
      setPhase("racing");
      return;
    }
    const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [count, phase]);

  useEffect(() => {
    if (phase !== "countdown" && phase !== "racing") return;
    const driveKeys = new Set([
      "ArrowRight",
      "ArrowLeft",
      "ArrowUp",
      "ArrowDown",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ]);
    const onKey = (event: KeyboardEvent) => {
      if (!driveKeys.has(event.code)) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      postToGame(iframeRef.current, {
        type: "key",
        code: event.code,
        down: event.type === "keydown",
        repeat: event.repeat,
      });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "racing") return;
    const timer = window.setInterval(() => {
      const current = roomRef.current;
      if (!current || !aliveRef.current) return;
      void hillRushDistance(supabase, current.id, lastDistRef.current);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [phase, supabase]);

  useEffect(() => {
    if (phase !== "racing" || !room || !userId) return;
    const timer = window.setInterval(() => {
      const current = roomRef.current;
      if (!current || current.status !== "racing") return;
      if (!presenceRef.current.has(userId)) return;
      const now = Date.now();
      const present = presenceRef.current;
      for (const player of playersRef.current) {
        if (!player.alive || player.userId === userId) continue;
        const hostMissing = player.userId === current.hostId;
        const guestMissing = userId === current.hostId && player.userId !== current.hostId;
        if (!hostMissing && !guestMissing) continue;
        if (present.has(player.userId)) {
          delete missingSinceRef.current[player.userId];
          continue;
        }
        const since = missingSinceRef.current[player.userId] ?? now;
        missingSinceRef.current[player.userId] = since;
        if (now - since < 5000 || forfeitedRef.current.has(player.userId)) continue;
        forfeitedRef.current.add(player.userId);
        void hillRushForfeit(supabase, current.id, player.userId).then(applySnapshot);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [applySnapshot, phase, room, supabase, userId]);

  const openLobby = async () => {
    setError(null);
    setPhase("gate");
    setBusy(true);
    try {
      const id = await ensureHillRushAuth(supabase);
      setUserId(id);
      const { data: sessionData } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(sessionData.session?.access_token ?? null);
      setPhase("gate");
      postToGame(iframeRef.current, { type: "catalog-request" });
    } catch (err) {
      setError(err instanceof Error ? err.message : hillRushError("unknown"));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    const nick = nickname.trim();
    if (!nick) {
      setError(hillRushError("invalid_nickname"));
      return;
    }
    setBusy(true);
    setError(null);
    saveHillRushNick(nick);
    const snapshot = await createHillRushRoom(supabase, nick, mode, stageId, vehicleId);
    setBusy(false);
    if (!snapshot.ok || !snapshot.room) {
      setError(hillRushError(snapshot.ok ? "unknown" : snapshot.code, snapshot.ok ? undefined : snapshot.message));
      return;
    }
    startedRef.current = false;
    droveRef.current = false;
    outSentRef.current = false;
    tagsRef.current = new Set();
    forfeitedRef.current = new Set();
    posesRef.current = {};
    aliveRef.current = true;
    applySnapshot(snapshot);
    setPhase("lobby");
  };

  const onJoin = async () => {
    const nick = nickname.trim();
    if (!nick) {
      setError(hillRushError("invalid_nickname"));
      return;
    }
    setBusy(true);
    setError(null);
    saveHillRushNick(nick);
    const snapshot = await joinHillRushRoom(supabase, joinCode, nick, vehicleId);
    setBusy(false);
    if (!snapshot.ok || !snapshot.room) {
      setError(hillRushError(snapshot.ok ? "unknown" : snapshot.code, snapshot.ok ? undefined : snapshot.message));
      return;
    }
    startedRef.current = false;
    droveRef.current = false;
    outSentRef.current = false;
    tagsRef.current = new Set();
    forfeitedRef.current = new Set();
    posesRef.current = {};
    aliveRef.current = true;
    applySnapshot(snapshot);
    setPhase("lobby");
  };

  const onHostChange = async (nextMode: HillRushMode, nextStage: string) => {
    setMode(nextMode);
    setStageId(nextStage);
    if (!room || room.hostId !== userId || room.status !== "lobby") return;
    const snapshot = await setHillRushRoom(
      supabase,
      room.id,
      nextMode,
      nextStage,
      room.vehicleId,
    );
    if (!snapshot.ok) setError(hillRushError(snapshot.code, snapshot.message));
    else applySnapshot(snapshot);
  };

  const onCarChange = async (nextVehicle: string) => {
    setVehicleId(nextVehicle);
    if (!room || room.status !== "lobby") return;
    const snapshot = await setHillRushVehicle(supabase, room.id, nextVehicle);
    if (!snapshot.ok) setError(hillRushError(snapshot.code, snapshot.message));
    else applySnapshot(snapshot);
  };

  const sendChat = () => {
    const text = cleanChatText(draft, 80);
    if (!text) return;
    const name = nickRef.current.trim() || "Driver";
    appendChat(name, text);
    setDraft("");
    void channelRef.current?.send({
      type: "broadcast",
      event: "chat",
      payload: { nickname: name, text },
    });
  };

  const onReopen = async () => {
    if (!room) return;
    setBusy(true);
    setError(null);
    const snapshot = await reopenHillRushRoom(supabase, room.id);
    setBusy(false);
    if (!snapshot.ok) setError(hillRushError(snapshot.code, snapshot.message));
    else applySnapshot(snapshot);
  };

  const onRoleChange = async (role: "hunter" | "runner") => {
    if (!room || room.status !== "lobby") return;
    const snapshot = await setHillRushRole(supabase, room.id, role);
    if (!snapshot.ok) setError(hillRushError(snapshot.code, snapshot.message));
    else applySnapshot(snapshot);
  };

  const onStart = async () => {
    if (!room) return;
    setBusy(true);
    setError(null);
    startedRef.current = false;
    droveRef.current = false;
    outSentRef.current = false;
    tagsRef.current = new Set();
    posesRef.current = {};
    aliveRef.current = true;
    const snapshot = await startHillRushRoom(supabase, room.id);
    setBusy(false);
    if (!snapshot.ok) {
      setError(hillRushError(snapshot.code, snapshot.message));
      return;
    }
    applySnapshot(snapshot);
    void channelRef.current?.send({
      type: "broadcast",
      event: "start",
      payload: { roomId: room.id },
    });
  };

  const closeOverlay = async () => {
    const current = roomRef.current;
    if (current && phase !== "gate") {
      await leaveHillRushRoom(supabase, current.id);
    }
    postToGame(iframeRef.current, { type: "stop" });
    startedRef.current = false;
    droveRef.current = false;
    setChat([]);
    setDraft("");
    setRoom(null);
    setPlayers([]);
    setPhase("closed");
    setError(null);
  };

  const isHost = !!room && room.hostId === userId;
  const hunters = players.filter((player) => player.role === "hunter").length;
  const runners = players.filter((player) => player.role === "runner").length;
  const chaseReady = !room || room.mode !== "chase" || (hunters > 0 && runners > 0);
  const stageName =
    catalog.stages.find((stage) => stage.id === (room?.stageId ?? stageId))?.name ??
    room?.stageId ??
    stageId;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        src="/hillrush/index.html"
        title="Brennan's Hill Rush"
        tabIndex={0}
        className="fixed inset-0 h-full w-full border-0"
        allow="autoplay"
        onLoad={() => postToGame(iframeRef.current, { type: "catalog-request" })}
      />

      {phase === "closed" ? (
        <button
          type="button"
          onClick={() => void openLobby()}
          disabled={busy}
          className="fixed left-4 top-4 z-30 rounded-2xl border-[3px] border-[#1b5e22] bg-gradient-to-b from-[#7ee36a] to-[#2e9a3a] px-4 py-2 text-lg font-bold text-white shadow-[0_5px_0_#1b5e22]"
        >
          Multiplayer
        </button>
      ) : null}

      {phase === "racing" ? (
        <>
        <div className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-[#3d2a12]/80 px-3 py-2 text-sm font-bold text-white">
            {players.map((player) => (
              <span key={player.userId} className={player.alive ? "" : "opacity-45"}>
                <i
                  className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: player.color }}
                />
                {player.nickname}
                {player.alive ? "" : " out"}
              </span>
            ))}
            <button
              type="button"
              onClick={() => void closeOverlay()}
              className="ml-2 rounded-full bg-white/20 px-3 py-1"
            >
              Leave
            </button>
          </div>
        </div>
        <div className="fixed bottom-3 left-3 z-30">
          <ChatBox lines={chat} draft={draft} onDraft={setDraft} onSend={sendChat} compact />
        </div>
        </>
      ) : null}

      {phase === "gate" || phase === "lobby" || phase === "countdown" || phase === "results" ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0a1e32]/55 p-4">
          <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-3xl border-[5px] border-[#7a4e1d] bg-gradient-to-b from-[#fff8e1] to-[#ffe0a3] px-6 py-5 text-center text-[#3d2a12] shadow-[0_12px_0_#5a3812]">
            {phase === "countdown" ? (
              <>
                <p className="text-sm font-bold text-[#7a4e1d]">Get ready</p>
                <p className="my-4 text-7xl font-bold text-[#e8521a]">{count > 0 ? count : "Go"}</p>
                <p className="text-sm text-[#7a4e1d]">
                  {room?.mode === "chase"
                    ? `Chase on ${stageName}. Runners go first. The chaser waits 2 seconds.`
                    : `Last alive on ${stageName}`}
                </p>
                <ChatBox lines={chat} draft={draft} onDraft={setDraft} onSend={sendChat} />
              </>
            ) : null}

            {phase === "results" && room ? (
              <>
                <p className="text-sm font-bold text-[#7a4e1d]">Room {room.code}</p>
                <h2 className="text-3xl font-bold text-[#c0391b]">Finish</h2>
                <p className="mt-2 text-lg font-bold">{winnerLine(room, players)}</p>
                <ul className="mt-4 space-y-2 text-left">
                  {[...players]
                    .sort((a, b) => b.distance - a.distance)
                    .map((player) => (
                      <li
                        key={player.userId}
                        className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2"
                      >
                        <span>
                          <i
                            className="mr-2 inline-block h-3 w-3 rounded-full"
                            style={{ background: player.color }}
                          />
                          {player.nickname}
                          {player.userId === room.winnerId ? " · winner" : ""}
                          {player.role === "hunter" ? " · chaser" : ""}
                        </span>
                        <b>{player.distance} m</b>
                      </li>
                    ))}
                </ul>
                <ChatBox lines={chat} draft={draft} onDraft={setDraft} onSend={sendChat} />
                {isHost ? (
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={busy || players.length < 2 || !chaseReady}
                    onClick={() => void onStart()}
                  >
                    Play again
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-[#7a4e1d]">Waiting in the room.</p>
                )}
                <button type="button" className={secondaryBtn} disabled={busy} onClick={() => void onReopen()}>
                  Back to room
                </button>
                <button type="button" className={secondaryBtn} onClick={() => void closeOverlay()}>
                  Leave
                </button>
              </>
            ) : null}

            {phase === "gate" ? (
              <>
                <h2 className="text-3xl font-bold text-[#e8521a]">Multiplayer</h2>
                <p className="mt-1 text-sm text-[#7a4e1d]">
                  Same hill, your own car. Last driver moving wins, or one hunter gives chase.
                </p>
                <label className="mt-4 block text-left text-sm font-bold">
                  Your name
                  <input
                    value={nickname}
                    maxLength={16}
                    onChange={(event) => setNickname(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={mode === "survive" ? primaryBtn : secondaryBtn}
                    onClick={() => setMode("survive")}
                  >
                    Last alive
                  </button>
                  <button
                    type="button"
                    className={mode === "chase" ? primaryBtn : secondaryBtn}
                    onClick={() => setMode("chase")}
                  >
                    Chase
                  </button>
                </div>
                <label className="mt-3 block text-left text-sm font-bold">
                  Hill
                  <select
                    value={stageId}
                    onChange={(event) => setStageId(event.target.value)}
                    className={fieldClass}
                  >
                    {catalog.stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-left text-sm font-bold">
                  Car
                  <select
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    className={fieldClass}
                  >
                    {catalog.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-[#7a4e1d]">
                  You pick your own car. No garage upgrades. Cars do not bump. In chase, anyone can be the chaser. Runners get a 2 second head start.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" className={primaryBtn} disabled={busy} onClick={() => void onCreate()}>
                    Create room
                  </button>
                  <label className="text-left text-sm font-bold">
                    Room code
                    <input
                      value={joinCode}
                      maxLength={4}
                      autoCapitalize="characters"
                      onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                      className={fieldClass}
                      placeholder="K7QM"
                    />
                  </label>
                  <button type="button" className={secondaryBtn} disabled={busy} onClick={() => void onJoin()}>
                    Join room
                  </button>
                  <button type="button" className={secondaryBtn} onClick={() => void closeOverlay()}>
                    Back
                  </button>
                </div>
              </>
            ) : null}

            {phase === "lobby" && room ? (
              <>
                <p className="text-sm font-bold text-[#7a4e1d]">Room code</p>
                <p className="text-5xl font-bold tracking-[0.2em] text-[#e8521a]">{room.code}</p>
                {room.winnerId ? (
                  <p className="mt-2 text-sm font-bold text-[#c0391b]">
                    Last race: {winnerLine(room, players)}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-[#7a4e1d]">
                  {players.length} / 4 drivers
                </p>
                {isHost ? (
                  <div className="mt-3 text-left">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={room.mode === "survive" ? primaryBtn : secondaryBtn}
                        onClick={() => void onHostChange("survive", room.stageId)}
                      >
                        Last alive
                      </button>
                      <button
                        type="button"
                        className={room.mode === "chase" ? primaryBtn : secondaryBtn}
                        onClick={() => void onHostChange("chase", room.stageId)}
                      >
                        Chase
                      </button>
                    </div>
                    <label className="mt-3 block text-sm font-bold">
                      Hill
                      <select
                        value={room.stageId}
                        onChange={(event) => void onHostChange(room.mode, event.target.value)}
                        className={fieldClass}
                      >
                        {catalog.stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#7a4e1d]">
                    {room.mode === "chase" ? "Chase" : "Last alive"} on {stageName}. Waiting for the host.
                  </p>
                )}
                <label className="mt-3 block text-left text-sm font-bold">
                  Your car
                  <select
                    value={vehicleId}
                    onChange={(event) => void onCarChange(event.target.value)}
                    className={fieldClass}
                  >
                    {catalog.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </label>
                {room.mode === "chase" ? (
                  <button
                    type="button"
                    className={
                      players.find((player) => player.userId === userId)?.role === "hunter"
                        ? primaryBtn
                        : secondaryBtn
                    }
                    onClick={() =>
                      void onRoleChange(
                        players.find((player) => player.userId === userId)?.role === "hunter"
                          ? "runner"
                          : "hunter",
                      )
                    }
                  >
                    {players.find((player) => player.userId === userId)?.role === "hunter"
                      ? "I'm the chaser"
                      : "I'm running"}
                  </button>
                ) : null}
                <ul className="mt-4 space-y-2 text-left">
                  {players.map((player) => (
                    <li key={player.userId} className="rounded-xl bg-white/70 px-3 py-2 font-bold">
                      <i
                        className="mr-2 inline-block h-3 w-3 rounded-full"
                        style={{ background: player.color }}
                      />
                      {player.nickname}
                      {player.userId === room.hostId ? " · host" : ""}
                      {room.mode === "chase"
                        ? player.role === "hunter"
                          ? " · chaser"
                          : " · runner"
                        : ""}
                      {" · "}
                      {catalog.vehicles.find((vehicle) => vehicle.id === player.vehicleId)?.name ??
                        player.vehicleId}
                    </li>
                  ))}
                </ul>
                <ChatBox lines={chat} draft={draft} onDraft={setDraft} onSend={sendChat} />
                {isHost ? (
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={busy || players.length < 2 || !chaseReady}
                    onClick={() => void onStart()}
                  >
                    Start
                  </button>
                ) : null}
                {room.mode === "chase" && !chaseReady ? (
                  <p className="mt-2 text-sm text-[#7a4e1d]">
                    Pick a chaser and someone to run.
                  </p>
                ) : null}
                <button type="button" className={secondaryBtn} onClick={() => void closeOverlay()}>
                  Leave room
                </button>
              </>
            ) : null}

            {error ? <p className="mt-3 text-sm font-bold text-[#c0391b]">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

const fieldClass =
  "mt-1 w-full rounded-xl border-[3px] border-[#7a4e1d] bg-white px-3 py-2 text-base font-bold text-[#3d2a12]";
const primaryBtn =
  "mt-3 w-full rounded-2xl border-[3px] border-[#1b5e22] bg-gradient-to-b from-[#7ee36a] to-[#2e9a3a] px-4 py-3 text-lg font-bold text-white shadow-[0_5px_0_#1b5e22] disabled:opacity-50";
const secondaryBtn =
  "mt-2 w-full rounded-2xl border-[3px] border-[#8a6300] bg-gradient-to-b from-[#ffe08a] to-[#f0b429] px-4 py-3 text-lg font-bold text-[#3d2a12] shadow-[0_5px_0_#8a6300]";

function ChatBox({
  lines,
  draft,
  onDraft,
  onSend,
  compact,
}: {
  lines: ChatLine[];
  draft: string;
  onDraft: (value: string) => void;
  onSend: () => void;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      className={
        compact
          ? "pointer-events-auto w-64 rounded-2xl bg-[#3d2a12]/85 p-2 text-left text-white"
          : "mt-4 text-left"
      }
    >
      <ul
        className={
          compact
            ? "mb-1 max-h-20 space-y-0.5 overflow-y-auto text-xs"
            : "mb-2 max-h-28 space-y-1 overflow-y-auto rounded-xl bg-white/70 px-3 py-2 text-sm"
        }
      >
        {lines.length === 0 ? (
          <li className={compact ? "text-white/70" : "text-[#7a4e1d]"}>Say something</li>
        ) : (
          lines.slice(-8).map((line) => (
            <li key={line.id}>
              <b>{line.nickname}:</b> {line.text}
            </li>
          ))
        )}
      </ul>
      <input
        value={draft}
        maxLength={80}
        onChange={(event) => onDraft(event.target.value)}
        placeholder="Message"
        className={
          compact
            ? "w-full rounded-lg bg-white/90 px-2 py-1 text-sm text-[#3d2a12]"
            : fieldClass
        }
      />
    </form>
  );
}
