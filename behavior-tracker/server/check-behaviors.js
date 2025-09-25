const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkBehaviors() {
  try {
    console.log('Checking existing behaviors...');
    const result = await pool.query('SELECT id, name FROM behaviors ORDER BY name');
    console.log('Found behaviors:');
    result.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: "${row.name}"`);
    });
  } catch (error) {
    console.error('Error checking behaviors:', error);
  } finally {
    await pool.end();
  }
}

checkBehaviors();