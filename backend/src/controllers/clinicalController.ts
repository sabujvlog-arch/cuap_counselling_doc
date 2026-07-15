import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/crypto';

// Helper to encrypt session object
const encryptSessionFields = (data: any) => {
  return {
    presentingComplaint: encrypt(data.presentingComplaint || ''),
    history: encrypt(data.history || ''),
    pastPsychiatric: encrypt(data.pastPsychiatric || ''),
    pastMedical: encrypt(data.pastMedical || ''),
    medicationHistory: encrypt(data.medicationHistory || ''),
    familyHistory: encrypt(data.familyHistory || ''),
    developmentalHistory: encrypt(data.developmentalHistory || ''),
    educationalHistory: encrypt(data.educationalHistory || ''),
    occupationalHistory: encrypt(data.occupationalHistory || ''),
    relationshipHistory: encrypt(data.relationshipHistory || ''),
    substanceUse: encrypt(data.substanceUse || ''),
    legalHistory: encrypt(data.legalHistory || ''),
    socialHistory: encrypt(data.socialHistory || ''),
    traumaHistory: encrypt(data.traumaHistory || ''),
    personalityTraits: encrypt(data.personalityTraits || ''),
    protectiveFactors: encrypt(data.protectiveFactors || ''),
    strengths: encrypt(data.strengths || ''),
    mse: encrypt(data.mse || ''),
    diagnosis: encrypt(data.diagnosis || ''),
    differentialDiagnosis: encrypt(data.differentialDiagnosis || ''),
    caseFormulation: encrypt(data.caseFormulation || ''),
    riskAssessment: encrypt(data.riskAssessment || ''),
    subjective: encrypt(data.subjective || ''),
    objective: encrypt(data.objective || ''),
    assessment: encrypt(data.assessment || ''),
    plan: encrypt(data.plan || ''),
    homeworkAssigned: encrypt(data.homeworkAssigned || '')
  };
};

// Helper to decrypt session object
const decryptSessionFields = (row: any) => {
  if (!row) return row;
  return {
    ...row,
    presenting_complaint: decrypt(row.presenting_complaint),
    history: decrypt(row.history),
    past_psychiatric: decrypt(row.past_psychiatric),
    past_medical: decrypt(row.past_medical),
    medication_history: decrypt(row.medication_history),
    family_history: decrypt(row.family_history),
    developmental_history: decrypt(row.developmental_history),
    educational_history: decrypt(row.educational_history),
    occupational_history: decrypt(row.occupational_history),
    relationship_history: decrypt(row.relationship_history),
    substance_use: decrypt(row.substance_use),
    legal_history: decrypt(row.legal_history),
    social_history: decrypt(row.social_history),
    trauma_history: decrypt(row.trauma_history),
    personality_traits: decrypt(row.personality_traits),
    protective_factors: decrypt(row.protective_factors),
    strengths: decrypt(row.strengths),
    mse: decrypt(row.mse),
    diagnosis: decrypt(row.diagnosis),
    differential_diagnosis: decrypt(row.differential_diagnosis),
    case_formulation: decrypt(row.case_formulation),
    risk_assessment: decrypt(row.risk_assessment),
    subjective: decrypt(row.subjective),
    objective: decrypt(row.objective),
    assessment: decrypt(row.assessment),
    plan: decrypt(row.plan),
    homework_assigned: decrypt(row.homework_assigned)
  };
};

// ----------------------------------------------------
// Clinical Sessions & SOAP Notes
// ----------------------------------------------------

