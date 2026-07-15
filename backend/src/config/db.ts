import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const usePostgres = process.env.DB_TYPE === 'postgres' || !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

export const initDb = async (): Promise<void> => {
  if (usePostgres) {
    console.log('Attempting to connect to PostgreSQL...');
    try {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wccms',
        connectionTimeoutMillis: 5000,
      });
      // Test connection
      await pgPool.query('SELECT NOW()');
      console.log('Successfully connected to PostgreSQL.');
      await createPostgresTables();
      await seedDefaultAdmin();
      return;
    } catch (err) {
      console.error('PostgreSQL connection failed. Falling back to SQLite.', err);
      pgPool = null;
    }
  }

  // SQLite fallback
  console.log('Initializing SQLite database...');
  const dbPath = path.resolve(__dirname, '../../wccms.db');
  const dbExists = fs.existsSync(dbPath);
  
  sqliteDb = new sqlite3.Database(dbPath);
  
  // Enable foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON');

  await createSqliteTables();
  await seedDefaultAdmin();
  console.log(`SQLite database initialized at: ${dbPath}`);
};

// Generic query executor
export const query = async (text: string, params: any[] = []): Promise<any> => {
  if (pgPool) {
    const res = await pgPool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } else if (sqliteDb) {
    let sqliteText = text;
    sqliteText = sqliteText.replace(/\$[0-9]+/g, '?');

    return new Promise((resolve, reject) => {
      const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        sqliteDb!.all(sqliteText, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', sqliteText, params, err);
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length });
          }
        });
      } else {
        sqliteDb!.run(sqliteText, params, function (err) {
          if (err) {
            console.error('SQLite execute error:', sqliteText, params, err);
            reject(err);
          } else {
            resolve({ 
              rows: [], 
              rowCount: this.changes, 
              lastInsertId: this.lastID 
            });
          }
        });
      }
    });
  } else {
    throw new Error('Database not initialized');
  }
};

