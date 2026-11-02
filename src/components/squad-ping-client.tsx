"use client";

import {
  createSquadBase,
  ensureSquadAuth,
  fetchMyWallpaper,
  fetchSquadBase,
  fetchSquadMembers,
  fetchSquadMessages,
  fetchSquadProfileFromDb,
  fetchSquadReactions,
  formatJoinCodeInput,
  formatSquadTimestamp,
  joinSquadBase,
  listMySquadChats,
  loadSquadProfile,
  saveLastBaseId,
  saveSquadProfile,
  sendSquadImageMessage,
  sendSquadMessage,
  setSquadWallpaper,
  shouldShowTimestamp,
  squadInitials,
  SQUAD_AVATARS,
  SQUAD_BLASTS,
  SQUAD_TAPBACKS,
  toggleSquadReaction,
  updateSquadProfileRemote,
  uploadSquadImage,
  type SquadBase,
  type SquadInboxChat,
  type SquadMessage,
  type SquadProfile,
  type SquadReaction,
} from "@/lib/squad";
import { createClient } from "@/lib/supabase/client";
import { playKeyClick, resumeAudio } from "@/lib/typing-sounds";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type Phase = "loading" | "inbox" | "lobby" | "chat";

type BubblePosition = "single" | "first" | "middle" | "last";

type PresencePeer = {
  userId: string;
  callSign: string;
  avatar: string;
  photoUrl: string | null;
};

function defaultProfile(): SquadProfile {
  return { callSign: "", avatar: SQUAD_AVATARS[0], photoUrl: null };
}

function getBubblePositions(messages: SquadMessage[]): BubblePosition[] {
  return messages.map((msg, index) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const samePrev = prev?.userId === msg.userId;
    const sameNext = next?.userId === msg.userId;
    if (!samePrev && !sameNext) return "single";
    if (!samePrev && sameNext) return "first";
    if (samePrev && sameNext) return "middle";
    return "last";
  });
}

function bubbleClass(mine: boolean, position: BubblePosition): string {
  const base = mine ? "squad-bubble squad-bubble-sent" : "squad-bubble squad-bubble-received";
  return `${base} squad-bubble-${position}`;
}

function SquadAvatar({
  callSign,
  avatar,
  photoUrl,
  large,
}: {
  callSign: string;
  avatar: string;
  photoUrl: string | null;
  large?: boolean;
}) {
  return (
    <div
      className={`squad-avatar-circle ${large ? "squad-avatar-circle-lg" : ""}`}
      title={callSign}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" />
      ) : (
        <span aria-hidden>{avatar || squadInitials(callSign)}</span>
      )}
    </div>
  );
}

