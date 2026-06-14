import { useState, useEffect, useRef, useCallback } from 'react';
import { SquarePen, Users, MessageSquare, SendHorizontal, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

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

function ConvItem({ active, onClick, onDelete, avatar, name, sub, unread, lastMsg, lastAt }) {
  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-3 smooth cursor-pointer rounded-2xl ${
        active ? 'bg-white/15' : 'hover:bg-white/8'
      }`}
      onClick={onClick}
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
            <span className="text-[10px] text-muted shrink-0 ml-1 group-hover:hidden">{formatTime(lastAt)}</span>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded-lg smooth opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0"
              style={{ color: 'var(--clr-muted)' }}
              title="Чатты жою"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {sub && <div className="text-[11px] text-muted truncate">{sub}</div>}
        {lastMsg && (
          <div className="text-xs text-muted truncate mt-0.5">{lastMsg}</div>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { showConfirm } = useModal();
  const location = useLocation();

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
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [membersReads, setMembersReads] = useState([]);
  const [deletingMsgId, setDeletingMsgId] = useState(null);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const isNearBottom = useRef(true);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.conversations);
    } catch { /* тыныш */ }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (location.state?.openChatWith) {
      openDirectChat(location.state.openChatWith);
      window.history.replaceState({}, document.title);
    } else if (location.state?.openGroup) {
      openGroupChat(location.state.openGroup);
      window.history.replaceState({}, document.title);
    }
  }, []);

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

  useEffect(() => {
    if (!activeChat) return;

    setLoadingMsgs(true);
    setMessages([]);
    isNearBottom.current = true;
    loadMessages(activeChat).finally(() => setLoadingMsgs(false));

    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(activeChat), 3000);

    return () => clearInterval(pollRef.current);
  }, [activeChat, loadMessages]);

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleChatScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

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

  const deleteConversation = async (userId) => {
    const ok = await showConfirm('Чатты толығымен жоясыз ба? Барлық хабарламалар өшіріледі.', { danger: true });
    if (!ok) return;
    try {
      await api.delete(`/messages/conversation/${userId}`);
      setConversations((prev) => prev.filter((c) => c.id !== userId));
      if (activeChat?.type === 'direct' && activeChat.id === userId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch { /* тыныш */ }
  };

  const deleteMessage = async (msgId) => {
    setDeletingMsgId(msgId);
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch { /* тыныш */ } finally {
      setDeletingMsgId(null);
    }
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
      isNearBottom.current = true;
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
              <div className={`group/msg relative flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {(isMine || (user.role === 'admin' && activeChat?.type === 'group')) && (
                  <button
                    onClick={() => deleteMessage(m.id)}
                    disabled={deletingMsgId === m.id}
                    className="opacity-0 group-hover/msg:opacity-100 smooth flex items-center justify-center w-6 h-6 rounded-lg hover:text-red-400 shrink-0 mb-0.5"
                    style={{ color: 'var(--clr-muted)' }}
                    title="Жою"
                  >
                    {deletingMsgId === m.id
                      ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
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
              </div>
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
            {user.group_name && (
              <ConvItem
                active={activeChat?.type === 'group' && activeChat.groupName === user.group_name}
                onClick={() => openGroupChat(user.group_name)}
                name={user.group_name}
                sub="Топтық чат"
                unread={0}
              />
            )}

            {conversations.length === 0 && !user.group_name ? (
              <div className="text-center text-muted py-10 px-4 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <MessageSquare size={22} className="text-accent" />
                </div>
                <p className="text-xs leading-relaxed">Хабарламалар жоқ.<br/>
                  <button onClick={() => setShowSearch(true)} className="text-accent hover:underline">Жаңа чат бастаңыз</button>
                </p>
              </div>
            ) : (
              conversations.map((c) => (
                <ConvItem
                  key={c.id}
                  active={activeChat?.type === 'direct' && activeChat.id === c.id}
                  onClick={() => openDirectChat(c)}
                  onDelete={() => deleteConversation(c.id)}
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

        <div className={`glass-panel flex-1 flex flex-col overflow-hidden md:flex ${mobileSidebar ? 'hidden' : 'flex'}`}>
          {activeChat ? (
            <>
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

              <div ref={chatBodyRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto px-4 py-4">
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
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-8">
              <svg width="130" height="110" viewBox="0 0 130 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-55">
                <circle cx="65" cy="58" r="42" fill="rgba(99,102,241,0.07)" />
                <rect x="22" y="36" width="52" height="24" rx="12" fill="rgba(99,102,241,0.18)" />
                <circle cx="22" cy="60" r="6" fill="rgba(99,102,241,0.18)" />
                <line x1="32" y1="46" x2="64" y2="46" stroke="rgba(99,102,241,0.45)" strokeWidth="2" strokeLinecap="round" />
                <line x1="32" y1="52" x2="58" y2="52" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="56" y="68" width="52" height="24" rx="12" fill="rgba(167,139,250,0.2)" />
                <circle cx="108" cy="68" r="6" fill="rgba(167,139,250,0.2)" />
                <line x1="66" y1="78" x2="98" y2="78" stroke="rgba(167,139,250,0.45)" strokeWidth="2" strokeLinecap="round" />
                <line x1="66" y1="84" x2="88" y2="84" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <h3 className="text-base font-semibold text-theme mb-1">Чат таңдаңыз</h3>
                <p className="text-sm text-muted">Сол жақтан диалог таңдаңыз немесе жаңа хат бастаңыз</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
