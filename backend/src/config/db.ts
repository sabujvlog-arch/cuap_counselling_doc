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
      await seedStudents();
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
  await seedStudents();
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

const seedStudents = async (): Promise<void> => {
  const students = [
    { name: "ALURU SURYA TEJA", regNo: "25BEC01", gender: "Male", mobile: "9849891226" },
    { name: "ANAND M SAGAR", regNo: "25BTC05", gender: "Male", mobile: "9496000017" },
    { name: "EEDARA BHAVYA NAYANA YAMINI", regNo: "23BEC07", gender: "Female", mobile: "7569386126" },
    { name: "BIPUL KUMAR", regNo: "25BBA09", gender: "Male", mobile: "9065814071" },
    { name: "BATTU SURYA VAMSI KRISHNA", regNo: "23BPS05", gender: "Male", mobile: "9652370181" },
    { name: "ANANTHAGIRI PRAVEEN", regNo: "24BCS09", gender: "Male", mobile: "9912627425" },
    { name: "NAGANANDI PAVAN KUMAR", regNo: "24BBA33", gender: "Male", mobile: "9885284143" },
    { name: "JANNU AJAY KUMAR", regNo: "25MED03", gender: "Male", mobile: "8919680408" },
    { name: "BALIJA VAMSHI", regNo: "25MED01", gender: "Male", mobile: "9100837005" },
    { name: "ARDRA T U", regNo: "25MAP04", gender: "Female", mobile: "8593073093" },
    { name: "SRADHA RAJEEV", regNo: "25MAP38", gender: "Female", mobile: "9871485988" },
    { name: "KOTNI POOJITH", regNo: "25BPS17", gender: "Male", mobile: "8179832374" },
    { name: "GALI VINAY BABU", regNo: "25BEL09", gender: "Male", mobile: "9849677695" },
    { name: "C REVANTH", regNo: "25BEC06", gender: "Male", mobile: "9740382945" },
    { name: "JYOTHIKA S R", regNo: "25MAP19", gender: "Female", mobile: "7736402014" },
    { name: "Byrapogu Harshavardhani", regNo: "24BRI01", gender: "Female", mobile: "8500167885" },
    { name: "D HEMANTH KUMAR REDDY", regNo: "25MBA13", gender: "Male", mobile: "8500889569" },
    { name: "SAKE SANJAY RAM", regNo: "25BPS39", gender: "Male", mobile: "8341658077" },
    { name: "DOMMANGI ARJUN", regNo: "24BCO08", gender: "Male", mobile: "9573535645" },
    { name: "KANDRU RAKESH", regNo: "25MAI08", gender: "Male", mobile: "9908324071" },
    { name: "KONDURU SYAM KUMAR", regNo: "25BCO18", gender: "Male", mobile: "8897539536" },
    { name: "ANNAPURNA KUNALA ", regNo: "24MEL03", gender: "Male", mobile: "9381120448" },
    { name: "MESA MARTHA JESSY", regNo: "25BSP17", gender: "Female", mobile: "9951059901" },
    { name: "KOTTI GANGA BHAVANI", regNo: "25MAI25", gender: "Female", mobile: "8897461059" },
    { name: "SREYA C S", regNo: "24BCO27", gender: "Female", mobile: "8547316665" },
    { name: "GUDIMETLA GEETHA PRASANGINI", regNo: "24BPS13", gender: "Female", mobile: "9603712820" },
    { name: "AJAY DAS", regNo: "24BCS06", gender: "Male", mobile: "9234860350" },
    { name: "IPSITA SAHOO", regNo: "24BCS22", gender: "Female", mobile: "7655883669" },
    { name: "DARIYA SUJWAL VICTOR", regNo: "24BCS18", gender: "Male", mobile: "9492554589" },
    { name: "KALLAMUDI PRAKASH", regNo: "24BCS29", gender: "Male", mobile: "8317675066" },
    { name: "BIPOGU VIJAYANAND", regNo: "24BCS78", gender: "Male", mobile: "9177192397" },
    { name: "RACHAPUDI AMULYA", regNo: "25MEL13", gender: "Female", mobile: "9032462135" },
    { name: "SHUDHANSHU KUMAR YADAV", regNo: "25MAI17", gender: "Male", mobile: "7683019028" },
    { name: "PANNATULA SAI SHARANNYA", regNo: "25BTC32", gender: "Female", mobile: "9441676649" },
    { name: "MOTUPALLI MAHESH", regNo: "24MEC08", gender: "Male", mobile: "8179958095" },
    { name: "MOHANA SRINIVASULU", regNo: "24BCS36", gender: "Male", mobile: "8056282704" },
    { name: "SJ KHUTJATULKUBRA", regNo: "25BTC57", gender: "Female", mobile: "9063133604" },
    { name: "PIYUSH RAJ", regNo: "24BCS49", gender: "Male", mobile: "9279513797" },
    { name: "O ABISHEK", regNo: "25BBA32", gender: "Male", mobile: "9182828307" },
    { name: "VURAMALA CHARITHA", regNo: "25BTC59", gender: "Female", mobile: "9110795701" },
    { name: "JANNI LOKESH BABU", regNo: "25BCS28", gender: "Male", mobile: "8179169390" },
    { name: "KALLA JASHWANTH REDDY", regNo: "25BPS15", gender: "Male", mobile: "9985652679" },
    { name: "PEDDIVEETI SREEHARI", regNo: "25MAI27", gender: "Male", mobile: "9121348512" },
    { name: "YATA NAGA SAI BHANU ARAVIND", regNo: "25MAI31", gender: "Male", mobile: "7997890386" },
    { name: "BULLE PRASANTH KUMAR ", regNo: "24MPS03", gender: "Male", mobile: "9959158137" },
    { name: "RAGENI VYSHNAVI", regNo: "24BRI10", gender: "Female", mobile: "9701924311" },
    { name: "RAHUL S V", regNo: "25MMB19", gender: "Male", mobile: "8156903893" },
    { name: "SIBIN K", regNo: "25MBA32", gender: "Male", mobile: "7034291044" },
    { name: "MUHAMMED THWAYYIB P S", regNo: "25MBA25", gender: "Male", mobile: "6238347294" },
    { name: "MAHENDRA REDDY", regNo: "25MMB12", gender: "Male", mobile: "6364638941" },
    { name: "MADDELA SAI KUMAR", regNo: "25MMB11", gender: "Male", mobile: "9390728343" },
    { name: "KALABANDI RAHUL BENHIN SHALOME", regNo: "25BBA16", gender: "Male", mobile: "9989273194" },
    { name: "NAVYA N", regNo: "24MEC09", gender: "Female", mobile: "8137814985" },
    { name: "ANJANA P", regNo: "24MEC01", gender: "Female", mobile: "6238796449" },
    { name: "TARUNAKANTA SAHOO", regNo: "25BCO39", gender: "Male", mobile: "6281343766" },
    { name: "APOORV SINGH", regNo: "25BCS13", gender: "Male", mobile: "9473224448" },
    { name: "VELPULA BHARATH", regNo: "25MMB29", gender: "Male", mobile: "6309608361" },
    { name: "ARIGELA LALITH SATHWIK", regNo: "25MAI03", gender: "Male", mobile: "9515022969" },
    { name: "KAKARLA JASWANTH CHOWDARY", regNo: "25MST09", gender: "Male", mobile: "9347889339" },
    { name: "ATHIDEV A S", regNo: "25BCO04", gender: "Male", mobile: "9188467483" },
    { name: "VALMEEKI NARASIMHULU GARI GOPICHAND", regNo: "24MAT20", gender: "Male", mobile: "8309092182" },
    { name: "TAPASVI PANDA", regNo: "25BSP32", gender: "Male", mobile: "9265820840" },
    { name: "HIMADRI HALDAR", regNo: "25BSP14", gender: "Male", mobile: "7450810258" },
    { name: "PAGIDIPALAYAM YUVA SREE", regNo: "25BPS29", gender: "Female", mobile: "9440414239" },
    { name: "KANDULA VENKATA ADITYA", regNo: "25BPS16", gender: "Male", mobile: "9703164114" },
    { name: "DIDDI ARYAN SIVA KESHAV SHARMA", regNo: "24BCO07", gender: "Male", mobile: "9493870450" },
    { name: "K K S S DHANUSH", regNo: "24BBA13", gender: "Male", mobile: "9704482467" },
    { name: "MD JEEBRAEEL", regNo: "25MBA22", gender: "Male", mobile: "6299334157" },
    { name: "ALAPAN CHATTERJEE", regNo: "25MGG04", gender: "Male", mobile: "9830921124" },
    { name: "MOHNISH DUTTA", regNo: "25MPS11", gender: "Male", mobile: "8100298506" },
    { name: "P. Rishitha", regNo: "24BSP41", gender: "Female", mobile: "9441633970" },
    { name: "SINGARA SELVI", regNo: "24BSP33", gender: "Female", mobile: "9597159051" },
    { name: "RATHNAVATH PRASANNA NAIK", regNo: "24BBA44", gender: "Male", mobile: "8148858541" },
    { name: "PUTTA YASWITHA", regNo: "24BCS52", gender: "Female", mobile: "9885275449" },
    { name: "MANEESH BATHINI", regNo: "24MGP04", gender: "Male", mobile: "9704517728" },
    { name: "SAI CHETHAN", regNo: "24MPS26", gender: "Male", mobile: "9652892098" },
    { name: "GADDAM BHAVANA", regNo: "24MPS06", gender: "Female", mobile: "9014818123" },
    { name: "UTKARSH KUMAR UPADHYAY", regNo: "24BBA54", gender: "Male", mobile: "7667205971" },
    { name: "PRATIK SUSHILRAO DHOKE", regNo: "24BSP26", gender: "Male", mobile: "9021845503" },
    { name: "ALOK KUMAR ", regNo: "24BEC04", gender: "Male", mobile: "9508460072" },
    { name: "GUDIBANDA DAYANA LAKSHMI", regNo: "24BBA12", gender: "Female", mobile: "8886808015" },
    { name: "SALLAGUNDLA BHAVANA", regNo: "24BBA45", gender: "Female", mobile: "8688023120" },
    { name: "AASHATH C", regNo: "24BCO01", gender: "Male", mobile: "9659902131" },
    { name: "VISHAL MANICKAM SACHIDHANANDHAM", regNo: "24BCO31", gender: "Male", mobile: "8300839479" },
    { name: "DOMMARAJU HARISHVARMA", regNo: "25MGP02", gender: "Male", mobile: "9391269233" },
    { name: "GOLLA JYOTHISWAROOP", regNo: "25MPS04", gender: "Male", mobile: "6303962914" },
    { name: "SHEELAM SHANUMUKA RAJA SAI RAHUL", regNo: "25MGP03", gender: "Male", mobile: "8639461286" },
    { name: "Nithiyasri S", regNo: "24BBA35", gender: "Female", mobile: "8148365935" },
    { name: "PARAGATH NISHA T", regNo: "24BPS32", gender: "Female", mobile: "9095325117" },
    { name: "DEEPIKA", regNo: "24BPS09", gender: "Female", mobile: "9489477113" },
    { name: "UBAID ASHRAF", regNo: "24BCS72", gender: "Male", mobile: "9258048532" },
    { name: "MOKARA JAGAN", regNo: "23BPS14", gender: "Male", mobile: "9985518256" },
    { name: "MALAPATI UDAY KIRAN", regNo: "23BBA19", gender: "Male", mobile: "8008415798" },
    { name: "SANDELA ADVITHRAJ", regNo: "25MEC08", gender: "Male", mobile: "9550212925" },
    { name: "MAHESH", regNo: "24BPS23", gender: "Male", mobile: "9121211608" },
    { name: "jatta gnana sidshartha ambedkar sastry", regNo: "24BPS18", gender: "Male", mobile: "7993818780" },
    { name: "ZAINUL ABIDEEN JIFIRI THANGAL A", regNo: "25MCS08", gender: "Male", mobile: "8330020137" },
    { name: "PANCHAJANYA KHAUND", regNo: "25MMB16", gender: "Male", mobile: "9365445800" },
    { name: "BHUKYA VENKATESH", regNo: "25MEC01", gender: "Male", mobile: "7995205012" },
    { name: "RAJ KUMAR", regNo: "24MPS24", gender: "Male", mobile: "6203240548" },
    { name: "MANOHAR MOIRANGTHEM", regNo: "25MCO02", gender: "Male", mobile: "8798133912" },
    { name: "MUDE SIVA PRASAD NAIK", regNo: "25MCS03", gender: "Male", mobile: "6281020535" }
  ];

  console.log(`Checking/Seeding ${students.length} student records...`);
  
  for (const s of students) {
    const username = s.regNo.toLowerCase().trim();
    const res = await query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (res.rows.length === 0) {
      // Seed user row
      // Use exact regNo as default password (e.g. "25BEC01")
      const passwordHash = await bcrypt.hash(s.regNo.toUpperCase(), 10);
      
      const insertUser = await query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        [username, passwordHash, 'student']
      );

      const selectNew = await query('SELECT id FROM users WHERE username = $1', [username]);
      const userId = selectNew.rows[0].id;

      // Parse department and semester based on registration number
      const reg = s.regNo.toUpperCase();
      let department = "Applied Sciences";
      if (reg.includes("BEC")) department = "Electronics & Communication";
      else if (reg.includes("BTC")) department = "Biotechnology";
      else if (reg.includes("BBA")) department = "Business Administration";
      else if (reg.includes("BPS")) department = "Applied Psychology";
      else if (reg.includes("BCS")) department = "Computer Science & IT";
      else if (reg.includes("MAI")) department = "Artificial Intelligence";
      else if (reg.includes("MED")) department = "Education";
      else if (reg.includes("MAP")) department = "Applied Psychology (PG)";
      else if (reg.includes("MEC")) department = "English (PG)";
      else if (reg.includes("MGP")) department = "Geography (PG)";
      else if (reg.includes("MBA")) department = "Business Management (MBA)";
      else if (reg.includes("BCO")) department = "Commerce (UG)";
      else if (reg.includes("BEL")) department = "English (UG)";
      else if (reg.includes("MEL")) department = "English (PG)";
      else if (reg.includes("BSP")) department = "Science & Physics";
      else if (reg.includes("BRI")) department = "Retail Management";
      else if (reg.includes("MST")) department = "Statistics";
      else if (reg.includes("MGG")) department = "Geography";
      else if (reg.includes("MAT")) department = "Mathematics";
      else if (reg.includes("MMB")) department = "Molecular Biology";
      else if (reg.includes("MCS")) department = "Computer Science (PG)";
      else if (reg.includes("MCO")) department = "Commerce (PG)";

      let semester = "Semester II";
      if (reg.startsWith("23")) semester = "Semester VI";
      else if (reg.startsWith("24")) semester = "Semester IV";

      const age = s.gender === 'Male' ? 21 : 20;
      const dob = s.gender === 'Male' ? '2005-06-15' : '2006-03-22';
      const email = `${username}@cuap.edu.in`;

      await query(
        `INSERT INTO students 
         (user_id, registration_number, name, age, gender, dob, department, semester, phone, email, hostel_scholar, emergency_contact, emergency_phone, blood_group, address, informed_consent_signed, consent_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1, CURRENT_TIMESTAMP)`,
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
          'Hosteller',
          'Guardian',
          s.mobile,
          'O+',
          'CUAP Campus, Anantapuramu'
        ]
      );
    }
  }
  console.log('Student seeding checks complete.');
};
