import { Request, Response } from 'express';
import { query } from '../config/db';

const callGeminiAPI = async (prompt: string, systemInstruction: string = ''): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in .env file.');
  }

  // Use the verified model from psychology-portfolio
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

export const publicChat = async (req: Request, res: Response) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    // 1. Fetch live providers
    const providersRes = await query('SELECT id, name, specialization FROM providers');
    const providersList = providersRes.rows || [];

    // 2. Fetch approved appointments to filter booked slots
    const appointmentsRes = await query("SELECT provider_id, slot_date, slot_time FROM appointments WHERE status = 'approved'");
    const bookedSlots = appointmentsRes.rows || [];

    // 3. Generate standard slots for next 5 days
    const nextDays: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      nextDays.push(d.toISOString().split('T')[0]);
    }
    const standardSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];

    // 4. Construct live calendar context text
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
      - Format the slot choice as a markdown link using our custom booking protocol so the user can book it dynamically:
        [Click here to book <Counselor Name> on <YYYY-MM-DD> at <Slot Time>](book://<counselorId>/<YYYY-MM-DD>/<urlencoded slot time>)
        Example: [Click here to book Dr. Sabuj Das on 2026-07-17 at 10:00 AM](book://1/2026-07-17/10%3A00%20AM)
      - Tell the user they can just click the link/button to book immediately.
      
      CRITICAL SAFETY POLICY:
      If the user mentions suicide, self-harm, ending their life, feeling hopeless, or any crisis indicators:
      - Immediately prioritize their safety.
      - Provide crisis support hotlines: Tele-MANAS (14416 or 1800-891-4416) or AASRA (91-9820466726).
      - Encourage them to visit the CUAP Health Centre immediately or contact local emergency contacts.
    `;

    // Construct conversation context from history
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
