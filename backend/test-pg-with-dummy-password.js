// Test with a dummy password (trust will ignore it anyway)
import pg from 'pg';
const { Client } = pg;

console.log('Testing with dummy password (trust mode will ignore it)...\n');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'ifc_user',
  password: 'dummy', // ANY password, trust will ignore it
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
    console.log('\n🎉🎉🎉 SUCCESS! Trust authentication works with ANY password!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    client.end();
    process.exit(1);
  });