export const saveSession = async (req: AuthRequest, res: Response) => {
  const {
    id,
    appointmentId,
    studentId,
    presentingComplaint,
    history,
    pastPsychiatric,
    pastMedical,
    medicationHistory,
    familyHistory,
    developmentalHistory,
    educationalHistory,
    occupationalHistory,
    relationshipHistory,
    substanceUse,
    legalHistory,
    socialHistory,
    traumaHistory,
    personalityTraits,
    protectiveFactors,
    strengths,
    mse,
    diagnosis,
    differentialDiagnosis,
    caseFormulation,
    riskAssessment,
    subjective,
    objective,
    assessment,
    plan,
    interventionUsed,
    homeworkAssigned,
    sessionDuration,
    autoSave
  } = req.body;

  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can write clinical notes' });
  }

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }
    const providerId = providerRes.rows[0].id;

    // Encrypt fields
    const enc = encryptSessionFields(req.body);

    let sessionId = id;
    let currentVersion = 1;

    if (sessionId) {
      const currentSessionRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
      if (currentSessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const currentSession = currentSessionRes.rows[0];
      currentVersion = currentSession.version;

      if (!autoSave) {
        await query(
          `INSERT INTO session_history 
           (session_id, version, edited_by, presenting_complaint, history, mse, diagnosis, case_formulation, risk_assessment, subjective, objective, assessment, plan) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            sessionId,
            currentVersion,
            req.user.id,
            currentSession.presenting_complaint,
            currentSession.history,
            currentSession.mse,
            currentSession.diagnosis,
            currentSession.case_formulation,
            currentSession.risk_assessment,
            currentSession.subjective,
            currentSession.objective,
            currentSession.assessment,
            currentSession.plan
          ]
        );
        currentVersion += 1;
      }

      await query(
        `UPDATE sessions SET 
          presenting_complaint = $1, history = $2, past_psychiatric = $3, past_medical = $4, 
          medication_history = $5, family_history = $6, developmental_history = $7, 
          educational_history = $8, occupational_history = $9, relationship_history = $10, 
          substance_use = $11, legal_history = $12, social_history = $13, trauma_history = $14, 
          personality_traits = $15, protective_factors = $16, strengths = $17, 
          mse = $18, diagnosis = $19, differential_diagnosis = $20, 
          case_formulation = $21, risk_assessment = $22, subjective = $23, 
          objective = $24, assessment = $25, plan = $26, intervention_used = $27, 
          homework_assigned = $28, session_duration = $29, version = $30
         WHERE id = $31`,
        [
          enc.presentingComplaint, enc.history, enc.pastPsychiatric, enc.pastMedical,
          enc.medicationHistory, enc.familyHistory, enc.developmentalHistory,
          enc.educationalHistory, enc.occupationalHistory, enc.relationshipHistory,
          enc.substanceUse, enc.legalHistory, enc.socialHistory, enc.traumaHistory,
          enc.personalityTraits, enc.protectiveFactors, enc.strengths,
          enc.mse, enc.diagnosis, enc.differentialDiagnosis,
          enc.caseFormulation, enc.riskAssessment, enc.subjective,
          enc.objective, enc.assessment, enc.plan, interventionUsed || 'Supportive Therapy',
          enc.homeworkAssigned, parseInt(sessionDuration || '50'), currentVersion,
          sessionId
        ]
      );
    } else {
      await query(
        `INSERT INTO sessions 
         (appointment_id, student_id, provider_id, session_date, 
          presenting_complaint, history, past_psychiatric, past_medical,
          medication_history, family_history, developmental_history, 
          educational_history, occupational_history, relationship_history, 
          substance_use, legal_history, social_history, trauma_history, 
          personality_traits, protective_factors, strengths,
          mse, diagnosis, differential_diagnosis, case_formulation, risk_assessment,
          subjective, objective, assessment, plan, intervention_used, homework_assigned, session_duration, version) 
         VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 1)`,
        [
          appointmentId || null,
          studentId,
          providerId,
          enc.presentingComplaint, enc.history, enc.pastPsychiatric, enc.pastMedical,
          enc.medicationHistory, enc.familyHistory, enc.developmentalHistory,
          enc.educationalHistory, enc.occupationalHistory, enc.relationshipHistory,
          enc.substanceUse, enc.legalHistory, enc.socialHistory, enc.traumaHistory,
          enc.personalityTraits, enc.protectiveFactors, enc.strengths,
          enc.mse, enc.diagnosis, enc.differentialDiagnosis, enc.caseFormulation, enc.riskAssessment,
          enc.subjective, enc.objective, enc.assessment, enc.plan, interventionUsed || 'Supportive Therapy',
          enc.homeworkAssigned, parseInt(sessionDuration || '50')
        ]
      );

      const fetchNew = await query(
        'SELECT id FROM sessions WHERE student_id = $1 AND provider_id = $2 ORDER BY created_at DESC LIMIT 1',
        [studentId, providerId]
      );
      sessionId = fetchNew.rows[0].id;

      if (appointmentId) {
        await query("UPDATE appointments SET status = 'completed' WHERE id = $1", [appointmentId]);
      }
    }

    return res.json({ 
      message: autoSave ? 'Draft auto-saved successfully' : 'Session notes saved and locked successfully.', 
      id: sessionId,
      version: currentVersion
    });
  } catch (err) {
    console.error('Save session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSession = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sessionRes = await query(
      `SELECT s.*, 
              st.name as student_name, st.registration_number, st.age, st.gender, st.department as student_dept, st.semester as student_semester,
              p.name as provider_name, p.specialization as provider_spec
       FROM sessions s
       JOIN students st ON s.student_id = st.id
       JOIN providers p ON s.provider_id = p.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0 || studentRes.rows[0].id !== session.student_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return res.json(decryptSessionFields(session));
  } catch (err) {
    console.error('Get session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessionVersions = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const historyRes = await query(
      `SELECT sh.*, u.username as editor_name
       FROM session_history sh
       LEFT JOIN users u ON sh.edited_by = u.id
       WHERE sh.session_id = $1
       ORDER BY sh.version DESC`,
      [id]
    );

    const decryptedHistory = historyRes.rows.map((row: any) => decryptSessionFields(row));
    return res.json(decryptedHistory);
  } catch (err) {
    console.error('Get session versions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentEMR = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.user.role === 'student') {
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentProfile.rows.length === 0 || studentProfile.rows[0].id !== parseInt(studentId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const studentInfo = await query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (studentInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const sessionsRes = await query(
      `SELECT s.*, p.name as provider_name 
       FROM sessions s
       JOIN providers p ON s.provider_id = p.id
       WHERE s.student_id = $1
       ORDER BY s.session_date DESC`,
      [studentId]
    );

    const decryptedSessions = sessionsRes.rows.map((row: any) => decryptSessionFields(row));

    const prescriptionsRes = await query(
      `SELECT pr.id, pr.prescription_date, pr.diagnosis, p.name as provider_name
       FROM prescriptions pr
       JOIN providers p ON pr.provider_id = p.id
       WHERE pr.student_id = $1
       ORDER BY pr.prescription_date DESC`,
      [studentId]
    );

    const assessmentsRes = await query(
      `SELECT a.id, a.type, a.assessment_date, a.scores, a.report, p.name as provider_name
       FROM assessments a
       LEFT JOIN providers p ON a.provider_id = p.id
       WHERE a.student_id = $1
       ORDER BY a.assessment_date DESC`,
      [studentId]
    );

    return res.json({
      student: studentInfo.rows[0],
      sessions: decryptedSessions,
      prescriptions: prescriptionsRes.rows,
      assessments: assessmentsRes.rows
    });
  } catch (err) {
    console.error('Get EMR error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------------------------------
// Mental State Examination (MSE) logs
// ----------------------------------------------------

export const saveMSELog = async (req: AuthRequest, res: Response) => {
  const {
    studentId,
    sessionId,
    appearance,
    behaviour,
    speech,
    moodAffect,
    thoughtProcess,
    thoughtContent,
    perception,
    cognition,
    insightJudgment,
    riskLevel,
    clinicalImpression
  } = req.body;

  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can write clinical MSE records' });
  }

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const providerId = providerRes.rows[0].id;

    await query(
      `INSERT INTO mse_logs 
       (student_id, provider_id, session_id, appearance, behaviour, speech, mood_affect, thought_process, thought_content, perception, cognition, insight_judgment, risk_level, clinical_impression) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        studentId,
        providerId,
        sessionId || null,
        appearance, behaviour, speech, moodAffect,
        thoughtProcess, thoughtContent, perception,
        cognition, insightJudgment, riskLevel || 'low',
        clinicalImpression
      ]
    );

    // Audit logs
    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'SAVE_MSE', `Saved structured Mental State Exam log (Risk: ${riskLevel}) for Student ID ${studentId}`, req.ip]
    );

    return res.status(201).json({ message: 'Mental State Exam log recorded successfully' });
  } catch (err) {
    console.error('Save MSE log error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMSELogs = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.user.role === 'student') {
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentProfile.rows.length === 0 || studentProfile.rows[0].id !== parseInt(studentId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const logsRes = await query(
      `SELECT m.*, p.name as provider_name 
       FROM mse_logs m
       JOIN providers p ON m.provider_id = p.id
       WHERE m.student_id = $1
       ORDER BY m.created_at DESC`,
      [studentId]
    );

    return res.json(logsRes.rows);
  } catch (err) {
    console.error('Get MSE logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------------------------------
// Prescription Module
// ----------------------------------------------------

export const createPrescription = async (req: AuthRequest, res: Response) => {
  const {
    sessionId,
    studentId,
    diagnosis,
    advice,
    lifestyleRecommendations,
    followUpDate,
    items
  } = req.body;

  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can write prescriptions' });
  }

  if (!studentId || !diagnosis || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Student ID, diagnosis, and prescription items are required' });
  }

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const providerId = providerRes.rows[0].id;

    await query(
      `INSERT INTO prescriptions (session_id, student_id, provider_id, diagnosis, advice, lifestyle_recommendations, follow_up_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId || null, studentId, providerId, diagnosis, advice || '', lifestyleRecommendations || '', followUpDate || null]
    );

    const presIdRes = await query(
      'SELECT id FROM prescriptions WHERE student_id = $1 AND provider_id = $2 ORDER BY created_at DESC LIMIT 1',
      [studentId, providerId]
    );
    const prescriptionId = presIdRes.rows[0].id;

    for (const item of items) {
      await query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dose, frequency, duration) 
         VALUES ($1, $2, $3, $4, $5)`,
        [prescriptionId, item.medicineName, item.dose, item.frequency, item.duration]
      );
    }

    const studentUser = await query('SELECT user_id FROM students WHERE id = $1', [studentId]);
    if (studentUser.rows.length > 0) {
      await query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
        [studentUser.rows[0].user_id, 'prescription', `A new prescription from Dr. ${req.user.username} is now ready for view.`]
      );
    }

    return res.status(201).json({ message: 'Prescription created successfully', id: prescriptionId });
  } catch (err) {
    console.error('Create prescription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPrescription = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const presRes = await query(
      `SELECT pr.*, 
              s.name as student_name, s.registration_number, s.age, s.gender, s.department as student_dept, s.semester as student_semester,
              p.name as provider_name, p.qualification as provider_qual, p.specialization as provider_spec, p.signature_url
       FROM prescriptions pr
       JOIN students s ON pr.student_id = s.id
       JOIN providers p ON pr.provider_id = p.id
       WHERE pr.id = $1`,
      [id]
    );

    if (presRes.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = presRes.rows[0];

    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0 || studentRes.rows[0].id !== prescription.student_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const itemsRes = await query(
      'SELECT * FROM prescription_items WHERE prescription_id = $1',
      [id]
    );

    return res.json({
      ...prescription,
      items: itemsRes.rows
    });
  } catch (err) {
    console.error('Get prescription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPrescriptionPrintLayout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const presRes = await query(
      `SELECT pr.*, 
              s.name as student_name, s.registration_number, s.age, s.gender, s.department as student_dept, s.semester as student_semester, s.blood_group,
              p.name as provider_name, p.qualification as provider_qual, p.specialization as provider_spec, p.employee_id as provider_emp_id, p.signature_url
       FROM prescriptions pr
       JOIN students s ON pr.student_id = s.id
       JOIN providers p ON pr.provider_id = p.id
       WHERE pr.id = $1`,
      [id]
    );

    if (presRes.rows.length === 0) {
      return res.status(404).send('<h1>Prescription not found</h1>');
    }

    const p = presRes.rows[0];
    const itemsRes = await query('SELECT * FROM prescription_items WHERE prescription_id = $1', [id]);
    const items = itemsRes.rows;

    const itemsRows = items.map((it: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 6px; font-weight: 600; color: #1e293b;">${idx + 1}. ${it.medicine_name}</td>
        <td style="padding: 12px 6px; color: #475569;">${it.dose}</td>
        <td style="padding: 12px 6px; color: #475569;">${it.frequency}</td>
        <td style="padding: 12px 6px; color: #475569;">${it.duration}</td>
      </tr>
    `).join('');

    const formattedDate = new Date(p.prescription_date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    
    const formattedFollowUp = p.follow_up_date ? new Date(p.follow_up_date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    }) : 'As needed';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prescription_${p.registration_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #3b82f6;
            padding: 30px;
            border-radius: 12px;
            position: relative;
            background: linear-gradient(to bottom, #ffffff, #fcfdff);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px double #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo {
            width: 70px;
            height: 70px;
            background-color: #1e3a8a;
            color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
            border: 2px solid #3b82f6;
          }
          .title-area h1 {
            margin: 0;
            font-size: 20px;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title-area p {
            margin: 3px 0 0 0;
            font-size: 12px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .header-right h2 {
            margin: 0;
            font-size: 18px;
            color: #1e3a8a;
          }
          .header-right p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #475569;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 15px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .info-col p {
            margin: 6px 0;
          }
          .rx-symbol {
            font-size: 28px;
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 12px;
          }
          .meds-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .meds-table th {
            background-color: #eff6ff;
            color: #1e3a8a;
            text-align: left;
            padding: 10px 6px;
            font-weight: 600;
            border-bottom: 2px solid #3b82f6;
          }
          .notes-section {
            margin-bottom: 30px;
            font-size: 13px;
            line-height: 1.5;
          }
          .notes-title {
            font-weight: 600;
            color: #1e3a8a;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-top: 50px;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 500;
          }
          .signature-img {
            max-height: 45px;
            max-width: 160px;
            margin-bottom: -15px;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #3b82f6;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          @media print {
            body {
              padding: 0;
            }
            .container {
              border: none;
              padding: 0;
              background: none;
            }
            .print-btn {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <div class="logo">CUAP</div>
              <div class="title-area">
                <h1>Wellness Counseling Centre</h1>
                <p>Central University of Andhra Pradesh</p>
                <p>Ananthapuramu - 515002, India</p>
              </div>
            </div>
            <div class="header-right">
              <h2>Dr. ${p.provider_name}</h2>
              <p>${p.provider_qual}</p>
              <p>${p.provider_spec}</p>
              <p>Emp ID: ${p.provider_emp_id}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <p><strong>Student Name:</strong> ${p.student_name}</p>
              <p><strong>Registration No:</strong> ${p.registration_number.toUpperCase()}</p>
              <p><strong>Department/Semester:</strong> ${p.student_dept} / Sem ${p.student_semester}</p>
            </div>
            <div class="info-col" style="border-left: 1px solid #e2e8f0; padding-left: 15px;">
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Age / Gender:</strong> ${p.age} Y / ${p.gender}</p>
              <p><strong>Blood Group:</strong> ${p.blood_group}</p>
            </div>
          </div>

          <div>
            <div style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 8px;">
              <strong>Diagnosis:</strong> ${p.diagnosis}
            </div>
            <div class="rx-symbol">R<sub>x</sub></div>
            <table class="meds-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          ${p.advice ? `
          <div class="notes-section">
            <div class="notes-title">Advice & Instruction</div>
            <div style="color: #334155;">${p.advice}</div>
          </div>
          ` : ''}

          ${p.lifestyle_recommendations ? `
          <div class="notes-section">
            <div class="notes-title">Lifestyle & Recommendations</div>
            <div style="color: #334155;">${p.lifestyle_recommendations}</div>
          </div>
          ` : ''}

          <div class="footer-section">
            <div style="font-size: 13px; color: #475569;">
              <strong>Follow-up Date:</strong> <span style="color: #1e3a8a; font-weight: 600;">${formattedFollowUp}</span>
            </div>
            <div class="signature-box">
              ${p.signature_url ? `<img src="${p.signature_url}" class="signature-img" alt="Digital Signature" />` : ''}
              <div class="signature-line">Authorized Digital Signature</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (err) {
    console.error('Get print layout error:', err);
    return res.status(500).send('<h1>Internal Server Error</h1>');
  }
};
