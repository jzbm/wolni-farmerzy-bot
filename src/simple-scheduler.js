/**
 * Simple Scheduler - Prosty system harmonogramu zadań
 * 
 * Zasady:
 * 1. Każdy moduł (farma, tartak, stragany) jest niezależny
 * 2. Każdy moduł ma swój własny interwał
 * 3. Kolejka zapewnia że tylko jeden moduł działa naraz
 * 4. Przeglądarka jest współdzielona między modułami
 * 5. Tryb inteligentny - analizuje cache i uruchamia moduły gdy coś jest gotowe
 */

import { browserManager } from './browser.js';
import { GameAuth } from './modules/auth.js';
import { FarmModule } from './modules/farm.js';
import { ForestryModule } from './modules/forestry.js';
import { StallsModule } from './modules/stalls.js';
import { 
  getGameAccounts, 
  getGameAccount,
  logAction,
  getForestryBuildingConfig,
  getGameStatusCache 
} from './database.js';
import logger from './logger.js';

// Funkcje do wysyłania powiadomień (będą zaimportowane z serwera)
let emitModuleStarted = null;
let emitModuleCompleted = null;
let emitModuleError = null;
let emitLevelUp = null;

/**
 * Ustawia funkcje emitowania powiadomień (wywoływane z serwera)
 */
export function setNotificationEmitters(startedFn, completedFn, errorFn, levelUpFn = null) {
  emitModuleStarted = startedFn;
  emitModuleCompleted = completedFn;
  emitModuleError = errorFn;
  emitLevelUp = levelUpFn;
  logger.info('📢 Emittery powiadomień skonfigurowane');
}

/**
 * Typy modułów
 */
export const ModuleType = {
  FARM: 'farm',
  FORESTRY: 'forestry',
  STALLS: 'stalls',
};

/**
 * Prosty Scheduler
 */
class SimpleScheduler {
  constructor() {
    this.isRunning = false;
    this.activeAccounts = new Map(); // accountId -> AccountSchedule
    this.taskQueue = []; // Globalna kolejka zadań
    this.isProcessing = false; // Czy aktualnie przetwarzamy zadanie
    this.currentTask = null; // Aktualnie wykonywane zadanie
    this.queueInterval = null; // Interwał przetwarzania kolejki
    this.smartModeInterval = null; // Interwał sprawdzania smart mode
    this.stats = new Map(); // accountId -> { farm: {success, error, lastSuccess, lastError}, ... }
  }

  /**
   * Inicjalizuje statystyki dla konta
   */
  initAccountStats(accountId) {
    if (!this.stats.has(accountId)) {
      this.stats.set(accountId, {
        farm: { success: 0, error: 0, lastSuccess: null, lastError: null },
        forestry: { success: 0, error: 0, lastSuccess: null, lastError: null },
        stalls: { success: 0, error: 0, lastSuccess: null, lastError: null },
      });
    }
  }

  /**
   * Aktualizuje statystyki po wykonaniu zadania
   */
  updateStats(accountId, moduleType, success) {
    this.initAccountStats(accountId);
    const accountStats = this.stats.get(accountId);
    if (accountStats && accountStats[moduleType]) {
      if (success) {
        accountStats[moduleType].success++;
        accountStats[moduleType].lastSuccess = new Date();
      } else {
        accountStats[moduleType].error++;
        accountStats[moduleType].lastError = new Date();
      }
    }
  }

  /**
   * Pobiera statystyki dla konta
   */
  getAccountStats(accountId) {
    this.initAccountStats(accountId);
    return this.stats.get(accountId);
  }

  /**
   * Uruchamia scheduler
   */
  start() {
    if (this.isRunning) return;
    
    logger.info('🚀 Uruchamianie Simple Scheduler...');
    this.isRunning = true;
    
    // Przetwarzaj kolejkę co 5 sekund
    this.queueInterval = setInterval(() => {
      this.processQueue();
    }, 5000);
    
    // Sprawdzaj smart mode co 30 sekund
    this.smartModeInterval = setInterval(() => {
      this.checkSmartMode();
    }, 30000);
    
    logger.info('✅ Simple Scheduler uruchomiony');
  }

