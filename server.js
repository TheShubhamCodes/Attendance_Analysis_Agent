/**
 * Repository Root Server Entry Point
 * 
 * Allows running `node server.js` directly from the project root.
 * Forwards execution to server/src/server.js.
 */
const app = require('./server/src/server');

if (require.main === module) {
  if (typeof app.startServer === 'function') {
    app.startServer();
  }
}

module.exports = app;
