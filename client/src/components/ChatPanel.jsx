import React, { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { formatDate } from "../utils/format";

export default function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    setError("");
    try {
      await onSend({ text: text.trim(), file });
      setText("");
      setFile(null);
    } catch (err) {
      setError(err.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-card chat-panel">
      <div className="section-kicker">Chat</div>

      <div className="chat-stream">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h4>No messages</h4>
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
                {message.attachmentName || "Open"}
              </a>
            ) : null}
          </article>
        ))}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Message..."
          rows="3"
        />

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="chat-composer-footer">
          <label className="file-pill">
            <Paperclip size={14} />
            <span>{file ? file.name : "Attach"}</span>
            <input onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
          </label>
          <button disabled={busy} type="submit" className="btn btn-primary btn-sm" aria-label="Send">
            <Send size={14} />
          </button>
        </div>
      </form>
    </section>
  );
}
