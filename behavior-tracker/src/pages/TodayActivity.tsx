import { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AppProvider';
import { format } from 'date-fns';
import { apiAdapter } from '../data/adapters/api';

interface LogWithComments {
  id: string;
  client_name: string;
  behavior_name: string;
  staff_name: string;
  intensity: number;
  duration_min: number;
  notes: string;
  logged_at: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
}

export function TodayActivity() {
  const { auth } = useAuth();
  const [logs, setLogs] = useState<LogWithComments[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [showCommentBox, setShowCommentBox] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchTodaysLogs();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchTodaysLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaysLogs = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await apiAdapter.logs.list({
        date_from: today,
        date_to: today
      });

      // Fetch comments for each log
      const logsWithComments = await Promise.all(
        response.map(async (log: any) => {
          const comments = await apiAdapter.api.get(`/comments/log/${log.id}`);
          return { ...log, comments: comments.data };
        })
      );

      setLogs(logsWithComments);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (logId: string) => {
    if (!newComment[logId]?.trim()) return;

    try {
      await apiAdapter.api.post(`/comments/log/${logId}`, {
        content: newComment[logId]
      });
      setNewComment({ ...newComment, [logId]: '' });
      setShowCommentBox({ ...showCommentBox, [logId]: false });
      fetchTodaysLogs(); // Refresh to show new comment
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getIntensityColor = (intensity: number) => {
    const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
    return colors[intensity - 1] || '#64748b';
  };

  if (loading) {
    return <div className="loading">Loading today's activity...</div>;
  }

  return (
    <div className="page-container">
      <div className="nav">
        <div className="nav-brand">📋 Today's Activity</div>
        <div className="nav-links">
          <a href="/log" className="nav-link">Log Behavior</a>
          <a href="/today" className="nav-link active">Today's Activity</a>
          <a href="/history" className="nav-link">History</a>
          <a href="/bulletin" className="nav-link">Bulletin Board</a>
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
          <h1>Today's Activity Feed</h1>
          <p>Real-time view of all behavior logs for {format(new Date(), 'MMMM d, yyyy')}</p>
          <p className="text-muted">Auto-refreshes every 30 seconds</p>
        </div>

        {logs.length === 0 ? (
          <div className="no-data">
            <p>No behavior logs recorded today yet.</p>
          </div>
        ) : (
          <div className="activity-feed">
            {logs.map((log) => (
              <div key={log.id} className="activity-card">
                <div className="activity-header">
                  <div className="activity-client">
                    <strong>{log.client_name}</strong>
                    <span className="activity-time">
                      {format(new Date(log.logged_at), 'h:mm a')}
                    </span>
                  </div>
                  <div
                    className="intensity-badge"
                    style={{ backgroundColor: getIntensityColor(log.intensity) }}
                  >
                    Intensity {log.intensity}
                  </div>
                </div>

                <div className="activity-body">
                  <div className="activity-details">
                    <span className="detail-label">Behavior:</span> {log.behavior_name}
                  </div>
                  <div className="activity-details">
                    <span className="detail-label">Duration:</span> {log.duration_min} minutes
                  </div>
                  <div className="activity-details">
                    <span className="detail-label">Staff:</span> {log.staff_name}
                  </div>
                  {log.notes && (
                    <div className="activity-notes">
                      <span className="detail-label">Notes:</span>
                      <p>{log.notes}</p>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="comments-section">
                  {log.comments && log.comments.length > 0 && (
                    <div className="comments-list">
                      <h4>Supervisor Comments:</h4>
                      {log.comments.map((comment) => (
                        <div key={comment.id} className="comment">
                          <div className="comment-header">
                            <strong>{comment.author_name}</strong>
                            <span className="comment-time">
                              {format(new Date(comment.created_at), 'h:mm a')}
                            </span>
                          </div>
                          <p className="comment-content">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {auth?.user?.role === 'supervisor' && (
                    <div className="add-comment">
                      {showCommentBox[log.id] ? (
                        <div className="comment-input-group">
                          <textarea
                            value={newComment[log.id] || ''}
                            onChange={(e) => setNewComment({
                              ...newComment,
                              [log.id]: e.target.value
                            })}
                            placeholder="Add a comment..."
                            className="comment-input"
                          />
                          <div className="comment-actions">
                            <button
                              onClick={() => handleAddComment(log.id)}
                              className="btn-primary btn-small"
                            >
                              Post
                            </button>
                            <button
                              onClick={() => setShowCommentBox({
                                ...showCommentBox,
                                [log.id]: false
                              })}
                              className="btn-secondary btn-small"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCommentBox({
                            ...showCommentBox,
                            [log.id]: true
                          })}
                          className="btn-link"
                        >
                          Add Comment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}