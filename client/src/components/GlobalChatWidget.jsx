import React, { useMemo, useRef, useEffect, useState } from "react";
import { MessageCircle, Paperclip, Send, X } from "lucide-react";
import { formatDate } from "../utils/format";

export default function GlobalChatWidget({ messages, onSend }) {
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState("");
  const [file, setFile]   = useState(null);
  const [busy, setBusy]   = useState(false);
  const streamRef         = useRef(null);

  const recentMessages = useMemo(() => messages.slice(-30), [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [recentMessages, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    try {
      await onSend({ text: text.trim(), file });
      setText("");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <section className="chat-drawer" role="dialog" aria-label="Team chat">
          <header className="chat-drawer-header">
            <div>
              <div className="chat-drawer-kicker">Internal</div>
              <h3>Team channel</h3>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={14} />
            </button>
          </header>

          <div className="chat-drawer-stream" ref={streamRef}>
            {recentMessages.length === 0 ? (
              <div className="chat-empty">
                <strong>No messages yet</strong>
                <span>Send the first message to your team.</span>
              </div>
            ) : (
              recentMessages.map((msg) => (
                <article className="chat-bubble" key={msg._id}>
                  <div className="chat-bubble-top">
                    <strong>{msg.senderName}</strong>
                    <span>{formatDate(msg.createdAt)}</span>
                  </div>
                  {msg.text && <p>{msg.text}</p>}
                  {msg.attachmentUrl && (
                    <a className="chat-link" href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                      {msg.attachmentName || "Open attachment"}
                    </a>
                  )}
                </article>
              ))
            )}
          </div>

          <form className="chat-drawer-form" onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message the team…"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
              }}
            />
            <div className="chat-drawer-actions">
              <label className="attach-pill" title="Attach file">
                <Paperclip size={12} />
                <span>{file ? file.name : "Attach"}</span>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
              </label>
              <button disabled={busy} type="submit" style={{ gap: 6, minWidth: 80 }}>
                <Send size={13} />
                {busy ? "…" : "Send"}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        className="chat-fab"
        aria-label={open ? "Close chat" : "Open team chat"}
        onClick={() => setOpen((s) => !s)}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>
    </>
  );
}