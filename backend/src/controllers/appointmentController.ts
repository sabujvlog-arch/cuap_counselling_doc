import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// List all active providers (for student booking dropdown)
export const getProviders = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.specialization, p.department, p.email,
              u.username
       FROM providers p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.name ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get providers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const bookAppointment = async (req: AuthRequest, res: Response) => {
  const { providerId, date, timeSlot, reason } = req.body;
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can book appointments' });
  }

  if (!providerId || !date || !timeSlot || !reason) {
    return res.status(400).json({ error: 'Provider ID, date, timeslot, and reason are required' });
  }

  try {
    // Get student details
    const studentRes = await query('SELECT id, name FROM students WHERE user_id = $1', [req.user.id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    const studentId = studentRes.rows[0].id;
    const studentName = studentRes.rows[0].name;

    // Check if slot already booked by an approved appointment
    const clashRes = await query(
      "SELECT id FROM appointments WHERE provider_id = $1 AND slot_date = $2 AND slot_time = $3 AND status = 'approved'",
      [providerId, date, timeSlot]
    );

    let waitlistPosition = 0;
    let status = 'pending';

    if (clashRes.rows.length > 0) {
      // Slot is occupied, place on waitlist
      const waitlistRes = await query(
        "SELECT MAX(waitlist_position) as max_pos FROM appointments WHERE provider_id = $1 AND slot_date = $2 AND slot_time = $3",
        [providerId, date, timeSlot]
      );
      const maxPos = waitlistRes.rows[0]?.max_pos || 0;
      waitlistPosition = maxPos + 1;
      status = 'waiting';
    }

    // Generate mock verification token/QR code format
    const qrCode = `WCCMS-CUAP-${studentId}-${Date.now()}`;

    await query(
      'INSERT INTO appointments (student_id, provider_id, slot_date, slot_time, status, reason, qr_code, waitlist_position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [studentId, providerId, date, timeSlot, status, reason, qrCode, waitlistPosition]
    );

    // Create notifications for Student and Provider
    await query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [req.user.id, 'appointment', `Your appointment request for ${date} at ${timeSlot} is now ${status}.`]
    );

    // Get Provider's user ID to notify them
    const providerUserRes = await query('SELECT user_id, name FROM providers WHERE id = $1', [providerId]);
    if (providerUserRes.rows.length > 0) {
      const pUser = providerUserRes.rows[0];
      await query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
        [pUser.user_id, 'appointment', `New appointment request from student ${studentName} for ${date} at ${timeSlot}.`]
      );
    }

    return res.status(201).json({ 
      message: status === 'waiting' 
        ? 'Slot is full. You have been placed on the waiting list.' 
        : 'Appointment requested successfully.',
      status,
      waitlistPosition
    });
  } catch (err) {
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
      [id]
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
      queryText += ', slot_date = $2, slot_time = $3, status = \'pending\'';
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
        [app.provider_id, app.slot_date, app.slot_time]
      );

      if (waitingListRes.rows.length > 0) {
        // Promote the first waitlisted student
        const firstWait = waitingListRes.rows[0];
        await query(
          "UPDATE appointments SET status = 'approved', waitlist_position = 0 WHERE id = $1",
          [firstWait.id]
        );

        // Notify promoted student
        const waitStudentUserRes = await query('SELECT user_id FROM students WHERE id = $1', [firstWait.student_id]);
        if (waitStudentUserRes.rows.length > 0) {
          await query(
            'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
            [waitStudentUserRes.rows[0].user_id, 'appointment', `Your waitlist appointment for ${app.slot_date} at ${app.slot_time} has been approved!`]
          );
        }

        // Shift remaining waitlist positions down
        for (let i = 1; i < waitingListRes.rows.length; i++) {
          await query(
            'UPDATE appointments SET waitlist_position = $1 WHERE id = $2',
            [i, waitingListRes.rows[i].id]
          );
        }
      }
    }

    // Notify user
    const actionText = status === 'rescheduled' ? 'rescheduled (needs approval)' : status;
    await query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [app.student_user_id, 'appointment', `Your appointment with ${app.provider_name} has been ${actionText}.`]
    );

    await query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [app.provider_user_id, 'appointment', `Appointment with student ${app.student_name} updated to ${status}.`]
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'UPDATE_APPOINTMENT', `Appointment ID ${id} status updated to ${status}`, req.ip]
    );

    return res.json({ message: `Appointment status updated to ${status}` });
  } catch (err) {
    console.error('Update appointment status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

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
      'SELECT * FROM availability WHERE provider_id = (SELECT user_id FROM providers WHERE id = $1) AND day_of_week = $2',
      [providerId, dayOfWeek]
    );

    if (availRes.rows.length === 0 || availRes.rows[0].is_holiday) {
      return res.json({ slots: [], reason: 'Provider is not available on this day or it is a holiday/weekend.' });
    }

    const { start_time, end_time, break_start, break_end } = availRes.rows[0];

    // Generate slots in 30-minute intervals
    const slots: string[] = [];
    let current = parseTime(start_time);
    const end = parseTime(end_time);
    const bStart = break_start ? parseTime(break_start) : null;
    const bEnd = break_end ? parseTime(break_end) : null;

    while (current < end) {
      // Check if slot falls in break time
      const inBreak = bStart && bEnd && (current >= bStart && current < bEnd);
      
      if (!inBreak) {
        slots.push(formatTime(current));
      }
      current += 30; // 30 minutes
    }

    // 3. Query existing approved appointments for this provider on this date
    const bookedRes = await query(
      "SELECT slot_time, status FROM appointments WHERE provider_id = $1 AND slot_date = $2 AND status IN ('approved', 'pending')",
      [providerId, date]
    );

    // Map existing slot status
    const bookings = bookedRes.rows.reduce((acc: any, curr: any) => {
      acc[curr.slot_time] = curr.status;
      return acc;
    }, {});

    const responseSlots = slots.map(time => ({
      time,
      status: bookings[time] ? (bookings[time] === 'approved' ? 'occupied' : 'pending') : 'available'
    }));

    return res.json({ slots: responseSlots });
  } catch (err) {
    console.error('Get available slots error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions for time processing
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

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
      [qrCode]
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
        status: appointment.status
      }
    });
  } catch (err) {
    console.error('Verify QR error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
