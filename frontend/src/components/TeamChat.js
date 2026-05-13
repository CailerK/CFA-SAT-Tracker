import React, { useState } from 'react';
import './TeamChat.css';

const TeamChat = ({ onBack }) => {
  const [selectedChat, setSelectedChat] = useState('general');
  const [messageText, setMessageText] = useState('');

  const chats = [
    { id: 'general', name: 'General', unread: 0, lastMessage: 'Great work today!', lastTime: '2:30 PM' },
    { id: 'operations', name: 'Operations', unread: 2, lastMessage: 'Shift schedule updated', lastTime: '1:15 PM' },
    { id: 'kitchen', name: 'Kitchen', unread: 0, lastMessage: 'New menu items ready', lastTime: '12:45 PM' },
    { id: 'foh', name: 'FOH Team', unread: 1, lastMessage: 'Table 5 ready for seating', lastTime: '11:30 AM' }
  ];

  const messages = {
    general: [
      { id: 1, user: 'Sarah Johnson', avatar: 'SJ', message: 'Good morning team! Ready for today?', time: '9:00 AM', isOwn: false },
      { id: 2, user: 'You', avatar: 'YO', message: 'Morning! All set here.', time: '9:05 AM', isOwn: true },
      { id: 3, user: 'John Smith', avatar: 'JS', message: 'Let\'s have a great shift today', time: '9:10 AM', isOwn: false },
      { id: 4, user: 'Maria Garcia', avatar: 'MG', message: 'Great work today!', time: '2:30 PM', isOwn: false }
    ],
    operations: [
      { id: 5, user: 'Manager', avatar: 'M', message: 'Shift schedule updated for next week', time: '1:15 PM', isOwn: false },
      { id: 6, user: 'You', avatar: 'YO', message: 'Thanks for the update', time: '1:20 PM', isOwn: true }
    ],
    kitchen: [
      { id: 7, user: 'Chef', avatar: 'C', message: 'New menu items ready for service', time: '12:45 PM', isOwn: false }
    ],
    foh: [
      { id: 8, user: 'Host', avatar: 'H', message: 'Table 5 ready for seating', time: '11:30 AM', isOwn: false },
      { id: 9, user: 'You', avatar: 'YO', message: 'Got it, sending server now', time: '11:32 AM', isOwn: true }
    ]
  };

  const currentChat = chats.find(c => c.id === selectedChat);
  const currentMessages = messages[selectedChat] || [];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessageText('');
    }
  };

  return (
    <div className="team-chat-page">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-header-left">
            <button className="chat-back-btn" onClick={onBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="chat-title">Team Chat</h1>
          </div>
        </div>
      </header>

      <div className="chat-container">
        {/* Sidebar - Chat List */}
        <aside className="chat-sidebar">
          <div className="chat-list">
            {chats.map(chat => (
              <button
                key={chat.id}
                className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(chat.id)}
              >
                <div className="chat-item-content">
                  <div className="chat-item-header">
                    <span className="chat-item-name">{chat.name}</span>
                    {chat.unread > 0 && (
                      <span className="chat-unread-badge">{chat.unread}</span>
                    )}
                  </div>
                  <span className="chat-item-preview">{chat.lastMessage}</span>
                </div>
                <span className="chat-item-time">{chat.lastTime}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-main">
          {/* Chat Header */}
          <div className="chat-main-header">
            <h2 className="chat-main-title">{currentChat?.name}</h2>
            <div className="chat-main-actions">
              <button className="chat-action-btn" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
              <button className="chat-action-btn" aria-label="More options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {currentMessages.map(msg => (
              <div key={msg.id} className={`message ${msg.isOwn ? 'own' : ''}`}>
                <div className="message-avatar">{msg.avatar}</div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-user">{msg.user}</span>
                    <span className="message-time">{msg.time}</span>
                  </div>
                  <div className="message-text">{msg.message}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="chat-input-area">
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="chat-send-btn" onClick={handleSendMessage} aria-label="Send message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346272 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99701575 L3.03521743,10.4380088 C3.03521743,10.5951061 3.19218622,10.7522035 3.50612381,10.7522035 L16.6915026,11.5376905 C16.6915026,11.5376905 17.1624089,11.5376905 17.1624089,12.0089827 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeamChat;
