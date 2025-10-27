// Test direct connection with pg library
import pg from 'pg';
const { Pool } = pg;

console.log('Testing PostgreSQL connection with pg library...\n');

// Test 1: With password
console.log('Test 1: Connection with password');
const pool1 = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'ifc_user',
  password: 'test123',
  database: 'ifc_openworld',
  ssl: false,
});

pool1.query('SELECT NOW() as now, version() as version')
  .then(result => {
    console.log('✅ SUCCESS with password!');
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version.substring(0, 50) + '...\n');
    return pool1.end();
  })
  .catch(err => {
    console.log('❌ FAILED with password');
    console.log('Error:', err.message, '\n');
    return pool1.end();
  })
  .then(() => {
    // Test 2: Without password (trust)
    console.log('Test 2: Connection without password (trust)');
    const pool2 = new Pool({
      host: '127.0.0.1',
      port: 5432,
      user: 'ifc_user',
      database: 'ifc_openworld',
      ssl: false,
    });

    return pool2.query('SELECT NOW() as now')
      .then(result => {
        console.log('✅ SUCCESS without password (trust works)!');
        console.log('Time:', result.rows[0].now, '\n');
        return pool2.end();
      })
      .catch(err => {
        console.log('❌ FAILED without password');
        console.log('Error:', err.message, '\n');
        return pool2.end();
      });
  })
  .then(() => {
    // Test 3: Connection string
    console.log('Test 3: Using connection string');
    const pool3 = new Pool({
      connectionString: 'postgresql://ifc_user:test123@127.0.0.1:5432/ifc_openworld',
      ssl: false,
    });

    return pool3.query('SELECT NOW() as now')
      .then(result => {
        console.log('✅ SUCCESS with connection string!');
        console.log('Time:', result.rows[0].now, '\n');
        return pool3.end();
      })
      .catch(err => {
        console.log('❌ FAILED with connection string');
        console.log('Error:', err.message, '\n');
        return pool3.end();
      });
  })
  .then(() => {
    console.log('All tests completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });