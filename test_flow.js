const fs = require('fs');
const dbPath = './backend/data/db.json';
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
