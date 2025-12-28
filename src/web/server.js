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
  updateStallSlotConfig,
  getForestryBuildingConfig,
  updateForestryBuildingConfig,
  getFarmConfig,
  updateFarmConfig,
  getSchedulerConfig,
  updateSchedulerConfig,
  saveGameStatusCache,
  getGameStatusCache,
  getAllAppSettings,
  setAppSetting,
  isHeadlessMode,
  setHeadlessMode,
  getActiveSchedulerConfigs,
  setSchedulerActive
} from '../database.js';
import { scheduler, ModuleType, setNotificationEmitters } from '../simple-scheduler.js';
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

// Pobierz pojedyncze konto
app.get('/api/accounts/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    // Ukryj hasło
    const safeAccount = {
      ...account,
      password: '********'
    };
    
    res.json({ account: safeAccount });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania konta' });
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
    await scheduler.deactivateAccount(id);
    
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
    
    // Pobierz informacje o graczu (premium, pieniądze)
    const playerInfo = await auth.getPlayerInfo();
    
    const { FarmModule } = await import('../modules/farm.js');
    const farm = new FarmModule(session, account, playerInfo);
    
    // cropType = null -> fullFarmCycle pobierze konfigurację per farma z bazy danych
    const results = await farm.fullFarmCycle({
      farms: [1, 2, 3, 4],
      harvest: true,
      plant: true,
      water: true,
    });
    
    // Zamknij przeglądarkę
    await browserManager.closeSession(account.email);
    FarmModule.resetCropSelection();
    
    res.json({ success: true, results, playerInfo });
  } catch (error) {
    try {
      const account = getGameAccount(req.params.id);
      if (account) await browserManager.closeSession(account.email);
    } catch (e) {}
    res.status(500).json({ error: `Błąd: ${error.message}` });
  }
});

// Dodaj wszystkie moduły do kolejki
app.post('/api/accounts/:id/run-cycle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    // Dodaj wszystkie włączone moduły do kolejki
    if (account.farm_enabled) {
      scheduler.runModule(parseInt(id), ModuleType.FARM);
    }
    if (account.forestry_enabled) {
      scheduler.runModule(parseInt(id), ModuleType.FORESTRY);
    }
    if (account.stalls_enabled) {
      scheduler.runModule(parseInt(id), ModuleType.STALLS);
    }
    
    res.json({ success: true, message: 'Moduły dodane do kolejki' });
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
    
    // Pobierz konfigurację tartaku
    const buildingConfigStr = getForestryBuildingConfig(id);
    const buildingConfig = buildingConfigStr ? JSON.parse(buildingConfigStr) : null;
    
    // Mapuj nazwę drzewa na ID
    const treeNameToId = {
      'swierk': 1, 'świerk': 1,
      'brzoza': 2,
      'buk': 3,
      'topola': 4,
      'kasztan': 5,
      'dab': 7, 'dąb': 7,
      'jesion': 8,
      'klon': 9,
      'wierzba': 10,
    };
    const preferredTreeName = account.forestry_preferred_tree || 'swierk';
    const preferredTreeId = treeNameToId[preferredTreeName.toLowerCase()] || 1;
    
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
      harvestTrees: account.forestry_auto_harvest !== false,
      plantTrees: account.forestry_auto_plant !== false,
      waterTrees: account.forestry_auto_water !== false,
      preferredTreeId: preferredTreeId,
      manageBuildings: account.forestry_auto_production !== false,
      buildingConfig: buildingConfig,
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
    
    await scheduler.activateAccount(parseInt(id));
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
    
    await scheduler.deactivateAccount(parseInt(id));
    
    // Zapisz że harmonogram jest nieaktywny
    setSchedulerActive(parseInt(id), false);
    
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

// Pobierz konfigurację tartaku
app.get('/api/accounts/:id/forestry-config', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const configStr = getForestryBuildingConfig(id);
    const config = configStr ? JSON.parse(configStr) : null;
    const preferredTree = account.forestry_preferred_tree || 'swierk';
    res.json({ config, preferredTree });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania konfiguracji tartaku' });
  }
});

// Zapisz konfigurację tartaku
app.post('/api/accounts/:id/forestry-config', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { config, preferredTree } = req.body;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    if (config) {
      updateForestryBuildingConfig(id, config);
    }
    if (preferredTree) {
      updateAutomationSettings(id, { forestry_preferred_tree: preferredTree });
    }
    res.json({ success: true, message: 'Konfiguracja tartaku zapisana' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd zapisywania konfiguracji tartaku' });
  }
});

// Pobierz konfigurację farmy (rośliny per farma)
app.get('/api/accounts/:id/farm-config', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const configStr = getFarmConfig(id);
    const config = configStr ? JSON.parse(configStr) : {
      farm1: 'zboze',
      farm2: 'zboze',
      farm3: 'zboze',
      farm4: 'zboze'
    };
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania konfiguracji farmy' });
  }
});

