import React, { useState } from "react";
import { formatDate } from "../utils/format";

export default function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

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
    <section className="workspace-card chat-panel">
      <div className="section-kicker">Team Channel</div>
      <div className="section-heading-row">
        <div>
          <h3>Realtime collaboration room</h3>
          <p>Use this for internal handoffs, document drops, client context, and same-day escalation.</p>
        </div>
      </div>

      <div className="chat-stream">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h4>No messages yet</h4>
            <p>The first field update or shared file will appear here.</p>
          </div>
        ) : null}

        {messages.map((message) => (
          <article className="chat-message" key={message._id}>
            <div className="chat-message-meta">
              <span>{message.senderName}</span>
              <span>{formatDate(message.createdAt)}</span>
            </div>
            {message.text ? <p className="chat-message-body">{message.text}</p> : null}
            {message.attachmentUrl ? (
              <a className="attachment-link" href={message.attachmentUrl} rel="noreferrer" target="_blank">
                {message.attachmentName || "Open attachment"}
              </a>
            ) : null}
          </article>
        ))}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Share a client update, task handoff, or internal note."
          rows="4"
        />
        <div className="chat-composer-footer">
          <label className="file-pill">
            <span>{file ? file.name : "Attach document, audio, image, or video"}</span>
            <input onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
          </label>
          <button disabled={busy} type="submit">
            {busy ? "Sending..." : "Send to Team Channel"}
          </button>
        </div>
      </form>
    </section>
  );
}
