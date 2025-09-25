-- Behavior Templates Table
CREATE TABLE IF NOT EXISTS behavior_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  behavior_id UUID NOT NULL REFERENCES behaviors(id) ON DELETE CASCADE,
  default_intensity INTEGER NOT NULL CHECK (default_intensity >= 1 AND default_intensity <= 5),
  default_duration_min INTEGER CHECK (default_duration_min > 0),
  antecedent_template TEXT,
  behavior_template TEXT,
  consequence_template TEXT,
  notes_template TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_behavior_templates_org_id ON behavior_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_behavior_templates_behavior_id ON behavior_templates(behavior_id);
CREATE INDEX IF NOT EXISTS idx_behavior_templates_created_by ON behavior_templates(created_by);

-- RLS Policies
ALTER TABLE behavior_templates ENABLE ROW LEVEL SECURITY;

-- Supervisors and staff can view templates in their org
CREATE POLICY templates_view_policy ON behavior_templates
  FOR SELECT
  USING (
    org_id = (
      SELECT org_id
      FROM users
      WHERE id = auth.uid()
      AND active = true
    )
  );

-- Only supervisors can insert templates
CREATE POLICY templates_insert_policy ON behavior_templates
  FOR INSERT
  WITH CHECK (
    org_id = (
      SELECT org_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'supervisor'
      AND active = true
    )
  );

-- Only supervisors can update templates in their org
CREATE POLICY templates_update_policy ON behavior_templates
  FOR UPDATE
  USING (
    org_id = (
      SELECT org_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'supervisor'
      AND active = true
    )
  );

-- Only supervisors can delete templates in their org
CREATE POLICY templates_delete_policy ON behavior_templates
  FOR DELETE
  USING (
    org_id = (
      SELECT org_id
      FROM users
      WHERE id = auth.uid()
      AND role = 'supervisor'
      AND active = true
    )
  );

-- Insert some sample templates for the demo org
DO $$
DECLARE
  demo_org_id UUID;
  supervisor_id UUID;
  aggression_behavior_id UUID;
  selfinjury_behavior_id UUID;
  property_behavior_id UUID;
BEGIN
  -- Get the demo org and supervisor
  SELECT id INTO demo_org_id FROM organizations WHERE name = 'Demo Behavioral Health Agency';
  SELECT id INTO supervisor_id FROM users WHERE email = 'supervisor@demo.com';

  -- Get behavior IDs
  SELECT id INTO aggression_behavior_id FROM behaviors WHERE name = 'Physical Aggression';
  SELECT id INTO selfinjury_behavior_id FROM behaviors WHERE name = 'Self-Injurious Behavior';
  SELECT id INTO property_behavior_id FROM behaviors WHERE name = 'Property Destruction';

  IF demo_org_id IS NOT NULL AND supervisor_id IS NOT NULL THEN
    -- Physical Aggression Template
    INSERT INTO behavior_templates (
      org_id, name, behavior_id, default_intensity, default_duration_min,
      antecedent_template, behavior_template, consequence_template, notes_template,
      created_by
    ) VALUES (
      demo_org_id,
      'Physical Aggression - Peer Conflict',
      aggression_behavior_id,
      3,
      2,
      'Peer took preferred item/activity',
      'Hit, kicked, or pushed peer',
      'Redirected to calm-down area, discussed appropriate requests',
      'Consider teaching replacement behavior for requesting items back'
    ) ON CONFLICT (org_id, name) DO NOTHING;

    -- Self-Injury Template
    INSERT INTO behavior_templates (
      org_id, name, behavior_id, default_intensity, default_duration_min,
      antecedent_template, behavior_template, consequence_template, notes_template,
      created_by
    ) VALUES (
      demo_org_id,
      'Self-Injury - Task Avoidance',
      selfinjury_behavior_id,
      4,
      1,
      'Presented with non-preferred task',
      'Head-banging, hand-biting',
      'Task modified/removed, comfort provided',
      'Break down task into smaller steps, increase reinforcement'
    ) ON CONFLICT (org_id, name) DO NOTHING;

    -- Property Destruction Template
    INSERT INTO behavior_templates (
      org_id, name, behavior_id, default_intensity, default_duration_min,
      antecedent_template, behavior_template, consequence_template, notes_template,
      created_by
    ) VALUES (
      demo_org_id,
      'Property Destruction - Attention Seeking',
      property_behavior_id,
      2,
      3,
      'Low attention from staff',
      'Threw materials, knocked over items',
      'Brief acknowledgment, redirected to appropriate attention-seeking behavior',
      'Increase scheduled attention, teach appropriate ways to request attention'
    ) ON CONFLICT (org_id, name) DO NOTHING;

    -- Quick Daily Check Template
    INSERT INTO behavior_templates (
      org_id, name, behavior_id, default_intensity, default_duration_min,
      antecedent_template, behavior_template, consequence_template, notes_template,
      created_by
    ) VALUES (
      demo_org_id,
      'Quick Incident - Physical Aggression',
      aggression_behavior_id,
      2,
      1,
      '',
      '',
      '',
      'Minor incident - see full assessment if pattern develops'
    ) ON CONFLICT (org_id, name) DO NOTHING;

    -- Positive Behavior Template
    INSERT INTO behavior_templates (
      org_id, name, behavior_id, default_intensity, default_duration_min,
      antecedent_template, behavior_template, consequence_template, notes_template,
      created_by
    ) VALUES (
      demo_org_id,
      'Self-Injury - Breakthrough Success',
      selfinjury_behavior_id,
      1,
      0,
      'Typical trigger situation occurred',
      'Used coping strategy instead of self-injury',
      'Praised and reinforced appropriate behavior',
      'Great progress! Continue reinforcing replacement behaviors'
    ) ON CONFLICT (org_id, name) DO NOTHING;
  END IF;
END $$;