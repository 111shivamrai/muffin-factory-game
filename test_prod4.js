async function test() {
  try {
    const login2 = await fetch("https://muffin-factory-game-production.up.railway.app/api/auth/student-login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'arya', roomCode: 'AN2A1S' })
    });
    console.log("Student Login AN2A1S:", await login2.json());
  } catch(e) {
    console.error(e.message);
  }
}
test();