  /**
   * Zatrzymuje scheduler
   */
  async stop() {
    logger.info('🛑 Zatrzymywanie Simple Scheduler...');
    this.isRunning = false;
    
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
    
    if (this.smartModeInterval) {
      clearInterval(this.smartModeInterval);
      this.smartModeInterval = null;
    }
    
    // Wyczyść wszystkie interwały kont
    for (const [accountId, schedule] of this.activeAccounts) {
      this.clearAccountIntervals(schedule);
    }
    this.activeAccounts.clear();
    
    // Zamknij wszystkie przeglądarki
    const accounts = getGameAccounts();
    for (const account of accounts) {
      try {
        await browserManager.closeSession(account.email);
      } catch (e) {}
    }
    
    logger.info('✅ Simple Scheduler zatrzymany');
  }

  /**
   * Aktywuje konto - uruchamia interwały dla włączonych modułów
   * @param {number} accountId 
   * @param {object} options - { farmInterval, forestryInterval, stallsInterval, smartMode } w minutach
   */
  async activateAccount(accountId, options = {}) {
    const account = getGameAccount(accountId);
    if (!account) {
      throw new Error(`Nie znaleziono konta ${accountId}`);
    }

    logger.info(`🔓 Aktywacja konta: ${account.email}`);

    // Jeśli już aktywne, najpierw dezaktywuj
    if (this.activeAccounts.has(accountId)) {
      await this.deactivateAccount(accountId);
    }

    // Interwały w ms (domyślnie 30 min, 0 = wyłączony)
    const farmIntervalMs = (options.farmInterval || 0) * 60 * 1000;
    const forestryIntervalMs = (options.forestryInterval || 0) * 60 * 1000;
    const stallsIntervalMs = (options.stallsInterval || 0) * 60 * 1000;
    const smartMode = options.smartMode || false;
    const cacheInterval = options.cacheInterval || 60; // sekundy

    // Utwórz harmonogram dla konta
    const schedule = {
      accountId,
      email: account.email,
      intervals: {},
      intervalValues: {
        farm: options.farmInterval || 0,
        forestry: options.forestryInterval || 0,
        stalls: options.stallsInterval || 0,
      },
      smartMode: smartMode,
      cacheInterval: cacheInterval,
      lastRun: {},
      lastSmartCheck: {},
    };

    this.activeAccounts.set(accountId, schedule);

    // FARMA - jeśli ma interwał > 0
    if (farmIntervalMs > 0) {
      this.addToQueue(accountId, ModuleType.FARM);
      schedule.intervals.farm = setInterval(() => {
        this.addToQueue(accountId, ModuleType.FARM);
      }, farmIntervalMs);
      logger.info(`  🌾 Farma: interwał ${options.farmInterval} min`);
    }

    // TARTAK - jeśli ma interwał > 0
    if (forestryIntervalMs > 0) {
      this.addToQueue(accountId, ModuleType.FORESTRY);
      schedule.intervals.forestry = setInterval(() => {
        this.addToQueue(accountId, ModuleType.FORESTRY);
      }, forestryIntervalMs);
      logger.info(`  🌲 Tartak: interwał ${options.forestryInterval} min`);
    }

    // STRAGANY - jeśli mają interwał > 0
    if (stallsIntervalMs > 0) {
      this.addToQueue(accountId, ModuleType.STALLS);
      schedule.intervals.stalls = setInterval(() => {
        this.addToQueue(accountId, ModuleType.STALLS);
      }, stallsIntervalMs);
      logger.info(`  🏪 Stragany: interwał ${options.stallsInterval} min`);
    }

    // Smart mode
    if (smartMode) {
      logger.info(`  🧠 Tryb inteligentny: WŁĄCZONY (sprawdzanie co ${cacheInterval}s)`);
      // Sprawdź natychmiast przy uruchomieniu
      setTimeout(() => this.checkSmartModeForAccount(accountId), 2000);
    }

    // Sprawdź czy cokolwiek zostało aktywowane
    const hasAnyInterval = farmIntervalMs > 0 || forestryIntervalMs > 0 || stallsIntervalMs > 0;
    if (!hasAnyInterval && !smartMode) {
      logger.warn(`⚠️ Konto ${account.email} - żaden moduł nie ma ustawionego interwału i tryb inteligentny wyłączony`);
    }

    logger.info(`✅ Konto ${account.email} aktywowane`);
  }

