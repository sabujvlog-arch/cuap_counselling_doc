import { initDb, query } from './config/db';

const test = async () => {
  try {
    await initDb();
    const res = await query('SELECT COUNT(*) AS count FROM users');
    console.log('Successfully connected to database. User count:', res.rows[0].count);
  } catch (err) {
    console.error('Database connection test failed:', err);
  }
};

test();
