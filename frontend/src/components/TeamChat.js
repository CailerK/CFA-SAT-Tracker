/**
 * Team Chat — LD Growth "Groups" layout.
 *
 *  ┌──────────────┬───────────────────────────┐
 *  │ Groups       │                           │
 *  │ [search] [+] │     Ready to Connect!     │
 *  │              │     ...empty state...     │
 *  │ ┌──────────┐ │                           │
 *  │ │ 🏬 Whole │ │  (or: messages thread)    │
 *  │ │  Store   │ │                           │
 *  │ │ Store•193│ │                           │
 *  │ └──────────┘ │                           │
 *  └──────────────┴───────────────────────────┘
 *
 * Backend wiring uses the existing /api/chat/channels/ + /api/chat/messages/
 * endpoints (polled every 5s while a group is open).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './TeamChat.css';
import chatService from '../services/chat';
import { isManagerOrAbove } from '../utils/access';
import { FormModal, TextField, TextArea } from './ui';
import ChatGroupSettingsModal from './ChatGroupSettingsModal';

const formatTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  catch { return ''; }
};

const formatRelative = (iso) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const slugifyChannelName = (name) => (name || '')
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40);

// Lucide-style inline icons
const I = ({ size = 16, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);
const IconStore  = (p) => <I {...p}><path d="m2 7 1.5 4.5L5 7l1.5 4.5L8 7l1.5 4.5L11 7l1.5 4.5L14 7l1.5 4.5L17 7l1.5 4.5L20 7l1.5 4.5L23 7"/><path d="M21 11.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5"/><path d="M5 22V12"/><path d="M19 22V12"/></I>;
const IconSearch = (p) => <I {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></I>;
const IconPlus   = (p) => <I {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></I>;
const IconUsers  = (p) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>;
const IconBubble = (p) => <I {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></I>;
const IconSend   = (p) => <I {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></I>;
const IconBack   = (p) => <I {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></I>;

const TeamChat = ({ onBack, user }) => {
  const canManage = isManagerOrAbove(user);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [newChannelModal, setNewChannelModal] = useState(null);
  const [newChannelError, setNewChannelError] = useState('');
  // Settings modal: open when the user clicks the thread header. Holds the
  // full channel record (with allowed_roles, created_by) so the modal can
  // render its tabs without re-fetching.
  const [settingsChannel, setSettingsChannel] = useState(null);

  const loadChannels = useCallback(async ({ preferSlug } = {}) => {
    try {
      const res = await chatService.listChannels();
      const rows = res.results || res || [];
      const mapped = rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name || (c.slug ? c.slug[0].toUpperCase() + c.slug.slice(1) : 'Channel'),
        description: c.description || (c.is_default ? 'All team members in the store' : ''),
        is_default: !!c.is_default,
        unread: c.unread_count || 0,
        memberCount: c.member_count || 0,
        lastMessagePreview: c.last_message_preview || '',
        lastMessageAtIso: c.last_message_at || null,
        // Raw fields the settings modal needs without re-fetching:
        allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles : [],
        created_by: c.created_by ?? null,
      }));
      setChats(mapped);
      if (preferSlug) {
        const target = mapped.find((m) => m.slug === preferSlug);
        if (target) setSelectedChat(target.id);
      }
      return mapped;
    } catch (err) {
      console.error('Failed to load chat channels:', err);
      return [];
    }
  }, []);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  const loadMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const res = await chatService.listMessages(selectedChat);
      const rows = res.results || res || [];
      setMessages(rows.map((m) => ({
        id: m.id,
        user: m.author_name || 'Anonymous',
        avatar: m.author_initials || '??',
        message: m.body || '',
        time: formatTime(m.created_at),
        isOwn: user && m.author === user.id,
      })));
      await chatService.markRead(selectedChat);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  }, [selectedChat, user]);

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [loadMessages]);

  const currentChat = chats.find(c => c.id === selectedChat);

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.trim().toLowerCase();
    return chats.filter(c =>
      c.name.toLowerCase().includes(q)
      || (c.description || '').toLowerCase().includes(q)
    );
  }, [chats, search]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;
    const body = messageText.trim();
    setMessageText('');
    try {
      await chatService.sendMessage({ channel: selectedChat, body });
      await loadMessages();
      await loadChannels();
    } catch (err) {
      console.error('Send message failed:', err);
      setMessageText(body);
    }
  };

  const openNewChannel = () => {
    // Image 2: "Create a custom group to chat with specific team members."
    // Any authenticated user can spin up a custom group; the backend
    // auto-tags them as the creator (gets the crown + ownership rights).
    setNewChannelError('');
    setNewChannelModal({ name: '', description: '' });
  };

  const submitNewChannel = async () => {
    if (!newChannelModal) return;
    const name = (newChannelModal.name || '').trim();
    if (!name) {
      setNewChannelError('Channel name is required.');
      throw new Error('Missing name');
    }
    const slug = slugifyChannelName(name);
    if (!slug) {
      setNewChannelError('Channel name must contain at least one letter or number.');
      throw new Error('Bad slug');
    }
    try {
      const created = await chatService.createChannel({
        name, slug,
        description: (newChannelModal.description || '').trim(),
      });
      setNewChannelModal(null);
      await loadChannels({ preferSlug: created?.slug || slug });
    } catch (err) {
      console.error('Create channel failed:', err);
      const detail = err?.data
        ? Object.entries(err.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' • ')
        : (err?.message || 'Could not create channel — manager role required.');
      setNewChannelError(detail);
      throw err;
    }
  };

  return (
    <div className="tc-page">
      <header className="tc-page-head">
        {onBack && (
          <button className="tc-back" onClick={onBack} aria-label="Back">
            <IconBack size={18} />
          </button>
        )}
        <h1 className="tc-page-title">Team Chat</h1>
      </header>

      <div className="tc-shell">
        {/* ===== Sidebar: Groups ===== */}
        <aside className="tc-sidebar">
          <div className="tc-sidebar-head">
            <h2 className="tc-sidebar-title">Groups</h2>
          </div>

          <div className="tc-sidebar-controls">
            <div className="tc-search">
              <IconSearch size={14} />
              <input
                type="text"
                placeholder="Search groups…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* + button is open to any authenticated user — they own any
                group they create (image 2 reads "Create a custom group"). */}
            <button className="tc-new-btn" onClick={openNewChannel} aria-label="New group" title="New group">
              <IconPlus size={18} />
            </button>
          </div>

          <div className="tc-group-list">
            {filteredChats.map(c => {
              const isOwner = c.created_by && user?.id === c.created_by;
              return (
                <button
                  key={c.id}
                  className={`tc-group ${selectedChat === c.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedChat(c.id)}
                >
                  <span
                    className={`tc-group-icon ${c.is_default ? 'is-default' : 'is-custom'}`}
                    aria-hidden="true"
                  >
                    {c.is_default ? <IconStore size={18} /> : <IconBubble size={18} />}
                  </span>
                  <div className="tc-group-body">
                    <div className="tc-group-row1">
                      <span className="tc-group-name">
                        {c.name}
                        {isOwner && (
                          <span className="tc-owner-crown" title="You created this group">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l4 4 4-6 4 6 4-4 2 14H4z"/></svg>
                          </span>
                        )}
                      </span>
                      {c.unread > 0 && <span className="tc-unread">{c.unread}</span>}
                    </div>
                    <div className="tc-group-meta">
                      {c.is_default
                        ? <span className="tc-pill tc-pill-store">Store</span>
                        : <span className="tc-pill tc-pill-custom">Custom</span>}
                      <span className="tc-meta-members">
                        <IconUsers size={11} /> {c.memberCount}
                      </span>
                      {c.lastMessageAtIso && (
                        <span className="tc-meta-time">{formatRelative(c.lastMessageAtIso)}</span>
                      )}
                    </div>
                    {c.description && (
                      <div className="tc-group-desc">{c.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
            {filteredChats.length === 0 && (
              <div className="tc-side-empty">
                {search.trim()
                  ? <>No groups match "{search}".</>
                  : <>No groups yet. Tap + to create one.</>
                }
              </div>
            )}
          </div>
        </aside>

        {/* ===== Main: thread or empty state ===== */}
        <main className="tc-main">
          {!currentChat ? (
            <div className="tc-ready">
              <div className="tc-ready-icon" aria-hidden="true">
                <IconBubble size={36} />
              </div>
              <h2 className="tc-ready-title">Ready to Connect! 🎉</h2>
              <p className="tc-ready-sub">
                Choose a group from the sidebar to start chatting with your amazing team!
              </p>
              <p className="tc-ready-feats">
                <span>💬 Share updates</span> · <span>🤝 Collaborate</span> · <span>🎯 Stay connected</span>
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="tc-thread-head"
                onClick={() => setSettingsChannel(currentChat)}
                aria-label="Group settings"
                title="Group settings"
              >
                <span className="tc-thread-icon" aria-hidden="true">
                  {currentChat.is_default ? <IconStore size={16} /> : <IconBubble size={16} />}
                </span>
                <div className="tc-thread-titles">
                  <span className="tc-thread-name">
                    {currentChat.name}
                    {currentChat.created_by && user?.id === currentChat.created_by && (
                      <span className="tc-owner-crown" title="You created this group">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l4 4 4-6 4 6 4-4 2 14H4z"/></svg>
                      </span>
                    )}
                  </span>
                  <span className="tc-thread-sub">
                    {currentChat.memberCount} member{currentChat.memberCount === 1 ? '' : 's'}
                    {currentChat.description ? ` · ${currentChat.description}` : ''}
                  </span>
                </div>
                <span className="tc-thread-info" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </span>
              </button>

              <div className="tc-messages">
                {messages.length === 0 && (
                  <div className="tc-thread-empty">
                    No messages yet — be the first to say hi!
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`tc-msg ${m.isOwn ? 'is-own' : ''}`}>
                    <div className="tc-msg-avatar" aria-hidden="true">{m.avatar}</div>
                    <div className="tc-msg-body">
                      <div className="tc-msg-meta">
                        <span className="tc-msg-user">{m.user}</span>
                        <span className="tc-msg-time">{m.time}</span>
                      </div>
                      <div className="tc-msg-text">{m.message}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="tc-input-bar">
                <input
                  type="text"
                  className="tc-input"
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                />
                <button
                  className="tc-send"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  aria-label="Send message"
                >
                  <IconSend size={16} />
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create-group modal — matches image 2: "Create New Group" with the
          subtitle "Create a custom group to chat with specific team
          members." */}
      <FormModal
        isOpen={!!newChannelModal}
        title="Create New Group"
        submitLabel="Create Group"
        size="sm"
        onClose={() => setNewChannelModal(null)}
        onSubmit={submitNewChannel}
        submitDisabled={!newChannelModal?.name?.trim()}
        errorMessage={newChannelError}
      >
        <p className="tc-modal-subtitle">
          Create a custom group to chat with specific team members.
        </p>
        <TextField
          label="Group Name"
          value={newChannelModal?.name || ''}
          onChange={(v) => setNewChannelModal((m) => m && ({ ...m, name: v }))}
          placeholder="e.g., Morning Crew, Closing Team"
          required
          autoFocus
        />
        <TextArea
          label="Description (Optional)"
          value={newChannelModal?.description || ''}
          onChange={(v) => setNewChannelModal((m) => m && ({ ...m, description: v }))}
          placeholder="Brief description of the group's purpose"
          rows={3}
        />
      </FormModal>

      {/* Group settings modal — opens from clicking the thread header. */}
      <ChatGroupSettingsModal
        isOpen={!!settingsChannel}
        channel={settingsChannel}
        user={user}
        canManage={
          // Same rule the backend enforces: manager+ OR the channel's
          // creator can edit the group.
          isManagerOrAbove(user)
          || (!!settingsChannel?.created_by && settingsChannel.created_by === user?.id)
        }
        onClose={() => setSettingsChannel(null)}
        onChanged={async () => {
          // Refresh the sidebar so name/description/member-count etc. are
          // up to date, but keep the modal open.
          const refreshed = await loadChannels();
          const next = refreshed.find((c) => c.id === settingsChannel?.id);
          if (next) setSettingsChannel(next);
        }}
        onDeleted={async () => {
          // Group was deleted (or current user left). Drop the selection
          // and close the modal.
          setSettingsChannel(null);
          if (selectedChat === settingsChannel?.id) setSelectedChat(null);
          await loadChannels();
        }}
      />
    </div>
  );
};

export default TeamChat;
