async function run() {
  const { exec } = require('child_process');
  const serverProcess = exec('npm run start', { cwd: './backend' });
  
  await new Promise(r => setTimeout(r, 4000)); // wait for server

  try {
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'instructor@factory.com', password: 'muffin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const roomRes = await fetch('http://localhost:5001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Test Room', difficulty: 'beginner', tickRate: 10, maxDays: 30 })
    });
    const roomData = await roomRes.json();
    const code = roomData.code;
    console.log('Created Room Code:', code);

    const studentRes = await fetch('http://localhost:5001/api/auth/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student 1', roomCode: code })
    });
    const studentData = await studentRes.json();
    console.log('Student Join Response:', studentData);
  } catch (err) {
    console.error(err);
  }

  serverProcess.kill();
}
run();
