const net = require('net');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

let pgInstance = null;

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function ensureDatabaseExists(databaseUrl) {
  try {
    const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
    const user = url.username || 'postgres';
    const password = url.password || 'postgres';
    const host = url.hostname || '127.0.0.1';
    const port = parseInt(url.port || '5432', 10);
    const dbName = (url.pathname || '/attendance_agent_db').replace('/', '');

    const client = new Client({
      user,
      password,
      host,
      port,
      database: 'postgres',
    });

    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[DB Runner] Database "${dbName}" created successfully.`);
    } else {
      console.log(`[DB Runner] Database "${dbName}" already exists.`);
    }

    await client.end();
  } catch (err) {
    console.warn(`[DB Runner] Could not ensure database exists: ${err.message}`);
  }
}

async function startDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isProduction = process.env.NODE_ENV === 'production';
  const isRemote = dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

  if (isProduction || isRemote) {
    console.log('[DB Runner] Running in cloud/remote PostgreSQL mode. Skipping embedded-postgres.');
    try {
      const prisma = require('../config/db');
      await prisma.$connect();
      console.log('[DB Runner] Database connection successfully established via Prisma.');
    } catch (err) {
      console.warn(`[DB Runner] Note: Remote database connection test yielded: ${err.message}`);
    }
    return;
  }

  const localDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendance_agent_db?schema=public';
  const port = 5432;
  const isRunning = await checkPort(port);

  if (isRunning) {
    console.log(`[DB Runner] PostgreSQL is already running on port ${port}. Using active database.`);
    await ensureDatabaseExists(localDbUrl);
    return;
  }

  console.log(`[DB Runner] No active PostgreSQL found on port ${port}. Starting embedded PostgreSQL 18.4...`);
  
  const EmbeddedPostgres = require('embedded-postgres').default;
  const dataDir = path.resolve(__dirname, '../../pg_data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  pgInstance = new EmbeddedPostgres({
    port,
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await pgInstance.initialise();
  } catch (err) {
    // Cluster may already be initialized in dataDir
  }

  await pgInstance.start();
  console.log(`[DB Runner] Embedded PostgreSQL started successfully on port ${port}.`);

  await ensureDatabaseExists(localDbUrl);

  process.on('SIGINT', async () => {
    if (pgInstance) {
      console.log('[DB Runner] Shutting down embedded PostgreSQL...');
      await pgInstance.stop();
    }
    process.exit(0);
  });
}

if (require.main === module) {
  require('dotenv').config();
  startDatabase().then(() => {
    console.log('[DB Runner] Database is ready for Prisma queries.');
    if (process.argv.includes('--init-and-exit')) {
      process.exit(0);
    }
  }).catch((err) => {
    console.error('[DB Runner] Error starting database:', err);
    process.exit(1);
  });
}

module.exports = { startDatabase, checkPort, ensureDatabaseExists };