// Zapisz konfigurację farmy (rośliny per farma)
app.post('/api/accounts/:id/farm-config', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    if (config) {
      updateFarmConfig(id, config);
    }
    res.json({ success: true, message: 'Konfiguracja farmy zapisana' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd zapisywania konfiguracji farmy' });
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
    
    // Pobierz informacje o graczu (poziom, pieniądze)
    const playerInfo = await auth.getPlayerInfo();
    
    // Pobierz informacje o odblokowanych funkcjach z mapy
    const unlockedFeatures = await auth.getUnlockedFeatures();
    
    // Pobierz status straganów tylko jeśli odblokowane
    let stallsStatus = [];
    if (unlockedFeatures.stalls) {
      const { StallsModule } = await import('../modules/stalls.js');
      const stalls = new StallsModule(session, account);
      stallsStatus = await stalls.getAllStallsStatus();
    }
    
    // Pobierz live status pól z gry - tylko dla odblokowanych farm
    const farm = new FarmModule(session, account, playerInfo);
    const unlockedFarmNumbers = Object.entries(unlockedFeatures.farms)
      .filter(([num, unlocked]) => unlocked)
      .map(([num]) => parseInt(num));
    const fieldsStatus = await farm.getAllFieldsStatus(unlockedFarmNumbers);
    
    // Pobierz status tartaku tylko jeśli odblokowany
    let forestryStatus = { trees: [], building1: null, building2: null };
    if (unlockedFeatures.forestry) {
      const { ForestryModule } = await import('../modules/forestry.js');
      const forestry = new ForestryModule(session, account);
      forestryStatus = await forestry.getForestryStatus();
    }
    
    // Zamknij przeglądarkę
    await browserManager.closeSession(account.email);
    
    // Zapisz do cache w bazie danych (dla smart mode)
    try {
      saveGameStatusCache(parseInt(id), { fieldsStatus, stallsStatus, forestryStatus, playerInfo, unlockedFeatures });
    } catch (e) {
      console.error('Błąd zapisu cache statusu:', e);
    }
    
    res.json({ 
      stallsStatus,
      fieldsStatus,
      forestryStatus,
      playerInfo,
      unlockedFeatures,
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

// Pobierz cache statusu gry z bazy (bez uruchamiania przeglądarki)
app.get('/api/accounts/:id/game-status-cache', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const account = getGameAccount(id);
    
    if (!account || account.app_user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Konto nie znalezione' });
    }
    
    const cache = getGameStatusCache(parseInt(id));
    
    if (!cache) {
      return res.status(404).json({ error: 'Brak cache' });
    }
    
    // Zwróć unlockedFeatures tylko jeśli był zapisany w cache (nie domyślna wartość)
    // null oznacza "brak danych" - dashboard powinien pokazać wszystkie sekcje
    res.json({
      fieldsStatus: cache.fieldsStatus,
      stallsStatus: cache.stallsStatus,
      forestryStatus: cache.forestryStatus,
      playerInfo: cache.playerInfo || { level: 1, gold: 0, cash: 0, name: '' },
      unlockedFeatures: cache.unlockedFeatures, // może być null
      updatedAt: cache.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Pobierz kolejkę zadań dla konta
app.get('/api/scheduler/accounts/:id/queue', requireAuth, (req, res) => {
  const { id } = req.params;
  const queue = scheduler.getAccountTaskQueue(parseInt(id));
  res.json({ queue });
});

// Pobierz konfigurację harmonogramu z bazy
app.get('/api/scheduler/accounts/:id/config', requireAuth, (req, res) => {
  const { id } = req.params;
  try {
    const config = getSchedulerConfig(parseInt(id));
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aktywuj konto z interwałami per moduł
app.post('/api/scheduler/accounts/:id/activate', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { farmInterval, forestryInterval, stallsInterval, smartMode, cacheInterval } = req.body;
  
  try {
    // Zapisz konfigurację do bazy (z active=true)
    updateSchedulerConfig(parseInt(id), {
      farmInterval: farmInterval || 0,
      forestryInterval: forestryInterval || 0,
      stallsInterval: stallsInterval || 0,
      smartMode: smartMode || false,
      active: true,
      cacheInterval: cacheInterval || 60
    });
    
    // Aktywuj w schedulerze
    await scheduler.activateAccount(parseInt(id), {
      farmInterval: farmInterval || 0,
      forestryInterval: forestryInterval || 0,
      stallsInterval: stallsInterval || 0,
      smartMode: smartMode || false,
      cacheInterval: cacheInterval || 60
    });
    res.json({ success: true, message: 'Konto aktywowane' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Uruchom pojedynczy moduł
app.post('/api/scheduler/accounts/:id/run-module', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { moduleType } = req.body;
  
  if (!moduleType || !Object.values(ModuleType).includes(moduleType)) {
    return res.status(400).json({ error: 'Nieprawidłowy typ modułu' });
  }
  
  try {
    scheduler.runModule(parseInt(id), moduleType);
    res.json({ success: true, message: `Moduł ${moduleType} dodany do kolejki` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USTAWIENIA APLIKACJI ============

// Pobierz wszystkie ustawienia aplikacji
app.get('/api/settings', requireAuth, (req, res) => {
  try {
    const settings = getAllAppSettings();
    res.json({ 
      headlessMode: settings.headless_mode === 'true',
      browserTimeout: parseInt(settings.browser_timeout) || 30000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Zaktualizuj ustawienia aplikacji
app.post('/api/settings', requireAuth, (req, res) => {
  try {
    const { headlessMode, browserTimeout } = req.body;
    
    if (typeof headlessMode === 'boolean') {
      setHeadlessMode(headlessMode);
    }
    
    if (browserTimeout) {
      setAppSetting('browser_timeout', String(browserTimeout));
    }
    
    res.json({ 
      success: true, 
      message: 'Ustawienia zapisane. Zmiany zostaną zastosowane przy następnym uruchomieniu przeglądarki.' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ WEBSOCKET ============

io.on('connection', (socket) => {
  logger.debug('Nowe połączenie WebSocket');
  
  socket.on('subscribe', (accountId) => {
    socket.join(`account_${accountId}`);
    socket.join('global'); // Subskrybuj też kanał globalny
    logger.debug(`Socket subskrybuje konto ${accountId}`);
  });
  
  socket.on('disconnect', () => {
    logger.debug('Rozłączono WebSocket');
  });
});

// Funkcja do wysyłania aktualizacji
export function sendUpdate(accountId, type, data) {
  io.to(`account_${accountId}`).emit('update', { type, data });
}

// Funkcja do wysyłania powiadomień o uruchomieniu modułu
export function emitModuleStarted(accountId, accountEmail, module, message = null) {
  const data = { accountId, accountEmail, module, message, timestamp: new Date().toISOString() };
  io.to(`account_${accountId}`).emit('module_started', data);
  io.to('global').emit('module_started', data);
  logger.info(`📢 Powiadomienie: ${accountEmail} - moduł ${module} uruchomiony`);
}

// Funkcja do wysyłania powiadomień o zakończeniu modułu
export function emitModuleCompleted(accountId, accountEmail, module, results = null) {
  const data = { accountId, accountEmail, module, results, timestamp: new Date().toISOString() };
  io.to(`account_${accountId}`).emit('module_completed', data);
  io.to('global').emit('module_completed', data);
  logger.info(`✅ Powiadomienie: ${accountEmail} - moduł ${module} zakończony`);
}

// Funkcja do wysyłania powiadomień o błędzie modułu
export function emitModuleError(accountId, accountEmail, module, error) {
  const data = { accountId, accountEmail, module, error, timestamp: new Date().toISOString() };
  io.to(`account_${accountId}`).emit('module_error', data);
  io.to('global').emit('module_error', data);
  logger.error(`❌ Powiadomienie: ${accountEmail} - błąd ${module}: ${error}`);
}

// ============ START SERWERA ============

export async function startServer() {
  // Inicjalizuj bazę danych
  initDatabase();
  
  // Skonfiguruj emittery powiadomień dla schedulera
  setNotificationEmitters(emitModuleStarted, emitModuleCompleted, emitModuleError);
  
  // Uruchom scheduler
  scheduler.start();
  
  // Reaktywuj zapisane harmonogramy
  await reactivateSavedSchedulers();
  
  httpServer.listen(config.port, () => {
    logger.info(`Serwer webowy uruchomiony na http://localhost:${config.port}`);
  });
}

/**
 * Reaktywuje harmonogramy które były aktywne przed restartem
 */
async function reactivateSavedSchedulers() {
  try {
    const activeConfigs = getActiveSchedulerConfigs();
    
    if (activeConfigs.length === 0) {
      logger.info('Brak zapisanych aktywnych harmonogramów do reaktywacji');
      return;
    }
    
    logger.info(`Reaktywacja ${activeConfigs.length} zapisanych harmonogramów...`);
    
    for (const config of activeConfigs) {
      try {
        await scheduler.activateAccount(config.account_id, {
          farmInterval: config.scheduler_farm_interval,
          forestryInterval: config.scheduler_forestry_interval,
          stallsInterval: config.scheduler_stalls_interval,
          smartMode: config.scheduler_smart_mode === 1,
          cacheInterval: config.scheduler_cache_interval || 60
        });
        logger.info(`✅ Reaktywowano harmonogram dla: ${config.email}`);
      } catch (error) {
        logger.error(`❌ Błąd reaktywacji dla ${config.email}: ${error.message}`);
      }
    }
    
    logger.info('Reaktywacja harmonogramów zakończona');
  } catch (error) {
    logger.error(`Błąd podczas reaktywacji harmonogramów: ${error.message}`);
  }
}

export default app;
