import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

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
