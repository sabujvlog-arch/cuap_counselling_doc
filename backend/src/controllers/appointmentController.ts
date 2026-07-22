import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export interface ConflictCheckResult {
  conflict: boolean;
  message: string;
}

export function parseTime12H(time12H: string): number {
  if (!time12H) return 0;
  const cleanStr = time12H.trim().toUpperCase();
  const match = cleanStr.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (!match) {
    const matchNoSpace = cleanStr.match(/^(\d+):(\d+)(AM|PM)$/);
    if (!matchNoSpace) return 0;
    let hours = parseInt(matchNoSpace[1], 10);
    const minutes = parseInt(matchNoSpace[2], 10);
    const ampm = matchNoSpace[3];
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function parseSlotRange(slotTimeStr: string): { startMin: number; endMin: number } {
  if (!slotTimeStr) return { startMin: 0, endMin: 0 };
  const clean = slotTimeStr.replace(/–/g, '-');
  const parts = clean.split('-');
  if (parts.length < 2) return { startMin: 0, endMin: 0 };
  return {
    startMin: parseTime12H(parts[0]),
    endMin: parseTime12H(parts[1]),
  };
}

export function ensureSlotRange(timeStr: string, durationMin: number = 45): string {
  if (!timeStr) return '';
  if (timeStr.includes('-') || timeStr.includes('–')) {
    return timeStr;
  }
  let minutes = 0;
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    minutes = parseTime12H(timeStr);
  } else {
    const [h, m] = timeStr.split(':').map(Number);
    minutes = (h || 0) * 60 + (m || 0);
  }
  return formatSlotRange(minutes, durationMin);
}

export async function resolveCurrentSlot(
  providerId: number | string,
): Promise<{ slotDate: string; slotTime: string } | null> {
  const now = new Date();
  const slotDate = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay();

  const providerRes = await query('SELECT user_id FROM providers WHERE id = $1', [providerId]);
  if (providerRes.rows.length === 0) return null;
  const providerUserId = providerRes.rows[0].user_id;

  const availRes = await query(
    'SELECT * FROM availability WHERE provider_id = $1 AND day_of_week = $2',
    [providerUserId, dayOfWeek],
  );
  if (availRes.rows.length === 0 || availRes.rows[0].is_holiday) return null;

  const {
    start_time,
    end_time,
    session_duration = 45,
    buffer_time = 0,
    slot_interval = 45,
  } = availRes.rows[0];

  const start = parseTime(start_time);
  const end = parseTime(end_time);
  const duration = parseInt(session_duration as any, 10) || 45;
  const buffer = parseInt(buffer_time as any, 10) || 0;
  const interval = slot_interval ? parseInt(slot_interval as any, 10) : duration + buffer;

  let current = start;
  while (current + duration <= end) {
    if (currentMinutes >= current && currentMinutes < current + interval) {
      return {
        slotDate,
        slotTime: formatSlotRange(current, duration),
      };
    }
    current += interval;
  }

  // Default to a slot based on current hour if outside predefined slots
  const roundedStart = Math.max(start, currentMinutes - (currentMinutes % 30));
  return {
    slotDate,
    slotTime: formatSlotRange(roundedStart, duration),
  };
}

export const verifyConflict = async (
  providerId: number | string,
  date: string,
  timeSlot: string,
  excludeAppointmentId?: number,
): Promise<ConflictCheckResult> => {
  const providerRes = await query(
    'SELECT user_id, is_active, is_blocked FROM providers WHERE id = $1',
    [providerId],
  );
  if (providerRes.rows.length === 0) {
    return { conflict: true, message: 'Provider not found.' };
  }
  const provider = providerRes.rows[0];
  if (provider.is_blocked || !provider.is_active) {
    return {
      conflict: true,
      message: 'This counselor is currently marked as unavailable or on leave.',
    };
  }
  const providerUserId = provider.user_id;

  const slotDate = new Date(date);
  const dayOfWeek = slotDate.getDay();

  const availRes = await query(
    'SELECT * FROM availability WHERE (provider_id = $1 OR provider_id = (SELECT id FROM providers WHERE user_id = $1)) AND day_of_week = $2',
    [providerUserId, dayOfWeek],
  );

  const availRow = availRes.rows[0] || {};
  if (availRow.is_holiday) {
    return {
      conflict: true,
      message: 'This counselor is not available on this day (holiday or leave).',
    };
  }

  const {
    start_time = '09:00',
    end_time = '17:00',
    break_start,
    break_end,
    session_duration = 60,
    buffer_time = 0,
  } = availRow;

  const parsed = parseSlotRange(timeSlot);
  if (parsed.startMin === 0 && parsed.endMin === 0) {
    return { conflict: true, message: 'Invalid slot format.' };
  }

  const { startMin, endMin } = parsed;

  const workStart = parseTime(start_time);
  const workEnd = parseTime(end_time);
  if (startMin < workStart || endMin > workEnd) {
    return {
      conflict: true,
      message: 'The selected slot falls outside working hours.',
    };
  }

  if (break_start && break_end) {
    const breakStart = parseTime(break_start);
    const breakEnd = parseTime(break_end);
    if (startMin < breakEnd && endMin > breakStart) {
      return {
        conflict: true,
        message: "The selected slot conflicts with the counselor's lunch break.",
      };
    }
  }

  let queryText = `
    SELECT id, slot_time, status FROM appointments 
    WHERE provider_id = $1 AND slot_date = $2 
    AND status IN ('approved', 'pending', 'booked', 'follow-up', 'emergency')
  `;
  const params: any[] = [providerId, date];
  if (excludeAppointmentId) {
    queryText += ` AND id != $3`;
    params.push(excludeAppointmentId);
  }

  const bookingsRes = await query(queryText, params);
  const buffer = parseInt(buffer_time as any, 10) || 0;

  for (const booking of bookingsRes.rows) {
    const bParsed = parseSlotRange(booking.slot_time);
    if (bParsed.startMin === 0 && bParsed.endMin === 0) continue;

    if (startMin < bParsed.endMin && endMin > bParsed.startMin) {
      return {
        conflict: true,
        message:
          'This appointment slot is already booked. Please select another available time slot.',
      };
    }

    if (startMin < bParsed.endMin + buffer && endMin > bParsed.startMin - buffer) {
      return {
        conflict: true,
        message: `The selected slot violates the counselor's configured buffer time of ${buffer} minutes before or after another appointment.`,
      };
    }
  }

  return { conflict: false, message: '' };
};

// List all active providers (for student booking dropdown)
export const getProviders = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.specialization, p.department, p.email,
              u.username
       FROM providers p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.name ASC`,
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get providers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const bookAppointment = async (req: AuthRequest, res: Response) => {
  const {
    providerId,
    date,
    timeSlot,
    chiefComplaint,
    reasonReferral,
    presentingProblem,
    durationProblem,
    additionalNotes,
  } = req.body;
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can book appointments' });
  }

  if (!providerId || !date || !timeSlot || !chiefComplaint) {
    return res
      .status(400)
      .json({ error: 'Provider ID, date, timeslot, and chief complaint are required' });
  }

  try {
    // Get student details
    const studentRes = await query('SELECT id, name FROM students WHERE user_id = $1', [
      req.user.id,
    ]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    const studentId = studentRes.rows[0].id;
    const studentName = studentRes.rows[0].name;

    // Start Transaction for atomic concurrent protection
    await query('BEGIN');

    // Centralized Conflict check
    const conflictCheck = await verifyConflict(providerId, date, timeSlot);
    if (conflictCheck.conflict) {
      await query('ROLLBACK');
      return res.status(400).json({ error: conflictCheck.message });
    }

    const status = 'approved';
    const waitlistPosition = 0;
    const qrCode = `WCCMS-CUAP-${studentId}-${Date.now()}`;

    await query(
      `INSERT INTO appointments (
         student_id, provider_id, slot_date, slot_time, status, reason, qr_code, waitlist_position,
         chief_complaint, reason_referral, presenting_problem, duration_problem, additional_notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        studentId,
        providerId,
        date,
        timeSlot,
        status,
        chiefComplaint,
        qrCode,
        waitlistPosition,
        chiefComplaint,
        reasonReferral || null,
        presentingProblem || null,
        durationProblem || null,
        additionalNotes || null,
      ],
    );

    // Create notifications for Student and Provider
    await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
      req.user.id,
      'appointment',
      `Your appointment request for ${date} at ${timeSlot} is now ${status}.`,
    ]);

    // Get Provider's user ID to notify them
    const providerUserRes = await query('SELECT user_id, name FROM providers WHERE id = $1', [
      providerId,
    ]);
    if (providerUserRes.rows.length > 0) {
      const pUser = providerUserRes.rows[0];
      await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
        pUser.user_id,
        'appointment',
        `New appointment request from student ${studentName} for ${date} at ${timeSlot}.`,
      ]);
    }

    await query('COMMIT');

    return res.status(201).json({
      message: 'Your counseling appointment has been booked successfully.',
      status,
      waitlistPosition,
    });
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch (e) {}
    console.error('Book appointment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppointments = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { status, date } = req.query;

  try {
    let sql = `
      SELECT a.*, 
             s.name as student_name, s.registration_number, s.department as student_dept, s.semester as student_semester, s.phone as student_phone,
             p.name as provider_name, p.specialization as provider_spec, p.department as provider_dept
      FROM appointments a
      JOIN students s ON a.student_id = s.id
      JOIN providers p ON a.provider_id = p.id
    `;
    const params: any[] = [];

    // Filters based on Role
    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0) return res.json([]);
      sql += ' WHERE a.student_id = $' + (params.length + 1);
      params.push(studentRes.rows[0].id);
    } else if (req.user.role === 'provider') {
      const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
      if (providerRes.rows.length === 0) return res.json([]);
      sql += ' WHERE a.provider_id = $' + (params.length + 1);
      params.push(providerRes.rows[0].id);
    } else {
      // Admin sees everything
      sql += ' WHERE 1=1';
    }

    if (status) {
      sql += ' AND a.status = $' + (params.length + 1);
      params.push(status);
    }

    if (date) {
      sql += ' AND a.slot_date = $' + (params.length + 1);
      params.push(date);
    }

    sql += ' ORDER BY a.slot_date DESC, a.slot_time ASC';

    const dbRes = await query(sql, params);
    return res.json(dbRes.rows);
  } catch (err) {
    console.error('Get appointments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, date, timeSlot } = req.body; // status can be: approved, rejected, cancelled, completed, rescheduled

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check appointment
    const appRes = await query(
      `SELECT a.*, s.user_id as student_user_id, s.name as student_name, p.name as provider_name, p.user_id as provider_user_id 
       FROM appointments a
       JOIN students s ON a.student_id = s.id
       JOIN providers p ON a.provider_id = p.id
       WHERE a.id = $1`,
      [id],
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const app = appRes.rows[0];

    // Access control: Students can cancel their own appointments. Providers and Admins can update all.
    if (req.user.role === 'student' && app.student_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let queryText = 'UPDATE appointments SET status = $1';
    const params: any[] = [status];

    if (status === 'rescheduled') {
      if (!date || !timeSlot) {
        return res.status(400).json({ error: 'Date and timeSlot are required for rescheduling' });
      }
      queryText += ", slot_date = $2, slot_time = $3, status = 'pending'";
      params.push(date, timeSlot);
    }

    queryText += ' WHERE id = $' + (params.length + 1);
    params.push(id);

    await query(queryText, params);

    // If status is 'approved' or 'rescheduled' or 'cancelled', update waitlist
    if (status === 'approved') {
      // Cancel any other waiting appointments for the same student on the same slot, if needed, or notify them.
    } else if (status === 'cancelled' || status === 'rejected') {
      // Shift waitlist up
      const waitingListRes = await query(
        "SELECT id, student_id, waitlist_position FROM appointments WHERE provider_id = $1 AND slot_date = $2 AND slot_time = $3 AND status = 'waiting' ORDER BY waitlist_position ASC",
        [app.provider_id, app.slot_date, app.slot_time],
      );

      if (waitingListRes.rows.length > 0) {
        // Promote the first waitlisted student
        const firstWait = waitingListRes.rows[0];
        await query(
          "UPDATE appointments SET status = 'approved', waitlist_position = 0 WHERE id = $1",
          [firstWait.id],
        );

        // Notify promoted student
        const waitStudentUserRes = await query('SELECT user_id FROM students WHERE id = $1', [
          firstWait.student_id,
        ]);
        if (waitStudentUserRes.rows.length > 0) {
          await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
            waitStudentUserRes.rows[0].user_id,
            'appointment',
            `Your waitlist appointment for ${app.slot_date} at ${app.slot_time} has been approved!`,
          ]);
        }

        // Shift remaining waitlist positions down
        for (let i = 1; i < waitingListRes.rows.length; i++) {
          await query('UPDATE appointments SET waitlist_position = $1 WHERE id = $2', [
            i,
            waitingListRes.rows[i].id,
          ]);
        }
      }
    }

    // Notify user
    const actionText = status === 'rescheduled' ? 'rescheduled (needs approval)' : status;
    await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
      app.student_user_id,
      'appointment',
      `Your appointment with ${app.provider_name} has been ${actionText}.`,
    ]);

    await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
      app.provider_user_id,
      'appointment',
      `Appointment with student ${app.student_name} updated to ${status}.`,
    ]);

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'UPDATE_APPOINTMENT',
        `Appointment ID ${id} status updated to ${status}`,
        req.ip,
      ],
    );

    return res.json({ message: `Appointment status updated to ${status}` });
  } catch (err) {
    console.error('Update appointment status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions for time processing
function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function formatTime12H(totalMinutes: number): string {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes.toString().padStart(2, '0');
  const hrStr = hours.toString().padStart(2, '0');
  return `${hrStr}:${minStr} ${ampm}`;
}

function formatSlotRange(startMin: number, durationMin: number): string {
  const startStr = formatTime12H(startMin);
  const endStr = formatTime12H(startMin + durationMin);
  return `${startStr} – ${endStr}`;
}

export const getAvailableSlots = async (req: AuthRequest, res: Response) => {
  const { providerId, date } = req.query;

  if (!providerId || !date) {
    return res.status(400).json({ error: 'Provider ID and Date are required' });
  }

  try {
    // 1. Get Day of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const slotDate = new Date(date as string);
    const dayOfWeek = slotDate.getDay();

    // 2. Fetch provider's settings for this day
    const availRes = await query(
      'SELECT * FROM availability WHERE (provider_id = $1 OR provider_id = (SELECT user_id FROM providers WHERE id = $1)) AND day_of_week = $2',
      [providerId, dayOfWeek],
    );

    const availRow = availRes.rows[0] || {};
    if (availRow.is_holiday) {
      return res.json({
        slots: [],
        reason: 'Provider is not available on this day (marked as holiday).',
      });
    }

    const {
      start_time = '09:00',
      end_time = '17:00',
      break_start,
      break_end,
      session_duration = 60,
      buffer_time = 0,
      slot_interval = 60,
    } = availRow;

    // Generate slots
    const slots: { time: string; status: string }[] = [];
    let current = parseTime(start_time);
    const end = parseTime(end_time);
    const bStart = break_start ? parseTime(break_start) : null;
    const bEnd = break_end ? parseTime(break_end) : null;

    const duration = parseInt(session_duration as any, 10) || 45;
    const buffer = parseInt(buffer_time as any, 10) || 0;
    const interval = slot_interval ? parseInt(slot_interval as any, 10) : duration + buffer;

    while (current + duration <= end) {
      // Check if slot falls in break time
      const slotStart = current;
      const slotEnd = current + duration;

      const overlapsBreak =
        bStart &&
        bEnd &&
        ((slotStart >= bStart && slotStart < bEnd) ||
          (slotEnd > bStart && slotEnd <= bEnd) ||
          (slotStart <= bStart && slotEnd >= bEnd));

      if (!overlapsBreak) {
        slots.push({
          time: formatSlotRange(slotStart, duration),
          status: 'available',
        });
      }
      current += interval;
    }

    // 3. Query existing approved/pending appointments for this provider on this date
    const bookedRes = await query(
      "SELECT slot_time, status FROM appointments WHERE provider_id = $1 AND slot_date = $2 AND status IN ('approved', 'pending', 'waiting')",
      [providerId, date],
    );

    // Map existing slot status
    const bookings = bookedRes.rows.reduce((acc: any, curr: any) => {
      acc[curr.slot_time] = curr.status;
      return acc;
    }, {});

    const responseSlots = slots.map((s) => {
      const bookedStatus = bookings[s.time];
      return {
        time: s.time,
        status: bookedStatus
          ? bookedStatus === 'approved'
            ? 'occupied'
            : bookedStatus === 'pending'
              ? 'pending'
              : 'occupied'
          : 'available',
      };
    });

    return res.json({ slots: responseSlots });
  } catch (err) {
    console.error('Get available slots error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCounselorSettings = async (req: AuthRequest, res: Response) => {
  const { providerId } = req.query;
  if (!providerId) {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  try {
    const providerRes = await query('SELECT user_id FROM providers WHERE id = $1', [providerId]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    const userId = providerRes.rows[0].user_id;

    const settingsRes = await query(
      'SELECT * FROM availability WHERE provider_id = $1 ORDER BY day_of_week ASC',
      [userId],
    );
    return res.json(settingsRes.rows);
  } catch (err) {
    console.error('Get counselor settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCounselorSettings = async (req: AuthRequest, res: Response) => {
  const { providerId, sessionDuration, bufferTime, maxAppointments, slotInterval, workingDays } =
    req.body;

  if (!providerId || !sessionDuration || !workingDays) {
    return res
      .status(400)
      .json({ error: 'Provider ID, session duration, and working days are required' });
  }

  try {
    const providerRes = await query('SELECT user_id FROM providers WHERE id = $1', [providerId]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    const userId = providerRes.rows[0].user_id;

    for (const wd of workingDays) {
      const checkRes = await query(
        'SELECT id FROM availability WHERE provider_id = $1 AND day_of_week = $2',
        [userId, wd.dayOfWeek],
      );

      if (checkRes.rows.length > 0) {
        await query(
          `UPDATE availability 
           SET start_time = $1, end_time = $2, break_start = $3, break_end = $4, is_holiday = $5,
               session_duration = $6, buffer_time = $7, max_appointments_per_day = $8, slot_interval = $9
           WHERE provider_id = $10 AND day_of_week = $11`,
          [
            wd.startTime,
            wd.endTime,
            wd.breakStart,
            wd.breakEnd,
            wd.isHoliday,
            sessionDuration,
            bufferTime || 0,
            maxAppointments || 8,
            slotInterval || sessionDuration,
            userId,
            wd.dayOfWeek,
          ],
        );
      } else {
        await query(
          `INSERT INTO availability (provider_id, day_of_week, start_time, end_time, break_start, break_end, is_holiday, session_duration, buffer_time, max_appointments_per_day, slot_interval)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            userId,
            wd.dayOfWeek,
            wd.startTime,
            wd.endTime,
            wd.breakStart,
            wd.breakEnd,
            wd.isHoliday,
            sessionDuration,
            bufferTime || 0,
            maxAppointments || 8,
            slotInterval || sessionDuration,
          ],
        );
      }
    }

    return res.json({ message: 'Counselor schedule settings updated successfully' });
  } catch (err) {
    console.error('Update counselor settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyAppointmentQR = async (req: AuthRequest, res: Response) => {
  const { qrCode } = req.body;

  if (!qrCode) {
    return res.status(400).json({ error: 'QR Code payload is required' });
  }

  try {
    const appRes = await query(
      `SELECT a.*, s.name as student_name, s.registration_number, p.name as provider_name 
       FROM appointments a
       JOIN students s ON a.student_id = s.id
       JOIN providers p ON a.provider_id = p.id
       WHERE a.qr_code = $1`,
      [qrCode],
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid QR Code or appointment booking not found.' });
    }

    const appointment = appRes.rows[0];
    return res.json({
      valid: true,
      appointment: {
        id: appointment.id,
        studentName: appointment.student_name,
        studentRegNo: appointment.registration_number,
        providerName: appointment.provider_name,
        date: appointment.slot_date,
        time: appointment.slot_time,
        status: appointment.status,
      },
    });
  } catch (err) {
    console.error('Verify QR error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================
// Phase 10 Refinement Controllers
// ============================================================

// Helper to resolve provider_id from body or logged in req.user
async function resolveProviderId(reqUser: any, bodyProviderId?: any): Promise<number> {
  if (bodyProviderId && Number(bodyProviderId) > 0) return Number(bodyProviderId);
  if (reqUser && reqUser.id) {
    const pRes = await query('SELECT id FROM providers WHERE user_id = $1', [reqUser.id]);
    if (pRes.rows.length > 0) return pRes.rows[0].id;
  }
  const fallback = await query('SELECT id FROM providers ORDER BY id ASC LIMIT 1');
  return fallback.rows?.[0]?.id || 1;
}

// Helper to resolve student_id from ID or manual student_name + registration_number
async function resolveOrCreateStudent(
  student_id?: number | string,
  student_name?: string,
  registration_number?: string,
): Promise<number | null> {
  if (student_id && Number(student_id) > 0) return Number(student_id);

  const regNo = registration_number?.trim() || `WALKIN-${Date.now()}`;
  const name = student_name?.trim() || 'Walk-in Student';

  if (!registration_number?.trim() && !student_name?.trim()) {
    return null;
  }

  // 1. Check existing student by registration_number
  if (registration_number?.trim()) {
    const existingReg = await query('SELECT id FROM students WHERE registration_number = $1', [
      regNo,
    ]);
    if (existingReg.rows.length > 0) {
      return existingReg.rows[0].id;
    }
  }

  // 2. Check existing student by name
  if (student_name?.trim()) {
    const existingName = await query('SELECT id FROM students WHERE LOWER(name) = LOWER($1)', [
      name,
    ]);
    if (existingName.rows.length > 0) {
      return existingName.rows[0].id;
    }
  }

  // 3. Create dummy user + student record
  const email = `${regNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@cuap.edu.in`;
  let userId: number;
  const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (userCheck.rows.length > 0) {
    userId = userCheck.rows[0].id;
  } else {
    const userInsert = await query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id`,
      [email, 'hash_walkin'],
    );
    userId = userInsert.rows?.[0]?.id || userInsert.lastInsertId;
  }

  const studentInsert = await query(
    `INSERT INTO students (user_id, registration_number, name, age, gender, dob, department, semester, phone, email, hostel_scholar, emergency_contact, emergency_phone, blood_group, address)
     VALUES ($1, $2, $3, 20, 'Unspecified', '2004-01-01', 'General', 'Sem 1', '0000000000', $4, 'Hosteller', 'N/A', '0000000000', 'O+', 'Campus')
     RETURNING id`,
    [userId, regNo, name, email],
  );

  return studentInsert.rows?.[0]?.id || studentInsert.lastInsertId || null;
}

export const bookOnBehalf = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'provider' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only authorized staff can book on behalf of a student' });
  }

  const {
    student_id,
    student_name,
    registration_number,
    provider_id,
    slot_date,
    slot_time,
    reason,
    chief_complaint,
  } = req.body;
  if ((!student_id && !student_name && !registration_number) || !slot_date || !slot_time) {
    return res.status(400).json({ error: 'Student details, date, and timeslot are required.' });
  }

  try {
    const resolvedStudentId = await resolveOrCreateStudent(
      student_id,
      student_name,
      registration_number,
    );
    if (!resolvedStudentId) {
      return res
        .status(400)
        .json({ error: 'Valid student selection or Student Name / Registration Number required.' });
    }

    const targetProviderId = await resolveProviderId(req.user, provider_id);

    await query('BEGIN');

    const conflictCheck = await verifyConflict(targetProviderId, slot_date, slot_time);
    if (conflictCheck.conflict) {
      await query('ROLLBACK');
      return res.status(400).json({ error: conflictCheck.message });
    }

    const insertRes = await query(
      `INSERT INTO appointments 
       (student_id, provider_id, slot_date, slot_time, status, reason, chief_complaint)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        resolvedStudentId,
        targetProviderId,
        slot_date,
        slot_time,
        'approved',
        reason || 'Booked by counselor',
        chief_complaint || reason || 'Booked on behalf',
      ],
    );

    await query('COMMIT');

    return res.json({
      message: 'Appointment booked successfully',
      appointmentId: insertRes.rows?.[0]?.id || insertRes.lastInsertId,
    });
  } catch (err: any) {
    try {
      await query('ROLLBACK');
    } catch (e) {}
    console.error('Book on behalf error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const registerEmergency = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'provider' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const {
    student_id,
    student_name,
    registration_number,
    provider_id,
    priority,
    crisis_notes,
    referral_details,
    emergency_contact,
  } = req.body;

  try {
    const resolvedStudentId = await resolveOrCreateStudent(
      student_id,
      student_name,
      registration_number,
    );
    if (!resolvedStudentId) {
      return res
        .status(400)
        .json({ error: 'Valid student selection or Student Name / Registration Number required.' });
    }

    const targetProviderId = await resolveProviderId(req.user, provider_id);

    const insertRes = await query(
      `INSERT INTO emergency_cases 
       (student_id, provider_id, priority, crisis_notes, referral_details, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        resolvedStudentId,
        targetProviderId,
        priority || 'high',
        crisis_notes || 'Emergency Walk-in Crisis',
        referral_details || 'Immediate Emergency',
        emergency_contact || 'N/A',
      ],
    );

    return res.json({
      message: 'Emergency registered successfully',
      emergencyId: insertRes.rows?.[0]?.id || insertRes.lastInsertId,
    });
  } catch (err: any) {
    console.error('Register emergency error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const registerSpot = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'provider' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const { student_id, student_name, registration_number, provider_id, reason_for_visit, priority } =
    req.body;

  try {
    const resolvedStudentId = await resolveOrCreateStudent(
      student_id,
      student_name,
      registration_number,
    );
    if (!resolvedStudentId) {
      return res
        .status(400)
        .json({ error: 'Valid student selection or Student Name / Registration Number required.' });
    }

    const targetProviderId = await resolveProviderId(req.user, provider_id);

    const insertRes = await query(
      `INSERT INTO spot_registrations 
       (student_id, provider_id, reason_for_visit, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        resolvedStudentId,
        targetProviderId,
        reason_for_visit || 'Spot Registration Walk-in',
        priority || 'normal',
      ],
    );

    return res.json({
      message: 'Spot registration successful',
      spotId: insertRes.rows?.[0]?.id || insertRes.lastInsertId,
    });
  } catch (err: any) {
    console.error('Register spot error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const scheduleFollowUp = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can schedule follow-ups' });
  }

  const { session_id, student_id, follow_up_date, follow_up_time, duration, notes, goals } =
    req.body;

  try {
    // Get provider_id
    const provRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const provider_id = provRes.rows[0].id;

    const insertRes = await query(
      `INSERT INTO follow_ups 
       (session_id, student_id, provider_id, follow_up_date, follow_up_time, duration, notes, goals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        session_id,
        student_id,
        provider_id,
        follow_up_date,
        follow_up_time,
        duration || 45,
        notes,
        goals,
      ],
    );

    return res.json({
      message: 'Follow-up scheduled successfully',
      followUpId: insertRes.rows?.[0]?.id || insertRes.lastInsertId,
    });
  } catch (err) {
    console.error('Schedule follow-up error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
