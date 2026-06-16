async function testLogin() {
  try {
    const res = await fetch('https://afs-emi.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'oem@liugong.com',
        password: 'admin123',
        role: 'OEM'
      })
    });
    const data = await res.json();
    console.log('Login Status:', res.status);
    console.log('Login Data:', data);
  } catch (err) {
    console.error('Login Error:', err.message);
  }
}

testLogin();

