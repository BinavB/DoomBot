"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { announceApprovalsChanged } from "@/components/events";
import { Markdown } from "@/components/markdown";
import { DoomMark } from "@/components/doom-mark";

interface ChatLine {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface ChatReply {
  reply?: string;
  approvalsCreated?: number[];
  error?: string;
}

const suggestions = [
  "Brief me on today",
  "What's on my calendar today?",
  "Summarize my unread email",
  "What's the weather in Dubai?",
];

const nearBottomPixels = 96;
const composerMaxHeight = 200;

function TypingDots() {
  return (
    <div className="flex items-center gap-3" role="status" aria-label="DOOMBOT is replying">
      <DoomMark size={28} />
      <div className="flex gap-1.5 rounded-full bg-raised px-3.5 py-3">
        <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ChatView() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const firstScroll = useRef(true);
  const nextLocalId = useRef(-1);

  useEffect(() => {
    fetch("/api/chat")
      .then((response) => response.json() as Promise<{ messages: ChatLine[] }>)
      .then((data) => setLines(data.messages))
      .catch(() => setError("Chat history could not load. Reload the page to try again."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) {
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({
      behavior: firstScroll.current || reduceMotion ? "auto" : "smooth",
      block: "end",
    });
    if (lines.length > 0) {
      firstScroll.current = false;
    }
  }, [lines, sending]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distance < nearBottomPixels;
    setShowJump(!stickToBottom.current);
  }

  function jumpToLatest() {
    stickToBottom.current = true;
    setShowJump(false);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function resizeComposer() {
    const element = composerRef.current;
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, composerMaxHeight)}px`;
  }

  async function send(text: string) {
    const message = text.trim();
    if (message.length === 0 || sending) {
      return;
    }

    stickToBottom.current = true;
    setShowJump(false);
    setSending(true);
    setError(null);
    setShowApprovalNotice(false);
    setDraft("");
    requestAnimationFrame(resizeComposer);
    setLines((current) => [...current, { id: nextLocalId.current--, role: "user", content: message }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as ChatReply;
      if (!response.ok || data.reply === undefined) {
        setError(data.error ?? "DOOMBOT could not answer. Try again in a moment.");
        return;
      }
      const reply = data.reply;
      setLines((current) => [...current, { id: nextLocalId.current--, role: "assistant", content: reply }]);
      if (data.approvalsCreated && data.approvalsCreated.length > 0) {
        setShowApprovalNotice(true);
        announceApprovalsChanged();
      }
    } catch {
      setError("DOOMBOT could not be reached. Check that the server is running.");
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  async function copy(line: ChatLine) {
    try {
      await navigator.clipboard.writeText(line.content);
      setCopiedId(line.id);
      setTimeout(() => setCopiedId((current) => (current === line.id ? null : current)), 1500);
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
    }
  }

  const empty = loaded && lines.length === 0 && !sending;

  return (
    <div className="relative flex h-full flex-col">
      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 md:px-6">
          {empty && (
            <div className="flex flex-col items-center gap-6 pt-[12vh] text-center">
              <DoomMark size={56} />
              <div className="flex flex-col gap-2">
                <p className="font-display text-2xl font-semibold tracking-tight">What do you need today?</p>
                <p className="text-sm text-muted">Ask about your day, your inbox, your tasks or the weather.</p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-doom hover:bg-doom-soft"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {lines.map((line) =>
            line.role === "user" ? (
              <div key={line.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-raised px-4 py-2.5 leading-relaxed">
                  {line.content}
                </p>
              </div>
            ) : (
              <div key={line.id} className="group flex gap-3">
                <DoomMark size={28} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <Markdown text={line.content} />
                  <button
                    type="button"
                    onClick={() => void copy(line)}
                    className="mt-2 rounded-md px-2 py-1 text-xs text-muted opacity-100 transition-opacity hover:bg-raised hover:text-ink md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  >
                    {copiedId === line.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ),
          )}

          {sending && <TypingDots />}

          {showApprovalNotice && (
            <p className="rounded-xl border border-signal/40 px-4 py-3 text-sm">
              An action is waiting for you.{" "}
              <Link href="/approvals" className="font-medium text-signal underline underline-offset-2">
                Review it in Approvals
              </Link>
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-2 text-sm shadow-lg"
        >
          Jump to latest
        </button>
      )}

      <div className="shrink-0 border-t border-line bg-canvas px-4 pt-3 pb-4 md:px-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-line bg-panel p-2 focus-within:border-doom"
        >
          <label htmlFor="composer" className="sr-only">
            Message DOOMBOT
          </label>
          <textarea
            id="composer"
            ref={composerRef}
            value={draft}
            rows={1}
            maxLength={4000}
            onChange={(event) => {
              setDraft(event.target.value);
              resizeComposer();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message DOOMBOT"
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 leading-relaxed outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            className="h-10 shrink-0 rounded-xl bg-doom px-4 text-sm font-semibold text-canvas transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </form>
        <p className="mx-auto mt-2 w-full max-w-3xl text-center text-xs text-muted">
          Enter to send, Shift+Enter for a new line. Actions that change things wait for your approval.
        </p>
      </div>
    </div>
  );
}
