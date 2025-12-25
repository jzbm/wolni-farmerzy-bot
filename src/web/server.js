/**
 * Serwer webowy - panel zarządzania botem
 */
import express from 'express';
import session from 'express-session';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../config.js';
import { 
  initDatabase,
  createAppUser, 
  verifyAppUser, 
  getAppUser,
  addGameAccount, 
  getGameAccounts, 
  getGameAccount,
  updateGameAccount,
  deleteGameAccount,
  updateAutomationSettings,
  getFields,
  getActionLogs,
  getAccountStats,
  getPendingTasks,
  getStallSlotConfig,
  updateStallSlotConfig
} from '../database.js';
import { scheduler } from '../scheduler.js';
import { browserManager } from '../browser.js';
import { GameAuth } from '../modules/auth.js';
import { FarmModule } from '../modules/farm.js';
import { ForestryModule } from '../modules/forestry.js';
import { SawmillModule } from '../modules/sawmill.js';
import { MapModule } from '../modules/map.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Ustaw na true jeśli używasz HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 godziny
  }
}));

// Middleware sprawdzający czy użytkownik jest zalogowany
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Niezalogowany' });
  }
  next();
};

// ============ STRONY ============

app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(join(__dirname, 'public', 'login.html'));
  }
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

// ============ API AUTORYZACJI ============

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Podaj login i hasło' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć minimum 6 znaków' });
    }
    
    const result = createAppUser(username, password);
    req.session.userId = result.lastInsertRowid;
    
    res.json({ success: true, message: 'Konto utworzone' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Taki użytkownik już istnieje' });
    }
    res.status(500).json({ error: 'Błąd rejestracji' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = verifyAppUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }
    
    req.session.userId = user.id;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Błąd logowania' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = getAppUser(req.session.userId);
  res.json({ user });
});

// ============ API KONT GRY ============

app.get('/api/accounts', requireAuth, (req, res) => {
  try {
    const accounts = getGameAccounts(req.session.userId);
    // Ukryj hasła
    const safeAccounts = accounts.map(acc => ({
      ...acc,
      password: '********'
    }));
    res.json({ accounts: safeAccounts });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania kont' });
  }
});

app.post('/api/accounts', requireAuth, async (req, res) => {
  try {
    const { email, password, server } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Podaj email i hasło konta gry' });
    }
    
    const accountId = addGameAccount(req.session.userId, email, password, server || 1);
    res.json({ success: true, accountId });
  } catch (error) {
    res.status(500).json({ error: 'Błąd dodawania konta' });
  }
});

app.put('/api/accounts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    updateGameAccount(id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Błąd aktualizacji konta' });
  }
});

app.delete('/api/accounts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    // Zatrzymaj automatyzację jeśli działa
    await scheduler.stopAccountAutomation(id);
    
    deleteGameAccount(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Błąd usuwania konta' });
  }
});

// ============ API USTAWIEŃ AUTOMATYZACJI ============

app.put('/api/accounts/:id/settings', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    updateAutomationSettings(id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Błąd aktualizacji ustawień' });
  }
});

// ============ API AKCJI BOTA ============

