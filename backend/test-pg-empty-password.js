// Test with empty password string
import pg from 'pg';
const { Client } = pg;

console.log('Testing with empty password string...\n');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'ifc_user',
  password: '', // Empty string instead of undefined
  database: 'ifc_openworld',
});

client.connect()
  .then(() => {
    console.log('✅ Connected!');
    return client.query('SELECT NOW() as now, version() as version');
  })
  .then(result => {
    console.log('✅ Query successful!');
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version.substring(0, 60));
    return client.end();
  })
  .then(() => {
    console.log('\n🎉 SUCCESS! Empty password works with trust authentication!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    client.end();
    process.exit(1);
  });