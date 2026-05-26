import React, { useMemo, useState } from "react";
import { MessageSquareMore, Paperclip, SendHorizontal, X } from "lucide-react";
import { formatDate } from "../utils/format";

export default function GlobalChatWidget({ messages, onSend }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const recentMessages = useMemo(() => messages.slice(-20), [messages]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim() && !file) return;

    setBusy(true);
    try {
      await onSend({ text: text.trim(), file });
      setText("");
      setFile(null);
      event.target.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open ? (
        <section className="chat-drawer">
          <header className="chat-drawer-header">
            <div>
              <div className="chat-drawer-kicker">Team channel</div>
              <h3>Internal advisory chat</h3>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} type="button">
              <X size={18} />
            </button>
          </header>

          <div className="chat-drawer-stream">
            {recentMessages.length === 0 ? (
              <div className="chat-empty">
                <strong>No messages yet</strong>
                <span>The team channel will appear here on every page.</span>
              </div>
            ) : null}

            {recentMessages.map((message) => (
              <article className="chat-bubble" key={message._id}>
                <div className="chat-bubble-top">
                  <strong>{message.senderName}</strong>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                {message.text ? <p>{message.text}</p> : null}
                {message.attachmentUrl ? (
                  <a className="chat-link" href={message.attachmentUrl} rel="noreferrer" target="_blank">
                    {message.attachmentName || "Open attachment"}
                  </a>
                ) : null}
              </article>
            ))}
          </div>

          <form className="chat-drawer-form" onSubmit={handleSubmit}>
            <textarea
              onChange={(event) => setText(event.target.value)}
              placeholder="Message the team from anywhere in the product..."
              rows="4"
              value={text}
            />
            <div className="chat-drawer-actions">
              <label className="attach-pill">
                <Paperclip size={14} />
                <span>{file ? file.name : "Attach file"}</span>
                <input onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
              </label>
              <button disabled={busy} type="submit">
                <SendHorizontal size={16} />
                <span>{busy ? "Sending..." : "Send"}</span>
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button aria-label="Open team chat" className="chat-fab" onClick={() => setOpen(true)} type="button">
        <MessageSquareMore size={22} />
      </button>
    </>
  );
}