  /**
   * Dezaktywuje konto
   */
  async deactivateAccount(accountId) {
    const schedule = this.activeAccounts.get(accountId);
    if (!schedule) return;

    logger.info(`🔒 Dezaktywacja konta: ${schedule.email}`);

    // Wyczyść interwały
    this.clearAccountIntervals(schedule);

    // Usuń zadania tego konta z kolejki
    this.taskQueue = this.taskQueue.filter(t => t.accountId !== accountId);

    // Zamknij przeglądarkę
    try {
      await browserManager.closeSession(schedule.email);
    } catch (e) {}

    this.activeAccounts.delete(accountId);
    logger.info(`✅ Konto ${schedule.email} dezaktywowane`);
  }

  /**
   * Czyści interwały konta
   */
  clearAccountIntervals(schedule) {
    for (const key of Object.keys(schedule.intervals)) {
      if (schedule.intervals[key]) {
        clearInterval(schedule.intervals[key]);
        schedule.intervals[key] = null;
      }
    }
  }

  /**
   * Dodaje zadanie do kolejki (jeśli nie ma już takiego samego)
   */
  addToQueue(accountId, moduleType) {
    // Sprawdź czy nie ma już takiego zadania w kolejce
    const exists = this.taskQueue.some(
      t => t.accountId === accountId && t.moduleType === moduleType
    );
    
    if (exists) {
      logger.debug(`Zadanie ${moduleType} dla konta ${accountId} już w kolejce`);
      return;
    }

    const task = {
      id: `${accountId}_${moduleType}_${Date.now()}`,
      accountId,
      moduleType,
      addedAt: new Date(),
    };

    this.taskQueue.push(task);
    logger.info(`📥 Dodano do kolejki: ${moduleType} (konto ${accountId})`);
  }

