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
    homeworkAssigned: encrypt(data.homeworkAssigned || ''),
    // Phase 1 — new dynamic EMR fields
    counselingAssessment: data.counselingAssessment
      ? encrypt(JSON.stringify(data.counselingAssessment))
      : null,
    counselingAdvice: data.counselingAdvice ? encrypt(JSON.stringify(data.counselingAdvice)) : null,
    therapeuticIssues: data.therapeuticIssues
      ? encrypt(JSON.stringify(data.therapeuticIssues))
      : null,
    medicalExam: data.medicalExam ? encrypt(JSON.stringify(data.medicalExam)) : null,
    vitalSigns: data.vitalSigns ? encrypt(JSON.stringify(data.vitalSigns)) : null,
    treatmentPlanData: data.treatmentPlanData
      ? encrypt(JSON.stringify(data.treatmentPlanData))
      : null,
    sessionNotesText: data.sessionNotesText ? encrypt(data.sessionNotesText) : null,
    // Phase 6 — session completion
    progressSinceLast: data.progressSinceLast ? encrypt(data.progressSinceLast) : null,
    homeworkReview: data.homeworkReview ? encrypt(data.homeworkReview) : null,
    medicationAdherence: data.medicationAdherence ? encrypt(data.medicationAdherence) : null,
    dischargeSummary: data.dischargeSummary ? encrypt(data.dischargeSummary) : null,
  };
};

