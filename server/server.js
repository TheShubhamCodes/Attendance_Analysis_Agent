/**
 * Server Root Entry Point
 * 
 * Direct entry point for running the server from the server directory (e.g., `node server.js`).
 * Forwards execution to src/server.js.
 */
const app = require('./src/server');

if (require.main === module) {
  if (typeof app.startServer === 'function') {
    app.startServer();
  }
}

module.exports = app;
