/**
 * PM2 Configuration - Wolni Farmerzy Bot
 * 
 * Uruchom: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [{
    name: 'wf-bot',
    script: 'src/index.js',
    
    // Automatyczny restart przy crashu
    autorestart: true,
    
    // Obserwuj pliki i restartuj przy zmianach (wyłącz na produkcji)
    watch: false,
    
    // Maksymalna ilość pamięci przed restartem (opcjonalne)
    max_memory_restart: '1G',
    
    // Środowisko produkcyjne
    env: {
      NODE_ENV: 'production',
      APP_PORT: 3000,
    },
    
    // Logi
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // Restart policy
    exp_backoff_restart_delay: 100,
    
    // Czas oczekiwania przed uznaniem za uruchomiony
    min_uptime: '10s',
    
    // Maksymalna liczba restartów przy ciągłych crashach
    max_restarts: 10,
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Interpretor Node.js
    interpreter: 'node',
    interpreter_args: '--experimental-specifier-resolution=node',
  }]
};
