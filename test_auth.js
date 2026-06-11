const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./backend/data/db.json', 'utf8'));
const admin = db.users.find(u => u.email === 'aryajain1906@gmail.com');
console.log(admin);