app.post('/api/accounts/:id/test-login', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const session = await browserManager.getSession(account.email);
    const auth = new GameAuth(session, account);
    const success = await auth.login();
    
    res.json({ success, message: success ? 'Zalogowano pomyślnie' : 'Logowanie nie powiodło się' });
  } catch (error) {
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

// ============ OSOBNE MODUŁY ============

// Uruchom tylko FARMĘ
app.post('/api/accounts/:id/run-farm', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const session = await browserManager.getSession(account.email);
    const auth = new GameAuth(session, account);
    const loggedIn = await auth.ensureLoggedIn();
    
    if (!loggedIn) {
      await browserManager.closeSession(account.email);
      return res.status(500).json({ error: 'Nie udało się zalogować' });
    }
    
    const { FarmModule } = await import('../modules/farm.js');
    const farm = new FarmModule(session, account);
    const preferredPlants = JSON.parse(account.farm_preferred_plants || '["zboze"]');
    
    const results = await farm.fullFarmCycle({
      farms: [1, 2, 3, 4],
      harvest: true,
      plant: true,
      water: account.farm_auto_water,
      cropType: preferredPlants[0] || 'zboze',
    });
    
    // Zamknij przeglądarkę
    await browserManager.closeSession(account.email);
    FarmModule.resetCropSelection();
    
    res.json({ success: true, results });
  } catch (error) {
    try {
      const account = getGameAccount(req.params.id);
      if (account) await browserManager.closeSession(account.email);
    } catch (e) {}
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

// Pełny cykl (wszystkie moduły)
app.post('/api/accounts/:id/run-cycle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const results = await scheduler.runFullCycle(parseInt(id));
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

// Uruchom tylko TARTAK
app.post('/api/accounts/:id/run-forestry', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    // Uruchom cykl tartaku
    const session = await browserManager.getSession(account.email);
    const auth = new GameAuth(session, account);
    const loggedIn = await auth.ensureLoggedIn();
    
    if (!loggedIn) {
      await browserManager.closeSession(account.email);
      return res.status(500).json({ error: 'Nie udało się zalogować' });
    }
    
    const forestry = new ForestryModule(session, account);
    const results = await forestry.fullForestryCycle({
      harvestTrees: true,
      plantTrees: true,
      waterTrees: true,
      preferredTreeType: account.forestry_preferred_tree || 'swierk',
      startProduction: true,
      productionBuildings: [1, 2],
    });
    
    // Zamknij przeglądarkę po zakończeniu
    await browserManager.closeSession(account.email);
    
    res.json({ success: true, results });
  } catch (error) {
    // Zamknij przeglądarkę przy błędzie
    try {
      const account = getGameAccount(req.params.id);
      if (account) await browserManager.closeSession(account.email);
    } catch (e) {}
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

// Uruchom tylko STRAGANY
app.post('/api/accounts/:id/run-stalls', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const session = await browserManager.getSession(account.email);
    const auth = new GameAuth(session, account);
    const loggedIn = await auth.ensureLoggedIn();
    
    if (!loggedIn) {
      await browserManager.closeSession(account.email);
      return res.status(500).json({ error: 'Nie udało się zalogować' });
    }
    
    const { StallsModule } = await import('../modules/stalls.js');
    const stalls = new StallsModule(session, account);
    const results = await stalls.runCycle();
    
    // Zamknij przeglądarkę
    await browserManager.closeSession(account.email);
    
    res.json({ success: true, results });
  } catch (error) {
    try {
      const account = getGameAccount(req.params.id);
      if (account) await browserManager.closeSession(account.email);
    } catch (e) {}
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

app.post('/api/accounts/:id/start-automation', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    await scheduler.startAccountAutomation(parseInt(id));
    res.json({ success: true, message: 'Automatyzacja uruchomiona' });
  } catch (error) {
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

app.post('/api/accounts/:id/stop-automation', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    await scheduler.stopAccountAutomation(parseInt(id));
    res.json({ success: true, message: 'Automatyzacja zatrzymana' });
  } catch (error) {
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

// ============ API DANYCH ============

// Pobierz konfigurację slotów straganów
app.get('/api/accounts/:id/stalls-config', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const configStr = getStallSlotConfig(id);
    const config = configStr ? JSON.parse(configStr) : null;
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania konfiguracji straganów' });
  }
});

// Zapisz konfigurację slotów straganów
app.post('/api/accounts/:id/stalls-config', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    updateStallSlotConfig(id, config);
    res.json({ success: true, message: 'Konfiguracja zapisana' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd zapisywania konfiguracji straganów' });
  }
});

// Pobierz live status gry (stragany, pola, budynki)
app.get('/api/accounts/:id/game-status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const session = await browserManager.getSession(account.email);
    const auth = new GameAuth(session, account);
    const loggedIn = await auth.ensureLoggedIn();
    
    if (!loggedIn) {
      await browserManager.closeSession(account.email);
      return res.status(500).json({ error: 'Nie udało się zalogować' });
    }
    
    // Pobierz status straganów
    const { StallsModule } = await import('../modules/stalls.js');
    const stalls = new StallsModule(session, account);
    const stallsStatus = await stalls.getAllStallsStatus();
    
    // Pobierz status pól z bazy
    const fields = getFields(id);
    
    // Zamknij przeglądarkę
    await browserManager.closeSession(account.email);
    
    res.json({ 
      stallsStatus,
      fields,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    try {
      const account = getGameAccount(req.params.id);
      if (account) await browserManager.closeSession(account.email);
    } catch (e) {}
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

app.get('/api/accounts/:id/fields', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const fields = getFields(id, type);
    res.json({ fields });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania pól' });
  }
});

app.get('/api/accounts/:id/stats', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const stats = getAccountStats(id);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania statystyk' });
  }
});

app.get('/api/accounts/:id/logs', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const logs = getActionLogs(id, parseInt(limit) || 100);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania logów' });
  }
});

app.get('/api/scheduler/status', requireAuth, (req, res) => {
  const status = scheduler.getStatus();
  res.json(status);
});

// ============ WEBSOCKET ============

io.on('connection', (socket) => {
  logger.debug('Nowe połączenie WebSocket');
  
  socket.on('subscribe', (accountId) => {
    socket.join(`account_${accountId}`);
  });
  
  socket.on('disconnect', () => {
    logger.debug('Rozłączono WebSocket');
  });
});

// Funkcja do wysyłania aktualizacji
export function sendUpdate(accountId, type, data) {
  io.to(`account_${accountId}`).emit('update', { type, data });
}

// ============ START SERWERA ============

export function startServer() {
  // Inicjalizuj bazę danych
  initDatabase();
  
  // Uruchom scheduler
  scheduler.start();
  
  httpServer.listen(config.port, () => {
    logger.info(`Serwer webowy uruchomiony na http://localhost:${config.port}`);
  });
}

export default app;
