const bcrypt = require('bcryptjs');

const hash = '$2a$10$LuVPxGypvNYiRtP0llh0Bel7blfjtbEtX.j2OoFZ6q1l7KuDLW25y';

console.log('Hash:', hash);
console.log('Length:', hash.length);
console.log('Starts with $2a$:', hash.startsWith('$2a$'));
console.log('First char:', hash[0], 'code:', hash.charCodeAt(0));

bcrypt.compare('newpassword123', hash).then(result => {
  console.log('Compare result:', result);
}).catch(err => {
  console.log('Error:', err);
});