  /**
   * Przetwarza kolejkę zadań (tylko jedno na raz)
   */
  async processQueue() {
    if (!this.isRunning || this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    // Pobierz pierwsze zadanie z kolejki
    const task = this.taskQueue.shift();
    this.currentTask = task;

    const account = getGameAccount(task.accountId);
    if (!account) {
      logger.error(`Nie znaleziono konta ${task.accountId}`);
      this.isProcessing = false;
      this.currentTask = null;
      return;
    }

    logger.info(`▶️ Wykonuję: ${task.moduleType} dla ${account.email}`);
    
    // Wyślij powiadomienie o rozpoczęciu
    if (emitModuleStarted) {
      emitModuleStarted(task.accountId, account.email, task.moduleType, `Uruchamiam moduł ${task.moduleType}`);
    }

    try {
      // Pobierz lub utwórz sesję przeglądarki
      const session = await browserManager.getSession(account.email);
      
      // Upewnij się że jesteśmy zalogowani
      const auth = new GameAuth(session, account);
      const loggedIn = await auth.ensureLoggedIn();
      
      if (!loggedIn) {
        throw new Error('Nie udało się zalogować');
      }

      // Pobierz stary poziom z cache (do porównania)
      const oldCache = getGameStatusCache(task.accountId);
      const oldLevel = oldCache?.playerInfo?.level || 0;

      // Pobierz informacje o graczu (premium, pieniądze)
      const playerInfo = await auth.getPlayerInfo();
      
      // Sprawdź czy gracz awansował
      if (playerInfo.level > oldLevel && oldLevel > 0) {
        logger.info(`🎉 ${account.email} awansował z poziomu ${oldLevel} na ${playerInfo.level}!`);
        if (emitLevelUp) {
          emitLevelUp(task.accountId, account.email, oldLevel, playerInfo.level);
        }
      }
      
      // Pobierz informacje o odblokowaniu funkcji (farmy, stragany, tartak)
      const unlockedFeatures = await auth.getUnlockedFeatures();

      // Wykonaj odpowiedni moduł
      let result;
      switch (task.moduleType) {
        case ModuleType.FARM:
          result = await this.executeFarmModule(session, account, playerInfo, unlockedFeatures);
          break;
        case ModuleType.FORESTRY:
          // Sprawdź czy tartak jest odblokowany
          if (!unlockedFeatures.forestry) {
            logger.info('Tartak jest zablokowany, pomijam moduł');
            result = { skipped: true, reason: 'locked' };
            break;
          }
          result = await this.executeForestryModule(session, account);
          break;
        case ModuleType.STALLS:
          // Sprawdź czy stragany są odblokowane
          if (!unlockedFeatures.stalls) {
            logger.info('Stragany są zablokowane, pomijam moduł');
            result = { skipped: true, reason: 'locked' };
            break;
          }
          result = await this.executeStallsModule(session, account);
          break;
      }

      // Zaktualizuj czas ostatniego uruchomienia
      const schedule = this.activeAccounts.get(task.accountId);
      if (schedule) {
        schedule.lastRun[task.moduleType] = new Date();
      }

      logger.info(`✅ Zakończono: ${task.moduleType} dla ${account.email}`);
      logAction(task.accountId, task.moduleType, JSON.stringify(result || {}), true);
      
      // Wyślij powiadomienie o zakończeniu
      if (emitModuleCompleted) {
        emitModuleCompleted(task.accountId, account.email, task.moduleType, result);
      }
      
      // Aktualizuj statystyki - sukces
      this.updateStats(task.accountId, task.moduleType, true);

      // Zamknij przeglądarkę po każdym module
      await browserManager.closeSession(account.email);

    } catch (error) {
      logger.error(`❌ Błąd ${task.moduleType} dla ${account.email}: ${error.message}`);
      logAction(task.accountId, task.moduleType, `Błąd: ${error.message}`, false);
      
      // Wyślij powiadomienie o błędzie
      if (emitModuleError) {
        emitModuleError(task.accountId, account.email, task.moduleType, error.message);
      }
      
      // Aktualizuj statystyki - błąd
      this.updateStats(task.accountId, task.moduleType, false);
      
      // Przy błędzie też zamknij przeglądarkę
      try {
        await browserManager.closeSession(account.email);
      } catch (e) {}
    }

    this.isProcessing = false;
    this.currentTask = null;

    // Jeśli są kolejne zadania, przetwórz je po chwili (daj czas na zamknięcie przeglądarki)
    if (this.taskQueue.length > 0) {
      setTimeout(() => this.processQueue(), 3000);
    }
  }

  /**
   * Wykonuje moduł farmy
   */
  async executeFarmModule(session, account, playerInfo = null, unlockedFeatures = null) {
    logger.info('🌾 Moduł farmy...');
    
    // Określ które farmy są odblokowane
    let unlockedFarms = [1]; // Farma 1 zawsze dostępna
    
    if (unlockedFeatures && unlockedFeatures.farms) {
      unlockedFarms = Object.entries(unlockedFeatures.farms)
        .filter(([key, unlocked]) => unlocked)
        .map(([key]) => parseInt(key));
      logger.info(`Odblokowane farmy: ${unlockedFarms.join(', ')}`);
    }
    
    const farm = new FarmModule(session, account, playerInfo);
    const result = await farm.fullFarmCycle({
      farms: unlockedFarms,
      harvest: true,
      plant: true,
      water: true,
    });
    
    FarmModule.resetCropSelection();
    return result;
  }

  /**
   * Wykonuje moduł tartaku
   */
  async executeForestryModule(session, account) {
    logger.info('🌲 Moduł tartaku...');
    
    const forestry = new ForestryModule(session, account);
    
    const buildingConfigStr = getForestryBuildingConfig(account.id);
    const buildingConfig = buildingConfigStr ? JSON.parse(buildingConfigStr) : null;
    
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
    
    const result = await forestry.fullForestryCycle({
      harvestTrees: true,
      plantTrees: true,
      waterTrees: true,
      preferredTreeId: preferredTreeId,
      manageBuildings: true,
      buildingConfig: buildingConfig,
    });
    
    return result;
  }

  /**
   * Wykonuje moduł straganów
   */
  async executeStallsModule(session, account) {
    logger.info('🏪 Moduł straganów...');
    
    const stalls = new StallsModule(session, account);
    const result = await stalls.runCycle();
    
    return result;
  }

  /**
   * Sprawdza smart mode dla wszystkich aktywnych kont
   * Używa per-account cache interval zamiast globalnego
   */
  checkSmartMode() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    
    for (const [accountId, schedule] of this.activeAccounts) {
      if (schedule.smartMode) {
        // Użyj per-account cache interval (w sekundach)
        const intervalMs = (schedule.cacheInterval || 60) * 1000;
        const lastCheck = schedule.lastSmartCheck?.timestamp || 0;
        
        if (now - lastCheck >= intervalMs) {
          schedule.lastSmartCheck = schedule.lastSmartCheck || {};
          schedule.lastSmartCheck.timestamp = now;
          this.checkSmartModeForAccount(accountId);
        }
      }
    }
  }

