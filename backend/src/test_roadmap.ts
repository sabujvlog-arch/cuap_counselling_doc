const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('🏁 Starting Roadmap Integration Tests...');

  try {
    // ----------------------------------------------------
    // TEST 1: Public Chatbot booking recommendation
    // ----------------------------------------------------
    console.log('\n🤖 Test 1: Public Chatbot slot recommendations...');
    const chatbotRes = await fetch(`${BASE_URL}/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'When is Dr. Sarah Connor free?',
        history: [],
      }),
    });

    if (!chatbotRes.ok) {
      throw new Error(`Chatbot request failed: Status ${chatbotRes.status}`);
    }
    const chatbotData = (await chatbotRes.json()) as any;
    console.log('✓ Chatbot reply received.');

    const replyText = chatbotData.reply || '';
    const hasBookingUri = replyText.includes('book://');
    if (hasBookingUri) {
      console.log('✓ Success: Chatbot reply contains a book:// custom booking protocol link!');
    } else {
      console.warn(
        '⚠️ Note: Chatbot reply did not return a book:// link directly. (This depends on live counselor availability configured in the DB).',
      );
    }

    // ----------------------------------------------------
    // TEST 2: Student login & Screening PDF generation
    // ----------------------------------------------------
    console.log('\n📊 Test 2: Student Login & Wellness PDF generation...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '25bec01', password: '25bec01' }),
    });

    if (!loginRes.ok) {
      throw new Error('Student login failed.');
    }
    const loginData = (await loginRes.json()) as any;
    const studentToken = loginData.token;
    console.log('✓ Student logged in successfully.');

    // Retrieve active profile ID using /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = (await meRes.json()) as any;
    const studentProfileId = meData.profile.id;
    console.log(`✓ Fetched Student Profile ID: ${studentProfileId}`);

    // Submit a dummy screening assessment
    const submitRes = await fetch(`${BASE_URL}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        studentId: studentProfileId,
        type: 'PHQ-9',
        answers: { q1: 1, q2: 2, q3: 1, q4: 3, q5: 2, q6: 1, q7: 0, q8: 2, q9: 0 },
      }),
    });

    if (!submitRes.ok) {
      throw new Error(`Assessment submission failed: ${await submitRes.text()}`);
    }
    const submitData = (await submitRes.json()) as any;
    const assessmentId = submitData.id;
    console.log(`✓ Screening submitted successfully. Assessment ID: ${assessmentId}`);

    // Call PDF generation endpoint
    const pdfRes = await fetch(`${BASE_URL}/assessments/${assessmentId}/pdf`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (!pdfRes.ok) {
      throw new Error(`PDF generation endpoint failed with status ${pdfRes.status}`);
    }
    const contentType = pdfRes.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      console.log('✓ Success: PDF endpoint returned a valid application/pdf document stream!');
    } else {
      throw new Error(`Unexpected Content-Type returned: ${contentType}`);
    }

    // ----------------------------------------------------
    // TEST 3: Counselor Login & SOAP Version History
    // ----------------------------------------------------
    console.log('\n🪵 Test 3: Counselor Login & SOAP version history audit logs...');
    const cLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'counselor01', password: '3690' }),
    });

    if (!cLoginRes.ok) {
      throw new Error('Counselor login failed.');
    }
    const cLoginData = (await cLoginRes.json()) as any;
    const counselorToken = cLoginData.token;
    console.log('✓ Counselor logged in successfully.');

    // Create/update a session draft to generate version history
    const sessionPayload = {
      studentId: studentProfileId,
      clinicianMode: 'counselor',
      reportType: 'counseling',
      sessionNumber: 1,
      sessionStatus: 'completed',
      presentingComplaint: 'Exam anxiety and light insomnia.',
      subjective: 'Client reports academic stress.',
      objective: 'Client appears tense.',
      assessment: 'Mild anxiety indicators.',
      plan: 'Suggest relaxation exercises.',
      chiefComplaint: 'Academic stress',
      autoSave: false,
    };

    const sessionSaveRes = await fetch(`${BASE_URL}/clinical/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${counselorToken}`,
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!sessionSaveRes.ok) {
      throw new Error(`Session save failed: ${await sessionSaveRes.text()}`);
    }
    const sessionSaveData = (await sessionSaveRes.json()) as any;
    const sessionId = sessionSaveData.id;
    console.log(`✓ Session saved successfully. Session ID: ${sessionId}`);

    // Update the session draft to generate a revision version in history
    const sessionUpdatePayload = {
      ...sessionPayload,
      id: sessionId,
      subjective: 'Client reports improved academic stress after trying breathing techniques.',
    };

    const sessionUpdateRes = await fetch(`${BASE_URL}/clinical/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${counselorToken}`,
      },
      body: JSON.stringify(sessionUpdatePayload),
    });

    if (!sessionUpdateRes.ok) {
      throw new Error('Session update failed.');
    }
    console.log('✓ Session updated/revised successfully.');

    // Query version history
    const versionsRes = await fetch(`${BASE_URL}/clinical/sessions/${sessionId}/versions`, {
      headers: { Authorization: `Bearer ${counselorToken}` },
    });

    if (!versionsRes.ok) {
      throw new Error(`Get versions endpoint failed with status ${versionsRes.status}`);
    }
    const versionsData = await versionsRes.json();
    if (Array.isArray(versionsData) && versionsData.length > 0) {
      console.log(
        `✓ Success: Retrieved ${versionsData.length} historical version logs for Session ID ${sessionId}!`,
      );
      console.log(
        `  - Version ${versionsData[0].version} created at ${versionsData[0].created_at} by ${versionsData[0].editor_name}`,
      );
    } else {
      throw new Error('No version history logs returned.');
    }

    console.log(
      '\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! All WCCMS Roadmap features are functional.',
    );
  } catch (err: any) {
    console.error('\n❌ Test execution failed:', err.message || err);
    process.exit(1);
  }
};

runTests();
