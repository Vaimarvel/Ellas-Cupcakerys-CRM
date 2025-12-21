import React, { useState, useEffect, useRef } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function ChatWidget({ onCelebrate, currentUserId, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const userId = currentUserId || 'NEW_USER';
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: text,
          chat_history: next.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      const reply = data && data.response ? data.response : 'No response';

      const final = [...next, { role: 'assistant', text: reply }];
      setMessages(final);
      if (onCelebrate) onCelebrate(reply);

    } catch {
      const final = [...next, { role: 'assistant', text: 'Sorry, something went wrong.' }];
      setMessages(final);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header" style={{ background: 'linear-gradient(90deg, #6a1b9a, #8e24aa)', color: 'white', padding: '12px', fontWeight: 'bold', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
        Chat with El_Intel
      </div>
      <div className="chat-body" style={{ height: '350px', overflowY: 'auto', padding: '16px', background: '#f9f9f9' }}>
        {messages.map((m, i) => (
          <div className={`chat-row ${m.role}`} key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div className="chat-bubble" style={{
              background: m.role === 'user' ? '#6a1b9a' : '#fff',
              color: m.role === 'user' ? '#fff' : '#333',
              padding: '10px 14px',
              borderRadius: '12px',
              borderBottomRightRadius: m.role === 'user' ? '0' : '12px',
              borderBottomLeftRadius: m.role === 'assistant' ? '0' : '12px',
              maxWidth: '80%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="chat-row assistant">
            <div className="chat-bubble" style={{ background: '#fff', padding: '10px', borderRadius: '8px' }}>
              Hello! How can I make your day sweeter today?
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input" style={{ display: 'flex', borderTop: '1px solid #eee', padding: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && send()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '20px', marginRight: '10px', outline: 'none' }}
        />
        <button disabled={busy} onClick={send} style={{ background: '#ba68c8', color: 'white', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {busy ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
