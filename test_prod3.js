async function test() {
  try {
    const res = await fetch("https://muffin-factory-game-production.up.railway.app/api/auth/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aryajain1906@gmail.com', password: '@Aryajain19' })
    });
    const data = await res.json();
    if(data.token) {
       const roomsRes = await fetch("https://muffin-factory-game-production.up.railway.app/api/rooms", {
         headers: { 'Authorization': 'Bearer ' + data.token }
       });
       const rooms = await roomsRes.json();
       console.log("Rooms:", JSON.stringify(rooms, null, 2));
    }
  } catch(e) {
    console.error(e.message);
  }
}
test();
