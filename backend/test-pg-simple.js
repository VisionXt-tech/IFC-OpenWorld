// Simplest possible test
import pg from 'pg';
const { Client } = pg;

console.log('Testing with Client (not Pool)...\n');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'ifc_user',
  database: 'ifc_openworld',
  // NO password - trust should work
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
    console.log('\n✅ All good! Database connection works!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Details:', err);
    client.end();
    process.exit(1);
  });