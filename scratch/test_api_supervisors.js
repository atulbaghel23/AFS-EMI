import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const BASE_URL = 'https://afs-emi.vercel.app/api';

async function run() {
  // Login as admin to get token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'oem@liugong.com',
      password: 'admin123',
      role: 'OEM'
    })
  });

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Logged in. Token:', token ? 'OK' : 'FAIL');

  // Fetch supervisors
  const supRes = await fetch(`${BASE_URL}/fmc/supervisors`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const sups = await supRes.json();
  console.log('Supervisors returned by API:', JSON.stringify(sups, null, 2));
  process.exit(0);
}

run().catch(console.error);
