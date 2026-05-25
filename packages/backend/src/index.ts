import { serve } from '@hono/node-server';
import { ENV } from './env.js';
import { app } from './api/server.js';
import { startScheduler } from './dca/scheduler.js';
import { backendAccount } from './chain/client.js';
import { TESTNET_DEPLOYMENT } from '@ballast/shared';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚢 Ballast — agent backend');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Backend wallet : ${backendAccount.address}`);
  console.log(`AllocationDesk : ${TESTNET_DEPLOYMENT.allocationDesk ?? '(not deployed yet)'}`);
  console.log(`Port           : ${ENV.PORT}`);
  console.log('');

  // Start the autonomous DCA scheduler. With no plans, ticks are no-ops.
  startScheduler();

  serve(
    {
      fetch: app.fetch,
      port: ENV.PORT,
    },
    () => {
      console.log(`✓ HTTP ready: http://localhost:${ENV.PORT}/health`);
      console.log('');
    }
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
