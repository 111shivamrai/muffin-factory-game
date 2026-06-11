async function test() {
  try {
    const res = await fetch("https://muffin-factory-game-production.up.railway.app/api/auth/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@factory.com', password: 'muffin123' })
    });
    const data = await res.json();
    console.log("Login:", data);
    if(data.token) {
       const roomsRes = await fetch("https://muffin-factory-game-production.up.railway.app/api/rooms", {
         headers: { 'Authorization': 'Bearer ' + data.token }
       });
       console.log("Rooms:", await roomsRes.json());
    }
  } catch(e) {
    console.error(e.message);
  }
}
test();
