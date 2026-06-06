import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatPanel from "./ChatPanel";

export default function GlobalChatWidget({ messages, onSend, chatUnreadCount = 0, onMarkChatRead }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const recentMessages = useMemo(() => messages.slice(-50), [messages]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [open, recentMessages]);

  return (
    <>
      {open && (
        <div className="chat-drawer-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <aside
            className="chat-drawer-shell"
            role="dialog"
            aria-label="Team channel"
            onClick={(event) => event.stopPropagation()}
          >
            <div ref={panelRef} className="chat-drawer-panel">
              <ChatPanel messages={recentMessages} onSend={onSend} />
            </div>
          </aside>
        </div>
      )}

      <button
        className="chat-fab"
        aria-label={open ? "Close team chat" : "Open team chat"}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) onMarkChatRead?.();
        }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {chatUnreadCount > 0 && !open ? (
          <span className="badge badge-fab" aria-label={`${chatUnreadCount} unread messages`}>
            {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
          </span>
        ) : null}
      </button>
    </>
  );
}