// Helper to decrypt session object
const decryptSessionFields = (row: any) => {
  if (!row) return row;

  const tryParseJson = (val: string | null) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

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
    homework_assigned: decrypt(row.homework_assigned),
    // Phase 1 — dynamic EMR fields
    counseling_assessment: tryParseJson(
      row.counseling_assessment ? decrypt(row.counseling_assessment) : null,
    ),
    counseling_advice: tryParseJson(row.counseling_advice ? decrypt(row.counseling_advice) : null),
    therapeutic_issues: tryParseJson(
      row.therapeutic_issues ? decrypt(row.therapeutic_issues) : null,
    ),
    medical_exam: tryParseJson(row.medical_exam ? decrypt(row.medical_exam) : null),
    vital_signs: tryParseJson(row.vital_signs ? decrypt(row.vital_signs) : null),
    treatment_plan_data: tryParseJson(
      row.treatment_plan_data ? decrypt(row.treatment_plan_data) : null,
    ),
    session_notes_text: row.session_notes_text ? decrypt(row.session_notes_text) : null,
    // Phase 6 — session completion
    progress_since_last: row.progress_since_last ? decrypt(row.progress_since_last) : null,
    homework_review: row.homework_review ? decrypt(row.homework_review) : null,
    medication_adherence: row.medication_adherence ? decrypt(row.medication_adherence) : null,
    discharge_summary: row.discharge_summary ? decrypt(row.discharge_summary) : null,
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
    autoSave,
  } = req.body;

  if (
    !req.user ||
    (req.user.role !== 'provider' &&
      req.user.role !== 'clinician' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only authorized clinicians can write clinical notes' });
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
            currentSession.plan,
          ],
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
          homework_assigned = $28, session_duration = $29, version = $30,
          clinician_mode = $31, report_type = $32,
          counseling_assessment = $33, counseling_advice = $34, therapeutic_issues = $35,
          medical_exam = $36, vital_signs = $37, treatment_plan_data = $38, session_notes_text = $39,
          session_status = $40, session_number = $41, case_outcome = $42,
          progress_since_last = $43, homework_review = $44, medication_adherence = $45,
          discharge_summary = $46, ai_followup_suggestions = $47
         WHERE id = $48`,
        [
          enc.presentingComplaint,
          enc.history,
          enc.pastPsychiatric,
          enc.pastMedical,
          enc.medicationHistory,
          enc.familyHistory,
          enc.developmentalHistory,
          enc.educationalHistory,
          enc.occupationalHistory,
          enc.relationshipHistory,
          enc.substanceUse,
          enc.legalHistory,
          enc.socialHistory,
          enc.traumaHistory,
          enc.personalityTraits,
          enc.protectiveFactors,
          enc.strengths,
          enc.mse,
          enc.diagnosis,
          enc.differentialDiagnosis,
          enc.caseFormulation,
          enc.riskAssessment,
          enc.subjective,
          enc.objective,
          enc.assessment,
          enc.plan,
          interventionUsed || 'Supportive Therapy',
          enc.homeworkAssigned,
          parseInt(sessionDuration || '50'),
          currentVersion,
          req.body.clinicianMode || 'counselor',
          req.body.reportType || 'counseling',
          enc.counselingAssessment,
          enc.counselingAdvice,
          enc.therapeuticIssues,
          enc.medicalExam,
          enc.vitalSigns,
          enc.treatmentPlanData,
          enc.sessionNotesText,
          req.body.sessionStatus || 'completed',
          req.body.sessionNumber || 1,
          req.body.caseOutcome || null,
          enc.progressSinceLast,
          enc.homeworkReview,
          enc.medicationAdherence,
          enc.dischargeSummary,
          req.body.aiFollowupSuggestions ? JSON.stringify(req.body.aiFollowupSuggestions) : null,
          sessionId,
        ],
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
          subjective, objective, assessment, plan, intervention_used, homework_assigned, session_duration, version,
          clinician_mode, report_type,
          counseling_assessment, counseling_advice, therapeutic_issues,
          medical_exam, vital_signs, treatment_plan_data, session_notes_text,
          session_status, session_number, case_outcome,
          progress_since_last, homework_review, medication_adherence,
          discharge_summary, ai_followup_suggestions) 
         VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 1, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49)`,
        [
          appointmentId || null,
          studentId,
          providerId,
          enc.presentingComplaint,
          enc.history,
          enc.pastPsychiatric,
          enc.pastMedical,
          enc.medicationHistory,
          enc.familyHistory,
          enc.developmentalHistory,
          enc.educationalHistory,
          enc.occupationalHistory,
          enc.relationshipHistory,
          enc.substanceUse,
          enc.legalHistory,
          enc.socialHistory,
          enc.traumaHistory,
          enc.personalityTraits,
          enc.protectiveFactors,
          enc.strengths,
          enc.mse,
          enc.diagnosis,
          enc.differentialDiagnosis,
          enc.caseFormulation,
          enc.riskAssessment,
          enc.subjective,
          enc.objective,
          enc.assessment,
          enc.plan,
          interventionUsed || 'Supportive Therapy',
          enc.homeworkAssigned,
          parseInt(sessionDuration || '50'),
          req.body.clinicianMode || 'counselor',
          req.body.reportType || 'counseling',
          enc.counselingAssessment,
          enc.counselingAdvice,
          enc.therapeuticIssues,
          enc.medicalExam,
          enc.vitalSigns,
          enc.treatmentPlanData,
          enc.sessionNotesText,
          req.body.sessionStatus || 'completed',
          req.body.sessionNumber || 1,
          req.body.caseOutcome || null,
          enc.progressSinceLast,
          enc.homeworkReview,
          enc.medicationAdherence,
          enc.dischargeSummary,
          req.body.aiFollowupSuggestions ? JSON.stringify(req.body.aiFollowupSuggestions) : null,
        ],
      );

      const fetchNew = await query(
        'SELECT id FROM sessions WHERE student_id = $1 AND provider_id = $2 ORDER BY created_at DESC LIMIT 1',
        [studentId, providerId],
      );
      sessionId = fetchNew.rows[0].id;

      if (appointmentId) {
        await query("UPDATE appointments SET status = 'completed' WHERE id = $1", [appointmentId]);
      }
    }

    return res.json({
      message: autoSave
        ? 'Draft auto-saved successfully'
        : 'Session notes saved and locked successfully.',
      id: sessionId,
      version: currentVersion,
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
      [id],
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
      [id],
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
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [
        req.user.id,
      ]);
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
      [studentId],
    );

    let decryptedSessions = sessionsRes.rows.map((row: any) => decryptSessionFields(row));

    const prescriptionsRes = await query(
      `SELECT pr.id, pr.prescription_date, pr.diagnosis, p.name as provider_name, pr.is_released, pr.advice, pr.lifestyle_recommendations
       FROM prescriptions pr
       JOIN providers p ON pr.provider_id = p.id
       WHERE pr.student_id = $1
       ORDER BY pr.prescription_date DESC`,
      [studentId],
    );

    const assessmentsRes = await query(
      `SELECT a.id, a.type, a.assessment_date, a.scores, a.report, p.name as provider_name, a.is_released
       FROM assessments a
       LEFT JOIN providers p ON a.provider_id = p.id
       WHERE a.student_id = $1
       ORDER BY a.assessment_date DESC`,
      [studentId],
    );

    let prescriptions = prescriptionsRes.rows;
    let assessments = assessmentsRes.rows;

    if (req.user.role === 'student') {
      decryptedSessions = decryptedSessions.map((s: any) => {
        if (!s.is_released) {
          return {
            id: s.id,
            session_date: s.session_date,
            provider_name: s.provider_name,
            is_released: 0,
            report_type: s.report_type,
            masked: true,
          };
        }
        return s;
      });

      prescriptions = prescriptions.map((p: any) => {
        if (!p.is_released) {
          return {
            id: p.id,
            prescription_date: p.prescription_date,
            provider_name: p.provider_name,
            is_released: 0,
            masked: true,
          };
        }
        return p;
      });

      assessments = assessments.map((a: any) => {
        if (!a.is_released) {
          return {
            id: a.id,
            assessment_date: a.assessment_date,
            provider_name: a.provider_name,
            type: a.type,
            is_released: 0,
            masked: true,
          };
        }
        return a;
      });
    }

    return res.json({
      student: studentInfo.rows[0],
      sessions: decryptedSessions,
      prescriptions: prescriptions,
      assessments: assessments,
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
    clinicalImpression,
  } = req.body;

  if (
    !req.user ||
    (req.user.role !== 'provider' &&
      req.user.role !== 'clinician' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res
      .status(403)
      .json({ error: 'Only authorized clinicians can write clinical MSE records' });
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
        appearance,
        behaviour,
        speech,
        moodAffect,
        thoughtProcess,
        thoughtContent,
        perception,
        cognition,
        insightJudgment,
        riskLevel || 'low',
        clinicalImpression,
      ],
    );

    // Audit logs
    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'SAVE_MSE',
        `Saved structured Mental State Exam log (Risk: ${riskLevel}) for Student ID ${studentId}`,
        req.ip,
      ],
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
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [
        req.user.id,
      ]);
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
      [studentId],
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
  const { sessionId, studentId, diagnosis, advice, lifestyleRecommendations, followUpDate, items } =
    req.body;

  if (
    !req.user ||
    (req.user.role !== 'provider' &&
      req.user.role !== 'clinician' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only authorized clinicians can write prescriptions' });
  }

  if (!studentId || !diagnosis || !items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: 'Student ID, diagnosis, and prescription items are required' });
  }

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const providerId = providerRes.rows[0].id;

    await query(
      `INSERT INTO prescriptions (session_id, student_id, provider_id, diagnosis, advice, lifestyle_recommendations, follow_up_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sessionId || null,
        studentId,
        providerId,
        diagnosis,
        advice || '',
        lifestyleRecommendations || '',
        followUpDate || null,
      ],
    );

    const presIdRes = await query(
      'SELECT id FROM prescriptions WHERE student_id = $1 AND provider_id = $2 ORDER BY created_at DESC LIMIT 1',
      [studentId, providerId],
    );
    const prescriptionId = presIdRes.rows[0].id;

    for (const item of items) {
      await query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dose, frequency, duration) 
         VALUES ($1, $2, $3, $4, $5)`,
        [prescriptionId, item.medicineName, item.dose, item.frequency, item.duration],
      );
    }

    const studentUser = await query('SELECT user_id FROM students WHERE id = $1', [studentId]);
    if (studentUser.rows.length > 0) {
      await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
        studentUser.rows[0].user_id,
        'prescription',
        `A new prescription from Dr. ${req.user.username} is now ready for view.`,
      ]);
    }

    return res
      .status(201)
      .json({ message: 'Prescription created successfully', id: prescriptionId });
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
      [id],
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

    const itemsRes = await query('SELECT * FROM prescription_items WHERE prescription_id = $1', [
      id,
    ]);

    return res.json({
      ...prescription,
      items: itemsRes.rows,
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
      [id],
    );

    if (presRes.rows.length === 0) {
      return res.status(404).send('<h1>Prescription not found</h1>');
    }

    const p = presRes.rows[0];
    const itemsRes = await query('SELECT * FROM prescription_items WHERE prescription_id = $1', [
      id,
    ]);
    const items = itemsRes.rows;

    const itemsRows = items
      .map(
        (it: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 6px; font-weight: 600; color: #1e293b;">${idx + 1}. ${it.medicine_name}</td>
        <td style="padding: 12px 6px; color: #475569;">${it.dose}</td>
        <td style="padding: 12px 6px; color: #475569;">${it.frequency}</td>
        <td style="padding: 12px 6px; color: #475569;">${it.duration}</td>
      </tr>
    `,
      )
      .join('');

    const formattedDate = new Date(p.prescription_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formattedFollowUp = p.follow_up_date
      ? new Date(p.follow_up_date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'As needed';

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
              <img src="http://localhost:3000/logo.png" style="width: 70px; height: 70px; object-fit: contain;" alt="CUAP Logo" />
              <div class="title-area">
                <h1>Student Wellness & Counseling Centre</h1>
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

          ${
            p.advice
              ? `
          <div class="notes-section">
            <div class="notes-title">Advice & Instruction</div>
            <div style="color: #334155;">${p.advice}</div>
          </div>
          `
              : ''
          }

          ${
            p.lifestyle_recommendations
              ? `
          <div class="notes-section">
            <div class="notes-title">Lifestyle & Recommendations</div>
            <div style="color: #334155;">${p.lifestyle_recommendations}</div>
          </div>
          `
              : ''
          }

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

export const saveCaseHistory = async (req: AuthRequest, res: Response) => {
  const {
    studentId,
    sociodemographics,
    presentingComplaints,
    hopi,
    treatmentHistory,
    pastHistory,
    familyHistory,
    personalHistory,
  } = req.body;

  if (
    !req.user ||
    (req.user.role !== 'provider' &&
      req.user.role !== 'clinician' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only authorized clinicians can write case histories' });
  }

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const providerId = providerRes.rows[0].id;

    await query(
      `INSERT INTO student_case_histories 
       (student_id, provider_id, sociodemographics, presenting_complaints, hopi, treatment_history, past_history, family_history, personal_history) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        studentId,
        providerId,
        JSON.stringify(sociodemographics),
        presentingComplaints,
        hopi,
        treatmentHistory,
        pastHistory,
        JSON.stringify(familyHistory),
        JSON.stringify(personalHistory),
      ],
    );

    // Audit logs
    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'SAVE_CASE_HISTORY', `Saved Case History for Student ID ${studentId}`, req.ip],
    );

    return res.status(201).json({ message: 'Case History recorded successfully' });
  } catch (err) {
    console.error('Save case history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCaseHistories = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.user.role === 'student') {
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [
        req.user.id,
      ]);
      if (studentProfile.rows.length === 0 || studentProfile.rows[0].id !== parseInt(studentId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const logsRes = await query(
      `SELECT c.*, p.name as provider_name 
       FROM student_case_histories c
       JOIN providers p ON c.provider_id = p.id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
      [studentId],
    );

    const formattedRows = logsRes.rows.map((row: any) => ({
      ...row,
      sociodemographics: JSON.parse(row.sociodemographics || '{}'),
      family_history: JSON.parse(row.family_history || '{}'),
      personal_history: JSON.parse(row.personal_history || '{}'),
    }));

    return res.json(formattedRows);
  } catch (err) {
    console.error('Get student case histories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMSEPrintLayout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const logRes = await query(
      `SELECT m.*, p.name as provider_name, p.qualification as provider_qual, p.specialization as provider_spec, p.employee_id as provider_emp_id, p.signature_url,
              s.name as student_name, s.registration_number, s.department as student_dept, s.semester as student_semester, s.age, s.gender, s.blood_group
       FROM mse_logs m
       JOIN providers p ON m.provider_id = p.id
       JOIN students s ON m.student_id = s.id
       WHERE m.id = $1`,
      [id],
    );

    if (logRes.rows.length === 0) {
      return res.status(404).send('<h1>MSE Log not found</h1>');
    }

    const p = logRes.rows[0];
    const formattedDate = new Date(p.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mental Status Examination - ${p.student_name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .title-area h1 {
            font-size: 20px;
            margin: 0 0 4px 0;
            color: #1e3a8a;
            font-weight: 700;
          }
          .title-area p {
            margin: 0;
            font-size: 13px;
            color: #475569;
          }
          .header-right {
            text-align: right;
            font-size: 13px;
            color: #475569;
          }
          .header-right h2 {
            font-size: 16px;
            margin: 0 0 4px 0;
            color: #1e3a8a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 35px;
            font-size: 13px;
          }
          .info-col p {
            margin: 4px 0;
          }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .content-box {
            font-size: 13px;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 15px;
            white-space: pre-wrap;
          }
          .risk-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
          }
          .risk-low { background-color: #dcfce7; color: #15803d; }
          .risk-medium { background-color: #fef9c3; color: #a16207; }
          .risk-high { background-color: #fee2e2; color: #b91c1c; }
          .risk-severe { background-color: #fca5a5; color: #991b1b; }
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
            body { padding: 0; }
            .container { border: none; padding: 0; box-shadow: none; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img src="http://localhost:3000/logo.png" style="width: 70px; height: 70px; object-fit: contain;" alt="CUAP Logo" />
              <div class="title-area">
                <h1>Student Wellness & Counseling Centre</h1>
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
              <p><strong>Exam Date:</strong> ${formattedDate}</p>
              <p><strong>Age / Gender:</strong> ${p.age} Y / ${p.gender}</p>
              <p><strong>Risk Level:</strong> <span class="risk-badge risk-${p.risk_level}">${p.risk_level}</span></p>
            </div>
          </div>

          <div class="section-title">1. General Appearance & Behaviour</div>
          <div class="content-box"><strong>Appearance:</strong> ${p.appearance || 'Not specified'}\n<strong>Behaviour:</strong> ${p.behaviour || 'Not specified'}</div>

          <div class="section-title">2. Speech & Communication</div>
          <div class="content-box">${p.speech || 'Not specified'}</div>

          <div class="section-title">3. Mood & Affect</div>
          <div class="content-box">${p.mood_affect || 'Not specified'}</div>

          <div class="section-title">4. Thought & Perception</div>
          <div class="content-box"><strong>Thought Process:</strong> ${p.thought_process || 'Not specified'}\n<strong>Thought Content:</strong> ${p.thought_content || 'Not specified'}\n<strong>Perception:</strong> ${p.perception || 'Not specified'}</div>

          <div class="section-title">5. Cognitive Functions & Judgment</div>
          <div class="content-box"><strong>Cognition:</strong> ${p.cognition || 'Not specified'}\n<strong>Insight & Judgment:</strong> ${p.insight_judgment || 'Not specified'}</div>

          <div class="section-title">Clinical Impression & Notes</div>
          <div class="content-box">${p.clinical_impression || 'Not specified'}</div>

          <div class="footer-section">
            <div style="font-size: 13px; color: #475569;">
              CUAP Student Wellness Report
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
    console.error('Get MSE print layout error:', err);
    return res.status(500).send('<h1>Internal Server Error</h1>');
  }
};

export const getCaseHistoryPrintLayout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const logRes = await query(
      `SELECT c.*, p.name as provider_name, p.qualification as provider_qual, p.specialization as provider_spec, p.employee_id as provider_emp_id, p.signature_url,
              s.name as student_name, s.registration_number, s.department as student_dept, s.semester as student_semester, s.age, s.gender, s.blood_group
       FROM student_case_histories c
       JOIN providers p ON c.provider_id = p.id
       JOIN students s ON c.student_id = s.id
       WHERE c.id = $1`,
      [id],
    );

    if (logRes.rows.length === 0) {
      return res.status(404).send('<h1>Case History not found</h1>');
    }

    const p = logRes.rows[0];
    const formattedDate = new Date(p.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const sd = JSON.parse(p.sociodemographics || '{}');
    const fh = JSON.parse(p.family_history || '{}');
    const ph = JSON.parse(p.personal_history || '{}');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Case History - ${sd.name || p.student_name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .title-area h1 {
            font-size: 20px;
            margin: 0 0 4px 0;
            color: #1e3a8a;
            font-weight: 700;
          }
          .title-area p {
            margin: 0;
            font-size: 13px;
            color: #475569;
          }
          .header-right {
            text-align: right;
            font-size: 13px;
            color: #475569;
          }
          .header-right h2 {
            font-size: 16px;
            margin: 0 0 4px 0;
            color: #1e3a8a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 35px;
            font-size: 13px;
          }
          .info-col p {
            margin: 4px 0;
          }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .content-box {
            font-size: 13px;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 15px;
            white-space: pre-wrap;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 13px;
          }
          .details-table th, .details-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
          }
          .details-table th {
            background-color: #f1f5f9;
            font-weight: 600;
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
            body { padding: 0; }
            .container { border: none; padding: 0; box-shadow: none; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img src="http://localhost:3000/logo.png" style="width: 70px; height: 70px; object-fit: contain;" alt="CUAP Logo" />
              <div class="title-area">
                <h1>Student Wellness & Counseling Centre</h1>
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
              <p><strong>Case ID:</strong> CCH-${p.id}</p>
              <p><strong>Student / Reference Name:</strong> ${sd.name || p.student_name}</p>
              <p><strong>Registration No:</strong> ${p.registration_number.toUpperCase()}</p>
            </div>
            <div class="info-col" style="border-left: 1px solid #e2e8f0; padding-left: 15px;">
              <p><strong>Record Date:</strong> ${formattedDate}</p>
              <p><strong>Age / Gender:</strong> ${sd.age || p.age} Y / ${sd.sex || p.gender}</p>
              <p><strong>Mother Tongue:</strong> ${sd.motherTongue || 'Not specified'}</p>
            </div>
          </div>

          <div class="section-title">1. Sociodemographic Details</div>
          <table class="details-table">
            <tr>
              <th>Address</th>
              <td>${sd.address || 'N/A'}</td>
              <th>Education</th>
              <td>${sd.education || 'N/A'}</td>
            </tr>
            <tr>
              <th>Religion</th>
              <td>${sd.religion || 'N/A'}</td>
              <th>Residence Type</th>
              <td>${sd.residence || 'N/A'}</td>
            </tr>
            <tr>
              <th>Family Type & Size</th>
              <td>${sd.familyTypeSize || 'N/A'}</td>
              <th>Family Income</th>
              <td>${sd.familyIncome || 'N/A'}</td>
            </tr>
            <tr>
              <th>Occupation/Marital</th>
              <td colspan="3">${sd.occupationMarital || 'N/A'}</td>
            </tr>
          </table>

          <div class="section-title">2. Presenting Complaints</div>
          <div class="content-box">${p.presenting_complaints || 'None'}</div>

          <div class="section-title">3. History of Presenting Illness (HOPI)</div>
          <div class="content-box">${p.hopi || 'None'}</div>

          <div class="section-title">4. Treatment & Past History</div>
          <div class="content-box"><strong>Treatment History:</strong>\n${p.treatment_history || 'None'}\n\n<strong>Past Illnesses (Medical & Psychiatric):</strong>\n${p.past_history || 'None'}</div>

          <div class="section-title">5. Family History & Tree</div>
          <div class="content-box"><strong>Family Background / Tree:</strong>\n${fh.familyTree || 'None'}\n\n<strong>Father\'s Profile:</strong> Age: ${fh.fatherAge || 'N/A'}, Status: ${fh.fatherStatus || 'N/A'}, Edu: ${fh.fatherEducation || 'N/A'}, Relation: ${fh.fatherRelationship || 'N/A'}\n<strong>Mother\'s Profile:</strong> Age: ${fh.motherAge || 'N/A'}, Status: ${fh.motherStatus || 'N/A'}, Edu: ${fh.motherEducation || 'N/A'}, Relation: ${fh.motherRelationship || 'N/A'}\n\n<strong>Psychiatric Illness / Dependencies in Family:</strong>\n${fh.psychiatricHistory || 'None'}</div>

          <div class="section-title">6. Personal History (Birth & Developmental)</div>
          <table class="details-table">
            <tr>
              <th>Birth Type</th>
              <td>${ph.birthType || 'N/A'}</td>
              <th>Birth Cry</th>
              <td>${ph.birthCry || 'N/A'}</td>
            </tr>
            <tr>
              <th>Birth Complication</th>
              <td>${ph.birthComplication || 'N/A'}</td>
              <th>Prenatal Factors</th>
              <td>${ph.prenatalFactors || 'N/A'}</td>
            </tr>
            <tr>
              <th>Perinatal Factors</th>
              <td>${ph.perinatalFactors || 'N/A'}</td>
              <th>Developmental Milestones</th>
              <td>${ph.milestones || 'N/A'}</td>
            </tr>
            <tr>
              <th>Relationship of Parents</th>
              <td colspan="3">${ph.parentsRelationship || 'N/A'}</td>
            </tr>
            <tr>
              <th>Play Behaviour</th>
              <td colspan="3">${ph.playBehaviour || 'N/A'}</td>
            </tr>
          </table>

          <div class="section-title">7. Academic History</div>
          <table class="details-table">
            <tr>
              <th>School Admission Age</th>
              <td>${ph.schoolAdmissionAge || 'N/A'}</td>
              <th>Highest Grade</th>
              <td>${ph.highestGrade || 'N/A'}</td>
            </tr>
            <tr>
              <th>Academic Performance</th>
              <td colspan="3">${ph.academicPerformance || 'N/A'}</td>
            </tr>
          </table>

          <div class="footer-section">
            <div style="font-size: 13px; color: #475569;">
              Case History Record - CUAP SWCC
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
    console.error('Get student case history print layout error:', err);
    return res.status(500).send('<h1>Internal Server Error</h1>');
  }
};

export const orderTest = async (req: AuthRequest, res: Response) => {
  const { studentId, testName, category } = req.body;

  if (
    !req.user ||
    (req.user.role !== 'provider' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only clinicians can order investigations' });
  }

  if (!studentId || !testName || !category) {
    return res.status(400).json({ error: 'Student ID, test name, and category are required' });
  }

  try {
    const provRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const providerId = provRes.rows[0]?.id || null;

    await query(
      `INSERT INTO test_orders (student_id, provider_id, test_name, category, status) 
       VALUES ($1, $2, $3, $4, 'pending')`,
      [studentId, providerId, testName, category],
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'ORDER_TEST', `Ordered test '${testName}' for student ID ${studentId}`, req.ip],
    );

    return res.status(201).json({ message: 'Test ordered successfully' });
  } catch (err) {
    console.error('Order test error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingTests = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'technician' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const testsRes = await query(
      `SELECT t.*, s.name as student_name, s.registration_number, p.name as provider_name
       FROM test_orders t
       JOIN students s ON t.student_id = s.id
       LEFT JOIN providers p ON t.provider_id = p.id
       WHERE t.status = 'pending'
       ORDER BY t.created_at ASC`,
    );
    return res.json(testsRes.rows || []);
  } catch (err) {
    console.error('Get pending tests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitTestResults = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { results, report } = req.body;

  if (
    !req.user ||
    (req.user.role !== 'technician' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only lab technicians can submit results' });
  }

  if (!results) {
    return res.status(400).json({ error: 'Test results are required' });
  }

  try {
    const testOrderRes = await query('SELECT * FROM test_orders WHERE id = $1', [id]);
    if (testOrderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Test order not found' });
    }

    const testOrder = testOrderRes.rows[0];
    const generatedReport = report || `Test results logged for ${testOrder.test_name}: ${results}`;

    await query(
      `UPDATE test_orders 
       SET status = 'completed', results = $1, report = $2, technician_id = $3 
       WHERE id = $4`,
      [results, generatedReport, req.user.id, id],
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'SUBMIT_TEST_RESULTS', `Submitted results for test order ID ${id}`, req.ip],
    );

    return res.json({ message: 'Test results submitted and report auto-generated successfully' });
  } catch (err) {
    console.error('Submit test results error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentTests = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  try {
    const testsRes = await query(
      `SELECT t.*, u.username as technician_name, p.name as provider_name
       FROM test_orders t
       LEFT JOIN users u ON t.technician_id = u.id
       LEFT JOIN providers p ON t.provider_id = p.id
       WHERE t.student_id = $1
       ORDER BY t.created_at DESC`,
      [studentId],
    );
    return res.json(testsRes.rows || []);
  } catch (err) {
    console.error('Get student tests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCompiledClientReport = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const sessionRes = await query(
      `SELECT s.*, p.name as provider_name, p.qualification as provider_qual, p.specialization as provider_spec, p.employee_id as provider_emp_id, p.signature_url,
              st.name as student_name, st.registration_number, st.department as student_dept, st.semester as student_semester, st.age, st.gender, st.blood_group, st.referral_source, st.informed_consent_signed
       FROM sessions s
       JOIN providers p ON s.provider_id = p.id
       JOIN students st ON s.student_id = st.id
       WHERE s.id = $1`,
      [id],
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).send('<h1>Clinical Session Record not found</h1>');
    }

    const s = sessionRes.rows[0];
    const formattedDate = new Date(s.session_date || s.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Decrypt presenting complaint if HIPAA encryption is active
    let complaintText = s.presenting_complaint;
    try {
      const { decrypt } = require('../utils/crypto');
      complaintText = decrypt(s.presenting_complaint);
    } catch (_) {}

    // Retrieve completed test orders
    const testsRes = await query(
      "SELECT test_name, category, report, created_at FROM test_orders WHERE student_id = $1 AND status = 'completed'",
      [s.student_id],
    );
    const tests = testsRes.rows || [];

    // Retrieve prescription items
    const prescRes = await query(
      'SELECT p.advice, p.lifestyle_recommendations, p.follow_up_date, i.medicine_name, i.dose, i.frequency, i.duration FROM prescriptions p LEFT JOIN prescription_items i ON p.id = i.prescription_id WHERE p.session_id = $1',
      [s.id],
    );
    const prescItems = prescRes.rows || [];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compiled EMR Clinical Report - ${s.student_name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
          }
          .container {
            max-width: 850px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .title-area h1 {
            font-size: 18px;
            margin: 0 0 4px 0;
            color: #1e3a8a;
            font-weight: 750;
            text-transform: uppercase;
          }
          .title-area p {
            margin: 0;
            font-size: 12px;
            color: #475569;
          }
          .header-right {
            text-align: right;
            font-size: 12px;
            color: #475569;
          }
          .header-right h2 {
            font-size: 15px;
            margin: 0 0 4px 0;
            color: #1e3a8a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 30px;
            font-size: 13px;
          }
          .info-col p {
            margin: 4px 0;
          }
          .section-title {
            font-size: 13px;
            font-weight: 800;
            color: #1e3a8a;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .content-box {
            font-size: 13px;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 15px;
            white-space: pre-wrap;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin: 10px 0 20px 0;
          }
          .details-table th, .details-table td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
          }
          .details-table th {
            background-color: #f8fafc;
            font-weight: 700;
            color: #475569;
            width: 25%;
          }
          .prescription-list {
            margin: 10px 0;
            padding-left: 20px;
            font-size: 13px;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .signature-box {
            text-align: center;
            width: 220px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-top: 40px;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 650;
            color: #64748b;
          }
          .signature-img {
            max-height: 40px;
            max-width: 150px;
            margin-bottom: -15px;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            font-size: 12px;
          }
          @media print {
            body { padding: 0; }
            .container { border: none; padding: 0; box-shadow: none; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Export PDF</button>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img src="http://localhost:3000/logo.png" style="width: 65px; height: 65px; object-fit: contain;" alt="CUAP Logo" />
              <div class="title-area">
                <h1>CUAP Mental Health & Wellness Portal</h1>
                <p>Central University of Andhra Pradesh</p>
                <p>Ananthapuramu - 515002, India</p>
              </div>
            </div>
            <div class="header-right">
              <h2>Dr. ${s.provider_name}</h2>
              <p>${s.provider_qual}</p>
              <p>${s.provider_spec}</p>
              <p>Emp ID: ${s.provider_emp_id}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <p><strong>Client/Student Name:</strong> ${s.student_name}</p>
              <p><strong>Registration No:</strong> ${s.registration_number.toUpperCase()}</p>
              <p><strong>Department/Semester:</strong> ${s.student_dept} / ${s.student_semester}</p>
              <p><strong>Referral Source:</strong> ${s.referral_source || 'Self-Referral'}</p>
            </div>
            <div class="info-col" style="border-left: 1px solid #e2e8f0; padding-left: 15px;">
              <p><strong>Encounter Date:</strong> ${formattedDate}</p>
              <p><strong>Age / Gender:</strong> ${s.age} Y / ${s.gender}</p>
              <p><strong>Consent Status:</strong> ${s.informed_consent_signed ? 'Signed & Authorized' : 'Consent Not Signed'}</p>
              <p><strong>Encounter ID:</strong> ENC-${s.id}</p>
            </div>
          </div>

          <div class="section-title">1. Intake Case History</div>
          <table class="details-table">
            <tr>
              <th>Chief Complaint</th>
              <td>${complaintText || 'No complaint notes logged.'}</td>
            </tr>
            <tr>
              <th>Present Illness History</th>
              <td>${s.history || 'No illness history logged.'}</td>
            </tr>
            <tr>
              <th>Past Psychiatric History</th>
              <td>${s.past_psychiatric || 'None'}</td>
            </tr>
            <tr>
              <th>Past Medical/Surgical</th>
              <td>${s.past_medical || 'None'}</td>
            </tr>
            <tr>
              <th>Family & Social History</th>
              <td>${s.family_history || 'None'}</td>
            </tr>
            <tr>
              <th>Substance Use Details</th>
              <td>${s.substance_use || 'None'}</td>
            </tr>
          </table>

          <div class="section-title">2. Mental Status Examination (MSE)</div>
          <div class="content-box">${s.mse || 'MSE observation notes not logged.'}</div>

          <div class="section-title">3. Clinical Assessment & Diagnosis</div>
          <table class="details-table">
            <tr>
              <th>Primary Diagnosis</th>
              <td><strong>${s.diagnosis || 'None'}</strong></td>
            </tr>
            <tr>
              <th>Differential Diagnoses</th>
              <td>${s.differential_diagnosis || 'None'}</td>
            </tr>
            <tr>
              <th>Risk Assessment</th>
              <td>${s.risk_assessment || 'Low risk metrics detected.'}</td>
            </tr>
            <tr>
              <th>Case Formulation</th>
              <td>${s.case_formulation || 'None'}</td>
            </tr>
          </table>

          <div class="section-title">4. Investigations & Rating Scales</div>
          ${
            tests.length === 0
              ? '<p style="font-size: 13px; color: #64748b;">No laboratory or psychological testing reports ordered for this client.</p>'
              : `<table class="details-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Category</th>
                  <th>Results Report Summary</th>
                </tr>
              </thead>
              <tbody>
                ${tests
                  .map(
                    (t: any) => `
                  <tr>
                    <td><strong>${t.test_name}</strong></td>
                    <td style="text-transform: capitalize;">${t.category}</td>
                    <td>${t.report || 'Results pending'}</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>`
          }

          <div class="section-title">5. Treatment Plan & Medico Prescriptions</div>
          <table class="details-table">
            <tr>
              <th>Therapeutic Intervention</th>
              <td>${s.intervention_used || 'Standard supportive counseling'}</td>
            </tr>
            <tr>
              <th>Assigned Homework</th>
              <td>${s.homework_assigned || 'None'}</td>
            </tr>
            <tr>
              <th>Session Duration</th>
              <td>${s.session_duration || '50'} minutes</td>
            </tr>
          </table>

          ${
            prescItems.length === 0
              ? '<p style="font-size: 13px; color: #64748b;">No pharmacotherapy prescriptions or medical advice ordered.</p>'
              : `
            <h4 style="font-size: 13px; color: #1e3a8a; margin: 15px 0 5px 0; text-transform: uppercase;">Prescribed Pharmacotherapy:</h4>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${prescItems
                  .map(
                    (item: any) => `
                  <tr>
                    <td><strong>${item.medicine_name}</strong></td>
                    <td>${item.dose}</td>
                    <td>${item.frequency}</td>
                    <td>${item.duration}</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
            <p style="font-size: 13px;"><strong>General Advice / Follow-up:</strong> ${prescItems[0]?.advice || 'None'}</p>
            <p style="font-size: 13px;"><strong>Lifestyle Recommendations:</strong> ${prescItems[0]?.lifestyle_recommendations || 'None'}</p>
            <p style="font-size: 13px;"><strong>Scheduled Follow-up:</strong> ${prescItems[0]?.follow_up_date ? new Date(prescItems[0].follow_up_date).toLocaleDateString() : 'As required'}</p>
          `
          }

          <div class="footer-section">
            <div style="font-size: 11px; color: #64748b;">
              CUAP Clinical Portal EMR Compiled Report. Confidential.
            </div>
            <div class="signature-box">
              ${s.signature_url ? `<img src="${s.signature_url}" class="signature-img" alt="Digital Signature" />` : ''}
              <div class="signature-line">Authorized Clinician E-Signature</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (err) {
    console.error('Get compiled client report error:', err);
    return res.status(500).send('<h1>Internal Server Error</h1>');
  }
};

export const cosignSession = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user || (req.user.role !== 'dept-head' && req.user.role !== 'super-admin')) {
    return res
      .status(403)
      .json({ error: 'Only Department Heads or Super Admins can co-sign high-risk files' });
  }

  try {
    await query(
      'UPDATE sessions SET cosigned_by = $1, cosigned_at = CURRENT_TIMESTAMP WHERE id = $2',
      [req.user.id, id],
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'COSIGN_SESSION', `Co-signed high-risk clinical session note ID ${id}`, req.ip],
    );

    return res.json({ message: 'Session successfully co-signed and authorized.' });
  } catch (err) {
    console.error('Cosign session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHighRiskSessions = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'dept-head' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const sessionsRes = await query(
      `SELECT s.id, s.session_date, s.risk_assessment, s.cosigned_by, s.cosigned_at, s.diagnosis, s.presenting_complaint,
              st.name as student_name, st.registration_number, p.name as provider_name
       FROM sessions s
       JOIN students st ON s.student_id = st.id
       JOIN providers p ON s.provider_id = p.id
       ORDER BY s.session_date DESC`,
    );
    return res.json(sessionsRes.rows || []);
  } catch (err) {
    console.error('Get high risk sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================
// PHASE 3 — Report Access Control
// ============================================================

export const grantReportAccess = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can grant report access' });
  }

  const { id: sessionId } = req.params;
  const { accessLevel, sectionsAllowed, expiresAt } = req.body;

  if (!accessLevel) {
    return res.status(400).json({ error: 'accessLevel is required' });
  }

  try {
    const sessionRes = await query('SELECT student_id FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const studentId = sessionRes.rows[0].student_id;

    // Revoke any existing active access first
    await query(
      `UPDATE report_access SET revoked_at = CURRENT_TIMESTAMP 
       WHERE session_id = $1 AND student_id = $2 AND revoked_at IS NULL`,
      [sessionId, studentId],
    );

    // Grant new access
    await query(
      `INSERT INTO report_access (session_id, student_id, granted_by, access_level, sections_allowed, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        studentId,
        req.user.id,
        accessLevel,
        sectionsAllowed ? JSON.stringify(sectionsAllowed) : null,
        expiresAt || null,
      ],
    );

    return res.json({
      message: 'Report access granted successfully',
      sessionId,
      studentId,
      accessLevel,
    });
  } catch (err) {
    console.error('Grant report access error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const revokeReportAccess = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can revoke report access' });
  }

  const { id: sessionId } = req.params;

  try {
    const sessionRes = await query('SELECT student_id FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const studentId = sessionRes.rows[0].student_id;

    await query(
      `UPDATE report_access SET revoked_at = CURRENT_TIMESTAMP 
       WHERE session_id = $1 AND student_id = $2 AND revoked_at IS NULL`,
      [sessionId, studentId],
    );

    return res.json({ message: 'Report access revoked successfully' });
  } catch (err) {
    console.error('Revoke report access error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentAccessibleReports = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can access their own reports' });
  }

  try {
    const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = studentRes.rows[0].id;

    const reportsRes = await query(
      `SELECT s.id, s.session_date, s.session_status, s.clinician_mode, s.report_type,
              s.subjective, s.objective, s.assessment, s.plan,
              s.counseling_assessment, s.counseling_advice, s.therapeutic_issues,
              s.treatment_plan_data, s.session_notes_text, s.discharge_summary,
              p.name as provider_name, p.specialization as provider_specialization,
              ra.access_level, ra.sections_allowed, ra.expires_at
       FROM sessions s
       JOIN providers p ON s.provider_id = p.id
       JOIN report_access ra ON ra.session_id = s.id
       WHERE ra.student_id = $1
         AND ra.revoked_at IS NULL
         AND (ra.expires_at IS NULL OR ra.expires_at > CURRENT_TIMESTAMP)
       ORDER BY s.session_date DESC`,
      [studentId],
    );

    const reports = reportsRes.rows.map((row: any) => {
      const accessLevel = row.access_level;
      const sectionsAllowed = row.sections_allowed ? JSON.parse(row.sections_allowed) : null;

      let reportData: any = {
        id: row.id,
        sessionDate: row.session_date,
        sessionStatus: row.session_status,
        clinicianMode: row.clinician_mode,
        reportType: row.report_type,
        providerName: row.provider_name,
        providerSpecialization: row.provider_specialization,
        accessLevel,
        expiresAt: row.expires_at,
      };

      if (accessLevel === 'full' || (sectionsAllowed && sectionsAllowed.includes('soap'))) {
        reportData.subjective = decrypt(row.subjective);
        reportData.objective = decrypt(row.objective);
        reportData.assessment = decrypt(row.assessment);
        reportData.plan = decrypt(row.plan);
      }

      if (accessLevel === 'full' || (sectionsAllowed && sectionsAllowed.includes('counseling'))) {
        const tryParse = (v: any) => {
          try {
            return JSON.parse(v ? decrypt(v) : '{}');
          } catch {
            return null;
          }
        };
        reportData.counselingAssessment = tryParse(row.counseling_assessment);
        reportData.counselingAdvice = tryParse(row.counseling_advice);
        reportData.therapeuticIssues = tryParse(row.therapeutic_issues);
      }

      if (
        accessLevel === 'full' ||
        (sectionsAllowed && sectionsAllowed.includes('treatmentPlan'))
      ) {
        const tryParse = (v: any) => {
          try {
            return JSON.parse(v ? decrypt(v) : '{}');
          } catch {
            return null;
          }
        };
        reportData.treatmentPlanData = tryParse(row.treatment_plan_data);
      }

      if (accessLevel === 'summary_only' || accessLevel === 'full') {
        reportData.sessionNotes = row.session_notes_text ? decrypt(row.session_notes_text) : null;
      }

      if (accessLevel === 'full') {
        reportData.dischargeSummary = row.discharge_summary ? decrypt(row.discharge_summary) : null;
      }

      return reportData;
    });

    return res.json(reports);
  } catch (err) {
    console.error('Get student accessible reports error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================
// PHASE 5 — Session Drafts (AI private workspace)
// ============================================================

export const saveSessionDraft = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can save session drafts' });
  }

  const { sessionId, draftNotes } = req.body;

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }
    const providerId = providerRes.rows[0].id;

    const existing = await query(
      'SELECT id FROM session_drafts WHERE session_id = $1 AND provider_id = $2',
      [sessionId, providerId],
    );

    const encryptedNotes = encrypt(draftNotes || '');

    if (existing.rows.length > 0) {
      await query(
        'UPDATE session_drafts SET draft_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [encryptedNotes, existing.rows[0].id],
      );
    } else {
      await query(
        'INSERT INTO session_drafts (session_id, provider_id, draft_notes) VALUES ($1, $2, $3)',
        [sessionId || null, providerId, encryptedNotes],
      );
    }

    return res.json({ message: 'Draft saved successfully' });
  } catch (err) {
    console.error('Save session draft error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessionDraft = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'Only providers can retrieve session drafts' });
  }

  const { sessionId } = req.params;

  try {
    const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }
    const providerId = providerRes.rows[0].id;

    const draftRes = await query(
      'SELECT draft_notes, updated_at FROM session_drafts WHERE session_id = $1 AND provider_id = $2',
      [sessionId, providerId],
    );

    if (draftRes.rows.length === 0) {
      return res.json({ draftNotes: '', updatedAt: null });
    }

    return res.json({
      draftNotes: decrypt(draftRes.rows[0].draft_notes),
      updatedAt: draftRes.rows[0].updated_at,
    });
  } catch (err) {
    console.error('Get session draft error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================
// PHASE 4 — UniMind AI Clinical Suggestions
// ============================================================

export const aiClinicalSuggestions = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'UniMind AI is only available to authorized providers' });
  }

  const { presentingConcerns, sessionNotes, clinicianMode } = req.body;

  if (!presentingConcerns && !sessionNotes) {
    return res.status(400).json({ error: 'presentingConcerns or sessionNotes is required' });
  }

  const text = (presentingConcerns || '') + ' ' + (sessionNotes || '');
  const lower = text.toLowerCase();

  const therapeuticApproaches: string[] = [];
  const clinicalInsights: string[] = [];
  const followupSuggestions: string[] = [];
  const copingStrategies: string[] = [];

  // Therapeutic approach matching
  if (lower.includes('depress') || lower.includes('low mood') || lower.includes('hopeless')) {
    therapeuticApproaches.push(
      'Cognitive Behavioral Therapy (CBT) — particularly behavioral activation and cognitive restructuring',
    );
    therapeuticApproaches.push('Mindfulness-Based Cognitive Therapy (MBCT)');
    clinicalInsights.push(
      'Consider assessing sleep quality, appetite changes, and anhedonia severity',
    );
    clinicalInsights.push('Screen for suicidal ideation using C-SSRS or Columbia Scale');
    copingStrategies.push('Daily mood tracking journal');
    copingStrategies.push(
      'Behavioral activation scheduling — schedule one pleasant activity per day',
    );
    followupSuggestions.push('Follow-up in 1–2 weeks to monitor mood trajectory');
  }

  if (
    lower.includes('anxiet') ||
    lower.includes('panic') ||
    lower.includes('worry') ||
    lower.includes('fear')
  ) {
    therapeuticApproaches.push(
      'Cognitive Behavioral Therapy (CBT) — exposure and response prevention (ERP) if applicable',
    );
    therapeuticApproaches.push('Acceptance and Commitment Therapy (ACT) — defusion techniques');
    clinicalInsights.push('Assess for avoidance behaviors that may maintain anxiety cycle');
    clinicalInsights.push(
      'Consider ruling out medical causes of anxiety (thyroid, caffeine, medications)',
    );
    copingStrategies.push('Box breathing (4-4-4-4 technique) twice daily');
    copingStrategies.push('Progressive Muscle Relaxation (PMR)');
    followupSuggestions.push('Follow-up in 1–2 weeks; reassess avoidance behaviors');
  }

  if (
    lower.includes('trauma') ||
    lower.includes('abuse') ||
    lower.includes('ptsd') ||
    lower.includes('flashback')
  ) {
    therapeuticApproaches.push(
      'Trauma-Informed Care principles — establish safety before processing',
    );
    therapeuticApproaches.push('EMDR (Eye Movement Desensitization and Reprocessing) — if trained');
    therapeuticApproaches.push('Trauma-Focused CBT (TF-CBT)');
    clinicalInsights.push('Avoid trauma processing in early sessions — prioritize stabilization');
    clinicalInsights.push('Assess current safety, support systems, and triggers');
    copingStrategies.push('Grounding techniques — 5-4-3-2-1 sensory method');
    copingStrategies.push('Safe place visualization exercise');
    followupSuggestions.push(
      'Follow-up in 1 week to assess stabilization before trauma processing',
    );
  }

  if (
    lower.includes('substance') ||
    lower.includes('alcohol') ||
    lower.includes('drug') ||
    lower.includes('addiction')
  ) {
    therapeuticApproaches.push('Motivational Interviewing (MI) — ambivalence exploration');
    therapeuticApproaches.push('Solution-Focused Brief Therapy (SFBT)');
    clinicalInsights.push(
      'Assess stage of change (Precontemplation / Contemplation / Preparation / Action)',
    );
    clinicalInsights.push(
      'Evaluate medical detoxification need and refer to physician if required',
    );
    followupSuggestions.push(
      'Consider referral to psychiatric evaluation for dual diagnosis assessment',
    );
  }

  if (
    lower.includes('relationship') ||
    lower.includes('family') ||
    lower.includes('interpersonal') ||
    lower.includes('conflict')
  ) {
    therapeuticApproaches.push(
      'Interpersonal Therapy (IPT) — role transitions and interpersonal disputes',
    );
    therapeuticApproaches.push(
      'Strength-Based Counseling — explore existing relationship resources',
    );
    clinicalInsights.push('Explore communication patterns and role expectations');
    copingStrategies.push('Communication skills practice — "I" statements technique');
    copingStrategies.push('Active listening exercises for client to practice between sessions');
  }

  if (
    lower.includes('academic') ||
    lower.includes('study') ||
    lower.includes('exam') ||
    lower.includes('performance')
  ) {
    therapeuticApproaches.push(
      'Solution-Focused Brief Therapy (SFBT) — identify exceptions and strengths',
    );
    therapeuticApproaches.push('CBT — address perfectionism and catastrophic thinking patterns');
    clinicalInsights.push(
      'Assess for underlying performance anxiety, perfectionism, or fear of failure',
    );
    copingStrategies.push('Time-blocking and structured study planning');
    copingStrategies.push('Pomodoro technique for study focus (25 min work / 5 min break)');
    followupSuggestions.push('Follow-up within 2 weeks around exam period for support');
  }

  // Risk indicators
  const riskIndicators: string[] = [];
  if (
    lower.includes('suicide') ||
    lower.includes('self-harm') ||
    lower.includes('want to die') ||
    lower.includes('end my life')
  ) {
    riskIndicators.push(
      '⚠️ CRITICAL: Suicidal ideation indicators detected — conduct immediate safety assessment',
    );
    riskIndicators.push(
      'Activate crisis protocol and emergency contact procedures if risk is imminent',
    );
    followupSuggestions.push(
      '🔴 Emergency escalation may be required — do NOT close session without safety plan',
    );
  } else if (
    lower.includes('hopeless') ||
    lower.includes('burden') ||
    lower.includes('worthless')
  ) {
    riskIndicators.push('Passive suicidal ideation risk — assess with C-SSRS');
    riskIndicators.push('Identify protective factors: reasons for living, support network');
    followupSuggestions.push('Follow-up within 3–5 days for risk monitoring');
  }

  // Defaults if nothing matched
  if (therapeuticApproaches.length === 0) {
    therapeuticApproaches.push('Supportive Counseling — establish therapeutic alliance');
    therapeuticApproaches.push('Positive Psychology Interventions — strengths identification');
    clinicalInsights.push(
      'Gather further information about presenting concerns, duration, and impact on functioning',
    );
    followupSuggestions.push('Follow-up in 2 weeks after initial rapport building');
  }

  const isCounseling =
    !clinicianMode || clinicianMode === 'counselor' || clinicianMode === 'multidisciplinary';
  const isMedical = clinicianMode === 'doctor' || clinicianMode === 'multidisciplinary';

  return res.json({
    clinicalInsights,
    therapeuticApproaches: isCounseling ? therapeuticApproaches : [],
    copingStrategies: isCounseling ? copingStrategies : [],
    riskIndicators,
    followupSuggestions,
    medicalInsights: isMedical
      ? [
          'Consider reviewing medication history and current prescriptions',
          'Assess physical examination findings if not already completed',
          'Evaluate need for laboratory investigations',
        ]
      : [],
    disclaimer:
      'These suggestions are AI-generated clinical decision-support aids only. They do not constitute diagnoses. All recommendations must be reviewed and approved by the qualified clinician before use in clinical documentation.',
  });
};

