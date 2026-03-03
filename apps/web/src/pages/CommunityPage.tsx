import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  role: string;
}

interface CommunityPost {
  id: string;
  propertyId: string;
  userId: string;
  content: string;
  type: 'ANNOUNCEMENT' | 'DISCUSSION' | 'LOST_FOUND' | 'EVENT';
  parentId?: string;
  pinned: boolean;
  createdAt: string;
  user: User;
  replies?: CommunityPost[];
}

export default function CommunityPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'DISCUSSION' | 'ANNOUNCEMENT' | 'LOST_FOUND' | 'EVENT'>('DISCUSSION');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    // Fetch posts
    fetchPosts();

    // Socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || ''); // API URL
    setSocket(newSocket);

    newSocket.emit('join-community-room', { propertyId });

    newSocket.on('new-post', (post: CommunityPost) => {
      setPosts(prev => [post, ...prev]);
    });

    newSocket.on('new-reply', (reply: CommunityPost) => {
      setPosts(prev => prev.map(p => p.id === reply.parentId ? { ...p, replies: [...(p.replies || []), reply] } : p));
    });

    return () => {
      newSocket.emit('leave-community-room', { propertyId });
      newSocket.disconnect();
    };
  }, [propertyId]);

  const API = import.meta.env.VITE_API_URL || '';

  const fetchPosts = async () => {
    const response = await fetch(`${API}/api/community/${propertyId}/posts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    setPosts(data);
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;

    await fetch(`${API}/api/community/${propertyId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content: newPost, type: postType })
    });

    setNewPost('');
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return;

    await fetch(`${API}/api/community/${propertyId}/posts/${postId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content: replyContent })
    });

    setReplyContent('');
    setReplyingTo(null);
  };

  const handleModerate = async (postId: string, action: 'pin' | 'unpin' | 'delete') => {
    await fetch(`${API}/api/community/${propertyId}/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ action })
    });
  };

  const renderPost = (post: CommunityPost, isReply = false) => (
    <div key={post.id} className={`border p-3 sm:p-4 mb-4 rounded-lg ${post.pinned ? 'border-orange-500 bg-orange-50' : 'border-gray-300'} ${isReply ? 'ml-4 sm:ml-8' : ''}`}>
      {post.pinned && <div className="bg-orange-500 text-white px-2 py-1 text-sm">📌 Announcement</div>}
      <div className="flex justify-between">
        <strong>{post.user.name} ({post.type})</strong>
        <span>{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <p>{post.content}</p>
      <div className="mt-2">
        {!isReply && <button onClick={() => setReplyingTo(post.id)} className="text-blue-500 mr-2">Reply</button>}
        {/* Moderation buttons for landlord */}
        {post.user.role === 'LANDLORD' && (
          <>
            <button onClick={() => handleModerate(post.id, post.pinned ? 'unpin' : 'pin')} className="text-yellow-500 mr-2">
              {post.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => handleModerate(post.id, 'delete')} className="text-red-500">Delete</button>
          </>
        )}
      </div>
      {replyingTo === post.id && (
        <div className="mt-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="w-full p-2 border rounded"
          />
          <button onClick={() => handleReply(post.id)} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">Reply</button>
          <button onClick={() => setReplyingTo(null)} className="mt-2 ml-2 bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      )}
      {post.replies?.map(reply => renderPost(reply, true))}
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Fie Wura Property Community</h1>

      {/* New Post Input */}
      <div className="mb-6">
        <select value={postType} onChange={(e) => setPostType(e.target.value as any)} className="mr-2 p-2 border rounded">
          <option value="DISCUSSION">Discussion</option>
          <option value="ANNOUNCEMENT">Announcement</option>
          <option value="LOST_FOUND">Lost & Found</option>
          <option value="EVENT">Event</option>
        </select>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-2 border rounded mb-2"
        />
        <button onClick={handlePost} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          Post
        </button>
      </div>

      {/* Posts */}
      {posts.map(post => renderPost(post))}
    </div>
  );
}