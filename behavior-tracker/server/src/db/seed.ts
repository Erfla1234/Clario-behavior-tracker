import { pool } from './pool';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create demo organization
    const orgResult = await client.query(
      `INSERT INTO organizations (name)
       VALUES ('Demo Behavioral Health Agency')
       ON CONFLICT DO NOTHING
       RETURNING id`
    );

    let orgId;
    if (orgResult.rows.length > 0) {
      orgId = orgResult.rows[0].id;
    } else {
      const existingOrg = await client.query(
        `SELECT id FROM organizations WHERE name = 'Demo Behavioral Health Agency'`
      );
      orgId = existingOrg.rows[0].id;
    }

    // Create demo users
    const hashedPassword = await bcrypt.hash('demo123!', 10);

    await client.query(
      `INSERT INTO users (org_id, email, password_hash, display_name, role)
       VALUES
         ($1, 'supervisor@demo.com', $2, 'Dr. Sarah Johnson', 'supervisor'),
         ($1, 'staff@demo.com', $2, 'Michael Rodriguez', 'staff')
       ON CONFLICT (email) DO NOTHING`,
      [orgId, hashedPassword]
    );

    // Get user IDs
    const users = await client.query(
      `SELECT id, role FROM users WHERE org_id = $1`,
      [orgId]
    );

    // Create demo clients (de-identified)
    await client.query(
      `INSERT INTO clients (org_id, client_code, display_name)
       VALUES
         ($1, 'JD001', 'J.D.'),
         ($1, 'SM002', 'S.M.'),
         ($1, 'RB003', 'R.B.'),
         ($1, 'AL004', 'A.L.'),
         ($1, 'KT005', 'K.T.')
       ON CONFLICT (org_id, client_code) DO NOTHING`,
      [orgId]
    );

    // Create demo behaviors
    await client.query(
      `INSERT INTO behaviors (org_id, name, description)
       VALUES
         ($1, 'Verbal Outburst', 'Yelling, screaming, or loud verbal expressions'),
         ($1, 'Physical Aggression', 'Hitting, pushing, kicking, or throwing objects at others'),
         ($1, 'Self-Injury', 'Head banging, biting self, or other self-harm behaviors'),
         ($1, 'Property Destruction', 'Breaking, throwing, or damaging property'),
         ($1, 'Non-Compliance', 'Refusing to follow directions or participate in activities'),
         ($1, 'Elopement', 'Attempting to leave designated area without permission'),
         ($1, 'Inappropriate Language', 'Using profanity or sexually explicit language')
       ON CONFLICT DO NOTHING`,
      [orgId]
    );

    // Get client and behavior IDs for sample logs
    const clients = await client.query(
      `SELECT id, client_code FROM clients WHERE org_id = $1`,
      [orgId]
    );

    const behaviors = await client.query(
      `SELECT id FROM behaviors WHERE org_id = $1`,
      [orgId]
    );

    const staffUser = users.rows.find(u => u.role === 'staff');

    // Create sample behavior logs (last 30 days)
    if (staffUser && clients.rows.length > 0 && behaviors.rows.length > 0) {
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);

        // Random number of incidents per day (0-3)
        const incidentCount = Math.floor(Math.random() * 4);

        for (let i = 0; i < incidentCount; i++) {
          const selectedClient = clients.rows[Math.floor(Math.random() * clients.rows.length)];
          const behavior = behaviors.rows[Math.floor(Math.random() * behaviors.rows.length)];

          // Random time during the day
          const hour = Math.floor(Math.random() * 10) + 8; // 8 AM to 6 PM
          const minute = Math.floor(Math.random() * 60);
          date.setHours(hour, minute, 0, 0);

          await client.query(
            `INSERT INTO behavior_logs (
              org_id, client_id, staff_id, behavior_id, intensity,
              duration_min, antecedent, behavior_observed, consequence,
              notes, incident, logged_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              orgId,
              selectedClient.id,
              staffUser.id,
              behavior.id,
              Math.floor(Math.random() * 5) + 1, // intensity 1-5
              Math.floor(Math.random() * 30) + 1, // duration 1-30 min
              'Transition between activities',
              'Client became agitated during instruction',
              'Provided redirection and calming strategies',
              'Client responded well to intervention after 5 minutes',
              Math.random() > 0.7, // 30% chance of being marked as incident
              date.toISOString()
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
    console.log('Demo credentials:');
    console.log('  Supervisor: supervisor@demo.com / demo123!');
    console.log('  Staff: staff@demo.com / demo123!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch(console.error);
}

export { seed };