async function test() {
  try {
    const res = await fetch("https://muffin-factory-game-production.up.railway.app/api/auth/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aryajain1906@gmail.com', password: '@Aryajain19' })
    });
    const data = await res.json();
    console.log("Login:", data);
    if(data.token) {
       const roomsRes = await fetch("https://muffin-factory-game-production.up.railway.app/api/rooms", {
         headers: { 'Authorization': 'Bearer ' + data.token }
       });
       const rooms = await roomsRes.json();
       console.log("Rooms:", rooms);
       
       const login2 = await fetch("https://muffin-factory-game-production.up.railway.app/api/auth/student-login", {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ name: 'mmm', roomCode: 'K7NESD' })
       });
       console.log("Student Login:", await login2.json());
    }
  } catch(e) {
    console.error(e.message);
  }
}
test();
