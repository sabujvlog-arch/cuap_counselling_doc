const API_KEY = 'rnd_gY41Zvndj1LfArSKqXSLHYDFrrdh';
const REPO_URL = 'https://github.com/sabujvlog-arch/cuap_counseLLING_doc';

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const deploy = async () => {
  console.log('========================================================');
  console.log('    CUAP WCCMS AUTOMATED CLOUD DEPLOYMENT ON RENDER');
  console.log('========================================================\n');

  try {
    // 1. Get Owner ID
    console.log('[1/4] Retrieving Render owner/workspace account...');
    const ownerRes = await fetch('https://api.render.com/v1/owners?limit=1', { headers });
    if (!ownerRes.ok) {
      throw new Error(`Failed to get owner. Status: ${ownerRes.status} ${await ownerRes.text()}`);
    }
    const owners = await ownerRes.json();
    if (owners.length === 0) {
      throw new Error('No owners found on your Render account.');
    }
    const ownerId = owners[0].owner.id;
    console.log(`  -> Owner ID found: ${ownerId}`);

    // 2. Deploy Backend API
    console.log('\n[2/4] Registering WCCMS Express Backend Service...');
    const backendPayload = {
      type: 'web_service',
      name: 'cuap-wccms-backend',
      ownerId,
      repo: REPO_URL,
      branch: 'main',
      autoDeploy: 'yes',
      serviceDetails: {
        env: 'node',
        rootDir: 'backend',
        envSpecificDetails: {
          buildCommand: 'npm install && npm run build',
          startCommand: 'npm start',
        },
      },
      envVars: [
        { key: 'PORT', value: '5000' },
        { key: 'DB_TYPE', value: 'sqlite' },
        { key: 'JWT_SECRET', value: 'cuap-wccms-super-secret-key-2026' },
        { key: 'DB_ENCRYPTION_KEY', value: 'cuap-wccms-encryption-aes-key-2026' },
        {
          key: 'BREVO_API_KEY',
          value:
            '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',
        },
        { key: 'SENDER_EMAIL', value: 'sabujd880@gmail.com' },
        { key: 'SENDER_NAME', value: 'Sabuj Counseling Support' },
        { key: 'GEMINI_API_KEY', value: 'AQ.Ab8RN6IUqTTOqclK75V9v-Q8p0kNhcKCDrHYH8j4KBJXhYUCGQ' },
      ],
    };

    const backendRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers,
      body: JSON.stringify(backendPayload),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      console.warn(`Backend creation warning: ${backendRes.status}. Body: ${errText}`);
      if (errText.includes('name already in use') || errText.includes('already exists')) {
        console.log('  -> Backend service already exists, continuing...');
      } else {
        throw new Error(`Failed to create backend: ${errText}`);
      }
    } else {
      const backendData = await backendRes.json();
      console.log('  -> Backend Service Created successfully!');
      console.log(`  -> ID: ${backendData.id}`);
    }

    // Wait, let's query the service list to get the URL of backend
    console.log('\n[3/4] Locating Backend public endpoint URL...');
    let backendUrl = '';
    const servicesRes = await fetch('https://api.render.com/v1/services?limit=20', { headers });
    const services = await servicesRes.json();

    // Render API returns array of objects with service field
    const backendService = services.find((s) => s.service.name === 'cuap-wccms-backend');
    if (backendService) {
      backendUrl = backendService.service.url;
      console.log(`  -> Backend Public URL: ${backendUrl}`);
    } else {
      // Find default workspace name to build fallback
      backendUrl = `https://cuap-wccms-backend.onrender.com`;
      console.log(`  -> Fallback URL assumed: ${backendUrl}`);
    }

    // 3. Deploy Frontend Web Service
    console.log('\n[4/4] Registering WCCMS Next.js Frontend Service...');
    const frontendPayload = {
      type: 'web_service',
      name: 'cuap-wccms-frontend',
      ownerId,
      repo: REPO_URL,
      branch: 'main',
      autoDeploy: 'yes',
      serviceDetails: {
        env: 'node',
        rootDir: 'frontend',
        envSpecificDetails: {
          buildCommand: 'npm install && npm run build',
          startCommand: 'npm start',
        },
      },
      envVars: [{ key: 'NEXT_PUBLIC_API_URL', value: `${backendUrl}/api` }],
    };

    const frontendRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers,
      body: JSON.stringify(frontendPayload),
    });

    if (!frontendRes.ok) {
      const errText = await frontendRes.text();
      console.warn(`Frontend creation warning: ${frontendRes.status}. Body: ${errText}`);
      if (errText.includes('name already in use') || errText.includes('already exists')) {
        console.log('  -> Frontend service already exists.');
      } else {
        throw new Error(`Failed to create frontend: ${errText}`);
      }
    } else {
      const frontendData = await frontendRes.json();
      console.log('  -> Frontend Service Created successfully!');
      console.log(`  -> ID: ${frontendData.id}`);
    }

    console.log('\n========================================================');
    console.log(' 🎉 WCCMS SERVICES HAVE BEEN REGISTERED ON RENDER!');
    console.log(` Backend Service : ${backendUrl}`);
    console.log(` Frontend Service: https://cuap-wccms-frontend.onrender.com`);
    console.log(' Check your Render Dashboard to view the build logs.');
    console.log('========================================================');
  } catch (err) {
    console.error('Deployment script failed:', err.message);
  }
};

deploy();
