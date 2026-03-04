import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import BottomNav from '../components/BottomNav';

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

const API = import.meta.env.VITE_API_URL || '';

export default function CommunityPage() {
  const { propertyId: paramId } = useParams<{ propertyId: string }>();
  const [propertyId, setPropertyId] = useState<string | null>(paramId || null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'DISCUSSION' | 'ANNOUNCEMENT' | 'LOST_FOUND' | 'EVENT'>('DISCUSSION');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  // Resolve propertyId if not in URL
  useEffect(() => {
    if (propertyId) { setLoading(false); return; }
    const resolve = async () => {
      try {
        const res = await fetch(`${API}/properties`, { headers });
        if (res.ok) {
          const props = await res.json();
          if (props.length > 0) setPropertyId(props[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    resolve();
  }, []);

  useEffect(() => {
    if (!propertyId) return;

    const fetchPosts = async () => {
      try {
        const res = await fetch(`${API}/community/${propertyId}/posts`, { headers });
        if (res.ok) setPosts(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchPosts();

    const newSocket = io(API, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
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

  const handlePost = async () => {
    if (!newPost.trim() || !propertyId) return;
    try {
      await fetch(`${API}/community/${propertyId}/posts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost, type: postType }),
      });
      setNewPost('');
    } catch (e) { console.error(e); }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim() || !propertyId) return;
    try {
      await fetch(`${API}/community/${propertyId}/posts/${postId}/reply`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });
      setReplyContent('');
      setReplyingTo(null);
    } catch (e) { console.error(e); }
  };

  const handleModerate = async (postId: string, action: 'pin' | 'unpin' | 'delete') => {
    if (!propertyId) return;
    await fetch(`${API}/community/${propertyId}/posts/${postId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!propertyId) return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-purple-600 text-white p-4">
        <h1 className="text-xl font-bold">Community</h1>
      </div>
      <div className="p-4 text-center py-16">
        <p className="text-4xl mb-4">👥</p>
        <p className="text-gray-600 font-medium">No property community yet</p>
        <p className="text-gray-400 text-sm mt-2">Join a property to access its community board</p>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-purple-600 text-white p-4">
        <h1 className="text-xl font-bold">Community</h1>
        <p className="text-purple-100 text-sm">{posts.length} posts</p>
      </div>

      <div className="p-4">
        {/* New Post */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <select value={postType} onChange={e => setPostType(e.target.value as any)}
            className="w-full p-2 border rounded-lg text-sm mb-2">
            <option value="DISCUSSION">Discussion</option>
            <option value="ANNOUNCEMENT">Announcement</option>
            <option value="LOST_FOUND">Lost & Found</option>
            <option value="EVENT">Event</option>
          </select>
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
            placeholder="What's on your mind?" className="w-full p-2 border rounded-lg text-sm h-20 mb-2" />
          <button onClick={handlePost}
            className="w-full bg-purple-500 text-white py-2 rounded-lg font-medium text-sm">Post</button>
        </div>

        {/* Posts */}
        {posts.length === 0 && <p className="text-center text-gray-500 py-8">No posts yet. Start the conversation!</p>}
        {posts.map(post => (
          <div key={post.id} className={`bg-white rounded-lg shadow-sm border p-4 mb-3 ${post.pinned ? 'border-orange-400 bg-orange-50' : ''}`}>
            {post.pinned && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded mb-2 inline-block">Pinned</span>}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{post.user.name}</p>
                <p className="text-xs text-gray-400">{post.type} &middot; {new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-800 mt-2">{post.content}</p>

            <div className="flex gap-3 mt-2 text-xs">
              <button onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)} className="text-purple-500 font-medium">Reply</button>
              {user.role === 'LANDLORD' && (
                <>
                  <button onClick={() => handleModerate(post.id, post.pinned ? 'unpin' : 'pin')} className="text-yellow-600">{post.pinned ? 'Unpin' : 'Pin'}</button>
                  <button onClick={() => handleModerate(post.id, 'delete')} className="text-red-500">Delete</button>
                </>
              )}
            </div>

            {replyingTo === post.id && (
              <div className="mt-2 flex gap-2">
                <input value={replyContent} onChange={e => setReplyContent(e.target.value)}
                  placeholder="Reply..." className="flex-1 p-2 border rounded text-sm" />
                <button onClick={() => handleReply(post.id)} className="bg-purple-500 text-white px-3 py-2 rounded text-sm">Send</button>
              </div>
            )}

            {(post.replies || []).map(reply => (
              <div key={reply.id} className="ml-4 mt-2 pl-3 border-l-2 border-purple-200">
                <p className="text-xs font-medium">{reply.user.name}</p>
                <p className="text-sm text-gray-700">{reply.content}</p>
                <p className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
