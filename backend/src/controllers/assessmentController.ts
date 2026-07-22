import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const callGeminiAPI = async (prompt: string, systemInstruction: string = ''): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in .env file.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API returned error status:', response.status, errorText);
    throw new Error(`Gemini API call failed: ${errorText}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API.');
  }
  return text.trim();
};

// Automatic Scoring Algorithms for Standard Clinical Questionnaires
const scoreAssessment = (type: string, answers: Record<string, number>) => {
  let score = 0;
  let subScores: Record<string, number> = {};
  let interpretation = '';

  const values = Object.values(answers);
  const total = values.reduce((sum, v) => sum + (Number(v) || 0), 0);

  switch (type.toUpperCase()) {
    case 'PHQ-9':
      score = total;
      if (score <= 4) interpretation = 'Minimal Depression';
      else if (score <= 9) interpretation = 'Mild Depression';
      else if (score <= 14) interpretation = 'Moderate Depression';
      else if (score <= 19) interpretation = 'Moderately Severe Depression';
      else interpretation = 'Severe Depression';
      break;

    case 'GAD-7':
      score = total;
      if (score <= 4) interpretation = 'Minimal Anxiety';
      else if (score <= 9) interpretation = 'Mild Anxiety';
      else if (score <= 14) interpretation = 'Moderate Anxiety';
      else interpretation = 'Severe Anxiety';
      break;

    case 'DASS-21':
      // DASS-21 questions are categorized:
      // Depression: Q1, Q5, Q10, Q13, Q16, Q17, Q21 (indices 1, 5, 10, 13, 16, 17, 21 or keys)
      // Anxiety: Q2, Q4, Q7, Q9, Q15, Q19, Q20
      // Stress: Q3, Q6, Q8, Q11, Q12, Q14, Q18
      let depSum = 0;
      let anxSum = 0;
      let strSum = 0;

      Object.entries(answers).forEach(([key, val]) => {
        const qNum = parseInt(key.replace(/[^\d]/g, ''));
        const v = Number(val) || 0;
        if ([1, 5, 10, 13, 16, 17, 21].includes(qNum)) depSum += v;
        else if ([2, 4, 7, 9, 15, 19, 20].includes(qNum)) anxSum += v;
        else if ([3, 6, 8, 11, 12, 14, 18].includes(qNum)) strSum += v;
      });

      // DASS-21 scores are multiplied by 2 to compare with DASS-42 norms
      const depScore = depSum * 2;
      const anxScore = anxSum * 2;
      const strScore = strSum * 2;
      score = depScore + anxScore + strScore;
      subScores = { depression: depScore, anxiety: anxScore, stress: strScore };

      // Category evaluations
      const depEval =
        depScore <= 9
          ? 'Normal'
          : depScore <= 13
            ? 'Mild'
            : depScore <= 20
              ? 'Moderate'
              : depScore <= 27
                ? 'Severe'
                : 'Extremely Severe';
      const anxEval =
        anxScore <= 7
          ? 'Normal'
          : anxScore <= 9
            ? 'Mild'
            : anxScore <= 14
              ? 'Moderate'
              : anxScore <= 19
                ? 'Severe'
                : 'Extremely Severe';
      const strEval =
        strScore <= 14
          ? 'Normal'
          : strScore <= 18
            ? 'Mild'
            : strScore <= 25
              ? 'Moderate'
              : strScore <= 33
                ? 'Severe'
                : 'Extremely Severe';

      interpretation = `Depression: ${depEval} (${depScore}), Anxiety: ${anxEval} (${anxScore}), Stress: ${strEval} (${strScore})`;
      break;

    case 'BDI-II':
      score = total;
      if (score <= 13) interpretation = 'Minimal Depression';
      else if (score <= 19) interpretation = 'Mild Depression';
      else if (score <= 28) interpretation = 'Moderate Depression';
      else interpretation = 'Severe Depression';
      break;

    default: // Custom / Generic
      score = total;
      interpretation = `Score: ${score}. Custom questionnaire submission.`;
      break;
  }

  return { score, subScores, interpretation };
};

export const submitAssessment = async (req: AuthRequest, res: Response) => {
  const { studentId, type, answers } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!studentId || !type || !answers) {
    return res
      .status(400)
      .json({ error: 'Student ID, assessment type, and answers are required.' });
  }

  try {
    let resolvedStudentId = studentId;

    // If client is student, verify they are submitting for themselves
    if (req.user.role === 'student') {
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [
        req.user.id,
      ]);
      if (studentProfile.rows.length === 0 || studentProfile.rows[0].id !== parseInt(studentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden. Students can only submit their own assessments.' });
      }
      resolvedStudentId = studentProfile.rows[0].id;
    }

    // Determine scoring
    const { score, subScores, interpretation } = scoreAssessment(type, answers);

    // Get Provider ID if current user is provider, otherwise NULL
    let providerId: number | null = null;
    if (req.user.role === 'provider') {
      const providerRes = await query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
      providerId = providerRes.rows[0]?.id || null;
    }

    // SQLite accepts JSON as text, Postgres supports JSONB. We stringify answers and scores dictionary.
    const scoresJson = JSON.stringify({ totalScore: score, subScores, answers });
    const reportText = `Assessment Type: ${type}\nDate: ${new Date().toLocaleDateString()}\nResult: ${interpretation}\nCalculated Score: ${score}`;

    await query(
      `INSERT INTO assessments (student_id, provider_id, type, scores, report) 
       VALUES ($1, $2, $3, $4, $5)`,
      [resolvedStudentId, providerId, type, scoresJson, reportText],
    );

    // Get the assessment ID to return it
    const fetchNew = await query(
      'SELECT id FROM assessments WHERE student_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
      [resolvedStudentId, type],
    );
    const assessmentId = fetchNew.rows[0].id;

    // Audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'SUBMIT_ASSESSMENT',
        `Submitted ${type} assessment (Score: ${score}) for Student ID ${resolvedStudentId}`,
        req.ip,
      ],
    );

    return res.status(201).json({
      message: 'Assessment scored and recorded successfully.',
      id: assessmentId,
      score,
      interpretation,
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAssessments = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.query;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let sql = `
      SELECT a.*, s.name as student_name, s.registration_number, p.name as provider_name
      FROM assessments a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN providers p ON a.provider_id = p.id
    `;
    const params: any[] = [];

    // Access control
    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0) return res.json([]);
      sql += ' WHERE a.student_id = $1';
      params.push(studentRes.rows[0].id);
    } else {
      sql += ' WHERE 1=1';
    }

    if (studentId && req.user.role !== 'student') {
      sql += ` AND a.student_id = $${params.length + 1}`;
      params.push(studentId);
    }

    sql += ' ORDER BY a.assessment_date DESC, a.created_at DESC';

    const dbRes = await query(sql, params);

    // Parse scores JSON string back if it was sqlite/text
    const results = dbRes.rows.map((row: any) => {
      let parsedScores = row.scores;
      if (typeof row.scores === 'string') {
        try {
          parsedScores = JSON.parse(row.scores);
        } catch {
          // ignore
        }
      }
      return { ...row, scores: parsedScores };
    });

    return res.json(results);
  } catch (err) {
    console.error('Get assessments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAssessmentDetails = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const assessRes = await query(
      `SELECT a.*, s.name as student_name, s.registration_number, s.age, s.gender, s.department as student_dept, s.semester as student_semester
       FROM assessments a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1`,
      [id],
    );

    if (assessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessRes.rows[0];

    // Access check
    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0 || studentRes.rows[0].id !== assessment.student_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    let parsedScores = assessment.scores;
    if (typeof assessment.scores === 'string') {
      try {
        parsedScores = JSON.parse(assessment.scores);
      } catch {
        // ignore
      }
    }

    return res.json({
      ...assessment,
      scores: parsedScores,
    });
  } catch (err) {
    console.error('Get assessment details error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadAssessmentPDF = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Fetch assessment details
    const assessRes = await query(
      `SELECT a.*, s.name as student_name, s.registration_number, s.age, s.gender, s.department as student_dept, s.semester as student_semester
       FROM assessments a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1`,
      [id],
    );

    if (assessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessRes.rows[0];

    // Access check: Students can only download their own
    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0 || studentRes.rows[0].id !== assessment.student_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // 2. Fetch wellness recommendations from Gemini API
    const type = assessment.type;
    let score = 0;
    let interpretation = '';

    try {
      const parsed =
        typeof assessment.scores === 'string' ? JSON.parse(assessment.scores) : assessment.scores;
      score = parsed.totalScore || parsed.score || 0;
    } catch (_) {
      score = 0;
    }

    interpretation =
      assessment.report?.split('Result: ')?.[1]?.split('\n')?.[0] ||
      assessment.report ||
      'Completed';

    const systemInstruction =
      'You are a warm, supportive wellness coach at the Central University of Andhra Pradesh.';
    const geminiPrompt = `
      Create a custom self-care wellness recommendation guide for a student who scored ${score} on their ${type} screening (Result: ${interpretation}).
      Include 3 specific coping exercises (e.g. mindfulness or breathing) and 2 sleep or study lifestyle habits. Format cleanly with bullet points, keep it short, practical, and highly empathetic.
    `;

    let geminiReply = '';
    try {
      geminiReply = await callGeminiAPI(geminiPrompt, systemInstruction);
    } catch (e) {
      geminiReply = `1. Practice deep box breathing: Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, hold for 4 seconds. Repeat 4 times.\n2. Dedicate 10 minutes to quiet reflection or mindfulness daily.\n3. Keep a consistent sleep schedule and turn off all digital devices 30 minutes before bed.\n4. Stay active by walking around the CUAP campus for 30 minutes each day.\n5. If your symptoms persist or feel overwhelming, please schedule a session with our counseling centre specialists.`;
    }

    // 3. Generate PDF document
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wellness_path_${assessment.registration_number.toLowerCase()}.pdf"`,
    );

    doc.pipe(res);

    // Title / Banner
    doc
      .fillColor('#1e3a8a')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('CENTRAL UNIVERSITY OF ANDHRA PRADESH', { align: 'center' });
    doc
      .fontSize(14)
      .fillColor('#475569')
      .text('Student Wellness Counseling Centre', { align: 'center' });
    doc.moveDown(1.5);

    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Subtitle
    doc
      .fillColor('#1e293b')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Personalized Wellness Path & Screening Report', { align: 'left' });
    doc.moveDown(1);

    // Student Info
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('STUDENT PROFILE DETAILS');
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#334155');

    const yPos = doc.y;
    doc.text(`Name: ${assessment.student_name}`, 50, yPos);
    doc.text(`Reg No: ${assessment.registration_number.toUpperCase()}`, 300, yPos);
    doc.text(`Gender/Age: ${assessment.gender} / ${assessment.age}`, 50, yPos + 20);
    doc.text(
      `Dept/Sem: ${assessment.student_dept} (${assessment.student_semester})`,
      300,
      yPos + 20,
    );
    doc.moveDown(3);

    // Divider
    doc.strokeColor('#f1f5f9').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Assessment Results
    doc.font('Helvetica-Bold').fillColor('#475569').text('SCREENING RESULT');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#1e293b');
    doc.text(`Assessment Type: ${type}`);
    doc.text(
      `Date Completed: ${new Date(assessment.created_at || assessment.assessment_date).toLocaleDateString()}`,
    );

    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .fillColor('#2563eb')
      .text(`Severity Level: ${interpretation} (Score: ${score})`);
    doc.moveDown(1.5);

    // Divider
    doc.strokeColor('#f1f5f9').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Self-Care Guide
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#10b981')
      .text('PERSONALIZED COPING STRATEGIES & WELLNESS PATH');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#334155').text(geminiReply, {
      width: 500,
      align: 'justify',
      lineGap: 3,
    });

    doc.moveDown(3);
    doc
      .font('Helvetica-Oblique')
      .fillColor('#64748b')
      .fontSize(8)
      .text(
        'Disclaimer: This screening report is for informational purposes only and does not constitute medical advice or a psychiatric diagnosis. If you are experiencing distress, please reach out to the CUAP Wellness Centre counselors.',
        { width: 500, align: 'center' },
      );

    doc.end();
  } catch (err) {
    console.error('Download Assessment PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
