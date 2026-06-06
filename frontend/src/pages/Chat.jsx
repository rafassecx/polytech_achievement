import { useState, useEffect, useRef, useCallback } from 'react';
import { SquarePen, Users, MessageSquare, SendHorizontal, X, Check, CheckCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Уақыт форматы
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Бүгін';
  if (d.toDateString() === yesterday.toDateString()) return 'Кеше';
  return d.toLocaleDateString('kk-KZ');
}

// Аватар-шеңбер
function Avatar({ name, src, size = 10 }) {
  const cls = `w-${size} h-${size} rounded-2xl object-cover shrink-0`;
  if (src) return <img src={src} alt={name} className={cls} />;
  return (
    <div
      className={`${cls} flex items-center justify-center text-white font-bold text-sm`}
      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

// Диалог тізіміндегі жолақ
function ConvItem({ active, onClick, avatar, name, sub, unread, lastMsg, lastAt }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 smooth text-left ${
        active
          ? 'bg-white/15 rounded-2xl'
          : 'hover:bg-white/8 rounded-2xl'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={name} src={avatar} size={10} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full min-w-4.25 h-4.25 flex items-center justify-center px-1"
            style={{ background: 'var(--clr-accent)' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold truncate ${active ? 'text-accent' : 'text-theme'}`}>
            {name}
          </span>
          {lastAt && (
            <span className="text-[10px] text-muted shrink-0 ml-1">{formatTime(lastAt)}</span>
          )}
        </div>
        {sub && <div className="text-[11px] text-muted truncate">{sub}</div>}
        {lastMsg && (
          <div className="text-xs text-muted truncate mt-0.5">{lastMsg}</div>
        )}
      </div>
    </button>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const location = useLocation();

  // Белсенді чат: { type: 'direct'|'group', id, name, avatar?, groupName? }
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  // мобильде sidebar/chat ауысу
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [membersReads, setMembersReads] = useState([]);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  // Диалог тізімін жүктеу
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.conversations);
    } catch { /* тыныш */ }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Профиль бетінен "Хабарлама жіберу" арқылы ашу
  useEffect(() => {
    if (location.state?.openChatWith) {
      openDirectChat(location.state.openChatWith);
      window.history.replaceState({}, document.title);
    } else if (location.state?.openGroup) {
      openGroupChat(location.state.openGroup);
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Хабарламаларды жүктеу
  const loadMessages = useCallback(async (chat) => {
    if (!chat) return;
    try {
      let data;
      if (chat.type === 'direct') {
        ({ data } = await api.get(`/messages/direct/${chat.id}`));
      } else {
        ({ data } = await api.get(`/messages/group/${encodeURIComponent(chat.groupName)}`));
        setMembersReads(data.members_reads || []);
      }
      setMessages(data.messages || []);
    } catch { /* тыныш */ }
  }, []);

  // Белсенді чат ауысқанда
  useEffect(() => {
    if (!activeChat) return;

    setLoadingMsgs(true);
    setMessages([]);
    loadMessages(activeChat).finally(() => setLoadingMsgs(false));

    // Поллинг — 3 секунд сайын жаңарту
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(activeChat), 3000);

    return () => clearInterval(pollRef.current);
  }, [activeChat, loadMessages]);

  // Жаңа хабарлама келгенде прокрутка
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Пайдаланушы іздеу
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/messages/users?search=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.users);
      } catch { /* тыныш */ }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openDirectChat = (u) => {
    setActiveChat({ type: 'direct', id: u.id, name: u.full_name, avatar: u.avatar_url });
    setShowSearch(false);
    setSearchQuery('');
    setMobileSidebar(false);
  };

  const openGroupChat = (groupName) => {
    setActiveChat({ type: 'group', id: groupName, name: `${groupName} тобы`, groupName });
    setMobileSidebar(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || sending) return;

    setSending(true);
    setSendError('');
    const text = input.trim();
    setInput('');

    try {
      if (activeChat.type === 'direct') {
        await api.post(`/messages/direct/${activeChat.id}`, { content: text });
      } else {
        await api.post(`/messages/group/${encodeURIComponent(activeChat.groupName)}`, { content: text });
      }
      await loadMessages(activeChat);
      await loadConversations();
    } catch (err) {
      setInput(text);
      setSendError(err.response?.data?.message || 'Жіберу қатесі');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Күн бөлгіші (хабарламалар арасында)
  const renderMessages = () => {
    let lastDate = '';
    return messages.map((m) => {
      const isMine = m.sender_id === user.id;
      const dateStr = formatDate(m.created_at);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;

      return (
        <div key={m.id}>
          {showDate && (
            <div className="text-center my-3">
              <span className="badge text-[10px] px-3 py-1">{dateStr}</span>
            </div>
          )}
          <div className={`flex items-end gap-2 mb-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isMine && (
              <Link to={`/users/${m.sender_id}`} className="shrink-0 hover:opacity-80 smooth">
                <Avatar name={m.sender_name} src={m.sender_avatar} size={8} />
              </Link>
            )}
            <div className={`max-w-[72%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
              {!isMine && activeChat?.type === 'group' && (
                <span className="text-[11px] text-muted mb-0.5 ml-1">{m.sender_name}</span>
              )}
              <div
                className="px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  background: isMine ? 'var(--clr-accent)' : 'var(--glass)',
                  color: isMine ? '#fff' : 'var(--clr-text)',
                  borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  backdropFilter: isMine ? 'none' : 'blur(12px)',
                  border: isMine ? 'none' : '1px solid var(--glass-border)',
                  boxShadow: isMine
                    ? '0 4px 14px rgba(99,102,241,0.35)'
                    : 'var(--glass-shadow)',
                  wordBreak: 'break-word',
                }}
              >
                {m.content}
              </div>
              {/* Оқылды белгілері */}
              {isMine && activeChat?.type === 'direct' && (
                <div className="flex items-center gap-0.5 mt-0.5 px-1">
                  <span className="text-[10px] text-muted">{formatTime(m.created_at)}</span>
                  {m.is_read
                    ? <CheckCheck size={12} style={{ color: 'var(--clr-accent)' }} />
                    : <Check size={12} className="text-muted" />
                  }
                </div>
              )}
              {isMine && activeChat?.type === 'group' && (() => {
                const readCount = membersReads.filter(r => r.user_id !== user.id && r.last_message_id >= m.id).length;
                return (
                  <div className="flex items-center gap-0.5 mt-0.5 px-1">
                    <span className="text-[10px] text-muted">{formatTime(m.created_at)}</span>
                    {readCount > 0 && (
                      <>
                        <CheckCheck size={12} style={{ color: 'var(--clr-accent)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--clr-accent)' }}>{readCount}</span>
                      </>
                    )}
                  </div>
                );
              })()}
              {!isMine && (
                <span className="text-[10px] text-muted mt-0.5 px-1">{formatTime(m.created_at)}</span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-5 py-3 md:py-6 h-[calc(100dvh-200px)] md:h-[calc(100vh-120px)]">
      <div className="flex gap-4 h-full">

        {/* ═══ СОЛ ЖАҚ: диалог тізімі ═══ */}
        <div className={`glass-panel flex flex-col overflow-hidden w-full md:w-72 md:shrink-0 md:flex ${mobileSidebar ? 'flex' : 'hidden'}`}>
          <div className="px-4 py-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-theme">Чаттар</h2>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="btn-glass px-2.5 py-2 leading-none flex items-center justify-center"
                title="Жаңа хат"
              >
                <SquarePen size={16} />
              </button>
            </div>

            {/* Пайдаланушы іздеу */}
            {showSearch && (
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Пайдаланушы іздеу..."
                  className="glass-input text-sm py-2"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => openDirectChat(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 smooth text-left"
                      >
                        <Avatar name={u.full_name} src={u.avatar_url} size={8} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-theme truncate">{u.full_name}</div>
                          <div className="text-xs text-muted">{u.group_name || '—'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {/* Топтық чат (егер топ болса) */}
            {user.group_name && (
              <ConvItem
                active={activeChat?.type === 'group' && activeChat.groupName === user.group_name}
                onClick={() => openGroupChat(user.group_name)}
                name={user.group_name}
                sub="Топтық чат"
                unread={0}
              />
            )}

            {/* Жеке диалогтар */}
            {conversations.length === 0 && !user.group_name ? (
              <div className="text-center text-muted text-xs py-8 px-3">
                Хабарламалар жоқ.<br/>✏️ батырмасын басып жаңа чат бастаңыз.
              </div>
            ) : (
              conversations.map((c) => (
                <ConvItem
                  key={c.id}
                  active={activeChat?.type === 'direct' && activeChat.id === c.id}
                  onClick={() => openDirectChat(c)}
                  avatar={c.avatar_url}
                  name={c.full_name}
                  sub={c.group_name}
                  unread={c.unread}
                  lastMsg={c.last_message}
                  lastAt={c.last_at}
                />
              ))
            )}
          </div>
        </div>

        {/* ═══ ОҢ ЖАҚ: хабарламалар ═══ */}
        <div className={`glass-panel flex-1 flex flex-col overflow-hidden md:flex ${mobileSidebar ? 'hidden' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Тақырып жолағы */}
              <div className="px-4 py-3 md:py-4 border-b border-white/10 flex items-center gap-3">
                {activeChat.type === 'group' ? (
                  <Link to={`/groups/${encodeURIComponent(activeChat.groupName)}`} className="shrink-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-80 smooth"
                      style={{ background: 'rgba(99,102,241,0.15)' }}
                    >
                      <Users size={18} className="text-accent" />
                    </div>
                  </Link>
                ) : (
                  <Link to={`/users/${activeChat.id}`} className="shrink-0">
                    <Avatar name={activeChat.name} src={activeChat.avatar} size={10} />
                  </Link>
                )}
                <div className="flex-1 min-w-0">
                  {activeChat.type === 'direct' ? (
                    <Link to={`/users/${activeChat.id}`} className="text-sm font-semibold text-theme hover:text-accent smooth block truncate">
                      {activeChat.name}
                    </Link>
                  ) : (
                    <Link to={`/groups/${encodeURIComponent(activeChat.groupName)}`} className="text-sm font-semibold text-theme hover:text-accent smooth block truncate">
                      {activeChat.name}
                    </Link>
                  )}
                  <div className="text-xs text-muted">
                    {activeChat.type === 'group' ? 'Топтық чат' : 'Жеке хат'}
                  </div>
                </div>
              </div>

              {/* Хабарламалар алаңы */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loadingMsgs ? (
                  <div className="text-center text-muted text-sm py-10">Жүктелуде...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted text-sm py-10">
                    Хабарламалар жоқ. Алғашқы хабарламаңызды жіберіңіз!
                  </div>
                ) : (
                  renderMessages()
                )}
                <div ref={bottomRef} />
              </div>

              {/* Жіберу қатесі */}
              {sendError && (
                <div
                  className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2"
                  style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--clr-danger)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <span>{sendError}</span>
                  <button type="button" onClick={() => setSendError('')} className="shrink-0 opacity-60 hover:opacity-100">
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Енгізу алаңы */}
              <form onSubmit={sendMessage} className="px-4 py-3 border-t border-white/10 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Хабарлама жазыңыз..."
                  className="glass-input flex-1 py-2.5 text-sm"
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="btn-primary px-4 py-2.5 rounded-2xl shrink-0 flex items-center justify-center"
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <SendHorizontal size={16} />
                  }
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center px-8">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mb-1"
                style={{ background: 'rgba(99,102,241,0.12)' }}
              >
                <MessageSquare size={28} className="text-accent" />
              </div>
              <h3 className="text-base font-semibold text-theme">Чат таңдаңыз</h3>
              <p className="text-sm text-muted">
                Сол жақтан диалог таңдаңыз немесе жаңа хат бастаңыз
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
