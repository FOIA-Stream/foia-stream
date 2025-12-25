/**
 * @file Server Entry Point
 * @module api
 * @author FOIA Stream Team
 * @description Main entry point for the FOIA Stream API server.
 *              Initializes the Bun HTTP server and schedules background jobs
 *              like data retention in production environments.
 *
 * @example
 * ```bash
 * # Development
 * bun run dev
 *
 * # Production
 * bun run start
 * ```
 */

// ============================================
// FOIA Stream - Server Entry Point
// ============================================

import app from './src/app';
import { env } from './src/config/env';
import { getRetentionStats, runDataRetention } from './src/services/data-retention.service';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗ ██████╗ ██╗ █████╗     ███████╗████████╗      ║
║   ██╔════╝██╔═══██╗██║██╔══██╗    ██╔════╝╚══██╔══╝      ║
║   █████╗  ██║   ██║██║███████║    ███████╗   ██║         ║
║   ██╔══╝  ██║   ██║██║██╔══██║    ╚════██║   ██║         ║
║   ██║     ╚██████╔╝██║██║  ██║    ███████║   ██║         ║
║   ╚═╝      ╚═════╝ ╚═╝╚═╝  ╚═╝    ╚══════╝   ╚═╝         ║
║                                                           ║
║   Transparency & Audit Application for Public Records     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

console.log(`🚀 Starting FOIA Stream server...`);
console.log(`📍 Environment: ${env.NODE_ENV}`);
console.log(`🌐 Host: ${env.HOST}`);
console.log(`🔌 Port: ${env.PORT}`);

// Start server using Bun
export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};

console.log(`\n✅ Server running at http://${env.HOST}:${env.PORT}`);
console.log(`📚 API available at http://${env.HOST}:${env.PORT}/api/v1`);
console.log(`\n📖 Available endpoints:`);
console.log(`   GET  /                    - API info`);
console.log(`   GET  /health              - Health check`);
console.log(`   POST /api/v1/auth/register    - Create account`);
console.log(`   POST /api/v1/auth/login       - Login`);
console.log(`   GET  /api/v1/requests         - Search FOIA requests`);
console.log(`   POST /api/v1/requests         - Create FOIA request`);
console.log(`   GET  /api/v1/agencies         - Search agencies`);
console.log(`   GET  /api/v1/templates        - Get request templates`);

// Schedule data retention job (runs daily in production)
if (env.NODE_ENV === 'production') {
  const RETENTION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    console.log('🗑️  Running scheduled data retention...');
    try {
      const report = await runDataRetention(false);
      console.log(`✅ Data retention completed: ${report.totalPurged} items purged`);
    } catch (error) {
      console.error('❌ Data retention failed:', error);
    }
  }, RETENTION_INTERVAL);

  console.log(`\n🗓️  Data retention scheduled (every 24h)`);
}

// Log retention stats on startup
getRetentionStats()
  .then((stats) => {
    console.log(`\n📊 Data Retention Stats:`);
    console.log(`   Closed requests pending purge: ${stats.closedRequests.expiringCount}`);
    console.log(`   Inactive users pending purge: ${stats.inactiveUsers.eligibleForPurge}`);
    console.log(`   Expired sessions: ${stats.sessions.expiredCount}`);
    console.log(`   Old audit logs: ${stats.auditLogs.oldCount}`);
  })
  .catch(() => {
    // Silently ignore - database may not be initialized yet
  });
