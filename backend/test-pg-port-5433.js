// Test with port 5433 (Docker mapped port)
import pg from 'pg';
const { Client } = pg;

console.log('Testing with port 5433 (Docker mapped port)...\n');

const client = new Client({
  host: '127.0.0.1',
  port: 5433,
  user: 'ifc_user',
  password: 'ifc_password',
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
    console.log('\n🎉🎉🎉 SUCCESS! Port 5433 connection works!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    client.end();
    process.exit(1);
  });
