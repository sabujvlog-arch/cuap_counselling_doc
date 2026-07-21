import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cuap-secret-key-2026';

// ----------------------------------------------------
// Analytics Dashboard Stats
// ----------------------------------------------------
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'admin' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin' &&
      req.user.role !== 'provider')
  ) {
    return res.status(403).json({ error: 'Authorized permissions required' });
  }

  try {
    // 1. Basic counts
    const studentsRes = await query(
      'SELECT id, registration_number, department, created_at FROM students',
    );
    const appointmentsRes = await query(
      'SELECT id, status, slot_date, provider_id, created_at FROM appointments',
    );
    const sessionsRes = await query(
      'SELECT id, student_id, provider_id, session_status, workflow_stage, session_duration, created_at FROM sessions',
    );
    const providersRes = await query('SELECT id, name FROM providers');
    const mseLogsRes = await query('SELECT risk_level FROM mse_logs');
    const assessmentsRes = await query('SELECT type FROM assessments');

    const totalStudents = studentsRes.rows.length;
    const totalAppointments = appointmentsRes.rows.length;
    const totalSessions = sessionsRes.rows.length;
    const totalProviders = providersRes.rows.length;

    // Active/Closed Cases based on sessions status
    let activeCases = 0;
    let closedCases = 0;
    sessionsRes.rows.forEach((s: any) => {
      if (s.session_status === 'discharged' || s.session_status === 'administrative_closure') {
        closedCases++;
      } else {
        activeCases++;
      }
    });

    // Pending reviews (pending appointments)
    const pendingReviews = appointmentsRes.rows.filter((a: any) => a.status === 'pending').length;

    // Severity counts from mse_logs
    let mildSeverity = 0;
    let moderateSeverity = 0;
    let severeSeverity = 0;
    let criticalSeverity = 0;
    mseLogsRes.rows.forEach((log: any) => {
      const risk = (log.risk_level || 'low').toLowerCase();
      if (risk === 'low') mildSeverity++;
      else if (risk === 'medium') moderateSeverity++;
      else if (risk === 'high') severeSeverity++;
      else if (risk === 'severe') criticalSeverity++;
    });
    const highSeverityCases = severeSeverity + criticalSeverity;

    // Average Assessment Duration
    let totalDuration = 0;
    sessionsRes.rows.forEach((s: any) => {
      totalDuration += s.session_duration || 50;
    });
    const averageAssessmentTime =
      sessionsRes.rows.length > 0 ? Math.round(totalDuration / sessionsRes.rows.length) : 50;

    // Academic category counts
    const academicStats = {
      ug: { registrations: 0, active: 0, completed: 0, pendingFollowups: 0 },
      pg: { registrations: 0, active: 0, completed: 0, pendingFollowups: 0 },
      phd: { registrations: 0, active: 0, completed: 0, pendingFollowups: 0 },
    };

    // Index students by ID for easy lookup
    const studentMap = new Map<number, 'ug' | 'pg' | 'phd'>();
    studentsRes.rows.forEach((s: any) => {
      const reg = s.registration_number.toUpperCase();
      let type: 'ug' | 'pg' | 'phd' = 'pg';
      if (reg.includes('PHD')) type = 'phd';
      else if (reg.includes('B') || reg.startsWith('UG')) type = 'ug';

      studentMap.set(s.id, type);
      academicStats[type].registrations++;
    });

    // Populate academic active/completed stats from sessions
    sessionsRes.rows.forEach((s: any) => {
      const type = studentMap.get(s.student_id) || 'pg';
      if (s.session_status === 'discharged' || s.session_status === 'administrative_closure') {
        academicStats[type].completed++;
      } else {
        academicStats[type].active++;
      }
    });

    // Populate followups
    const prescriptionsRes = await query('SELECT student_id, follow_up_date FROM prescriptions');
    prescriptionsRes.rows.forEach((p: any) => {
      if (p.follow_up_date && new Date(p.follow_up_date) >= new Date()) {
        const type = studentMap.get(p.student_id) || 'pg';
        academicStats[type].pendingFollowups++;
      }
    });

    // Workflow Tracking stage counts
    const workflowStages = {
      registration: totalStudents,
      initial_assessment: appointmentsRes.rows.filter((a: any) => a.status === 'approved').length,
      counselling: sessionsRes.rows.filter(
        (s: any) => s.workflow_stage === 'counselling' || s.workflow_stage === 'registration',
      ).length,
      clinical_evaluation: sessionsRes.rows.length,
      medico_assessment: sessionsRes.rows.filter(
        (s: any) => s.workflow_stage === 'medico_assessment',
      ).length,
      follow_up: prescriptionsRes.rows.length,
      case_closure: closedCases,
    };

    const workflowStatuses = {
      pending: pendingReviews,
      in_progress: activeCases,
      completed:
        closedCases + sessionsRes.rows.filter((s: any) => s.session_status === 'completed').length,
      escalated: sessionsRes.rows.filter((s: any) => s.session_status === 'emergency_escalation')
        .length,
      closed: closedCases,
    };

    // Department-wise Stats
    const deptStatsMap = new Map();
    studentsRes.rows.forEach((s: any) => {
      const d = s.department || 'Applied Sciences';
      if (!deptStatsMap.has(d)) {
        deptStatsMap.set(d, {
          department: d,
          totalCases: 0,
          activeCases: 0,
          closedCases: 0,
          pendingAssessments: 0,
        });
      }
      deptStatsMap.get(d).totalCases++;
    });

    sessionsRes.rows.forEach((s: any) => {
      // Find student dept
      const stud = studentsRes.rows.find((st: any) => st.id === s.student_id);
      const d = stud ? stud.department : 'Applied Sciences';
      if (deptStatsMap.has(d)) {
        if (s.session_status === 'discharged' || s.session_status === 'administrative_closure') {
          deptStatsMap.get(d).closedCases++;
        } else {
          deptStatsMap.get(d).activeCases++;
        }
      }
    });

    // Workload per provider
    const providerMap = new Map();
    providersRes.rows.forEach((p: any) => {
      providerMap.set(p.id, {
        name: p.name,
        assignedStudents: Math.floor(Math.random() * 20) + 5, // Mock data
        activeCases: 0,
        sessionsCompleted: 0,
      });
    });
    sessionsRes.rows.forEach((s: any) => {
      if (s.provider_id && providerMap.has(s.provider_id)) {
        if (
          s.session_status === 'discharged' ||
          s.session_status === 'administrative_closure' ||
          s.session_status === 'completed'
        ) {
          providerMap.get(s.provider_id).sessionsCompleted++;
        } else {
          providerMap.get(s.provider_id).activeCases++;
        }
      }
    });
    const workloadData = Array.from(providerMap.values());

    // Gender Distribution
    const genderStats = { Male: 0, Female: 0, Other: 0 };
    const genderRes = await query('SELECT gender, COUNT(*) as count FROM students GROUP BY gender');
    genderRes.rows.forEach((r: any) => {
      if (r.gender === 'Male') genderStats.Male = parseInt(r.count);
      else if (r.gender === 'Female') genderStats.Female = parseInt(r.count);
      else genderStats.Other = parseInt(r.count);
    });

    // Mock Monthly Visits Trend (kept for compatibility)
    const mockMonthlyVisits = [
      { name: 'Jan', visits: 45 },
      { name: 'Feb', visits: 52 },
      { name: 'Mar', visits: 49 },
      { name: 'Apr', visits: 63 },
      { name: 'May', visits: 58 },
      { name: 'Jun', visits: 85 },
      { name: 'Jul', visits: appointmentsRes.rows.length },
    ];

    // Mock Weekly Visits Trend
    const mockWeeklyVisits = [
      { name: 'Mon', visits: 12, appointments: 8, sessions: 6, walkins: 4 },
      { name: 'Tue', visits: 18, appointments: 12, sessions: 10, walkins: 6 },
      { name: 'Wed', visits: 15, appointments: 10, sessions: 8, walkins: 5 },
      { name: 'Thu', visits: 22, appointments: 15, sessions: 12, walkins: 7 },
      { name: 'Fri', visits: 25, appointments: 18, sessions: 15, walkins: 7 },
      { name: 'Sat', visits: 8, appointments: 5, sessions: 4, walkins: 3 },
      { name: 'Sun', visits: 5, appointments: 3, sessions: 2, walkins: 2 },
    ];

    // Mock Assessment Analytics
    const mockAssessmentAnalytics = [
      { department: 'Applied Sciences', completed: 45, trend: 5 },
      { department: 'Social Sciences', completed: 38, trend: 2 },
      { department: 'Engineering', completed: 52, trend: 8 },
      { department: 'Humanities', completed: 29, trend: -3 },
    ];

    // Mock Appointment Overview
    const mockAppointmentOverview = [
      { name: 'Week 1', scheduled: 40, completed: 32, cancelled: 5, noShow: 3, followUp: 10 },
      { name: 'Week 2', scheduled: 45, completed: 38, cancelled: 4, noShow: 3, followUp: 12 },
      { name: 'Week 3', scheduled: 50, completed: 42, cancelled: 6, noShow: 2, followUp: 15 },
      { name: 'Week 4', scheduled: 35, completed: 30, cancelled: 3, noShow: 2, followUp: 8 },
    ];

    // Mock Student Enrollment Trend
    const mockEnrollmentTrend = [
      { week: 'W1', registrations: 120, growth: 120 },
      { week: 'W2', registrations: 135, growth: 155 },
      { week: 'W3', registrations: 150, growth: 205 },
      { week: 'W4', registrations: 180, growth: 285 },
      { week: 'W5', registrations: 210, growth: 395 },
    ];

    return res.json({
      summary: {
        totalStudents,
        totalPatients: totalStudents,
        totalAssessments: totalSessions + assessmentsRes.rows.length,
        activeCases,
        closedCases,
        pendingReviews,
        highSeverityCases,
        averageAssessmentTime,
        totalProviders,
        departmentPerformanceScore: 92, // Out of 100
      },
      charts: {
        monthlyVisits: mockMonthlyVisits, // keep legacy for compatibility if needed elsewhere
        weeklyVisitTrend: mockWeeklyVisits,
        patientDistribution: [
          { name: 'Active Cases', value: activeCases },
          { name: 'Closed Cases', value: closedCases },
          { name: 'Pending Cases', value: pendingReviews },
          { name: 'Emergency Cases', value: criticalSeverity || 3 },
        ],
        assessmentAnalytics: mockAssessmentAnalytics,
        appointmentOverview: mockAppointmentOverview,
        enrollmentTrend: mockEnrollmentTrend,
        emergencyStatus: {
          todayCount: criticalSeverity || 1,
          criticalAlerts: severeSeverity || 2,
        },
        genderDistribution: [
          { name: 'Male', value: genderStats.Male || 12 },
          { name: 'Female', value: genderStats.Female || 18 },
          { name: 'Other', value: genderStats.Other || 2 },
        ],
        departmentDistribution: Array.from(deptStatsMap.values()),
        providerWorkload: workloadData,
        academicLevelAnalytics: [
          {
            name: 'Undergraduate',
            value: academicStats.ug.registrations,
            registrations: academicStats.ug.registrations,
            active: academicStats.ug.active,
            completed: academicStats.ug.completed,
            followups: academicStats.ug.pendingFollowups,
          },
          {
            name: 'Postgraduate',
            value: academicStats.pg.registrations,
            registrations: academicStats.pg.registrations,
            active: academicStats.pg.active,
            completed: academicStats.pg.completed,
            followups: academicStats.pg.pendingFollowups,
          },
          {
            name: 'PhD Research',
            value: academicStats.phd.registrations,
            registrations: academicStats.phd.registrations,
            active: academicStats.phd.active,
            completed: academicStats.phd.completed,
            followups: academicStats.phd.pendingFollowups,
          },
        ],
        caseSeverityAnalytics: [
          { name: 'Low', value: mildSeverity || 15 },
          { name: 'Moderate', value: moderateSeverity || 10 },
          { name: 'High', value: severeSeverity || 5 },
          { name: 'Critical', value: criticalSeverity || 2 },
        ],
        workflowStages: [
          { name: 'Registration', count: workflowStages.registration },
          { name: 'Initial Assessment', count: workflowStages.initial_assessment },
          { name: 'Counselling', count: workflowStages.counselling },
          { name: 'Clinical Eval', count: workflowStages.clinical_evaluation },
          { name: 'Medico Assessment', count: workflowStages.medico_assessment },
          { name: 'Follow-up', count: workflowStages.follow_up },
          { name: 'Case Closure', count: workflowStages.case_closure },
        ],
        workflowStatuses: [
          { name: 'Pending', value: workflowStatuses.pending },
          { name: 'In Progress', value: workflowStatuses.in_progress },
          { name: 'Completed', value: workflowStatuses.completed },
          { name: 'Escalated', value: workflowStatuses.escalated },
          { name: 'Closed', value: workflowStatuses.closed },
        ],
      },
    });
  } catch (err) {
    console.error('Get analytics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------------------------------
// OPD Daily Patient Register
// ----------------------------------------------------
export const getOPDRegister = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role === 'student') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { date } = req.query; // date in YYYY-MM-DD
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const opdRes = await query(
      `SELECT a.id as token, a.slot_time as time, a.status, a.reason,
              s.registration_number, s.name as student_name, s.department, s.semester,
              p.name as provider_name,
              se.diagnosis, se.plan as follow_up
       FROM appointments a
       JOIN students s ON a.student_id = s.id
       JOIN providers p ON a.provider_id = p.id
       LEFT JOIN sessions se ON a.id = se.appointment_id
       WHERE a.slot_date = $1
       ORDER BY a.slot_time ASC`,
      [targetDate],
    );

    return res.json(opdRes.rows);
  } catch (err) {
    console.error('Get OPD Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportOPDRegisterCSV = async (req: AuthRequest, res: Response) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const opdRes = await query(
      `SELECT a.id as token, a.slot_time as time, a.status,
              s.registration_number, s.name as student_name, s.department, s.semester,
              p.name as provider_name,
              se.diagnosis
       FROM appointments a
       JOIN students s ON a.student_id = s.id
       JOIN providers p ON a.provider_id = p.id
       LEFT JOIN sessions se ON a.id = se.appointment_id
       WHERE a.slot_date = $1
       ORDER BY a.slot_time ASC`,
      [targetDate],
    );

    const rows = opdRes.rows;
    let csvContent =
      'Token,Time,Registration Number,Student Name,Department,Semester,Provider,Status,Diagnosis\n';

    rows.forEach((r: any) => {
      const diagnosis = r.diagnosis ? `"${r.diagnosis.replace(/"/g, '""')}"` : 'N/A';
      csvContent += `${r.token},${r.time},${r.registration_number.toUpperCase()},"${r.student_name}","${r.department}",${r.semester},"${r.provider_name}",${r.status},${diagnosis}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=OPD_Register_${targetDate}.csv`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export OPD error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------------------------------
// Audit Trail Logs
// ----------------------------------------------------
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }

  try {
    const logsRes = await query(
      `SELECT al.*, u.username, u.role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`,
    );
    return res.json(logsRes.rows);
  } catch (err) {
    console.error('Get audit logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------------------------------
// System Database Backup & Restore
// ----------------------------------------------------
export const backupDatabase = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }

  try {
    // Collect all table structures & contents
    const tables = [
      'users',
      'providers',
      'students',
      'appointments',
      'sessions',
      'session_history',
      'prescriptions',
      'prescription_items',
      'assessments',
      'messages',
      'documents',
      'availability',
      'notifications',
      'audit_logs',
    ];

    const backupData: Record<string, any[]> = {};
    for (const table of tables) {
      const resTable = await query(`SELECT * FROM ${table}`);
      backupData[table] = resTable.rows;
    }

    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFileName = `Backup_CUAP_WCCMS_${Date.now()}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'BACKUP_DATABASE',
        `Created system database backup file: ${backupFileName}`,
        req.ip,
      ],
    );

    return res.json({
      message: 'System database backup completed successfully.',
      fileName: backupFileName,
    });
  } catch (err) {
    console.error('Backup database error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const restoreDatabase = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }

  const { fileName } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'Backup filename is required' });
  }

  try {
    const backupFilePath = path.resolve(__dirname, '../../backups', fileName);
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const rawData = fs.readFileSync(backupFilePath, 'utf8');
    const backupData = JSON.parse(rawData);

    // Disable foreign keys temporarily during restore for SQLite
    await query('PRAGMA foreign_keys = OFF');

    // Truncate tables and insert contents
    const tables = Object.keys(backupData);
    for (const table of tables) {
      await query(`DELETE FROM ${table}`);
      const rows = backupData[table];
      if (rows.length === 0) continue;

      // Build insertion parameters
      for (const row of rows) {
        const columns = Object.keys(row).join(', ');
        const placeholders = Object.keys(row)
          .map((_, i) => `$${i + 1}`)
          .join(', ');
        const values = Object.values(row);

        await query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
      }
    }

    await query('PRAGMA foreign_keys = ON');

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'RESTORE_DATABASE',
        `Restored database state from backup file: ${fileName}`,
        req.ip,
      ],
    );

    return res.json({ message: 'System database restored successfully.' });
  } catch (err) {
    console.error('Restore database error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const listBackups = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  try {
    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(backupDir);
    const backupHistory = files
      .filter((f) => f.startsWith('Backup_CUAP_WCCMS_') && f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        const tsMatch = f.match(/Backup_CUAP_WCCMS_(\d+)\.json/);
        const timestamp = tsMatch ? new Date(parseInt(tsMatch[1])) : stats.mtime;
        return {
          fileName: f,
          timestamp: timestamp.toISOString(),
          fileSize: stats.size,
          status: 'Available',
        };
      });
    backupHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json(backupHistory);
  } catch (err) {
    console.error('List backups error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBackup = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  const { fileName } = req.params;
  try {
    const sanitizedName = path.basename(fileName);
    const filePath = path.resolve(__dirname, '../../backups', sanitizedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    fs.unlinkSync(filePath);
    return res.json({ message: 'Backup file deleted successfully.' });
  } catch (err) {
    console.error('Delete backup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadBackup = async (req: AuthRequest, res: Response) => {
  let user = req.user;
  if (!user && req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token as string, JWT_SECRET) as any;
      user = decoded;
    } catch (e) {}
  }
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  const { fileName } = req.params;
  try {
    const sanitizedName = path.basename(fileName);
    const filePath = path.resolve(__dirname, '../../backups', sanitizedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    return res.download(filePath, sanitizedName);
  } catch (err) {
    console.error('Download backup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const sanitizeDatabase = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  try {
    await query('BEGIN');

    const isPG = process.env.DB_TYPE === 'postgres' || process.env.DB_TYPE === 'postgresql';

    let cleanNotifQuery =
      "DELETE FROM notifications WHERE created_at < datetime('now', '-30 days')";
    let cleanLogsQuery = "DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days')";
    let cleanSessionsQuery =
      "UPDATE sessions SET diagnosis = 'Sanitized (Archived Case)' WHERE session_status = 'completed' AND created_at < datetime('now', '-180 days')";

    if (isPG) {
      cleanNotifQuery = "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'";
      cleanLogsQuery = "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'";
      cleanSessionsQuery =
        "UPDATE sessions SET diagnosis = 'Sanitized (Archived Case)' WHERE session_status = 'completed' AND created_at < NOW() - INTERVAL '180 days'";
    }

    const cleanNotif = await query(cleanNotifQuery);
    const cleanLogs = await query(cleanLogsQuery);
    const cleanSessions = await query(cleanSessionsQuery);

    await query('COMMIT');

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'SANITIZE_DATABASE',
        `Database sanitization executed. Notifications/Logs cleared.`,
        req.ip,
      ],
    );

    return res.json({
      message: 'Database sanitization executed successfully.',
      details: {
        notificationsCleared: cleanNotif?.rowCount || 0,
        auditLogsCleared: cleanLogs?.rowCount || 0,
        sessionsSanitized: cleanSessions?.rowCount || 0,
      },
    });
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch (e) {}
    console.error('Sanitize database error:', err);
    return res
      .status(500)
      .json({ error: 'Database sanitization failed. Transaction rolled back.' });
  }
};

// ----------------------------------------------------
// Manage Announcements
// ----------------------------------------------------
export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    // Announcements are special messages from system administrator to everyone
    const sysAnnRes = await query(
      `SELECT n.*, u.username as author 
       FROM notifications n
       JOIN users u ON n.user_id = u.id
       WHERE n.type = 'system' AND u.role = 'admin'
       ORDER BY n.created_at DESC LIMIT 20`,
    );
    return res.json(sysAnnRes.rows);
  } catch (err) {
    console.error('Get announcements error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Announcement message is required' });
  }

  try {
    // Insert into notifications as 'system' type for user_id = admin's user_id
    await query("INSERT INTO notifications (user_id, type, message) VALUES ($1, 'system', $2)", [
      req.user.id,
      message,
    ]);

    // Create notifications for all students and providers so it shows in their dashboard feeds
    const usersRes = await query("SELECT id FROM users WHERE role IN ('student', 'provider')");
    for (const u of usersRes.rows) {
      await query("INSERT INTO notifications (user_id, type, message) VALUES ($1, 'system', $2)", [
        u.id,
        `CUAP Announcement: ${message}`,
      ]);
    }

    return res.status(201).json({ message: 'Announcement published successfully to all users.' });
  } catch (err) {
    console.error('Create announcement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  const { id } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    const getMsgRes = await query('SELECT message FROM notifications WHERE id = $1', [id]);
    if (getMsgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    const originalMsg = getMsgRes.rows[0].message;
    await query('UPDATE notifications SET message = $1 WHERE id = $2', [message, id]);
    await query('UPDATE notifications SET message = $1 WHERE message = $2', [
      `CUAP Announcement: ${message}`,
      `CUAP Announcement: ${originalMsg}`,
    ]);
    return res.json({ message: 'Announcement updated successfully.' });
  } catch (err) {
    console.error('Update announcement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  const { id } = req.params;
  try {
    const getMsgRes = await query('SELECT message FROM notifications WHERE id = $1', [id]);
    if (getMsgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    const originalMsg = getMsgRes.rows[0].message;
    await query('DELETE FROM notifications WHERE id = $1', [id]);
    await query('DELETE FROM notifications WHERE message = $1 OR message = $2', [
      originalMsg,
      `CUAP Announcement: ${originalMsg}`,
    ]);
    return res.json({ message: 'Announcement deleted successfully.' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdminStudents = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  try {
    const studentsRes = await query(`
      SELECT s.*, u.username 
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `);
    return res.json(studentsRes.rows);
  } catch (err) {
    console.error('getAdminStudents error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAdminStudent = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  const { id } = req.params;
  const {
    name,
    age,
    gender,
    dob,
    department,
    semester,
    phone,
    email,
    hostelScholar,
    emergencyContact,
    emergencyPhone,
    bloodGroup,
    address,
  } = req.body;

  try {
    const checkRes = await query('SELECT * FROM students WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = checkRes.rows[0];

    await query(
      `
      UPDATE students 
      SET name = $1, age = $2, gender = $3, dob = $4, department = $5, semester = $6, 
          phone = $7, email = $8, hostel_scholar = $9, emergency_contact = $10, 
          emergency_phone = $11, blood_group = $12, address = $13
      WHERE id = $14
    `,
      [
        name,
        parseInt(age),
        gender,
        dob,
        department,
        semester,
        phone,
        email,
        hostelScholar,
        emergencyContact,
        emergencyPhone,
        bloodGroup,
        address,
        id,
      ],
    );

    await query(
      `
      UPDATE users
      SET email = $1, phone = $2
      WHERE id = $3
    `,
      [email, phone, student.user_id],
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'UPDATE_STUDENT',
        `Admin updated student profile for ${name} (${student.registration_number})`,
        req.ip,
      ],
    );

    return res.json({ message: 'Student updated successfully' });
  } catch (err) {
    console.error('updateAdminStudent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAdminStudent = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  const { id } = req.params;

  try {
    const checkRes = await query('SELECT * FROM students WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = checkRes.rows[0];

    await query('DELETE FROM appointments WHERE student_id = $1', [id]);

    const sessionsRes = await query('SELECT id FROM sessions WHERE student_id = $1', [id]);
    for (const session of sessionsRes.rows) {
      await query('DELETE FROM prescriptions WHERE session_id = $1', [session.id]);
      await query('DELETE FROM session_versions WHERE session_id = $1', [session.id]);
    }
    await query('DELETE FROM sessions WHERE student_id = $1', [id]);
    await query('DELETE FROM mse_logs WHERE student_id = $1', [id]);
    await query('DELETE FROM assessments WHERE student_id = $1', [id]);
    await query('DELETE FROM documents WHERE student_id = $1', [id]);

    await query('DELETE FROM students WHERE id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [student.user_id]);

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'DELETE_STUDENT',
        `Admin deleted student ${student.name} (${student.registration_number})`,
        req.ip,
      ],
    );

    return res.json({ message: 'Student account deleted successfully' });
  } catch (err) {
    console.error('deleteAdminStudent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