const createPostgresTables = async (): Promise<void> => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL, -- admin, provider, student
      otp_code VARCHAR(10),
      otp_expires_at TIMESTAMP WITH TIME ZONE,
      two_factor_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS providers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      employee_id VARCHAR(100) UNIQUE NOT NULL,
      department VARCHAR(255) NOT NULL,
      qualification VARCHAR(255) NOT NULL,
      specialization VARCHAR(255) NOT NULL,
      photo_url TEXT,
      signature_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      registration_number VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      age INTEGER NOT NULL,
      gender VARCHAR(50) NOT NULL,
      dob DATE NOT NULL,
      department VARCHAR(255) NOT NULL,
      semester VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      hostel_scholar VARCHAR(50) NOT NULL,
      emergency_contact VARCHAR(255) NOT NULL,
      emergency_phone VARCHAR(20) NOT NULL,
      blood_group VARCHAR(10) NOT NULL,
      address TEXT NOT NULL,
      informed_consent_signed BOOLEAN DEFAULT FALSE,
      consent_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
      slot_date DATE NOT NULL,
      slot_time VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled, completed
      reason TEXT NOT NULL,
      qr_code TEXT,
      waitlist_position INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      
      -- Expanded Case History
      presenting_complaint TEXT NOT NULL,
      history TEXT NOT NULL,
      past_psychiatric TEXT,
      past_medical TEXT,
      medication_history TEXT,
      family_history TEXT,
      developmental_history TEXT,
      educational_history TEXT,
      occupational_history TEXT,
      relationship_history TEXT,
      substance_use TEXT,
      legal_history TEXT,
      social_history TEXT,
      trauma_history TEXT,
      personality_traits TEXT,
      protective_factors TEXT,
      strengths TEXT,
      
      mse TEXT NOT NULL, -- Short clinical summary
      diagnosis TEXT NOT NULL,
      differential_diagnosis TEXT,
      case_formulation TEXT NOT NULL,
      risk_assessment TEXT NOT NULL,
      
      -- SOAP Notes
      subjective TEXT NOT NULL,
      objective TEXT NOT NULL,
      assessment TEXT NOT NULL,
      plan TEXT NOT NULL,
      
      -- Homework & Intervention
      intervention_used VARCHAR(255),
      homework_assigned TEXT,
      session_duration INTEGER DEFAULT 50, -- in minutes
      
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mse_logs (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      appearance TEXT,
      behaviour TEXT,
      speech TEXT,
      mood_affect TEXT,
      thought_process TEXT,
      thought_content TEXT,
      perception TEXT,
      cognition TEXT,
      insight_judgment TEXT,
      risk_level VARCHAR(50) DEFAULT 'low', -- low, medium, high, severe
      clinical_impression TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS session_history (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      presenting_complaint TEXT,
      history TEXT,
      mse TEXT,
      diagnosis TEXT,
      case_formulation TEXT,
      risk_assessment TEXT,
      subjective TEXT,
      objective TEXT,
      assessment TEXT,
      plan TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
      prescription_date DATE DEFAULT CURRENT_DATE,
      diagnosis VARCHAR(255) NOT NULL,
      advice TEXT,
      lifestyle_recommendations TEXT,
      follow_up_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescription_items (
      id SERIAL PRIMARY KEY,
      prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
      medicine_name VARCHAR(255) NOT NULL,
      dose VARCHAR(100) NOT NULL,
      frequency VARCHAR(100) NOT NULL,
      duration VARCHAR(100) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
      type VARCHAR(100) NOT NULL, -- PHQ-9, GAD-7, DASS-21, BDI-II, GHQ-12, C-SSRS
      assessment_date DATE DEFAULT CURRENT_DATE,
      scores JSONB NOT NULL,
      report TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      attachment_url TEXT,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS availability (
      id SERIAL PRIMARY KEY,
      provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time VARCHAR(20) NOT NULL,
      end_time VARCHAR(20) NOT NULL,
      break_start VARCHAR(20),
      break_end VARCHAR(20),
      is_holiday BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pgPool!.query(schema);
};

const createSqliteTables = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    sqliteDb!.serialize(() => {
      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          otp_code TEXT,
          otp_expires_at TEXT,
          two_factor_enabled INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS providers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          name TEXT NOT NULL,
          employee_id TEXT UNIQUE NOT NULL,
          department TEXT NOT NULL,
          qualification TEXT NOT NULL,
          specialization TEXT NOT NULL,
          photo_url TEXT,
          signature_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          registration_number TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT NOT NULL,
          dob TEXT NOT NULL,
          department TEXT NOT NULL,
          semester TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          hostel_scholar TEXT NOT NULL,
          emergency_contact TEXT NOT NULL,
          emergency_phone TEXT NOT NULL,
          blood_group TEXT NOT NULL,
          address TEXT NOT NULL,
          informed_consent_signed INTEGER DEFAULT 0,
          consent_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          provider_id INTEGER,
          slot_date TEXT NOT NULL,
          slot_time TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          reason TEXT NOT NULL,
          qr_code TEXT,
          waitlist_position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          appointment_id INTEGER,
          student_id INTEGER,
          provider_id INTEGER,
          session_date TEXT NOT NULL,
          
          -- Case History
          presenting_complaint TEXT NOT NULL,
          history TEXT NOT NULL,
          past_psychiatric TEXT,
          past_medical TEXT,
          medication_history TEXT,
          family_history TEXT,
          developmental_history TEXT,
          educational_history TEXT,
          occupational_history TEXT,
          relationship_history TEXT,
          substance_use TEXT,
          legal_history TEXT,
          social_history TEXT,
          trauma_history TEXT,
          personality_traits TEXT,
          protective_factors TEXT,
          strengths TEXT,
          
          mse TEXT NOT NULL,
          diagnosis TEXT NOT NULL,
          differential_diagnosis TEXT,
          case_formulation TEXT NOT NULL,
          risk_assessment TEXT NOT NULL,
          
          subjective TEXT NOT NULL,
          objective TEXT NOT NULL,
          assessment TEXT NOT NULL,
          plan TEXT NOT NULL,
          
          intervention_used TEXT,
          homework_assigned TEXT,
          session_duration INTEGER DEFAULT 50,
          
          version INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS mse_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          provider_id INTEGER,
          session_id INTEGER,
          appearance TEXT,
          behaviour TEXT,
          speech TEXT,
          mood_affect TEXT,
          thought_process TEXT,
          thought_content TEXT,
          perception TEXT,
          cognition TEXT,
          insight_judgment TEXT,
          risk_level TEXT DEFAULT 'low',
          clinical_impression TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS session_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          version INTEGER NOT NULL,
          edited_by INTEGER,
          presenting_complaint TEXT,
          history TEXT,
          mse TEXT,
          diagnosis TEXT,
          case_formulation TEXT,
          risk_assessment TEXT,
          subjective TEXT,
          objective TEXT,
          assessment TEXT,
          plan TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS prescriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          student_id INTEGER,
          provider_id INTEGER,
          prescription_date TEXT DEFAULT CURRENT_DATE,
          diagnosis TEXT NOT NULL,
          advice TEXT,
          lifestyle_recommendations TEXT,
          follow_up_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS prescription_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prescription_id INTEGER,
          medicine_name TEXT NOT NULL,
          dose TEXT NOT NULL,
          frequency TEXT NOT NULL,
          duration TEXT NOT NULL,
          FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS assessments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          provider_id INTEGER,
          type TEXT NOT NULL,
          assessment_date TEXT DEFAULT CURRENT_DATE,
          scores TEXT NOT NULL,
          report TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER,
          receiver_id INTEGER,
          content TEXT NOT NULL,
          attachment_url TEXT,
          read_at TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          category TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_url TEXT NOT NULL,
          uploaded_by INTEGER,
          version INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS availability (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider_id INTEGER,
          day_of_week INTEGER NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          break_start TEXT,
          break_end TEXT,
          is_holiday INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      sqliteDb!.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

const seedDefaultAdmin = async (): Promise<void> => {
  const adminUsername = 'admin';
  const defaultPassword = '2026';
  
  const res = await query('SELECT * FROM users WHERE username = $1', [adminUsername]);
  if (res.rows.length === 0) {
    console.log('Seeding default Admin user...');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [adminUsername, hashedPassword, 'admin']
    );
    console.log('Admin user successfully seeded (username: admin, password: 2026)');
  }
};