export function SquadPingClient() {
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [profile, setProfile] = useState<SquadProfile>(defaultProfile);
  const [base, setBase] = useState<SquadBase | null>(null);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [reactions, setReactions] = useState<SquadReaction[]>([]);
  const [presence, setPresence] = useState<PresencePeer[]>([]);
  const [inboxChats, setInboxChats] = useState<SquadInboxChat[]>([]);
  const [members, setMembers] = useState<PresencePeer[]>([]);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [baseName, setBaseName] = useState("");
  const [lobbyMode, setLobbyMode] = useState<"create" | "join">("create");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [tapbackMessageId, setTapbackMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const messagePhotoRef = useRef<HTMLInputElement>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const bubblePositions = useMemo(() => getBubblePositions(messages), [messages]);

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, SquadReaction[]>();
    for (const reaction of reactions) {
      const list = map.get(reaction.messageId) ?? [];
      list.push(reaction);
      map.set(reaction.messageId, list);
    }
    return map;
  }, [reactions]);

  const presenceLine = useMemo(() => {
    if (presence.length === 0) return "Just you";
    return presence
      .map((p) => (p.userId === userId ? `${p.callSign} (You)` : p.callSign))
      .join(", ");
  }, [presence, userId]);

  const refreshInbox = useCallback(async () => {
    const chats = await listMySquadChats(supabase);
    setInboxChats(chats);
  }, [supabase]);

  const loadReactions = useCallback(
    async (baseId: string) => {
      const rows = await fetchSquadReactions(supabase, baseId);
      setReactions(rows);
    },
    [supabase],
  );

  const enterBase = useCallback(
    async (nextBase: SquadBase) => {
      saveLastBaseId(nextBase.id);
      const [rows, wall, roster] = await Promise.all([
        fetchSquadMessages(supabase, nextBase.id),
        fetchMyWallpaper(supabase, nextBase.id),
        fetchSquadMembers(supabase, nextBase.id),
      ]);
      setBase(nextBase);
      setMessages(rows);
      setWallpaperUrl(wall);
      setMembers(
        roster.map((m) => ({
          userId: m.userId,
          callSign: m.callSign,
          avatar: m.avatar,
          photoUrl: m.photoUrl,
        })),
      );
      await loadReactions(nextBase.id);
      setPhase("chat");
      setError(null);
      setGroupInfoOpen(false);
    },
    [loadReactions, supabase],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const uid = await ensureSquadAuth(supabase);
        if (cancelled) return;
        setUserId(uid);

        const stored = loadSquadProfile();
        const fromDb = await fetchSquadProfileFromDb(supabase, uid);
        const nextProfile = fromDb ?? stored ?? defaultProfile();
        setProfile(nextProfile);
        saveSquadProfile(nextProfile);

        const chats = await listMySquadChats(supabase);
        if (!cancelled) {
          setInboxChats(chats);
          setPhase("inbox");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not connect. Turn on Anonymous sign-ins in Supabase Auth.",
          );
          setPhase("inbox");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (phase !== "chat" || !base?.id || !userId) return;

    const channel = supabase
      .channel(`squad-msgs-${base.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "squad_messages",
          filter: `base_id=eq.${base.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            base_id: string;
            user_id: string;
            call_sign: string;
            avatar: string;
            body: string;
            kind: string;
            photo_url: string | null;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                baseId: row.base_id,
                userId: row.user_id,
                callSign: row.call_sign,
                avatar: row.avatar,
                photoUrl: null,
                body: row.body,
                kind: row.kind === "image" ? "image" : "text",
                messagePhotoUrl: row.photo_url,
                createdAt: row.created_at,
              },
            ];
          });
          if (row.user_id !== userId && !mutedRef.current) {
            void resumeAudio().then(() => playKeyClick());
          }
        },
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`squad-reactions-${base.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "squad_message_reactions" },
        () => {
          void loadReactions(base.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionChannel);
    };
  }, [base?.id, loadReactions, phase, supabase, userId]);

  useEffect(() => {
    if (phase !== "chat" || !base?.id || !userId || !profile.callSign) return;

    const presenceChannel = supabase.channel(`squad-presence-${base.id}`, {
      config: { presence: { key: userId } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as Record<
          string,
          Array<{ callSign?: string; avatar?: string; photoUrl?: string | null }>
        >;
        const peers: PresencePeer[] = [];
        for (const [key, metas] of Object.entries(state)) {
          const meta = metas[0];
          peers.push({
            userId: key,
            callSign: meta?.callSign ?? "Agent",
            avatar: meta?.avatar ?? "👾",
            photoUrl: meta?.photoUrl ?? null,
          });
        }
        peers.sort((a, b) => a.callSign.localeCompare(b.callSign));
        setPresence(peers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            callSign: profile.callSign,
            avatar: profile.avatar,
            photoUrl: profile.photoUrl,
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [
    base?.id,
    phase,
    profile.avatar,
    profile.callSign,
    profile.photoUrl,
    supabase,
    userId,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!infoOpen) return;
    const close = () => setInfoOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [infoOpen]);

  const updateProfile = (patch: Partial<SquadProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveSquadProfile(next);
      return next;
    });
  };

  const profileReady = profile.callSign.trim().length >= 2;
  const canSend = draft.trim().length > 0;

  const persistProfile = async (next: SquadProfile) => {
    updateProfile(next);
    await updateSquadProfileRemote(supabase, next);
    if (base) {
      const roster = await fetchSquadMembers(supabase, base.id);
      setMembers(
        roster.map((m) => ({
          userId: m.userId,
          callSign: m.callSign,
          avatar: m.avatar,
          photoUrl: m.photoUrl,
        })),
      );
    }
  };

  const handleProfilePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId || !profileReady) return;
    setBusy(true);
    const url = await uploadSquadImage(
      supabase,
      userId,
      "photos/avatar.webp",
      file,
    );
    setBusy(false);
    if (!url) {
      setError("Could not upload photo.");
      return;
    }
    const next = { ...profile, photoUrl: url };
    await persistProfile(next);
  };

  const handleWallpaper = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId || !base) return;
    setBusy(true);
    const url = await uploadSquadImage(
      supabase,
      userId,
      `photos/wallpaper-${base.id}.webp`,
      file,
    );
    if (url) {
      await setSquadWallpaper(supabase, base.id, url);
      setWallpaperUrl(url);
    }
    setBusy(false);
  };

  const handleMessagePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId || !base || !profileReady) return;
    setBusy(true);
    const path = `messages/${base.id}/${crypto.randomUUID()}.webp`;
    const url = await uploadSquadImage(supabase, userId, path, file);
    if (url) {
      await sendSquadImageMessage(supabase, base.id, profile, url);
    }
    setBusy(false);
  };

  const handleCreate = async () => {
    setError(null);
    if (!profileReady) {
      setError("Pick a call sign with at least 2 characters.");
      return;
    }
    const name = baseName.trim();
    if (!name) {
      setError("Enter a group name.");
      return;
    }
    setBusy(true);
    await resumeAudio();
    await updateSquadProfileRemote(supabase, profile);
    const result = await createSquadBase(supabase, name, profile);
    setBusy(false);
    if (!result.ok) {
      setError("Could not create the chat. Try again.");
      return;
    }
    if (!muted) playKeyClick();
    await refreshInbox();
    await enterBase(result.base);
  };

  const handleJoin = async () => {
    setError(null);
    if (!profileReady) {
      setError("Pick a call sign with at least 2 characters.");
      return;
    }
    const code = formatJoinCodeInput(joinCode);
    if (!code.includes("-")) {
      setError("Enter the full code, like SHARK-7KQM.");
      return;
    }
    setBusy(true);
    await resumeAudio();
    await updateSquadProfileRemote(supabase, profile);
    const result = await joinSquadBase(supabase, code, profile);
    setBusy(false);
    if (!result.ok) {
      if (result.code === "not_found") {
        setError("No chat with that code. Check with your friend.");
      } else if (result.code === "invalid_code") {
        setError("That code format looks wrong. Example: SHARK-7KQM.");
      } else {
        setError("Could not join. Try again.");
      }
      return;
    }
    if (!muted) playKeyClick();
    await refreshInbox();
    await enterBase(result.base);
  };

  const handleSend = async (text: string) => {
    if (!base || !profileReady) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setDraft("");
    if (!muted) {
      await resumeAudio();
      playKeyClick();
    }
    const result = await sendSquadMessage(supabase, base.id, profile, trimmed);
    if (!result.ok) setError("Message did not send.");
  };

  const copyCode = async () => {
    if (!base) return;
    setInfoOpen(false);
    try {
      await navigator.clipboard.writeText(base.code);
      if (!muted) playKeyClick();
    } catch {
      setError("Could not copy code.");
    }
  };

  const copyMessage = async (body: string) => {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      setError("Could not copy message.");
    }
  };

  const leaveToInbox = async () => {
    setInfoOpen(false);
    setBase(null);
    setMessages([]);
    setPresence([]);
    setTapbackMessageId(null);
    await refreshInbox();
    setPhase("inbox");
  };

  const openChat = async (chat: SquadInboxChat) => {
    const row = await fetchSquadBase(supabase, chat.baseId);
    if (row) await enterBase(row);
  };

  if (phase === "loading") {
    return <p className="squad-loading">Loading…</p>;
  }

  if (phase === "inbox") {
    return (
      <>
        <header className="squad-nav">
          <Link href="/" className="squad-nav-back">
            <span className="squad-nav-back-chevron" aria-hidden>
              ‹
            </span>
            Projects
          </Link>
          <div className="squad-nav-center">
            <p className="squad-nav-title">Messages</p>
          </div>
          <div />
        </header>
        <div className="squad-inbox-list">
          {inboxChats.length === 0 ? (
            <p className="p-8 text-center text-[var(--squad-label)]">
              No chats yet. Tap compose to start one.
            </p>
          ) : (
            inboxChats.map((chat) => (
              <button
                key={chat.baseId}
                type="button"
                className="squad-inbox-row"
                onClick={() => void openChat(chat)}
              >
                <SquadAvatar
                  callSign={chat.name}
                  avatar="💬"
                  photoUrl={null}
                />
                <div className="squad-inbox-meta">
                  <p className="squad-inbox-title">{chat.name}</p>
                  <p className="squad-inbox-preview">{chat.preview}</p>
                </div>
                {chat.lastAt && (
                  <span className="squad-inbox-time">
                    {new Date(chat.lastAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        {error && <p className="squad-error px-4">{error}</p>}
        <button
          type="button"
          className="squad-inbox-compose"
          aria-label="New message"
          onClick={() => {
            setError(null);
            setPhase("lobby");
          }}
        >
          ✎
        </button>
      </>
    );
  }

  if (phase === "lobby") {
    return (
      <>
        <header className="squad-nav">
          <button type="button" className="squad-nav-back" onClick={() => void leaveToInbox()}>
            <span className="squad-nav-back-chevron" aria-hidden>
              ‹
            </span>
            Messages
          </button>
          <div className="squad-nav-center">
            <p className="squad-nav-title">New Message</p>
          </div>
          <div />
        </header>

        <div className="squad-lobby-scroll">
          <div className="flex flex-col items-center gap-3 py-4">
            <SquadAvatar
              callSign={profile.callSign || "You"}
              avatar={profile.avatar}
              photoUrl={profile.photoUrl}
              large
            />
            <button
              type="button"
              className="text-sm font-medium text-[var(--squad-link)]"
              onClick={() => profilePhotoRef.current?.click()}
            >
              Set profile photo
            </button>
            <input
              ref={profilePhotoRef}
              type="file"
              accept="image/*"
              className="squad-hidden-input"
              onChange={(e) => void handleProfilePhoto(e)}
            />
          </div>

          <div className="squad-grouped-section">
            <div className="squad-grouped-row">
              <span className="squad-grouped-label">Call sign</span>
              <input
                className="squad-grouped-input"
                value={profile.callSign}
                onChange={(e) => updateProfile({ callSign: e.target.value })}
                placeholder="Nickname"
                maxLength={16}
              />
            </div>
          </div>

          <div className="squad-grouped-section">
            <p className="squad-grouped-label px-4 pt-3 pb-1">Emoji badge</p>
            <div className="squad-avatar-row">
              {SQUAD_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => updateProfile({ avatar: emoji })}
                  className={`squad-avatar-btn ${
                    profile.avatar === emoji ? "squad-avatar-btn-selected" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="squad-segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={lobbyMode === "create"}
              onClick={() => setLobbyMode("create")}
              className={`squad-segmented-btn ${
                lobbyMode === "create" ? "squad-segmented-btn-active" : ""
              }`}
            >
              New chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lobbyMode === "join"}
              onClick={() => setLobbyMode("join")}
              className={`squad-segmented-btn ${
                lobbyMode === "join" ? "squad-segmented-btn-active" : ""
              }`}
            >
              Join
            </button>
          </div>

          <div className="squad-grouped-section">
            {lobbyMode === "create" ? (
              <div className="squad-grouped-row">
                <span className="squad-grouped-label">Group name</span>
                <input
                  className="squad-grouped-input"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="Moon Base Alpha"
                  maxLength={40}
                />
              </div>
            ) : (
              <div className="squad-grouped-row">
                <span className="squad-grouped-label">Invite code</span>
                <input
                  className="squad-grouped-input font-mono uppercase tracking-wide"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(formatJoinCodeInput(e.target.value))
                  }
                  placeholder="SHARK-7KQM"
                  maxLength={16}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void (lobbyMode === "create" ? handleCreate() : handleJoin())
            }
            className="squad-btn-continue"
          >
            {busy ? "Please wait…" : "Continue"}
          </button>

          {error && <p className="squad-error">{error}</p>}

          <p className="squad-footnote">
            Use a nickname, not your real name. Share invite codes only with friends
            you trust.
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="squad-nav">
        <button type="button" className="squad-nav-back" onClick={() => void leaveToInbox()}>
          <span className="squad-nav-back-chevron" aria-hidden>
            ‹
          </span>
          Messages
        </button>
        <div className="squad-nav-center">
          <p className="squad-nav-title">{base?.name}</p>
          <button
            type="button"
            className="squad-nav-subtitle-button"
            onClick={() => void copyCode()}
          >
            {base?.code} · tap to copy
          </button>
        </div>
        <div className="squad-nav-trailing-wrap">
          <button
            type="button"
            className="squad-nav-icon-btn"
            aria-label="Group info"
            onClick={() => setGroupInfoOpen(true)}
          >
            ⓘ
          </button>
          <button
            type="button"
            className="squad-nav-icon-btn"
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              setInfoOpen((open) => !open);
            }}
          >
            ···
          </button>
          {infoOpen && (
            <div className="squad-info-menu" role="menu">
              <button
                type="button"
                className="squad-info-menu-item"
                onClick={() => void copyCode()}
              >
                Copy invite code
              </button>
              <button
                type="button"
                className="squad-info-menu-item"
                onClick={() => {
                  setMuted((m) => !m);
                  setInfoOpen(false);
                }}
              >
                {muted ? "Turn sounds on" : "Turn sounds off"}
              </button>
            </div>
          )}
        </div>
      </header>

      <p className="squad-presence-line">{presenceLine}</p>

      <div
        className="squad-messages squad-messages-wallpaper flex min-h-0 flex-1 flex-col"
        style={
          wallpaperUrl
            ? { backgroundImage: `url(${wallpaperUrl})` }
            : undefined
        }
      >
        <ul className="squad-messages-scrim overflow-y-auto" aria-live="polite">
          {messages.map((msg, index) => {
            const mine = msg.userId === userId;
            const position = bubblePositions[index];
            const prev = messages[index - 1];
            const showSender =
              !mine && (position === "single" || position === "first");
            const needsSpacer = index > 0 && prev.userId !== msg.userId;
            const showTime = shouldShowTimestamp(
              index > 0 ? messages[index - 1].createdAt : null,
              msg.createdAt,
            );
            const msgReactions = reactionsByMessage.get(msg.id) ?? [];

            return (
              <li key={msg.id}>
                {showTime && (
                  <p className="squad-time-divider">
                    {formatSquadTimestamp(msg.createdAt)}
                  </p>
                )}
                {needsSpacer && <div className="squad-msg-spacer" aria-hidden />}
                <div
                  className={`squad-msg-row ${
                    mine ? "squad-msg-row-sent" : "squad-msg-row-received"
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTapbackMessageId(msg.id);
                  }}
                >
                  {showSender && (
                    <span className="squad-msg-sender">
                      {msg.callSign}
                    </span>
                  )}
                  {msg.kind === "image" && msg.messagePhotoUrl ? (
                    <div
                      className={`${bubbleClass(mine, position)} squad-image-bubble`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.messagePhotoUrl} alt="Shared" />
                    </div>
                  ) : (
                    <div
                      className={`${bubbleClass(mine, position)} ${
                        msg.body.length <= 6 && /\p{Emoji}/u.test(msg.body)
                          ? "squad-blast-pop"
                          : ""
                      }`}
                      onDoubleClick={() => void copyMessage(msg.body)}
                      title="Double-click to copy"
                    >
                      {msg.body}
                    </div>
                  )}
                  {msgReactions.length > 0 && (
                    <div className="squad-reaction-strip">
                      {msgReactions.map((r) => (
                        <span key={`${r.userId}-${r.emoji}`} className="squad-reaction-badge">
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  {tapbackMessageId === msg.id && (
                    <div className="squad-tapback-picker mt-1">
                      {SQUAD_TAPBACKS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="squad-tapback-btn"
                          onClick={() => {
                            void toggleSquadReaction(supabase, msg.id, emoji);
                            setTapbackMessageId(null);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          <li aria-hidden>
            <div ref={messagesEndRef} />
          </li>
        </ul>
      </div>

      <div className="squad-composer-wrap">
        <div className="squad-blast-row">
          {SQUAD_BLASTS.map((blast) => (
            <button
              key={blast.id}
              type="button"
              className="squad-blast-chip"
              title={blast.label}
              onClick={() => void handleSend(blast.body)}
            >
              {blast.body.slice(0, 2)}
            </button>
          ))}
        </div>
        <form
          className="squad-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) void handleSend(draft);
          }}
        >
          <button
            type="button"
            className="squad-composer-attach"
            aria-label="Send photo"
            onClick={() => messagePhotoRef.current?.click()}
          >
            +
          </button>
          <input
            ref={messagePhotoRef}
            type="file"
            accept="image/*"
            className="squad-hidden-input"
            onChange={(e) => void handleMessagePhoto(e)}
          />
          <input
            className="squad-composer-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Text Message"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`squad-composer-send ${
              canSend ? "squad-composer-send-active" : "squad-composer-send-idle"
            }`}
            aria-label="Send"
          >
            ↑
          </button>
        </form>
        {error && <p className="squad-error mt-2">{error}</p>}
      </div>

      {groupInfoOpen && base && (
        <>
          <button
            type="button"
            className="squad-group-sheet-backdrop"
            aria-label="Close"
            onClick={() => setGroupInfoOpen(false)}
          />
          <div className="squad-group-sheet" role="dialog" aria-label="Group info">
            <div className="squad-group-sheet-header">
              <SquadAvatar
                callSign={base.name}
                avatar="💬"
                photoUrl={null}
                large
              />
              <p className="squad-group-sheet-title mt-2">{base.name}</p>
              <p className="text-sm text-[var(--squad-label)]">{base.code}</p>
            </div>

            <div className="squad-group-sheet-section">
              <button
                type="button"
                className="squad-info-menu-item"
                onClick={() => profilePhotoRef.current?.click()}
              >
                Change my photo
              </button>
              <button
                type="button"
                className="squad-info-menu-item"
                onClick={() => wallpaperRef.current?.click()}
              >
                Change my wallpaper
              </button>
              <button
                type="button"
                className="squad-info-menu-item"
                onClick={async () => {
                  await setSquadWallpaper(supabase, base.id, null);
                  setWallpaperUrl(null);
                }}
              >
                Remove wallpaper
              </button>
            </div>

            <input
              ref={wallpaperRef}
              type="file"
              accept="image/*"
              className="squad-hidden-input"
              onChange={(e) => void handleWallpaper(e)}
            />
            <input
              ref={profilePhotoRef}
              type="file"
              accept="image/*"
              className="squad-hidden-input"
              onChange={(e) => void handleProfilePhoto(e)}
            />

            <div className="squad-group-sheet-section">
              {members.map((member) => (
                <div key={member.userId} className="squad-group-member-row">
                  <SquadAvatar
                    callSign={member.callSign}
                    avatar={member.avatar}
                    photoUrl={member.photoUrl}
                  />
                  <span className="font-medium">
                    {member.callSign}
                    {member.userId === userId ? " (You)" : ""}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="squad-btn-continue mx-4 mt-2"
              onClick={() => setGroupInfoOpen(false)}
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
