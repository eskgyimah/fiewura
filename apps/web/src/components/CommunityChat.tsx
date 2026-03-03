import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  type: 'ANNOUNCEMENT' | 'DISCUSSION';
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface CommunityChatProps {
  propertyId: string;
}

export default function CommunityChat({ propertyId }: CommunityChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'DISCUSSION' | 'ANNOUNCEMENT'>('DISCUSSION');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchMessages();

    // Connect socket
    socketRef.current = io(import.meta.env.VITE_API_URL);
    const socket = socketRef.current;

    // Join property room
    socket.emit('join-property-room', { propertyId });

    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for deleted messages
    socket.on('message-deleted', (messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    return () => {
      socket.emit('leave-property-room', { propertyId });
      socket.disconnect();
    };
  }, [propertyId]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${propertyId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${propertyId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newMessage,
          type: messageType
        })
      });

      if (response.ok) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/community/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Get latest announcement
  const latestAnnouncement = messages
    .filter(m => m.type === 'ANNOUNCEMENT')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <div>Loading community...</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Announcement Banner */}
      {latestAnnouncement && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                <strong>Announcement:</strong> {latestAnnouncement.content}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                By {latestAnnouncement.user.name} • {new Date(latestAnnouncement.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.user.id === localStorage.getItem('userId') ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.type === 'ANNOUNCEMENT'
                ? 'bg-orange-100 text-orange-800'
                : message.user.id === localStorage.getItem('userId')
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-75 mt-1">
                {message.user.name} • {new Date(message.createdAt).toLocaleString()}
              </p>
              {message.type === 'ANNOUNCEMENT' && (
                <span className="inline-block bg-orange-500 text-white text-xs px-2 py-1 rounded mt-1">
                  Announcement
                </span>
              )}
            </div>
            {/* Delete button for landlord */}
            {['LANDLORD', 'FIEWURA'].includes(localStorage.getItem('role') || '') && (
              <button
                onClick={() => deleteMessage(message.id)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as 'DISCUSSION' | 'ANNOUNCEMENT')}
            className="border rounded px-2 py-1"
          >
            <option value="DISCUSSION">Discussion</option>
            <option value="ANNOUNCEMENT">Announcement</option>
          </select>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={sendMessage}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}