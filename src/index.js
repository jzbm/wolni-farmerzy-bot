/**
 * Wolni Farmerzy Bot - Główny plik aplikacji
 */
import { startServer } from './web/server.js';
import logger from './logger.js';

// Obsługa zamknięcia
process.on('SIGINT', async () => {
  logger.info('Otrzymano SIGINT, zamykanie...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Otrzymano SIGTERM, zamykanie...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Nieobsłużony wyjątek: ${error.message}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Nieobsłużona obietnica: ${reason}`);
});

// Start
logger.info('='.repeat(50));
logger.info('Wolni Farmerzy Bot v1.0.0');
logger.info('='.repeat(50));

startServer();