  /**
   * Sprawdza smart mode dla konkretnego konta
   * Analizuje cache i dodaje zadania do kolejki jeśli coś jest gotowe
   */
  checkSmartModeForAccount(accountId) {
    const schedule = this.activeAccounts.get(accountId);
    if (!schedule || !schedule.smartMode) return;

    const cache = getGameStatusCache(accountId);
    if (!cache) {
      logger.debug(`🧠 Smart mode: brak cache dla konta ${accountId}`);
      return;
    }

    // Sprawdź jak stary jest cache (max 60 min)
    const cacheAge = Date.now() - new Date(cache.updatedAt).getTime();
    if (cacheAge > 60 * 60 * 1000) {
      logger.debug(`🧠 Smart mode: cache zbyt stary (${Math.round(cacheAge/60000)} min)`);
      return;
    }

    const now = new Date();
    
    // Analiza pól uprawnych (FARMA)
    if (cache.fieldsStatus && Array.isArray(cache.fieldsStatus)) {
      const readyFields = cache.fieldsStatus.filter(field => {
        if (field.status === 'ready') return true;
        if (field.status === 'growing' && field.readyTime) {
          // Parsuj czas w formacie HH:MM:SS i sprawdź czy minął
          const timeParts = field.readyTime.split(':').map(Number);
          if (timeParts.length === 3) {
            const [hours, minutes, seconds] = timeParts;
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            // Jeśli czas jest mniejszy niż 0 (lub bardzo mały), znaczy że gotowe
            if (totalSeconds <= 0) return true;
          }
        }
        return false;
      });

      if (readyFields.length > 0) {
        // Sprawdź czy niedawno nie uruchamialiśmy farmy
        const lastFarmCheck = schedule.lastSmartCheck?.farm || 0;
        if (Date.now() - lastFarmCheck > 5 * 60 * 1000) { // Min 5 min między sprawdzeniami
          logger.info(`🧠 Smart mode: ${readyFields.length} pól gotowych do zbioru`);
          this.addToQueue(accountId, ModuleType.FARM);
          schedule.lastSmartCheck.farm = Date.now();
        }
      }
    }

    // Analiza tartaku (FORESTRY)
    if (cache.forestryStatus) {
      let forestryReady = false;
      
      // Sprawdź drzewa
      if (cache.forestryStatus.trees && Array.isArray(cache.forestryStatus.trees)) {
        const readyTrees = cache.forestryStatus.trees.filter(tree => 
          tree.status === 'ready' || tree.status === 'Gotowe'
        );
        if (readyTrees.length > 0) {
          forestryReady = true;
          logger.info(`🧠 Smart mode: ${readyTrees.length} drzew gotowych do ścięcia`);
        }
      }
      
      // Sprawdź budynki produkcyjne
      if (cache.forestryStatus.buildings && Array.isArray(cache.forestryStatus.buildings)) {
        const readyBuildings = cache.forestryStatus.buildings.filter(b => 
          b.slots?.some(slot => slot.status === 'ready' || slot.status === 'Gotowe')
        );
        if (readyBuildings.length > 0) {
          forestryReady = true;
          logger.info(`🧠 Smart mode: produkcja gotowa w ${readyBuildings.length} budynkach`);
        }
      }

      if (forestryReady) {
        const lastForestryCheck = schedule.lastSmartCheck?.forestry || 0;
        if (Date.now() - lastForestryCheck > 5 * 60 * 1000) {
          this.addToQueue(accountId, ModuleType.FORESTRY);
          schedule.lastSmartCheck.forestry = Date.now();
        }
      }
    }

    // Analiza straganów (STALLS)
    if (cache.stallsStatus && Array.isArray(cache.stallsStatus)) {
      const stallsWithEmptySlots = cache.stallsStatus.filter(stall => {
        if (!stall.slots) return false;
        return stall.slots.some(slot => 
          slot.status === 'empty' || 
          slot.status === 'sold' ||
          slot.currentStock === 0
        );
      });

      if (stallsWithEmptySlots.length > 0) {
        const lastStallsCheck = schedule.lastSmartCheck?.stalls || 0;
        if (Date.now() - lastStallsCheck > 5 * 60 * 1000) {
          logger.info(`🧠 Smart mode: ${stallsWithEmptySlots.length} straganów z pustymi slotami`);
          this.addToQueue(accountId, ModuleType.STALLS);
          schedule.lastSmartCheck.stalls = Date.now();
        }
      }
    }
  }

