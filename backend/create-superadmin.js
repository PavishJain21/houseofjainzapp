const bcrypt = require('bcryptjs');

const email = 'admin@example.com';
const password = 'Admin123!';

bcrypt.hash(password, 10).then(hash => {
  console.log('========================================');
  console.log('   SUPER ADMIN SETUP INSTRUCTIONS');
  console.log('========================================\n');
  
  console.log('OPTION 1 (Easiest - Recommended):');
  console.log('----------------------------------');
  console.log('1. Register a user in the app with:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('\n2. Then run this SQL in Supabase SQL Editor:');
  console.log(`UPDATE users SET role = 'superadmin' WHERE email = '${email}';\n`);
  
  console.log('OPTION 2 (Direct Database Insert):');
  console.log('-----------------------------------');
  console.log('Run this SQL in Supabase SQL Editor:');
  console.log(`INSERT INTO users (email, password, name, religion, role) VALUES ('${email}', '${hash}', 'Super Admin', 'Jain', 'superadmin');\n`);
  
  console.log('========================================');
  console.log('   LOGIN CREDENTIALS');
  console.log('========================================');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('\nAfter setup, login with these credentials to access admin dashboard!');
});

