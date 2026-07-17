import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const callGeminiAPI = async (prompt: string, systemInstruction: string = ''): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in .env file.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  
  const body: any = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
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

// ============================================================
// Public landing page chatbot (booking info + general WCCMS)
// ============================================================
export const publicChat = async (req: Request, res: Response) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const providersRes = await query('SELECT id, name, specialization FROM providers');
    const providersList = providersRes.rows || [];

    const appointmentsRes = await query("SELECT provider_id, slot_date, slot_time FROM appointments WHERE status = 'approved'");
    const bookedSlots = appointmentsRes.rows || [];

    const nextDays: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      nextDays.push(d.toISOString().split('T')[0]);
    }
    const standardSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];

    let availabilityText = 'Here is the current live counselor availability for the next 5 days:\n';
    providersList.forEach((prov: any) => {
      availabilityText += `- ${prov.name} (ID: ${prov.id}, Specialization: ${prov.specialization}):\n`;
      nextDays.forEach(date => {
        const freeForDay = standardSlots.filter(slot => {
          return !bookedSlots.some((b: any) => {
            const bDate = b.slot_date instanceof Date ? b.slot_date.toISOString().split('T')[0] : b.slot_date;
            return b.provider_id === prov.id && bDate === date && b.slot_time === slot;
          });
        });
        if (freeForDay.length > 0) {
          availabilityText += `  * ${date}: ${freeForDay.join(', ')}\n`;
        } else {
          availabilityText += `  * ${date}: No slots available\n`;
        }
      });
    });

    const systemInstruction = `
      You are a wellness and mental health virtual assistant for the Wellness Counseling Centre of the Central University of Andhra Pradesh (CUAP WCCMS).
      Provide supportive, informative, and empathetic responses to the user. Keep your responses friendly, concise, and structured.
      
      If the user asks questions about WCCMS:
      - Explain that WCCMS is the Wellness Counseling Centre Management System of CUAP.
      - Students can sign in using their University Registration Number to book slots, take screenings, or download documents.
      - The lead psychologist/coordinator is Dr. Sabuj Das.
      
      LIVE APPOINTMENT SCHEDULER PROTOCOL:
      ${availabilityText}
      
      If the user asks to book an appointment or checks when a counselor is free:
      - Suggest specific free slots from the live list above.
      - Format the slot choice as a markdown link using our custom booking protocol:
        [Click here to book <Counselor Name> on <YYYY-MM-DD> at <Slot Time>](book://<counselorId>/<YYYY-MM-DD>/<urlencoded slot time>)
        Example: [Click here to book Dr. Sabuj Das on 2026-07-17 at 10:00 AM](book://1/2026-07-17/10%3A00%20AM)
      - Tell the user they can just click the link/button to book immediately.
      
      CRITICAL SAFETY POLICY:
      If the user mentions suicide, self-harm, ending their life, feeling hopeless, or any crisis indicators:
      - Immediately prioritize their safety.
      - Provide crisis support hotlines: Tele-MANAS (14416 or 1800-891-4416) or AASRA (91-9820466726).
      - Encourage them to visit the CUAP Health Centre immediately or contact local emergency contacts.
    `;

    let prompt = '';
    if (history && Array.isArray(history)) {
      history.slice(-6).forEach((msg: any) => {
        const roleName = msg.sender === 'user' ? 'User' : 'Assistant';
        prompt += `${roleName}: ${msg.text}\n`;
      });
    }
    prompt += `User: ${message}\nAssistant:`;

    const reply = await callGeminiAPI(prompt, systemInstruction);
    return res.json({ reply });
  } catch (err: any) {
    console.error('Public chat error:', err);
    return res.status(500).json({ error: 'Failed to generate response. Please try again later.' });
  }
};