export const aiDraftToReport = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ error: 'UniMind AI is only available to authorized providers' });
  }

  const { draftNotes, outputType, clinicianMode, studentName, sessionDate } = req.body;

  if (!draftNotes) {
    return res.status(400).json({ error: 'draftNotes is required' });
  }

  const lower = draftNotes.toLowerCase();
  const sentences = draftNotes
    .split(/[.!?\n]+/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  const patientRef = studentName || 'The client';
  const dateRef = sessionDate
    ? new Date(sessionDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : "today's session";

  if (outputType === 'counseling-report') {
    const presentingConcerns =
      sentences
        .filter((s: string) => /concern|issue|problem|worry|struggle|feel|experience/i.test(s))
        .join(' ') || draftNotes;
    const observations =
      sentences
        .filter((s: string) => /appear|observe|note|demeanor|behavior|mood|affect/i.test(s))
        .join(' ') || 'Client appeared cooperative and engaged during the session.';
    const interventions =
      sentences
        .filter((s: string) =>
          /discuss|explore|technique|exercise|strategy|tool|breathing|coping/i.test(s),
        )
        .join(' ') || 'Supportive counseling provided.';

    return res.json({
      outputType: 'counseling-report',
      draft: {
        presentingConcerns: `${patientRef} presented on ${dateRef} with the following concerns: ${presentingConcerns}`,
        sessionObservations: observations,
        interventionsUsed: interventions,
        sessionNotes: `${patientRef} participated in the counseling session. ${observations} ${interventions}`,
        followUpRecommendations:
          'Follow-up session recommended. Provider to confirm appropriate interval.',
        therapistNotes:
          'This draft was generated by UniMind AI from private session notes. Provider must review, edit, and approve before finalizing.',
      },
    });
  }

  if (outputType === 'soap-notes') {
    const subjective =
      sentences
        .filter((s: string) => /feel|said|report|state|think|concern|complaint|worry/i.test(s))
        .join(' ') || draftNotes;
    const objective =
      sentences
        .filter((s: string) => /appear|look|observed|session|score|exam|test|vital/i.test(s))
        .join(' ') || 'Client presented appropriately for session.';
    const assessment =
      sentences
        .filter((s: string) => /diagno|seems|symptom|criteri|impair|distress|pattern/i.test(s))
        .join(' ') || 'Ongoing assessment in progress.';
    const plan =
      sentences
        .filter((s: string) => /plan|next|follow|recommend|refer|schedule|prescri|goal/i.test(s))
        .join(' ') || 'Continue current therapeutic approach. Follow-up as scheduled.';

    return res.json({
      outputType: 'soap-notes',
      draft: { subjective, objective, assessment, plan },
    });
  }

  if (outputType === 'progress-notes') {
    return res.json({
      outputType: 'progress-notes',
      draft: {
        progressNotes: `Session ${dateRef}: ${patientRef} attended counseling session. ${draftNotes} Provider observed engagement with therapeutic process. Progress toward treatment goals to be evaluated at next session.`,
      },
    });
  }

  if (outputType === 'treatment-plan') {
    const goals = sentences.filter((s: string) =>
      /goal|target|achieve|improve|reduce|increase|manage/i.test(s),
    );
    const interventions = sentences.filter((s: string) =>
      /intervene|technique|CBT|DBT|ACT|therapy|exercise|skill/i.test(s),
    );

    return res.json({
      outputType: 'treatment-plan',
      draft: {
        treatmentGoals:
          goals.length > 0
            ? goals.join('; ')
            : 'Goals to be collaboratively developed with client.',
        interventionsPlanned:
          interventions.length > 0
            ? interventions.join('; ')
            : 'Evidence-based therapeutic interventions to be determined based on assessment.',
        reviewSchedule: 'Review treatment plan at 4-session intervals or as clinically indicated.',
        providerNote:
          'AI-generated draft. Provider must review and finalize before adding to official record.',
      },
    });
  }

  if (outputType === 'session-summary') {
    return res.json({
      outputType: 'session-summary',
      draft: {
        summary: `Session Summary — ${dateRef}: ${patientRef} attended a ${clinicianMode === 'doctor' ? 'medical' : 'counseling'} session. ${draftNotes} The session was concluded as per the clinician's clinical judgment.`,
      },
    });
  }

  if (outputType === 'follow-up-plan') {
    return res.json({
      outputType: 'follow-up-plan',
      draft: {
        followUpPlan: `Based on the session on ${dateRef}, the following follow-up actions are recommended: ${draftNotes}`,
        suggestedInterval: 'Follow-up in 1–2 weeks (to be confirmed by provider)',
        nextSessionObjectives: 'To be determined by provider based on clinical progress.',
        providerNote:
          'AI-generated draft. Provider to review and modify before confirming with client.',
      },
    });
  }

  if (outputType === 'referral-letter') {
    return res.json({
      outputType: 'referral-letter',
      draft: {
        referralLetter: `Dear Colleague,\n\nI am writing to refer ${patientRef} for further evaluation and management. ${draftNotes}\n\nKindly assess and advise regarding appropriate treatment and management.\n\nThank you for your professional support.\n\nYours sincerely,\n[Provider Name]\n[Designation]\nCUAP Wellness & Counseling Centre\n\n[Note: This is an AI-generated draft. Provider must review and sign before sending.]`,
      },
    });
  }

  return res.status(400).json({ error: `Unknown outputType: ${outputType}` });
};

export const toggleReportVisibility = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'provider' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Only authorized staff can toggle report visibility' });
  }

  const { type, id } = req.params;
  const { is_released } = req.body;

  if (is_released === undefined) {
    return res.status(400).json({ error: 'is_released is required' });
  }

  const tableName =
    type === 'prescription'
      ? 'prescriptions'
      : type === 'session'
        ? 'sessions'
        : type === 'assessment'
          ? 'assessments'
          : null;

  if (!tableName) {
    return res.status(400).json({ error: 'Invalid report type' });
  }

  try {
    await query(`UPDATE ${tableName} SET is_released = $1 WHERE id = $2`, [
      is_released ? 1 : 0,
      id,
    ]);
    return res.json({ message: 'Visibility updated successfully', is_released });
  } catch (err) {
    console.error('Toggle visibility error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGeneratedReports = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'provider' && req.user.role !== 'admin' && req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  try {
    // We fetch sessions, prescriptions, assessments
    const sessionsRes = await query(`
      SELECT s.id, 'session' as type, s.report_type, s.session_date as generated_date, s.is_released, 
             st.name as student_name, st.registration_number as student_id,
             p.name as counselor_name, s.session_status as status
      FROM sessions s
      JOIN students st ON s.student_id = st.id
      JOIN providers p ON s.provider_id = p.id
      ORDER BY s.session_date DESC
    `);

    const prescriptionsRes = await query(`
      SELECT pr.id, 'prescription' as type, 'Medical Prescription' as report_type, pr.prescription_date as generated_date, pr.is_released,
             st.name as student_name, st.registration_number as student_id,
             p.name as counselor_name, 'issued' as status
      FROM prescriptions pr
      JOIN students st ON pr.student_id = st.id
      JOIN providers p ON pr.provider_id = p.id
      ORDER BY pr.prescription_date DESC
    `);

    const assessmentsRes = await query(`
      SELECT a.id, 'assessment' as type, a.type as report_type, a.assessment_date as generated_date, a.is_released,
             st.name as student_name, st.registration_number as student_id,
             p.name as counselor_name, 'completed' as status
      FROM assessments a
      JOIN students st ON a.student_id = st.id
      LEFT JOIN providers p ON a.provider_id = p.id
      ORDER BY a.assessment_date DESC
    `);

    const combined = [...sessionsRes.rows, ...prescriptionsRes.rows, ...assessmentsRes.rows].sort(
      (a, b) => {
        return new Date(b.generated_date).getTime() - new Date(a.generated_date).getTime();
      },
    );

    return res.json(combined);
  } catch (err) {
    console.error('getGeneratedReports error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllAssessments = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'admin' &&
      req.user.role !== 'provider' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Authorized access required' });
  }

  try {
    const listRes = await query(`
      SELECT s.id, s.session_date, s.diagnosis, s.clinician_mode, s.session_status, s.workflow_stage, s.subjective, s.objective, s.assessment, s.plan, s.treatment_plan_data,
             st.name as student_name, st.registration_number, st.department as student_dept,
             p.name as provider_name,
             m.risk_level
      FROM sessions s
      JOIN students st ON s.student_id = st.id
      JOIN providers p ON s.provider_id = p.id
      LEFT JOIN mse_logs m ON s.id = m.session_id
      ORDER BY s.session_date DESC
    `);

    const decryptedRows = listRes.rows.map((row: any) => {
      let diag = '';
      try {
        diag = decrypt(row.diagnosis);
      } catch (e) {
        diag = row.diagnosis;
      }
      return {
        ...row,
        diagnosis: diag,
        subjective: decrypt(row.subjective),
        objective: decrypt(row.objective),
        assessment: decrypt(row.assessment),
        plan: decrypt(row.plan),
      };
    });

    return res.json(decryptedRows);
  } catch (err) {
    console.error('getAllAssessments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
