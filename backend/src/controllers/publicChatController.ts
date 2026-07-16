import { Request, Response } from 'express';

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
    const systemInstruction = `
      You are a wellness and mental health virtual assistant for the Wellness Counseling Centre of the Central University of Andhra Pradesh (CUAP WCCMS).
      Provide supportive, informative, and empathetic responses to the user. Keep your responses friendly, concise, and structured.
      
      If the user asks questions about WCCMS:
      - Explain that WCCMS is the Wellness Counseling Centre Management System of CUAP.
      - Students can sign in using their University Registration Number (default password is the same Reg Number) to book counseling slots, complete diagnostic screenings, download self-help resources, and communicate securely with specialists.
      - Counselors and administrators can log in to manage schedules, review cases, edit SOAP clinical notes, and view statistics.
      - The lead psychologist/coordinator is Dr. Sabuj Das.
      
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
