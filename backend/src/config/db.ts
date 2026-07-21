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
        connectionString:
          process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wccms',
        connectionTimeoutMillis: 5000,
      });
      // Test connection
      await pgPool.query('SELECT NOW()');
      console.log('Successfully connected to PostgreSQL.');
      await createPostgresTables();
      await upgradeDatabaseSchema();
      await seedDefaultAdmin();
      await seedStudents();
      await seedSyntheticData();
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
  await upgradeDatabaseSchema();
  await seedDefaultAdmin();
  await seedStudents();
  await seedSyntheticData();
  console.log(`SQLite database initialized at: ${dbPath}`);
};

const upgradeDatabaseSchema = async (): Promise<void> => {
  try {
    await query('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
    console.log('Added phone column to users table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE providers ADD COLUMN phone VARCHAR(20)');
    console.log('Added phone column to providers table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
    console.log('Added email column to users table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE providers ADD COLUMN email VARCHAR(255)');
    console.log('Added email column to providers table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE students ADD COLUMN referral_source VARCHAR(255)');
    console.log('Added referral_source column to students table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query("ALTER TABLE students ADD COLUMN student_type VARCHAR(20) DEFAULT 'day_scholar'");
    console.log('Added student_type column to students table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query(
      "ALTER TABLE sessions ADD COLUMN workflow_stage VARCHAR(50) DEFAULT 'registration'",
    );
    console.log('Added workflow_stage column to sessions table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE sessions ADD COLUMN cosigned_by INTEGER');
    console.log('Added cosigned_by column to sessions table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE sessions ADD COLUMN cosigned_at TIMESTAMP');
    console.log('Added cosigned_at column to sessions table.');
  } catch (e) {
    // Column already exists
  }

  try {
    await query('ALTER TABLE child_case_histories RENAME TO student_case_histories');
    console.log('Renamed child_case_histories table to student_case_histories.');
  } catch (e) {
    // Table might already be renamed or doesn't exist
  }

  try {
    // Create test_orders table if not exists (SQLite version)
    await query(`
      CREATE TABLE IF NOT EXISTS test_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
        test_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        results TEXT,
        technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        report TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Checked/Created test_orders table.');
  } catch (e) {
    // Try PostgreSQL SERIAL version if SQLite fails
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS test_orders (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
          test_name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          results TEXT,
          technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          report TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Checked/Created test_orders table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating test_orders table:', e2);
    }
  }

  // ============================================================
  // PHASE 1 — Dynamic EMR columns
  // ============================================================
  const newSessionColumns: [string, string][] = [
    ['clinician_mode', "VARCHAR(50) DEFAULT 'counselor'"],
    ['counseling_assessment', 'TEXT'],
    ['counseling_advice', 'TEXT'],
    ['therapeutic_issues', 'TEXT'],
    ['medical_exam', 'TEXT'],
    ['vital_signs', 'TEXT'],
    ['treatment_plan_data', 'TEXT'],
    ['session_notes_text', 'TEXT'],
    // Phase 2 — Report type
    ['report_type', "VARCHAR(50) DEFAULT 'counseling'"],
    ['locked_by', 'INTEGER'],
    ['locked_at', 'TIMESTAMP'],
    // Phase 3 — Content integrity
    ['content_hash', 'VARCHAR(64)'],
    // Phase 6 — Session completion
    ['session_status', "VARCHAR(100) DEFAULT 'completed'"],
    ['session_number', 'INTEGER DEFAULT 1'],
    ['progress_since_last', 'TEXT'],
    ['homework_review', 'TEXT'],
    ['medication_adherence', 'TEXT'],
    ['case_outcome', 'VARCHAR(100)'],
    ['discharge_summary', 'TEXT'],
    ['ai_followup_suggestions', 'TEXT'],
  ];

  for (const [col, colType] of newSessionColumns) {
    try {
      await query(`ALTER TABLE sessions ADD COLUMN ${col} ${colType}`);
      console.log(`Added ${col} column to sessions table.`);
    } catch (e) {
      // Column already exists — safe to ignore
    }
  }

  // ============================================================
  // PHASE 3 — Report access control table
  // ============================================================
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS report_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        granted_by INTEGER REFERENCES users(id),
        access_level VARCHAR(50) NOT NULL,
        sections_allowed TEXT,
        expires_at TIMESTAMP,
        revoked_at TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Checked/Created report_access table.');
  } catch (e) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS report_access (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          granted_by INTEGER REFERENCES users(id),
          access_level VARCHAR(50) NOT NULL,
          sections_allowed TEXT,
          expires_at TIMESTAMP,
          revoked_at TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Checked/Created report_access table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating report_access table:', e2);
    }
  }

  // ============================================================
  // PHASE 5 — Session drafts (private AI workspace notes)
  // ============================================================
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS session_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id),
        draft_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Checked/Created session_drafts table.');
  } catch (e) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS session_drafts (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
          provider_id INTEGER REFERENCES providers(id),
          draft_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Checked/Created session_drafts table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating session_drafts table:', e2);
    }
  }

  // ============================================================
  // PHASE 9 — Resource prescriptions table
  // ============================================================
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS resource_prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        resource_type VARCHAR(50),
        resource_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Checked/Created resource_prescriptions table.');
  } catch (e) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS resource_prescriptions (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          provider_id INTEGER REFERENCES providers(id),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          resource_type VARCHAR(50),
          resource_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Checked/Created resource_prescriptions table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating resource_prescriptions table:', e2);
    }
  }

  // ============================================================
  // WCCMS — Student Portal Improvements migrations
  // ============================================================
  const newAppointmentCols: [string, string][] = [
    ['chief_complaint', 'TEXT'],
    ['reason_referral', 'TEXT'],
    ['presenting_problem', 'TEXT'],
    ['duration_problem', 'TEXT'],
    ['additional_notes', 'TEXT'],
  ];

  for (const [col, colType] of newAppointmentCols) {
    try {
      await query(`ALTER TABLE appointments ADD COLUMN ${col} ${colType}`);
      console.log(`Added ${col} column to appointments table.`);
    } catch (e) {
      // Column already exists
    }
  }

  const newAvailabilityCols: [string, string][] = [
    ['session_duration', 'INTEGER DEFAULT 45'],
    ['buffer_time', 'INTEGER DEFAULT 0'],
    ['max_appointments_per_day', 'INTEGER DEFAULT 8'],
    ['slot_interval', 'INTEGER DEFAULT 45'],
  ];

  for (const [col, colType] of newAvailabilityCols) {
    try {
      await query(`ALTER TABLE availability ADD COLUMN ${col} ${colType}`);
      console.log(`Added ${col} column to availability table.`);
    } catch (e) {
      // Column already exists
    }
  }

  try {
    await query(`ALTER TABLE students ADD COLUMN assessments_enabled BOOLEAN DEFAULT FALSE`);
    console.log(`Added assessments_enabled column to students table.`);
  } catch (e) {
    // Column already exists
  }

  // ============================================================
  // WCCMS — Refinement (Phase 10) migrations
  // ============================================================

  // Add is_released to prescriptions, sessions, assessments
  const releasedCols = [
    { table: 'prescriptions' },
    { table: 'sessions' },
    { table: 'assessments' },
  ];

  for (const { table } of releasedCols) {
    try {
      await query(`ALTER TABLE ${table} ADD COLUMN is_released INTEGER DEFAULT 0`);
      console.log(`Added is_released column to ${table} table.`);
    } catch (e) {
      // Column already exists
    }
  }

  // Emergency Cases Table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
        priority VARCHAR(50) DEFAULT 'high',
        crisis_notes TEXT NOT NULL,
        referral_details TEXT,
        emergency_contact TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      )
    `);
    console.log('Checked/Created emergency_cases table (SQLite).');
  } catch (e) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS emergency_cases (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
          priority VARCHAR(50) DEFAULT 'high',
          crisis_notes TEXT NOT NULL,
          referral_details TEXT,
          emergency_contact TEXT,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP WITH TIME ZONE
        )
      `);
      console.log('Checked/Created emergency_cases table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating emergency_cases table:', e2);
    }
  }

  // Spot Registrations Table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS spot_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
        reason_for_visit TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'normal',
        status VARCHAR(50) DEFAULT 'waiting',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL
      )
    `);
    console.log('Checked/Created spot_registrations table (SQLite).');
  } catch (e) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS spot_registrations (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
          reason_for_visit TEXT NOT NULL,
          priority VARCHAR(50) DEFAULT 'normal',
          status VARCHAR(50) DEFAULT 'waiting',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL
        )
      `);
      console.log('Checked/Created spot_registrations table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating spot_registrations table:', e2);
    }
  }

  // Follow Ups Table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
        follow_up_date DATE NOT NULL,
        follow_up_time VARCHAR(50),
        duration INTEGER DEFAULT 45,
        notes TEXT,
        goals TEXT,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Checked/Created follow_ups table (SQLite).');
  } catch (e) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
          follow_up_date DATE NOT NULL,
          follow_up_time VARCHAR(50),
          duration INTEGER DEFAULT 45,
          notes TEXT,
          goals TEXT,
          status VARCHAR(50) DEFAULT 'scheduled',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Checked/Created follow_ups table (PostgreSQL).');
    } catch (e2) {
      console.error('Error creating follow_ups table:', e2);
    }
  }

  // Seed default availability for counselor01 (Dr. Sarah Connor)
  try {
    const providerRes = await query("SELECT id FROM providers WHERE employee_id = 'EMP103'");
    if (providerRes.rows.length > 0) {
      const providerId = providerRes.rows[0].id;
      const checkAvail = await query('SELECT id FROM availability WHERE provider_id = $1', [
        providerId,
      ]);
      if (checkAvail.rows.length === 0) {
        console.log('Seeding default availability settings for Dr. Sarah Connor...');
        for (let day = 1; day <= 5; day++) {
          await query(
            'INSERT INTO availability (provider_id, day_of_week, start_time, end_time, break_start, break_end, is_holiday, session_duration, buffer_time, max_appointments_per_day, slot_interval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [providerId, day, '09:00', '17:00', '12:00', '13:00', false, 45, 0, 8, 45],
          );
        }
        for (let day of [0, 6]) {
          await query(
            'INSERT INTO availability (provider_id, day_of_week, start_time, end_time, break_start, break_end, is_holiday, session_duration, buffer_time, max_appointments_per_day, slot_interval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [providerId, day, '09:00', '17:00', '12:00', '13:00', true, 45, 0, 8, 45],
          );
        }
      }
    }
  } catch (err) {
    console.error('Error seeding default availability:', err);
  }
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
              lastInsertId: this.lastID,
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
      student_type VARCHAR(20) DEFAULT 'day_scholar',
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

    CREATE TABLE IF NOT EXISTS student_case_histories (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
      sociodemographics TEXT,
      presenting_complaints TEXT,
      hopi TEXT,
      treatment_history TEXT,
      past_history TEXT,
      family_history TEXT,
      personal_history TEXT,
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
          student_type TEXT DEFAULT 'day_scholar',
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
      `);

      sqliteDb!.run(
        `
        CREATE TABLE IF NOT EXISTS student_case_histories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          provider_id INTEGER,
          sociodemographics TEXT,
          presenting_complaints TEXT,
          hopi TEXT,
          treatment_history TEXT,
          past_history TEXT,
          family_history TEXT,
          personal_history TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE
        )
      `,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  });
};

