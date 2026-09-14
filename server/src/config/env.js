const path = require('path');
// Load server/.env first, then root .env if running from workspace root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

// Ensure DIRECT_URL exists for Prisma schema when using Neon or standard Postgres
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_attendance_agent_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (NODE_ENV === 'production' && JWT_SECRET === 'fallback_secret_key_attendance_agent_2026') {
  console.warn('[Security Warning] JWT_SECRET is using the fallback default. Please set a custom JWT_SECRET in production environment variables.');
}

module.exports = {
  PORT,
  NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CORS_ORIGIN,
};