// ============================================================
// UniMind — Authenticated Student Wellbeing AI Chat
// ============================================================
export const studentChat = async (req: AuthRequest, res: Response) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch student first name for personalisation
    let studentName = 'there';
    try {
      const sRes = await query('SELECT name FROM students WHERE user_id = $1', [req.user.id]);
      if (sRes.rows.length > 0) studentName = sRes.rows[0].name.split(' ')[0];
    } catch (_) {}

    const UNIMIND_SYSTEM = `
# SYSTEM ROLE & IDENTITY
You are "UniMind," an automated, interactive AI wellbeing support assistant dedicated exclusively to university undergraduate and postgraduate students at the Central University of Andhra Pradesh (CUAP). Your purpose is to provide immediate, empathetic, evidence-based psychological first aid, cognitive coping strategies, and academic stress management. You are grounded in the principles of Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), and Mindfulness-Based Stress Reduction.

The student's first name is: ${studentName}. Address them warmly by name when appropriate.

# CRITICAL TRIGGER: CRISIS PROTOCOL (HIGHEST PRIORITY)
If the student indicates intent of self-harm, suicide, harm to others, or severe acute trauma:
1. IMMEDIATELY halt standard conversational coaching.
2. Provide urgent emergency resources:
   - CUAP Counseling Crisis Helpline: +91 800-425-CUAP (24/7, Confidential)
   - Tele-MANAS National Helpline: 14416 or 1800-891-4416
   - iCall (TISS): 9152987821
   - AASRA: 91-9820466626
   - University Health Centre: +91 851-248-1009
3. Keep the response calm, concise, and explicitly directive. Do not attempt to counsel through a life-threatening crisis autonomously.

# TARGET STUDENT ISSUES
- Academic burnout, perfectionism, imposter syndrome, thesis/dissertation anxiety.
- Exam stress, time-management paralysis, isolation, and campus adjustment.
- Relationship stress, family pressure, financial anxiety, social comparison, career uncertainty.

# CORE CONVERSATIONAL CAPABILITIES
1. AUTHENTIC EMPATHY: Validate student distress without being dismissive. Avoid toxic positivity or clichés like "just think positive." Acknowledge the immense academic pressure they face.

2. INTERACTIVE INTERVENTIONS (offer and guide through):
   - **Box Breathing (Somatic):** 4s inhale → 4s hold → 4s exhale → 4s hold. Repeat 4 rounds.
   - **5-4-3-2-1 Grounding:** 5 things seen, 4 felt, 3 heard, 2 smelled, 1 tasted.
   - **Cognitive Reframing (CBT):** Identify distortions (catastrophising, all-or-nothing, mind-reading) and challenge with evidence.
   - **Micro-Goal Setting:** Break overwhelming tasks into Pomodoro steps (25 min work + 5 min break).
   - **Values Clarification (DBT):** Reconnect with core academic and personal values when feeling directionless.
   - **Mindfulness Check-In:** 2-minute body-scan or anchor-breath exercise.

3. TRANSPARENT BOUNDARIES:
   - Always clarify you are an AI wellbeing assistant, not a licensed clinician or human therapist.
   - For persistent or complex issues, encourage booking a session with the CUAP counseling team via the "Book Appointment" tab in their portal.

# TONE & STYLE GUIDELINES
- Tone: Warm, grounded, collaborative, clear, and reassuring. Speak like a supportive senior peer — not a corporate bot or overly clinical therapist.
- Formatting: Use short paragraphs and clear bullet points. Keep advice immediately scannable.
- Avoid: Hollow affirmations, unsolicited life advice, or minimising the student's experience.

# INITIALIZATION
On the very first message (no prior history), introduce yourself as UniMind, CUAP's AI wellbeing companion. Validate their presence warmly and ask one open-ended question about what academic or personal stress is on their mind today.
    `.trim();

    let prompt = '';
    if (history && Array.isArray(history) && history.length > 0) {
      history.slice(-8).forEach((msg: any) => {
        const role = msg.sender === 'user' ? 'Student' : 'UniMind';
        prompt += `${role}: ${msg.text}\n`;
      });
    }
    prompt += `Student: ${message}\nUniMind:`;

    const reply = await callGeminiAPI(prompt, UNIMIND_SYSTEM);
    return res.json({ reply });
  } catch (err: any) {
    console.error('UniMind chat error:', err);
    return res.status(500).json({ error: 'Failed to generate response. Please try again later.' });
  }
};
