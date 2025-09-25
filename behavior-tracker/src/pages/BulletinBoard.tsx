import { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AppProvider';
import { format } from 'date-fns';
import { Nav } from '../components/Nav';
// import { apiAdapter } from '../data/adapters/api'; // Will use when API is ready

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  author_name: string;
  author_role: string;
  created_at: string;
  expires_at?: string;
}

export function BulletinBoard() {
  const { auth } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal' as const,
    expires_at: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      // For now, using mock data. Will implement when API is ready
      const mockAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'Team Meeting Tomorrow',
          content: 'Don\'t forget about our weekly team meeting at 9 AM in the conference room.',
          priority: 'high',
          author_name: 'Sarah Johnson',
          author_role: 'supervisor',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expires_at: undefined
        },
        {
          id: '2',
          title: 'New Safety Protocol',
          content: 'Please review the updated safety protocols for managing aggressive behaviors.',
          priority: 'urgent',
          author_name: 'Mike Williams',
          author_role: 'supervisor',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: undefined
        }
      ];
      setAnnouncements(mockAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;

    try {
      // Mock implementation - in production, this would call the API
      const newItem: Announcement = {
        id: Date.now().toString(),
        ...newAnnouncement,
        author_name: auth?.user?.display_name || 'Current User',
        author_role: auth?.user?.role || 'staff',
        created_at: new Date().toISOString(),
        expires_at: newAnnouncement.expires_at || undefined
      };
      setAnnouncements(prev => [newItem, ...prev]);
      setNewAnnouncement({ title: '', content: '', priority: 'normal', expires_at: '' });
      setShowNewForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this announcement?')) return;

    try {
      // Mock implementation - in production, this would call the API
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'normal': return '#3b82f6';
      case 'low': return '#64748b';
      default: return '#64748b';
    }
  };

  if (loading) {
    return <div className="loading">Loading bulletin board...</div>;
  }

  return (
    <div className="page-container">
      <div className="nav">
        <div className="nav-brand">📢 Bulletin Board</div>
        <div className="nav-links">
          <a href="/log" className="nav-link">Log Behavior</a>
          <a href="/today" className="nav-link">Today's Activity</a>
          <a href="/history" className="nav-link">History</a>
          <a href="/bulletin" className="nav-link active">Bulletin Board</a>
          {auth?.user?.role === 'supervisor' && (
            <a href="/reports" className="nav-link">Reports</a>
          )}
        </div>
        <div className="nav-user">
          <span className={`badge badge-${auth?.user?.role}`}>
            {auth?.user?.role}
          </span>
          <span>{auth?.user?.display_name}</span>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h1>Team Bulletin Board</h1>
          <p>Important announcements and updates for all staff</p>
        </div>

        <div className="bulletin-actions">
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="btn-primary"
          >
            + Post Announcement
          </button>
        </div>

        {showNewForm && (
          <div className="announcement-form card">
            <h3>New Announcement</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({
                    ...newAnnouncement,
                    title: e.target.value
                  })}
                  placeholder="Announcement title..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({
                    ...newAnnouncement,
                    content: e.target.value
                  })}
                  placeholder="Write your announcement..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newAnnouncement.priority}
                    onChange={(e) => setNewAnnouncement({
                      ...newAnnouncement,
                      priority: e.target.value as any
                    })}
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="normal">🔵 Normal</option>
                    <option value="low">⚪ Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Expires (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newAnnouncement.expires_at}
                    onChange={(e) => setNewAnnouncement({
                      ...newAnnouncement,
                      expires_at: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Post Announcement
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {announcements.length === 0 ? (
          <div className="no-data">
            <p>No announcements posted yet.</p>
          </div>
        ) : (
          <div className="announcements-list">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="announcement-card">
                <div className="announcement-header">
                  <div className="announcement-title-row">
                    <h3>{announcement.title}</h3>
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                    >
                      {announcement.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="announcement-meta">
                    <span>Posted by {announcement.author_name}</span>
                    <span> • </span>
                    <span>{format(new Date(announcement.created_at), 'MMM d, h:mm a')}</span>
                    {announcement.expires_at && (
                      <>
                        <span> • </span>
                        <span className="expires-badge">
                          Expires {format(new Date(announcement.expires_at), 'MMM d')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="announcement-content">
                  {announcement.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>

                {(auth?.user?.role === 'supervisor' ||
                  announcement.author_name === auth?.user?.display_name) && (
                  <div className="announcement-actions">
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="btn-link text-danger"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}