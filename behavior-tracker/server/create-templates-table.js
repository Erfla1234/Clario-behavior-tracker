const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTemplatesTable() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'src/db/templates-simple.sql'), 'utf8');

    console.log('Creating behavior templates table...');
    await pool.query(sql);
    console.log('✓ Behavior templates table created successfully with sample data');
  } catch (error) {
    console.error('Error creating templates table:', error);
  } finally {
    await pool.end();
  }
}

createTemplatesTable();