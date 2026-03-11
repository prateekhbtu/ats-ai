const fs = require('fs');
const content = fs.readFileSync('.dev.vars', 'utf-8');
console.log(content.split('\n').filter(line => line.includes('JWT')).join('\n'));
