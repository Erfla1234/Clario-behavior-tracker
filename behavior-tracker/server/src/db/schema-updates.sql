-- Add comments table for supervisors to comment on behavior logs
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  log_id UUID NOT NULL REFERENCES behavior_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add bulletin board for announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  author_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_comments_log_id ON comments(log_id);
CREATE INDEX idx_comments_org_id ON comments(org_id);
CREATE INDEX idx_announcements_org_id ON announcements(org_id);
CREATE INDEX idx_announcements_active ON announcements(active);

-- Add RLS policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_org_isolation ON comments
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::UUID);

-- Add RLS policies for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_org_isolation ON announcements
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::UUID);

-- Add notification preferences for staff
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  notify_new_logs BOOLEAN DEFAULT true,
  notify_comments BOOLEAN DEFAULT true,
  notify_announcements BOOLEAN DEFAULT true;

-- Create a view for today's logs with comments
CREATE OR REPLACE VIEW todays_logs_with_comments AS
SELECT
  bl.*,
  c.display_name as client_name,
  b.name as behavior_name,
  u.display_name as staff_name,
  COUNT(com.id) as comment_count,
  ARRAY_AGG(
    CASE WHEN com.id IS NOT NULL THEN
      json_build_object(
        'id', com.id,
        'content', com.content,
        'author', cu.display_name,
        'created_at', com.created_at
      )
    END
  ) FILTER (WHERE com.id IS NOT NULL) as comments
FROM behavior_logs bl
JOIN clients c ON bl.client_id = c.id
JOIN behaviors b ON bl.behavior_id = b.id
JOIN users u ON bl.staff_id = u.id
LEFT JOIN comments com ON bl.id = com.log_id
LEFT JOIN users cu ON com.user_id = cu.id
WHERE DATE(bl.logged_at) = CURRENT_DATE
GROUP BY bl.id, c.display_name, b.name, u.display_name;