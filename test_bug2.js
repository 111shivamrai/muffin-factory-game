async function test() {
  const joinName = "mmm";
  const roomCode = "K7NESD";
  try {
    const res = await fetch("http://localhost:5001/api/auth/student-login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: joinName, roomCode: roomCode })
    });
    console.log(await res.json());
  } catch(e) {
    console.error(e.message);
  }
}
test();