const seedDefaultAdmin = async (): Promise<void> => {
  const defaultPhone = '9849891226';
  const defaultEmail = 'sabujd880@gmail.com';

  // Load temp credentials from frontend config directory or workspace root
  let tempCreds = {
    admin: { username: 'admin01', password: 'Cuap@3690' },
    counselor: { username: 'counselor01', password: '3690' },
  };

  const possiblePaths = [
    path.resolve(process.cwd(), 'frontend/src/config/tempCredentials.json'),
    path.resolve(process.cwd(), '../frontend/src/config/tempCredentials.json'),
    path.resolve(process.cwd(), 'src/config/tempCredentials.json'),
    path.resolve(process.cwd(), 'tempCredentials.json'),
    path.resolve(__dirname, '../../frontend/src/config/tempCredentials.json'),
    path.resolve(__dirname, '../../../frontend/src/config/tempCredentials.json'),
  ];

  let loaded = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        console.log(`Loading centralized temp credentials from: ${p}`);
        const rawData = fs.readFileSync(p, 'utf8');
        tempCreds = JSON.parse(rawData);
        loaded = true;
        break;
      } catch (err: any) {
        console.error(`Error reading temp credentials from ${p}:`, err.message);
      }
    }
  }

  if (!loaded) {
    console.warn('Could not load tempCredentials.json, using defaults.');
  }

  // 1. Seed Admin01 from config
  const adminUsername = tempCreds.admin.username;
  const adminPassword = tempCreds.admin.password;
  const adminCheck = await query('SELECT * FROM users WHERE username = $1', [adminUsername]);
  if (adminCheck.rows.length === 0) {
    console.log(`Seeding Admin user (${adminUsername})...`);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await query(
      'INSERT INTO users (username, password_hash, role, phone, email) VALUES ($1, $2, $3, $4, $5)',
      [adminUsername, hashedPassword, 'admin', defaultPhone, defaultEmail],
    );
    console.log(`Admin user successfully seeded (username: ${adminUsername})`);
  }

  // 2. Seed Counselor01 (Provider) from config
  const providerUsername = tempCreds.counselor.username;
  const providerPassword = tempCreds.counselor.password;
  const providerCheck = await query('SELECT * FROM users WHERE username = $1', [providerUsername]);
  if (providerCheck.rows.length === 0) {
    console.log(`Seeding Provider Counselor user (${providerUsername})...`);
    const hashedPassword = await bcrypt.hash(providerPassword, 10);
    await query(
      'INSERT INTO users (username, password_hash, role, phone, email) VALUES ($1, $2, $3, $4, $5)',
      [providerUsername, hashedPassword, 'provider', defaultPhone, defaultEmail],
    );

    const selectUser = await query('SELECT id FROM users WHERE username = $1', [providerUsername]);
    const userId = selectUser.rows[0].id;

    await query(
      `INSERT INTO providers (user_id, name, employee_id, department, qualification, specialization, phone, email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        'Dr. Sarah Connor',
        'EMP103',
        'Wellness Centre',
        'PhD in Clinical Psychology',
        'Cognitive Behavioral Therapy (CBT)',
        defaultPhone,
        defaultEmail,
      ],
    );
    console.log(`Provider successfully seeded (username: ${providerUsername})`);
  }

  // Seeding backward-compatible legacy admin/provider usernames if not already present
  const legacyAdmin = 'admin';
  const legacyAdminCheck = await query('SELECT * FROM users WHERE username = $1', [legacyAdmin]);
  if (legacyAdminCheck.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('2026', 10);
    await query(
      'INSERT INTO users (username, password_hash, role, phone, email) VALUES ($1, $2, $3, $4, $5)',
      [legacyAdmin, hashedPassword, 'admin', defaultPhone, defaultEmail],
    );
  }

  const legacyProvider = 'provider';
  const legacyProviderCheck = await query('SELECT * FROM users WHERE username = $1', [
    legacyProvider,
  ]);
  if (legacyProviderCheck.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('2026', 10);
    await query(
      'INSERT INTO users (username, password_hash, role, phone, email) VALUES ($1, $2, $3, $4, $5)',
      [legacyProvider, hashedPassword, 'provider', defaultPhone, defaultEmail],
    );
    const selectUser = await query('SELECT id FROM users WHERE username = $1', [legacyProvider]);
    const userId = selectUser.rows[0].id;
    await query(
      `INSERT INTO providers (user_id, name, employee_id, department, qualification, specialization, phone, email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        'Dr. Sabuj Das',
        'EMP101',
        'Psychology',
        'PhD, M.Phil in Clinical Psychology',
        'Cognitive Behavioral Therapy (CBT) & Restructuring',
        defaultPhone,
        defaultEmail,
      ],
    );
  }

  // Run dynamic upgrades for existing rows
  try {
    await query("UPDATE users SET phone = $1 WHERE username = 'admin' AND phone IS NULL", [
      defaultPhone,
    ]);
    await query("UPDATE users SET phone = $1 WHERE username = 'provider' AND phone IS NULL", [
      defaultPhone,
    ]);
    await query("UPDATE providers SET phone = $1 WHERE employee_id = 'EMP101' AND phone IS NULL", [
      defaultPhone,
    ]);

    await query("UPDATE users SET email = $1 WHERE username = 'admin' AND email IS NULL", [
      defaultEmail,
    ]);
    await query("UPDATE users SET email = $1 WHERE username = 'provider' AND email IS NULL", [
      defaultEmail,
    ]);
    await query("UPDATE providers SET email = $1 WHERE employee_id = 'EMP101' AND email IS NULL", [
      defaultEmail,
    ]);
  } catch (e) {
    console.error('Error upgrading admin/provider phone/email numbers:', e);
  }

  // Seed new roles for Clinic Management System
  const usersToSeed = [
    { username: 'frontdesk', role: 'front-desk' },
    { username: 'technician', role: 'technician' },
    { username: 'depthead', role: 'dept-head' },
    { username: 'superadmin', role: 'super-admin' },
  ];

  for (const u of usersToSeed) {
    try {
      const userCheck = await query('SELECT * FROM users WHERE username = $1', [u.username]);
      if (userCheck.rows.length === 0) {
        console.log(`Seeding default ${u.role} user...`);
        const hashedPassword = await bcrypt.hash('2026', 10);
        await query(
          'INSERT INTO users (username, password_hash, role, phone, email) VALUES ($1, $2, $3, $4, $5)',
          [u.username, hashedPassword, u.role, defaultPhone, defaultEmail],
        );
        console.log(`${u.role} user seeded (username: ${u.username}, password: 2026)`);

        if (u.role === 'dept-head') {
          const selectUser = await query('SELECT id FROM users WHERE username = $1', [u.username]);
          const userId = selectUser.rows[0].id;
          await query(
            `INSERT INTO providers (user_id, name, employee_id, department, qualification, specialization, phone, email) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              'Dept Head Dr. Das',
              'EMP102',
              'Psychiatry',
              'MD, Psychiatry',
              'Clinical Psychiatry & Department Management',
              defaultPhone,
              defaultEmail,
            ],
          );
          console.log('Dept-head provider profile seeded.');
        }
      }
    } catch (err) {
      console.error(`Error seeding ${u.role} user:`, err);
    }
  }
};

const seedStudents = async (): Promise<void> => {
  let students: any[] = [
    {
      name: 'ARIGELA LALITH SATHWIK',
      regNo: '25MAI03',
      gender: 'Male',
      mobile: '9515022969',
      studentType: 'Hosteller',
    },
    {
      name: 'KAKARLA JASWANTH CHOWDARY',
      regNo: '25MST09',
      gender: 'Male',
      mobile: '9347889339',
      studentType: 'Day Scholar',
    },
    {
      name: 'ATHIDEV A S',
      regNo: '25BCO04',
      gender: 'Male',
      mobile: '9188467483',
      studentType: 'Hosteller',
    },
    {
      name: 'VALMEEKI NARASIMHULU GARI GOPICHAND',
      regNo: '24MAT20',
      gender: 'Male',
      mobile: '8309092182',
      studentType: 'Day Scholar',
    },
    {
      name: 'TAPASVI PANDA',
      regNo: '25BSP32',
      gender: 'Male',
      mobile: '9265820840',
      studentType: 'Hosteller',
    },
    {
      name: 'HIMADRI HALDAR',
      regNo: '25BSP14',
      gender: 'Male',
      mobile: '7450810258',
      studentType: 'Day Scholar',
    },
    {
      name: 'PAGIDIPALAYAM YUVA SREE',
      regNo: '25BPS29',
      gender: 'Female',
      mobile: '9440414239',
      studentType: 'Day Scholar',
    },
    {
      name: 'KANDULA VENKATA ADITYA',
      regNo: '25BPS16',
      gender: 'Male',
      mobile: '9703164114',
      studentType: 'Hosteller',
    },
    {
      name: 'DIDDI ARYAN SIVA KESHAV SHARMA',
      regNo: '24BCO07',
      gender: 'Male',
      mobile: '9493870450',
      studentType: 'Hosteller',
    },
    {
      name: 'K K S S DHANUSH',
      regNo: '24BBA13',
      gender: 'Male',
      mobile: '9704482467',
      studentType: 'Day Scholar',
    },
    {
      name: 'MD JEEBRAEEL',
      regNo: '25MBA22',
      gender: 'Male',
      mobile: '6299334157',
      studentType: 'Day Scholar',
    },
    {
      name: 'ALAPAN CHATTERJEE',
      regNo: '25MGG04',
      gender: 'Male',
      mobile: '9830921124',
      studentType: 'Hosteller',
    },
    {
      name: 'MOHNISH DUTTA',
      regNo: '25MPS11',
      gender: 'Male',
      mobile: '8100298506',
      studentType: 'Hosteller',
    },
    {
      name: 'P. Rishitha',
      regNo: '24BSP41',
      gender: 'Female',
      mobile: '9441633970',
      studentType: 'Day Scholar',
    },
    {
      name: 'SINGARA SELVI',
      regNo: '24BSP33',
      gender: 'Female',
      mobile: '9597159051',
      studentType: 'Day Scholar',
    },
    {
      name: 'RATHNAVATH PRASANNA NAIK',
      regNo: '24BBA44',
      gender: 'Male',
      mobile: '8148858541',
      studentType: 'Hosteller',
    },
    {
      name: 'PUTTA YASWITHA',
      regNo: '24BCS52',
      gender: 'Female',
      mobile: '9885275449',
      studentType: 'Day Scholar',
    },
    {
      name: 'MANEESH BATHINI',
      regNo: '24MGP04',
      gender: 'Male',
      mobile: '9704517728',
      studentType: 'Day Scholar',
    },
    {
      name: 'SAI CHETHAN',
      regNo: '24MPS26',
      gender: 'Male',
      mobile: '9652892098',
      studentType: 'Hosteller',
    },
    {
      name: 'GADDAM BHAVANA',
      regNo: '24MPS06',
      gender: 'Female',
      mobile: '9014818123',
      studentType: 'Day Scholar',
    },
    {
      name: 'UTKARSH KUMAR UPADHYAY',
      regNo: '24BBA54',
      gender: 'Male',
      mobile: '7667205971',
      studentType: 'Hosteller',
    },
    {
      name: 'PRATIK SUSHILRAO DHOKE',
      regNo: '24BSP26',
      gender: 'Male',
      mobile: '9021845503',
      studentType: 'Day Scholar',
    },
    {
      name: 'ALOK KUMAR ',
      regNo: '24BEC04',
      gender: 'Male',
      mobile: '9508460072',
      studentType: 'Hosteller',
    },
    {
      name: 'GUDIBANDA DAYANA LAKSHMI',
      regNo: '24BBA12',
      gender: 'Female',
      mobile: '8886808015',
      studentType: 'Day Scholar',
    },
    {
      name: 'SALLAGUNDLA BHAVANA',
      regNo: '24BBA45',
      gender: 'Female',
      mobile: '8688023120',
      studentType: 'Day Scholar',
    },
    {
      name: 'AASHATH C',
      regNo: '24BCO01',
      gender: 'Male',
      mobile: '9659902131',
      studentType: 'Hosteller',
    },
    {
      name: 'VISHAL MANICKAM SACHIDHANANDHAM',
      regNo: '24BCO31',
      gender: 'Male',
      mobile: '8300839479',
      studentType: 'Day Scholar',
    },
    {
      name: 'DOMMARAJU HARISHVARMA',
      regNo: '25MGP02',
      gender: 'Male',
      mobile: '9391269233',
      studentType: 'Hosteller',
    },
    {
      name: 'GOLLA JYOTHISWAROOP',
      regNo: '25MPS04',
      gender: 'Male',
      mobile: '6303962914',
      studentType: 'Day Scholar',
    },
    {
      name: 'SHEELAM SHANUMUKA RAJA SAI RAHUL',
      regNo: '25MGP03',
      gender: 'Male',
      mobile: '8639461286',
      studentType: 'Hosteller',
    },
    {
      name: 'Nithiyasri S',
      regNo: '24BBA35',
      gender: 'Female',
      mobile: '8148365935',
      studentType: 'Day Scholar',
    },
    {
      name: 'PARAGATH NISHA T',
      regNo: '24BPS32',
      gender: 'Female',
      mobile: '9095325117',
      studentType: 'Day Scholar',
    },
    {
      name: 'DEEPIKA',
      regNo: '24BPS09',
      gender: 'Female',
      mobile: '9489477113',
      studentType: 'Day Scholar',
    },
    {
      name: 'UBAID ASHRAF',
      regNo: '24BCS72',
      gender: 'Male',
      mobile: '9258048532',
      studentType: 'Hosteller',
    },
    {
      name: 'MOKARA JAGAN',
      regNo: '23BPS14',
      gender: 'Male',
      mobile: '9985518256',
      studentType: 'Hosteller',
    },
    {
      name: 'MALAPATI UDAY KIRAN',
      regNo: '23BBA19',
      gender: 'Male',
      mobile: '8008415798',
      studentType: 'Hosteller',
    },
    {
      name: 'SANDELA ADVITHRAJ',
      regNo: '25MEC08',
      gender: 'Male',
      mobile: '9550212925',
      studentType: 'Day Scholar',
    },
    {
      name: 'MAHESH',
      regNo: '24BPS23',
      gender: 'Male',
      mobile: '9121211608',
      studentType: 'Hosteller',
    },
    {
      name: 'jatta gnana sidshartha ambedkar sastry',
      regNo: '24BPS18',
      gender: 'Male',
      mobile: '7993818780',
      studentType: 'Hosteller',
    },
    {
      name: 'ZAINUL ABIDEEN JIFIRI THANGAL A',
      regNo: '25MCS08',
      gender: 'Male',
      mobile: '8330020137',
      studentType: 'Hosteller',
    },
    {
      name: 'PANCHAJANYA KHAUND',
      regNo: '25MMB16',
      gender: 'Male',
      mobile: '9365445800',
      studentType: 'Hosteller',
    },
    {
      name: 'BHUKYA VENKATESH',
      regNo: '25MEC01',
      gender: 'Male',
      mobile: '7995205012',
      studentType: 'Day Scholar',
    },
    {
      name: 'RAJ KUMAR',
      regNo: '24MPS24',
      gender: 'Male',
      mobile: '6203240548',
      studentType: 'Hosteller',
    },
    {
      name: 'MANOHAR MOIRANGTHEM',
      regNo: '25MCO02',
      gender: 'Male',
      mobile: '8798133912',
      studentType: 'Day Scholar',
    },
    {
      name: 'MUDE SIVA PRASAD NAIK',
      regNo: '25MCS03',
      gender: 'Male',
      mobile: '6281020535',
      studentType: 'Hosteller',
    },
  ];

  // Try loading from JSON file
  const jsonPath = 'C:\\Users\\CUAPDC03\\Downloads\\cuap.students.json';
  if (fs.existsSync(jsonPath)) {
    try {
      console.log(`Loading student database from: ${jsonPath}`);
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const loaded = JSON.parse(rawData);
      if (Array.isArray(loaded) && loaded.length > 0) {
        students = loaded.map((s: any) => ({
          name: s.name,
          regNo: s.regNo,
          gender: s.gender || 'Male',
          mobile: s.mobile || '9999999999',
          studentType: s.studentType || 'Day Scholar',
        }));
      }
    } catch (err: any) {
      console.error('Error reading student JSON file:', err.message);
    }
  }

  console.log(`Checking/Seeding ${students.length} student records...`);

  // Pre-hash password 'Student@123' to prevent performance hit during bulk inserts
  const defaultPasswordHash = await bcrypt.hash('Student@123', 10);

  // Wrap in a transaction for extreme performance boost
  try {
    await query('BEGIN TRANSACTION');
  } catch (_) {
    try {
      await query('BEGIN');
    } catch (_) {}
  }

  try {
    for (const s of students) {
      if (!s.regNo) continue;
      const username = s.regNo.toLowerCase().trim();
      const res = await query('SELECT id FROM users WHERE username = $1', [username]);

      if (res.rows.length === 0) {
        // Seed user row
        await query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [
          username,
          defaultPasswordHash,
          'student',
        ]);

        const selectNew = await query('SELECT id FROM users WHERE username = $1', [username]);
        const userId = selectNew.rows[0].id;

        // Parse department and semester based on registration number
        const reg = s.regNo.toUpperCase();
        let department = 'Applied Sciences';
        if (reg.includes('BEC')) department = 'Electronics & Communication';
        else if (reg.includes('BTC')) department = 'Biotechnology';
        else if (reg.includes('BBA')) department = 'Business Administration';
        else if (reg.includes('BPS')) department = 'Applied Psychology';
        else if (reg.includes('BCS')) department = 'Computer Science & IT';
        else if (reg.includes('MAI')) department = 'Artificial Intelligence';
        else if (reg.includes('MED')) department = 'Education';
        else if (reg.includes('MAP')) department = 'Applied Psychology (PG)';
        else if (reg.includes('MEC')) department = 'English (PG)';
        else if (reg.includes('MGP')) department = 'Geography (PG)';
        else if (reg.includes('MBA')) department = 'Business Management (MBA)';
        else if (reg.includes('BCO')) department = 'Commerce (UG)';
        else if (reg.includes('BEL')) department = 'English (UG)';
        else if (reg.includes('MEL')) department = 'English (PG)';
        else if (reg.includes('BSP')) department = 'Science & Physics';
        else if (reg.includes('BRI')) department = 'Retail Management';
        else if (reg.includes('MST')) department = 'Statistics';
        else if (reg.includes('MGG')) department = 'Geography';
        else if (reg.includes('MAT')) department = 'Mathematics';
        else if (reg.includes('MMB')) department = 'Molecular Biology';
        else if (reg.includes('MCS')) department = 'Computer Science (PG)';
        else if (reg.includes('MCO')) department = 'Commerce (PG)';

        let semester = 'Semester II';
        if (reg.startsWith('23')) semester = 'Semester VI';
        else if (reg.startsWith('24')) semester = 'Semester IV';

        const age = s.gender === 'Male' ? 21 : 20;
        const dob = s.gender === 'Male' ? '2005-06-15' : '2006-03-22';
        const email = `${username}@cuap.edu.in`;

        // Normalize student type for backend storage
        const typeNormalized = s.studentType === 'Hosteller' ? 'hosteller' : 'day_scholar';

        await query(
          `INSERT INTO students 
           (user_id, registration_number, name, age, gender, dob, department, semester, phone, email, hostel_scholar, student_type, emergency_contact, emergency_phone, blood_group, address, informed_consent_signed, consent_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 1, CURRENT_TIMESTAMP)`,
          [
            userId,
            s.regNo,
            s.name,
            age,
            s.gender,
            dob,
            department,
            semester,
            s.mobile,
            email,
            s.studentType === 'Hosteller' ? 'Hosteller' : 'Day Scholar',
            typeNormalized,
            'Guardian',
            s.mobile,
            'O+',
            'CUAP Campus, Anantapuramu',
          ],
        );
      }
    }
    await query('COMMIT');
  } catch (err: any) {
    try {
      await query('ROLLBACK');
    } catch (_) {}
    console.error('Error seeding student records:', err.message);
  }

  console.log('Student seeding checks complete.');
};

const seedSyntheticData = async (): Promise<void> => {
  try {
    const sessionCheck = await query('SELECT * FROM sessions');
    if (sessionCheck.rows.length > 0) {
      console.log('Synthetic session data already exists. Skipping synthetic data seeding.');
      return;
    }

    console.log('Seeding synthetic clinical data for testing purposes...');

    // Get a student
    const studentRes = await query("SELECT id FROM students WHERE registration_number = '25BEC01'");
    if (studentRes.rows.length === 0) {
      console.log('Student 25BEC01 not found for seeding synthetic data.');
      return;
    }
    const studentId = studentRes.rows[0].id;

    // Get providers
    const prov1Res = await query("SELECT id FROM providers WHERE employee_id = 'EMP101'");
    const prov2Res = await query("SELECT id FROM providers WHERE employee_id = 'EMP102'");
    if (prov1Res.rows.length === 0) {
      console.log('Provider EMP101 not found for seeding synthetic data.');
      return;
    }
    const providerId = prov1Res.rows[0].id;
    const deptHeadId = prov2Res.rows[0]?.id || providerId;

    // 1. Create a completed appointment
    const aptRes = await query(
      `INSERT INTO appointments (student_id, provider_id, slot_date, slot_time, status, reason)
       VALUES ($1, $2, '2026-07-16', '10:00 AM - 11:00 AM', 'completed', $3)`,
      [
        studentId,
        providerId,
        'Experiencing severe academic anxiety and insomnia before exam weeks.',
      ],
    );
    const appointmentId = aptRes.lastInsertId || 1;

    // 2. Create a completed counseling session
    const sessRes = await query(
      `INSERT INTO sessions (
        appointment_id, student_id, provider_id, session_date, presenting_complaint, history,
        past_psychiatric, past_medical, medication_history, family_history, developmental_history,
        educational_history, occupational_history, relationship_history, substance_use, legal_history,
        social_history, trauma_history, personality_traits, protective_factors, strengths,
        mse, diagnosis, differential_diagnosis, case_formulation, risk_assessment,
        subjective, objective, assessment, plan, intervention_used, homework_assigned, session_duration, workflow_stage
      ) VALUES ($1, $2, $3, '2026-07-16', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, 50, 'report')`,
      [
        appointmentId,
        studentId,
        providerId,
        // presenting_complaint
        'Student reports severe academic anxiety, heart palpitations before tests, and sleeplessness.',
        // history
        'Gradual onset over last 6 months. Exacerbated by pressure to qualify for postgraduate internships.',
        // past_psychiatric
        'No prior psychiatric consultations.',
        // past_medical
        'No active medical issues.',
        // medication_history
        'None.',
        // family_history
        'Father has history of treated depression.',
        // developmental_history
        'Milestones normal.',
        // educational_history
        'High academic performer, currently in Semester II.',
        // occupational_history
        'Student.',
        // relationship_history
        'Supportive relationships with peers.',
        // substance_use
        'Denies any substance use.',
        // legal_history
        'None.',
        // social_history
        'Living in university hostel.',
        // trauma_history
        'No history of trauma.',
        // personality_traits
        'Perfectionistic tendencies.',
        // protective_factors
        'High family support, good peer communication.',
        // strengths
        'Intact insight, high motivation for improvement.',
        // mse
        'Appearance: Well kempt. Rapport: Easily established. Eye Contact: Present. Speech: Fluent. Mood/Affect: Anxious. Thought Process: Goal-directed. Thought Content: No delusions or self-harm thoughts. Insight & Judgment: Intact.',
        // diagnosis
        'F41.1 Generalized Anxiety Disorder',
        // differential_diagnosis
        'F43.22 Adjustment disorder with anxiety',
        // case_formulation
        'Academic pressure triggering pre-existing perfectionistic anxiety traits, resulting in acute sleeplessness.',
        // risk_assessment
        'Low risk. Client explicitly denies suicidal thoughts or self-harm history.',
        // subjective
        'Feeling extremely nervous and unable to focus.',
        // objective
        'Restless movement, fidgeting hands during the session.',
        // assessment
        'GAD features exacerbated by examination schedule.',
        // plan
        'Initiate CBT. Teach deep breathing. Order baseline psychological scales.',
        // intervention_used
        'Cognitive Behavioral Therapy (CBT)',
        // homework_assigned
        'Complete GAD-7 daily log. Practice 4-7-8 breathing twice daily.',
      ],
    );
    const sessionId = sessRes.lastInsertId || 1;

    // 3. Create a completed prescription
    const presRes = await query(
      `INSERT INTO prescriptions (session_id, student_id, provider_id, prescription_date, diagnosis, advice, lifestyle_recommendations, follow_up_date)
       VALUES ($1, $2, $3, '2026-07-16', 'F41.1 Generalized Anxiety Disorder', 'Avoid caffeinated beverages after 4 PM.', 'Walk 30 minutes in morning.', '2026-08-16')`,
      [sessionId, studentId, providerId],
    );
    const prescriptionId = presRes.lastInsertId || 1;

    // Insert prescription items
    await query(
      `INSERT INTO prescription_items (prescription_id, medicine_name, dose, frequency, duration)
       VALUES ($1, 'Escitalopram 10mg', '1 tab', '1-0-0', '30 days')`,
      [prescriptionId],
    );
    await query(
      `INSERT INTO prescription_items (prescription_id, medicine_name, dose, frequency, duration)
       VALUES ($1, 'Clonazepam 0.25mg', '1 tab', '0-0-1', '10 days')`,
      [prescriptionId],
    );

    // 4. Create one completed test order (PHQ-9)
    await query(
      `INSERT INTO test_orders (student_id, provider_id, test_name, category, status, results, report)
       VALUES ($1, $2, 'PHQ-9 (Depression screening)', 'psychological', 'completed', 'Score: 12/27', 'PHQ-9 Score: 12/27 (Moderate Depression symptoms). Recommended supportive therapy.')`,
      [studentId, providerId],
    );

    // 5. Create one pending test order (GAD-7)
    await query(
      `INSERT INTO test_orders (student_id, provider_id, test_name, category, status)
       VALUES ($1, $2, 'GAD-7 (Anxiety screening)', 'psychological', 'pending')`,
      [studentId, providerId],
    );

    // 6. Create a high-risk session requiring co-signature (from a different student, e.g. 25BTC05)
    const student2Res = await query(
      "SELECT id FROM students WHERE registration_number = '25BTC05'",
    );
    if (student2Res.rows.length > 0) {
      const student2Id = student2Res.rows[0].id;
      const apt2Res = await query(
        `INSERT INTO appointments (student_id, provider_id, slot_date, slot_time, status, reason)
         VALUES ($1, $2, '2026-07-17', '11:00 AM - 12:00 PM', 'completed', $3)`,
        [student2Id, providerId, 'Crisis counseling intervention.'],
      );
      const appointment2Id = apt2Res.lastInsertId || 2;

      await query(
        `INSERT INTO sessions (
          appointment_id, student_id, provider_id, session_date, presenting_complaint, history,
          mse, diagnosis, case_formulation, risk_assessment,
          subjective, objective, assessment, plan, workflow_stage
        ) VALUES ($1, $2, $3, '2026-07-17', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'report')`,
        [
          appointment2Id,
          student2Id,
          providerId,
          'Student reports severe academic failure worries, hopelessness, self-harm impulses, and sleep deprivation.',
          'Onset 2 weeks ago following semester grade release. Progressive feelings of worthlessness.',
          'Disheveled appearance, flat affect, speech soft and slow, express feelings of hopelessness.',
          'F32.2 Severe depressive episode without psychotic symptoms',
          'Academic failure trigger in vulnerable student with low coping mechanisms, leading to severe hopelessness.',
          'HIGH RISK: Expresses passive suicidal ideation. Safety plan contracted with hostellers and wardens.',
          'Feeling completely hopeless and alone.',
          'Slumped posture, tearing up during session.',
          'Severe depressive symptoms with active risk indicators.',
          'Formulate crisis management team. Alert hostel warden. Follow up in 24 hours.',
        ],
      );
    }

    console.log('Synthetic data seeding successfully completed.');
  } catch (err) {
    console.error('Error seeding synthetic data:', err);
  }
};