  /**
   * Zwraca status schedulera
   */
  getStatus() {
    const accounts = [];
    
    for (const [accountId, schedule] of this.activeAccounts) {
      accounts.push({
        accountId,
        email: schedule.email,
        intervals: schedule.intervalValues || {},
        smartMode: schedule.smartMode || false,
        modules: {
          farm: !!schedule.intervals.farm,
          forestry: !!schedule.intervals.forestry,
          stalls: !!schedule.intervals.stalls,
        },
        lastRun: schedule.lastRun,
        stats: this.getAccountStats(accountId),
      });
    }

    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      currentTask: this.currentTask ? {
        moduleType: this.currentTask.moduleType,
        accountId: this.currentTask.accountId,
      } : null,
      queueLength: this.taskQueue.length,
      queue: this.taskQueue.map(t => ({
        moduleType: t.moduleType,
        accountId: t.accountId,
        addedAt: t.addedAt,
      })),
      activeAccounts: accounts,
    };
  }

  /**
   * Zwraca kolejkę zadań dla konta
   */
  getAccountTaskQueue(accountId) {
    return this.taskQueue
      .filter(t => t.accountId === accountId)
      .map(t => ({
        moduleType: t.moduleType,
        addedAt: t.addedAt,
      }));
  }

  /**
   * Ręczne uruchomienie modułu (dodaje do kolejki)
   */
  runModule(accountId, moduleType) {
    const account = getGameAccount(accountId);
    if (!account) {
      throw new Error(`Nie znaleziono konta ${accountId}`);
    }

    this.addToQueue(accountId, moduleType);
    
    // Jeśli nie przetwarzamy, uruchom natychmiast
    if (!this.isProcessing) {
      setTimeout(() => this.processQueue(), 100);
    }
  }
}

// Singleton
export const scheduler = new SimpleScheduler();
export default scheduler;
