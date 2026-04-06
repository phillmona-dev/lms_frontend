import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  INSTRUCTOR: 'Instructor',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  ADMIN: 'Admin',
  SYSTEM_ADMINISTRATOR: 'System Admin',
  SCHOOL_ADMINISTRATOR: 'School Admin',
};

const compactRole = (role) => {
  if (!role) {
    return 'Member';
  }
  const key = String(role).toUpperCase();
  return ROLE_BADGE[key] || key.replaceAll('_', ' ');
};

const formatLocalTime = (value) => {
  if (!value) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleString();
  }
};

const dayKey = (value) => {
  if (!value) {
    return '';
  }
  return new Date(value).toISOString().slice(0, 10);
};

const formatDayLabel = (value) => {
  if (!value) {
    return '';
  }
  const day = new Date(value);
  const now = new Date();

  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const currentKey = day.toISOString().slice(0, 10);
  if (currentKey === todayKey) {
    return 'Today';
  }
  if (currentKey === yesterdayKey) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day);
};

export default function ContextChatWidget({
  contextType,
  contextKey,
  title = 'Discussion',
  subtitle = 'Live class conversation',
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [lastSeenId, setLastSeenId] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const rootRef = useRef(null);
  const scrollRef = useRef(null);

  const canUseChat = Boolean(contextType && contextKey);
  const userIdentity = String(
    user?.publicId || user?.email || user?.id || user?.name || 'anonymous',
  );
  const storageScope = `lms:chat:${userIdentity}:${contextType || 'UNKNOWN'}:${contextKey || 'UNKNOWN'}`;
  const openStateKey = `${storageScope}:open`;
  const seenStateKey = `${storageScope}:seen`;

  const query = useMemo(
    () => ({
      contextType,
      contextKey,
    }),
    [contextKey, contextType],
  );

  const groupedMessages = useMemo(() => {
    const groups = [];
    messages.forEach((item) => {
      const key = dayKey(item.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({ key, label: formatDayLabel(item.createdAt), items: [item] });
      } else {
        last.items.push(item);
      }
    });
    return groups;
  }, [messages]);

  useEffect(() => {
    if (!canUseChat) {
      return;
    }

    const storedOpen = localStorage.getItem(openStateKey);
    const storedSeen = localStorage.getItem(seenStateKey);

    setIsOpen(storedOpen === null ? true : storedOpen === '1');
    setLastSeenId(storedSeen ? Number(storedSeen) || 0 : 0);
    setStorageReady(true);
  }, [canUseChat, openStateKey, seenStateKey]);

  useEffect(() => {
    if (!storageReady || !canUseChat) {
      return;
    }
    localStorage.setItem(openStateKey, isOpen ? '1' : '0');
  }, [canUseChat, isOpen, openStateKey, storageReady]);

  useEffect(() => {
    if (!storageReady || !canUseChat) {
      return;
    }
    localStorage.setItem(seenStateKey, String(lastSeenId));
  }, [canUseChat, lastSeenId, seenStateKey, storageReady]);

  const loadMessages = async (isInitial = false) => {
    if (!canUseChat) {
      return;
    }

    if (isInitial && isOpen) {
      setLoading(true);
    }

    try {
      const response = await axios.get('/api/chat/messages', { params: query });
      setMessages(Array.isArray(response.data) ? response.data : []);
      setError('');
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError(err.response?.data || 'Unable to load chat right now.');
    } finally {
      if (isInitial && isOpen) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMessages(true);
    const timer = setInterval(() => {
      loadMessages(false);
    }, 7000);

    return () => clearInterval(timer);
  }, [canUseChat, contextKey, contextType, isOpen]);

  useEffect(() => {
    const pageElement = rootRef.current?.closest('.ctx-page-with-chat');
    if (!pageElement) {
      return undefined;
    }

    pageElement.classList.toggle('ctx-page-chat-collapsed', !isOpen);

    return () => {
      pageElement.classList.remove('ctx-page-chat-collapsed');
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (!messages.length) {
      setUnseenCount(0);
      return;
    }

    const newestId = messages.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    if (isOpen) {
      if (newestId > lastSeenId) {
        setLastSeenId(newestId);
      }
      setUnseenCount(0);
      return;
    }

    const unseen = messages.filter(
      (item) => (Number(item.id) || 0) > lastSeenId && !item.mine,
    ).length;
    setUnseenCount(unseen);
  }, [isOpen, lastSeenId, messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending || !canUseChat) {
      return;
    }

    setSending(true);
    try {
      await axios.post('/api/chat/messages', { message: text }, { params: query });
      setMessage('');
      setError('');
      await loadMessages(false);
    } catch (err) {
      setError(err.response?.data || 'Message failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <div ref={rootRef} className="ctx-chat-collapsed-anchor">
        <button type="button" className="ctx-chat-fab" onClick={() => setIsOpen(true)}>
          Open Chat
          {unseenCount > 0 && (
            <span className="ctx-chat-fab-badge">
              {unseenCount > 99 ? '99+' : unseenCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <section className="ctx-chat-wrap" ref={rootRef}>
      <header className="ctx-chat-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="ctx-chat-head-actions">
          <span className={`ctx-chat-status ${connected ? 'is-live' : 'is-offline'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
          <button
            type="button"
            className="ctx-chat-min-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat panel"
          >
            Hide
          </button>
        </div>
      </header>

      <div className="ctx-chat-window" ref={scrollRef}>
        {loading ? (
          <p className="ctx-chat-empty">Loading messages...</p>
        ) : groupedMessages.length === 0 ? (
          <p className="ctx-chat-empty">No messages yet. Start the conversation.</p>
        ) : (
          groupedMessages.map((group) => (
            <div className="ctx-chat-group" key={group.key || `group-${group.items[0]?.id || 0}`}>
              {group.label && <div className="ctx-chat-day">{group.label}</div>}
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className={`ctx-chat-message ${item.mine ? 'is-mine' : 'is-peer'}`}
                >
                  <div className="ctx-chat-meta">
                    <strong>{item.mine ? 'You' : item.senderName || 'Member'}</strong>
                    <span>{compactRole(item.senderRole)}</span>
                  </div>
                  <p>{item.message}</p>
                  <time>{formatLocalTime(item.createdAt)}</time>
                </article>
              ))}
            </div>
          ))
        )}
      </div>

      {error && <p className="ctx-chat-error">{error}</p>}

      <form onSubmit={sendMessage} className="ctx-chat-form">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
          maxLength={3000}
          placeholder={user ? 'Write a message...' : 'Sign in to chat'}
          disabled={!user || sending || !canUseChat}
        />
        <button type="submit" className="btn btn-primary" disabled={!message.trim() || sending || !user}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  );
}
