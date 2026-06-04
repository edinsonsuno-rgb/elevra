const fs = require('fs');
const p = 'package.json';
let s = fs.readFileSync(p,'utf8');
const old = '"build": "tsc && vite build"';
const neu = '"build": "npx tsc && npx vite build"';
if (s.includes(neu)) { console.log('already'); process.exit(0); }
if (!s.includes(old)) { console.error('pattern not found'); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p,s,'utf8');
console.log('patched');
