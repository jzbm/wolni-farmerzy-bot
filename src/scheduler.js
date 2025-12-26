/**
 * Advanced Scheduler - Rozbudowany system harmonogramu zadań
 * 
 * TRYBY PRACY:
 * 1. INTERVAL - Uruchamianie co określony czas (np. co 30 minut)
 * 2. SMART_REFRESH - Inteligentne odświeżanie przed końcem czasu rośliny/drzewa/produkcji
 * 3. ON_READY - Reaktywne uruchamianie gdy coś jest gotowe
 * 4. DAILY - Raz dziennie o określonej godzinie
 * 5. WINDOW - W określonym oknie czasowym (np. 8:00-22:00)
 * 6. PRIORITY - Z priorytetami wykonania
 * 7. CONDITIONAL - Gdy spełniony warunek
 * 8. CHAIN - Łańcuch zadań wykonywanych po sobie
 */

import cron from 'node-cron';
import { browserManager, BrowserSession } from './browser.js';
import { GameAuth } from './modules/auth.js';
import { FarmModule } from './modules/farm.js';
import { ForestryModule } from './modules/forestry.js';
import { SawmillModule } from './modules/sawmill.js';
import { StallsModule } from './modules/stalls.js';
import { 
  getPendingTasks, 
  markTaskExecuted, 
  getGameAccounts, 
  getGameAccount,
  getAccountStats,
  logAction,
  getForestryBuildingConfig 
} from './database.js';
import logger from './logger.js';

/**
 * Typy trybów harmonogramu
 */
export const ScheduleMode = {
  INTERVAL: 'interval',           // Co określony czas
  SMART_REFRESH: 'smart_refresh', // Przed końcem czasu
  ON_READY: 'on_ready',           // Gdy gotowe
  DAILY: 'daily',                 // Raz dziennie
  WINDOW: 'window',               // W oknie czasowym
  PRIORITY: 'priority',           // Z priorytetem
  CONDITIONAL: 'conditional',     // Warunkowe
  CHAIN: 'chain',                 // Łańcuch zadań
};

/**
 * Typy zadań
 */
export const TaskType = {
  FULL_CYCLE: 'full_cycle',
  FARM_HARVEST: 'farm_harvest',
  FARM_PLANT: 'farm_plant',
  FARM_WATER: 'farm_water',
  FORESTRY_HARVEST: 'forestry_harvest',
  FORESTRY_PLANT: 'forestry_plant',
  FORESTRY_WATER: 'forestry_water',
  FORESTRY_PRODUCTION: 'forestry_production',
  STALLS_RESTOCK: 'stalls_restock',
  STATUS_CHECK: 'status_check',
};

/**
 * Priorytety zadań
 */
export const Priority = {
  CRITICAL: 1,  // Natychmiast (np. zbieranie gotowych plonów)
  HIGH: 2,      // Wysoki (np. sadzenie po zebraniu)
  NORMAL: 3,    // Normalny (np. podlewanie)
  LOW: 4,       // Niski (np. odświeżanie statusu)
  BACKGROUND: 5 // Tło (np. logowanie statystyk)
};

/**
 * Stan zadania w kolejce
 */
class ScheduledTask {
  constructor(options) {
    this.id = options.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.accountId = options.accountId;
    this.type = options.type;
    this.mode = options.mode || ScheduleMode.INTERVAL;
    this.priority = options.priority || Priority.NORMAL;
    this.data = options.data || {};
    
    // Timing
    this.scheduledAt = options.scheduledAt || new Date();
    this.executeAt = options.executeAt || new Date();
    this.interval = options.interval || null; // ms
    this.cronExpression = options.cronExpression || null;
    
    // Smart refresh
    this.targetEndTime = options.targetEndTime || null; // Kiedy kończy się roślina/produkcja
    this.refreshMargin = options.refreshMargin || 60000; // 1 min przed końcem
    
    // Window mode
    this.windowStart = options.windowStart || '08:00';
    this.windowEnd = options.windowEnd || '22:00';
    
    // Conditional
    this.condition = options.condition || null; // Funkcja sprawdzająca warunek
    
    // Chain
    this.nextTask = options.nextTask || null;
    this.dependsOn = options.dependsOn || null;
    
    // Status
    this.status = 'pending'; // pending, running, completed, failed, cancelled
    this.lastRun = null;
    this.runCount = 0;
    this.errors = [];
    this.retryCount = options.retryCount || 3;
    this.retryDelay = options.retryDelay || 30000; // 30s
  }

  /**
   * Czy zadanie powinno być wykonane teraz
   */
  shouldExecuteNow() {
    const now = new Date();
    
    // Sprawdź status
    if (this.status === 'running' || this.status === 'cancelled') {
      return false;
    }
    
    // Sprawdź okno czasowe
    if (this.mode === ScheduleMode.WINDOW) {
      if (!this.isInTimeWindow(now)) {
        return false;
      }
    }
    
    // Sprawdź warunek
    if (this.mode === ScheduleMode.CONDITIONAL && this.condition) {
      if (!this.condition()) {
        return false;
      }
    }
    
    // Sprawdź zależności
    if (this.dependsOn && this.dependsOn.status !== 'completed') {
      return false;
    }
    
    // Sprawdź czas wykonania
    return now >= this.executeAt;
  }

  /**
   * Czy jesteśmy w oknie czasowym
   */
  isInTimeWindow(date = new Date()) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const [startH, startM] = this.windowStart.split(':').map(Number);
    const [endH, endM] = this.windowEnd.split(':').map(Number);
    
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Oblicza następny czas wykonania
   */
  calculateNextExecuteTime() {
    const now = new Date();
    
    switch (this.mode) {
      case ScheduleMode.INTERVAL:
        if (this.interval) {
          return new Date(now.getTime() + this.interval);
        }
        break;
        
      case ScheduleMode.SMART_REFRESH:
        if (this.targetEndTime) {
          const targetTime = new Date(this.targetEndTime);
          const refreshTime = new Date(targetTime.getTime() - this.refreshMargin);
          
          // Jeśli czas już minął, ustaw na teraz + minimalny interwał
          if (refreshTime <= now) {
            return new Date(now.getTime() + 30000); // 30s
          }
          return refreshTime;
        }
        break;
        
      case ScheduleMode.DAILY:
        // Następny dzień o tej samej godzinie
        const next = new Date(this.executeAt);
        next.setDate(next.getDate() + 1);
        return next;
        
      case ScheduleMode.WINDOW:
        // Jeśli poza oknem, ustaw na początek okna
        if (!this.isInTimeWindow(now)) {
          const [startH, startM] = this.windowStart.split(':').map(Number);
          const nextWindow = new Date(now);
          nextWindow.setHours(startH, startM, 0, 0);
          
          if (nextWindow <= now) {
            nextWindow.setDate(nextWindow.getDate() + 1);
          }
          return nextWindow;
        }
        // W oknie - użyj interwału
        if (this.interval) {
          return new Date(now.getTime() + this.interval);
        }
        break;
    }
    
    // Domyślnie - za 5 minut
    return new Date(now.getTime() + 5 * 60 * 1000);
  }
}

/**
 * Stan konta w schedulerze
 */
class AccountState {
  constructor(accountId) {
    this.accountId = accountId;
    this.isActive = false;
    this.lastCheck = null;
    this.nextCheck = null;
    
    // Czasy gotowości
    this.farmReadyTimes = [];      // Czasy gotowości pól na farmie
    this.forestryReadyTimes = [];  // Czasy gotowości drzew
    this.productionReadyTimes = []; // Czasy gotowości produkcji
    
    // Kolejka zadań
    this.taskQueue = [];
    
    // Statystyki
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastSuccess: null,
      lastError: null,
    };
  }

  /**
   * Dodaje zadanie do kolejki
   */
  addTask(task) {
    // Sprawdź czy zadanie już istnieje (ten sam typ i tryb)
    const exists = this.taskQueue.find(t => 
      t.type === task.type && 
      t.mode === task.mode && 
      t.status === 'pending'
    );
    if (exists) {
      // Zaktualizuj czas wykonania jeśli nowy jest wcześniejszy
      if (task.executeAt < exists.executeAt) {
        exists.executeAt = task.executeAt;
      }
      return false;
    }
    
    // Dodaj i posortuj po priorytecie i czasie
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.executeAt - b.executeAt;
    });
    
    return true;
  }

  /**
   * Pobiera następne zadanie do wykonania
   */
  getNextTask() {
    for (const task of this.taskQueue) {
      if (task.shouldExecuteNow()) {
        return task;
      }
    }
    return null;
  }

  /**
   * Usuwa zadanie z kolejki
   */
  removeTask(taskId) {
    const index = this.taskQueue.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Aktualizuje czasy gotowości
   */
  updateReadyTimes(type, times) {
    switch (type) {
      case 'farm':
        this.farmReadyTimes = times.filter(t => t).sort((a, b) => new Date(a) - new Date(b));
        break;
      case 'forestry':
        this.forestryReadyTimes = times.filter(t => t).sort((a, b) => new Date(a) - new Date(b));
        break;
      case 'production':
        this.productionReadyTimes = times.filter(t => t).sort((a, b) => new Date(a) - new Date(b));
        break;
    }
  }

  /**
   * Pobiera najbliższy czas gotowości
   */
  getNextReadyTime() {
    const allTimes = [
      ...this.farmReadyTimes,
      ...this.forestryReadyTimes,
      ...this.productionReadyTimes
    ].filter(t => t && new Date(t) > new Date());
    
    if (allTimes.length === 0) return null;
    
    return allTimes.sort((a, b) => new Date(a) - new Date(b))[0];
  }
}

/**
 * Główna klasa Advanced Scheduler
 */
class AdvancedScheduler {
  constructor() {
    this.isRunning = false;
    this.accounts = new Map(); // accountId -> AccountState
    this.globalQueue = [];     // Globalna kolejka zadań
    
    // Timery
    this.mainLoopInterval = null;
    this.statusCheckInterval = null;
    
    // Konfiguracja
    this.config = {
      mainLoopInterval: 10000,      // 10s - główna pętla
      statusCheckInterval: 60000,   // 1 min - sprawdzanie statusu
      defaultRefreshMargin: 60000,  // 1 min przed końcem
      maxConcurrentTasks: 1,        // Max równoległych zadań na konto
      retryDelay: 30000,            // 30s między retry
      maxRetries: 3,
    };
    
    // Aktualnie wykonywane zadania
    this.runningTasks = new Map(); // taskId -> task
  }

  // ========================================
  // URUCHAMIANIE / ZATRZYMYWANIE
  // ========================================

  /**
   * Uruchamia scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler już działa');
      return;
    }

    logger.info('🚀 Uruchamianie Advanced Scheduler...');
    this.isRunning = true;

    // Główna pętla przetwarzania zadań
    this.mainLoopInterval = setInterval(() => {
      this.processTaskQueue();
    }, this.config.mainLoopInterval);

    // Okresowe sprawdzanie statusu kont
    this.statusCheckInterval = setInterval(() => {
      this.checkAllAccountsStatus();
    }, this.config.statusCheckInterval);

    // Pierwsze sprawdzenie od razu
    this.checkAllAccountsStatus();

    logger.info('✅ Advanced Scheduler uruchomiony');
  }

  /**
   * Zatrzymuje scheduler
   */
  async stop() {
    logger.info('🛑 Zatrzymywanie Advanced Scheduler...');
    
    this.isRunning = false;
    
    // Wyczyść timery
    if (this.mainLoopInterval) {
      clearInterval(this.mainLoopInterval);
      this.mainLoopInterval = null;
    }
    
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }

    // Anuluj wszystkie zadania
    for (const [taskId, task] of this.runningTasks) {
      task.status = 'cancelled';
    }
    this.runningTasks.clear();

    // Dezaktywuj wszystkie konta
    for (const [accountId, state] of this.accounts) {
      state.isActive = false;
      state.taskQueue = [];
    }

    // Zamknij wszystkie przeglądarki
    await browserManager.closeAll();

    logger.info('✅ Advanced Scheduler zatrzymany');
  }

  // ========================================
  // ZARZĄDZANIE KONTAMI
  // ========================================

  /**
   * Aktywuje automatyzację dla konta
   */
  async activateAccount(accountId, options = {}) {
    const account = getGameAccount(accountId);
    if (!account) {
      throw new Error(`Nie znaleziono konta ${accountId}`);
    }

    logger.info(`🔓 Aktywacja konta: ${account.email}`);

    // Pobierz lub utwórz stan konta
    let state = this.accounts.get(accountId);
    if (!state) {
      state = new AccountState(accountId);
      this.accounts.set(accountId, state);
    }

    state.isActive = true;

    // Dodaj zadania początkowe w zależności od opcji
    const mode = options.mode || ScheduleMode.INTERVAL;
    const interval = (options.intervalMinutes || account.check_interval_minutes || 30) * 60 * 1000;

    // Zadanie sprawdzania statusu (niski priorytet, częste)
    this.scheduleTask({
      accountId,
      type: TaskType.STATUS_CHECK,
      mode: ScheduleMode.INTERVAL,
      priority: Priority.LOW,
      interval: Math.min(interval, 5 * 60 * 1000), // Max co 5 min
      data: { checkAll: true }
    });

    // Główne zadanie cyklu
    this.scheduleTask({
      accountId,
      type: TaskType.FULL_CYCLE,
      mode: mode,
      priority: Priority.NORMAL,
      interval: interval,
      executeAt: new Date(), // Wykonaj od razu
      data: options.data || {}
    });

    // Uruchom pierwszy cykl
    try {
      await this.runFullCycle(accountId);
    } catch (error) {
      logger.error(`Błąd pierwszego cyklu dla ${account.email}: ${error.message}`);
    }

    logger.info(`✅ Konto ${account.email} aktywowane (tryb: ${mode}, interwał: ${interval/60000} min)`);
  }

  /**
   * Dezaktywuje automatyzację dla konta
   */
  async deactivateAccount(accountId) {
    const state = this.accounts.get(accountId);
    if (!state) {
      return false;
    }

    const account = getGameAccount(accountId);
    logger.info(`🔒 Dezaktywacja konta: ${account?.email || accountId}`);

    state.isActive = false;
    state.taskQueue = [];

    // Zamknij sesję przeglądarki
    if (account) {
      await browserManager.closeSession(account.email);
    }

    logger.info(`✅ Konto ${account?.email || accountId} dezaktywowane`);
    return true;
  }

  // ========================================
  // HARMONOGRAMOWANIE ZADAŃ
  // ========================================

  /**
   * Harmonogramuje nowe zadanie
   */
  scheduleTask(options) {
    const task = new ScheduledTask(options);
    
    const state = this.accounts.get(options.accountId);
    if (state) {
      state.addTask(task);
    } else {
      this.globalQueue.push(task);
    }

    logger.debug(`📅 Zaplanowano zadanie: ${task.type} dla konta ${options.accountId} (tryb: ${task.mode})`);
    return task.id;
  }

  /**
   * Harmonogramuje inteligentne odświeżanie przed końcem czasu
   */
  scheduleSmartRefresh(accountId, type, endTime, data = {}) {
    const refreshMargin = this.config.defaultRefreshMargin;
    const executeAt = new Date(new Date(endTime).getTime() - refreshMargin);

    // Nie planuj jeśli czas już minął
    if (executeAt <= new Date()) {
      return null;
    }

    const taskType = type === 'farm' ? TaskType.FARM_HARVEST : 
                     type === 'forestry' ? TaskType.FORESTRY_HARVEST :
                     TaskType.FORESTRY_PRODUCTION;

    return this.scheduleTask({
      accountId,
      type: taskType,
      mode: ScheduleMode.SMART_REFRESH,
      priority: Priority.HIGH,
      targetEndTime: endTime,
      refreshMargin: refreshMargin,
      executeAt: executeAt,
      data: data
    });
  }

  /**
   * Harmonogramuje zadanie gdy coś jest gotowe
   */
  scheduleOnReady(accountId, type, data = {}) {
    const taskType = type === 'farm' ? TaskType.FARM_HARVEST : 
                     type === 'forestry' ? TaskType.FORESTRY_HARVEST :
                     type === 'production' ? TaskType.FORESTRY_PRODUCTION :
                     TaskType.FULL_CYCLE;

    return this.scheduleTask({
      accountId,
      type: taskType,
      mode: ScheduleMode.ON_READY,
      priority: Priority.CRITICAL,
      executeAt: new Date(), // Natychmiast
      data: data
    });
  }

  /**
   * Harmonogramuje zadanie dzienne
   */
  scheduleDailyTask(accountId, type, hour, minute, data = {}) {
    const now = new Date();
    const executeAt = new Date(now);
    executeAt.setHours(hour, minute, 0, 0);
    
    // Jeśli już po tej godzinie, zaplanuj na jutro
    if (executeAt <= now) {
      executeAt.setDate(executeAt.getDate() + 1);
    }

    return this.scheduleTask({
      accountId,
      type: type,
      mode: ScheduleMode.DAILY,
      priority: Priority.NORMAL,
      executeAt: executeAt,
      data: data
    });
  }

  /**
   * Harmonogramuje zadanie w oknie czasowym
   */
  scheduleWindowTask(accountId, type, windowStart, windowEnd, interval, data = {}) {
    return this.scheduleTask({
      accountId,
      type: type,
      mode: ScheduleMode.WINDOW,
      priority: Priority.NORMAL,
      windowStart: windowStart,
      windowEnd: windowEnd,
      interval: interval,
      data: data
    });
  }

  /**
   * Harmonogramuje łańcuch zadań
   */
  scheduleTaskChain(accountId, tasks) {
    let previousTask = null;

    for (let i = 0; i < tasks.length; i++) {
      const taskConfig = tasks[i];
      const task = new ScheduledTask({
        accountId,
        ...taskConfig,
        mode: ScheduleMode.CHAIN,
        dependsOn: previousTask,
      });

      if (previousTask) {
        previousTask.nextTask = task;
      }

      const state = this.accounts.get(accountId);
      if (state) {
        state.addTask(task);
      }

      previousTask = task;
    }

    return previousTask ? previousTask.id : null;
  }

  // ========================================
  // PRZETWARZANIE ZADAŃ
  // ========================================

  /**
   * Główna pętla przetwarzania kolejki zadań
   */
  async processTaskQueue() {
    if (!this.isRunning) return;

    try {
      // Przetwarzaj zadania dla każdego aktywnego konta
      for (const [accountId, state] of this.accounts) {
        if (!state.isActive) continue;
        
        // Sprawdź czy nie ma już uruchomionego zadania dla tego konta
        const hasRunning = Array.from(this.runningTasks.values())
          .some(t => t.accountId === accountId && t.status === 'running');
        
        if (hasRunning) continue;

        // Pobierz następne zadanie
        const task = state.getNextTask();
        if (task) {
          await this.executeTask(task);
        }
      }

      // Przetwarzaj globalną kolejkę
      const globalTask = this.globalQueue.find(t => t.shouldExecuteNow());
      if (globalTask) {
        await this.executeTask(globalTask);
        const index = this.globalQueue.indexOf(globalTask);
        if (index !== -1) {
          this.globalQueue.splice(index, 1);
        }
      }

    } catch (error) {
      logger.error(`Błąd przetwarzania kolejki: ${error.message}`);
    }
  }

  /**
   * Wykonuje pojedyncze zadanie
   */
  async executeTask(task) {
    const account = getGameAccount(task.accountId);
    if (!account) {
      logger.error(`Nie znaleziono konta ${task.accountId}`);
      task.status = 'failed';
      return;
    }

    logger.info(`▶️ Wykonywanie: ${task.type} dla ${account.email} (priorytet: ${task.priority})`);
    
    task.status = 'running';
    task.lastRun = new Date();
    task.runCount++;
    this.runningTasks.set(task.id, task);

    const state = this.accounts.get(task.accountId);
    if (state) {
      state.stats.totalRuns++;
    }

    try {
      let result;

      switch (task.type) {
        case TaskType.FULL_CYCLE:
          result = await this.runFullCycle(task.accountId);
          break;

        case TaskType.STATUS_CHECK:
          result = await this.checkAccountStatus(task.accountId);
          break;

        case TaskType.FARM_HARVEST:
          result = await this.runFarmHarvest(task.accountId, task.data);
          break;

        case TaskType.FARM_PLANT:
          result = await this.runFarmPlant(task.accountId, task.data);
          break;

        case TaskType.FORESTRY_HARVEST:
          result = await this.runForestryHarvest(task.accountId, task.data);
          break;

        case TaskType.FORESTRY_PLANT:
          result = await this.runForestryPlant(task.accountId, task.data);
          break;

        case TaskType.FORESTRY_PRODUCTION:
          result = await this.runForestryProduction(task.accountId, task.data);
          break;

        case TaskType.STALLS_RESTOCK:
          result = await this.runStallsRestock(task.accountId, task.data);
          break;

        default:
          logger.warn(`Nieznany typ zadania: ${task.type}`);
      }

      task.status = 'completed';
      if (state) {
        state.stats.successfulRuns++;
        state.stats.lastSuccess = new Date();
      }

      // Zaplanuj następne wykonanie jeśli zadanie jest cykliczne
      if (task.mode === ScheduleMode.INTERVAL || 
          task.mode === ScheduleMode.WINDOW ||
          task.mode === ScheduleMode.DAILY) {
        task.executeAt = task.calculateNextExecuteTime();
        task.status = 'pending';
        logger.debug(`📅 Następne wykonanie ${task.type}: ${task.executeAt.toLocaleString()}`);
      }

      // Wykonaj następne zadanie w łańcuchu
      if (task.nextTask && task.mode === ScheduleMode.CHAIN) {
        task.nextTask.executeAt = new Date();
      }

      logger.info(`✅ Zakończono: ${task.type} dla ${account.email}`);

    } catch (error) {
      logger.error(`❌ Błąd zadania ${task.type}: ${error.message}`);
      
      task.errors.push({
        time: new Date(),
        message: error.message
      });

      if (state) {
        state.stats.failedRuns++;
        state.stats.lastError = error.message;
      }

      // Retry jeśli nie przekroczono limitu
      if (task.runCount < task.retryCount) {
        task.status = 'pending';
        task.executeAt = new Date(Date.now() + task.retryDelay);
        logger.info(`🔄 Retry ${task.runCount}/${task.retryCount} za ${task.retryDelay/1000}s`);
      } else {
        task.status = 'failed';
        
        // Usuń z kolejki
        if (state) {
          state.removeTask(task.id);
        }
      }

      logAction(task.accountId, task.type, `Błąd: ${error.message}`, false);

    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  // ========================================
  // SPRAWDZANIE STATUSU
  // ========================================

  /**
   * Sprawdza status wszystkich aktywnych kont
   */
  async checkAllAccountsStatus() {
    if (!this.isRunning) return;

    for (const [accountId, state] of this.accounts) {
      if (state.isActive) {
        try {
          // Nie sprawdzaj jeśli ostatnie sprawdzenie było niedawno
          if (state.lastCheck && 
              (Date.now() - state.lastCheck.getTime()) < 30000) {
            continue;
          }

          // Sprawdzanie statusu jest teraz osobnym zadaniem w kolejce
          // więc tutaj tylko logujemy
          logger.debug(`📊 Auto-sprawdzanie statusu dla ${accountId}`);
        } catch (error) {
          logger.debug(`Błąd sprawdzania statusu ${accountId}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Sprawdza status pojedynczego konta
   */
  async checkAccountStatus(accountId) {
    const account = getGameAccount(accountId);
    if (!account) return null;

    const state = this.accounts.get(accountId);
    if (!state) return null;

    logger.debug(`🔍 Sprawdzanie statusu: ${account.email}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);

      // Logowanie
      const auth = new GameAuth(session, account);
      const loggedIn = await auth.ensureLoggedIn();
      if (!loggedIn) {
        throw new Error('Nie udało się zalogować');
      }

      const status = {
        farm: null,
        forestry: null,
        readyItems: []
      };

      // Sprawdź farmę
      if (account.farm_enabled) {
        const farm = new FarmModule(session, account);
        await farm.navigateToFarm();
        status.farm = await farm.getFieldsStatus();
        
        // Zaktualizuj czasy gotowości
        const farmReadyTimes = status.farm
          .filter(f => f.readyAt)
          .map(f => f.readyAt);
        state.updateReadyTimes('farm', farmReadyTimes);

        // Znajdź gotowe pola
        const readyFields = status.farm.filter(f => f.status === 'ready');
        if (readyFields.length > 0) {
          status.readyItems.push({
            type: 'farm',
            count: readyFields.length,
            message: `${readyFields.length} pól gotowych do zbioru`
          });

          // Zaplanuj natychmiastowe zbieranie
          this.scheduleOnReady(accountId, 'farm', { fields: readyFields.map(f => f.fieldNum) });
        }

        // Zaplanuj smart refresh dla najbliższego zbioru
        const nextFarmReady = state.farmReadyTimes[0];
        if (nextFarmReady) {
          this.scheduleSmartRefresh(accountId, 'farm', nextFarmReady);
        }
      }

      // Sprawdź tartak
      if (account.forestry_enabled) {
        const forestry = new ForestryModule(session, account);
        await forestry.navigateToForestry();
        status.forestry = await forestry.getTreesStatus();

        // Zaktualizuj czasy gotowości drzew
        const forestryReadyTimes = status.forestry
          .filter(t => t.readyAt)
          .map(t => t.readyAt);
        state.updateReadyTimes('forestry', forestryReadyTimes);

        // Znajdź gotowe drzewa
        const readyTrees = status.forestry.filter(t => t.status === 'ready');
        if (readyTrees.length > 0) {
          status.readyItems.push({
            type: 'forestry',
            count: readyTrees.length,
            message: `${readyTrees.length} drzew gotowych do zbioru`
          });

          // Zaplanuj natychmiastowe zbieranie
          this.scheduleOnReady(accountId, 'forestry');
        }

        // Zaplanuj smart refresh dla najbliższego zbioru drzew
        const nextForestryReady = state.forestryReadyTimes[0];
        if (nextForestryReady) {
          this.scheduleSmartRefresh(accountId, 'forestry', nextForestryReady);
        }
      }

      state.lastCheck = new Date();
      state.nextCheck = new Date(Date.now() + this.config.statusCheckInterval);

      // Loguj jeśli są gotowe elementy
      if (status.readyItems.length > 0) {
        logger.info(`📊 ${account.email}: ${status.readyItems.map(r => r.message).join(', ')}`);
      }

      return status;

    } catch (error) {
      logger.error(`Błąd sprawdzania statusu ${account.email}: ${error.message}`);
      throw error;
    } finally {
      // Zamknij przeglądarkę po sprawdzeniu
      if (session) {
        await browserManager.closeSession(account.email);
      }
    }
  }

  // ========================================
  // WYKONYWANIE AKCJI
  // ========================================

  /**
   * Uruchamia pełny cykl dla konta
   */
  async runFullCycle(accountId) {
    const account = getGameAccount(accountId);
    if (!account) {
      throw new Error(`Nie znaleziono konta ${accountId}`);
    }

    logger.info(`🔄 Pełny cykl dla ${account.email}...`);

    let session = null;

    try {
      session = await browserManager.getSession(account.email);

      // Logowanie
      const auth = new GameAuth(session, account);
      const loggedIn = await auth.ensureLoggedIn();
      if (!loggedIn) {
        throw new Error('Nie udało się zalogować');
      }

      const results = {
        farm: null,
        forestry: null,
        stalls: null,
        readyTimes: []
      };

      // FARMA
      if (account.farm_enabled) {
        logger.info('🌾 Moduł farmy...');
        const farm = new FarmModule(session, account);
        
        // cropType = null -> fullFarmCycle pobierze konfigurację per farma z bazy danych
        results.farm = await farm.fullFarmCycle({
          farms: [1, 2, 3, 4],
          harvest: account.farm_auto_harvest,
          plant: account.farm_auto_plant,
          water: account.farm_auto_water,
        });

        // Zapisz czasy gotowości
        if (results.farm?.nextHarvest) {
          results.readyTimes.push({
            type: 'farm',
            time: results.farm.nextHarvest
          });
        }
      }

      // TARTAK
      if (account.forestry_enabled) {
        logger.info('🌲 Moduł tartaku...');
        const forestry = new ForestryModule(session, account);
        
        const buildingConfigStr = getForestryBuildingConfig(accountId);
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
        
        results.forestry = await forestry.fullForestryCycle({
          harvestTrees: account.forestry_auto_harvest,
          plantTrees: account.forestry_auto_plant,
          waterTrees: account.forestry_auto_water,
          preferredTreeId: preferredTreeId,
          manageBuildings: account.forestry_auto_production,
          buildingConfig: buildingConfig,
        });

        // Zapisz czasy gotowości
        if (results.forestry?.nextTreeReady) {
          results.readyTimes.push({
            type: 'forestry',
            time: results.forestry.nextTreeReady
          });
        }
      }

      // STRAGANY
      if (account.stalls_enabled && account.stalls_auto_restock) {
        logger.info('🏪 Moduł straganów...');
        const stalls = new StallsModule(session, account);
        results.stalls = await stalls.runCycle();
      }

      // Zaktualizuj stan konta
      const state = this.accounts.get(accountId);
      if (state) {
        // Zaplanuj smart refresh dla najbliższych czasów
        for (const rt of results.readyTimes) {
          this.scheduleSmartRefresh(accountId, rt.type, rt.time);
        }
      }

      logAction(accountId, 'full_cycle', JSON.stringify(results), true);
      logger.info(`✅ Cykl zakończony dla ${account.email}`);
      
      // Zamknij przeglądarkę
      await browserManager.closeSession(account.email);
      FarmModule.resetCropSelection();
      
      return results;

    } catch (error) {
      logger.error(`❌ Błąd pełnego cyklu: ${error.message}`);
      logAction(accountId, 'full_cycle', `Błąd: ${error.message}`, false);
      
      try {
        await browserManager.closeSession(account.email);
      } catch (e) {}
      
      throw error;
    }
  }

  /**
   * Zbiera plony z farmy
   */
  async runFarmHarvest(accountId, data = {}) {
    const account = getGameAccount(accountId);
    if (!account) throw new Error(`Nie znaleziono konta ${accountId}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);
      const auth = new GameAuth(session, account);
      await auth.ensureLoggedIn();

      const farm = new FarmModule(session, account);
      await farm.navigateToFarm();
      
      const result = await farm.harvestAllFields();
      
      await browserManager.closeSession(account.email);
      return result;
    } catch (error) {
      await browserManager.closeSession(account.email).catch(() => {});
      throw error;
    }
  }

  /**
   * Sadzi na farmie
   */
  async runFarmPlant(accountId, data = {}) {
    const account = getGameAccount(accountId);
    if (!account) throw new Error(`Nie znaleziono konta ${accountId}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);
      const auth = new GameAuth(session, account);
      await auth.ensureLoggedIn();

      const farm = new FarmModule(session, account);
      await farm.navigateToFarm();
      
      const cropType = data.cropType || JSON.parse(account.farm_preferred_plants || '["pszenica"]')[0];
      const result = await farm.plantAllEmptyFields(cropType);
      
      await browserManager.closeSession(account.email);
      return result;
    } catch (error) {
      await browserManager.closeSession(account.email).catch(() => {});
      throw error;
    }
  }

  /**
   * Zbiera drzewa z tartaku
   */
  async runForestryHarvest(accountId, data = {}) {
    const account = getGameAccount(accountId);
    if (!account) throw new Error(`Nie znaleziono konta ${accountId}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);
      const auth = new GameAuth(session, account);
      await auth.ensureLoggedIn();

      const forestry = new ForestryModule(session, account);
      await forestry.navigateToForestry();
      
      const result = await forestry.harvestAllTreesButton();
      
      await browserManager.closeSession(account.email);
      return result;
    } catch (error) {
      await browserManager.closeSession(account.email).catch(() => {});
      throw error;
    }
  }

  /**
   * Sadzi drzewa w tartaku
   */
  async runForestryPlant(accountId, data = {}) {
    const account = getGameAccount(accountId);
    if (!account) throw new Error(`Nie znaleziono konta ${accountId}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);
      const auth = new GameAuth(session, account);
      await auth.ensureLoggedIn();

      const forestry = new ForestryModule(session, account);
      await forestry.navigateToForestry();
      
      const treeNameToId = {
        'swierk': 1, 'świerk': 1, 'brzoza': 2, 'buk': 3, 'topola': 4,
        'kasztan': 5, 'dab': 7, 'dąb': 7, 'jesion': 8, 'klon': 9, 'wierzba': 10,
      };
      const preferredTreeName = data.treeType || account.forestry_preferred_tree || 'swierk';
      const treeId = treeNameToId[preferredTreeName.toLowerCase()] || 1;
      
      const result = await forestry.plantAllTreesManual(treeId);
      
      await browserManager.closeSession(account.email);
      return result;
    } catch (error) {
      await browserManager.closeSession(account.email).catch(() => {});
      throw error;
    }
  }

  /**
   * Obsługuje produkcję w tartaku
   */
  async runForestryProduction(accountId, data = {}) {
    const account = getGameAccount(accountId);
    if (!account) throw new Error(`Nie znaleziono konta ${accountId}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);
      const auth = new GameAuth(session, account);
      await auth.ensureLoggedIn();

      const forestry = new ForestryModule(session, account);
      await forestry.navigateToForestry();
      
      const buildingConfigStr = getForestryBuildingConfig(accountId);
      const buildingConfig = buildingConfigStr ? JSON.parse(buildingConfigStr) : null;
      
      const result = await forestry.manageBuildingProduction(
        data.buildingId || 1, 
        buildingConfig
      );
      
      await browserManager.closeSession(account.email);
      return result;
    } catch (error) {
      await browserManager.closeSession(account.email).catch(() => {});
      throw error;
    }
  }

  /**
   * Uzupełnia stragany
   */
  async runStallsRestock(accountId, data = {}) {
    const account = getGameAccount(accountId);
    if (!account) throw new Error(`Nie znaleziono konta ${accountId}`);

    let session = null;
    try {
      session = await browserManager.getSession(account.email);
      const auth = new GameAuth(session, account);
      await auth.ensureLoggedIn();

      const stalls = new StallsModule(session, account);
      const result = await stalls.runCycle();
      
      await browserManager.closeSession(account.email);
      return result;
    } catch (error) {
      await browserManager.closeSession(account.email).catch(() => {});
      throw error;
    }
  }

  // ========================================
  // STATUS I INFORMACJE
  // ========================================

  /**
   * Zwraca status schedulera
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      accounts: [],
      runningTasks: [],
      globalQueueSize: this.globalQueue.length
    };

    for (const [accountId, state] of this.accounts) {
      const account = getGameAccount(accountId);
      status.accounts.push({
        accountId,
        email: account?.email || 'unknown',
        isActive: state.isActive,
        lastCheck: state.lastCheck,
        nextCheck: state.nextCheck,
        taskQueueSize: state.taskQueue.length,
        nextReadyTime: state.getNextReadyTime(),
        stats: state.stats
      });
    }

    for (const [taskId, task] of this.runningTasks) {
      status.runningTasks.push({
        id: taskId,
        type: task.type,
        accountId: task.accountId,
        startedAt: task.lastRun,
        status: task.status
      });
    }

    return status;
  }

  /**
   * Zwraca kolejkę zadań dla konta
   */
  getAccountTaskQueue(accountId) {
    const state = this.accounts.get(accountId);
    if (!state) return [];

    return state.taskQueue.map(task => ({
      id: task.id,
      type: task.type,
      mode: task.mode,
      priority: task.priority,
      status: task.status,
      executeAt: task.executeAt,
      runCount: task.runCount
    }));
  }

  // ========================================
  // KOMPATYBILNOŚĆ WSTECZNA
  // ========================================

  /**
   * Alias dla kompatybilności wstecznej
   */
  async startAccountAutomation(accountId) {
    return this.activateAccount(accountId);
  }

  async stopAccountAutomation(accountId) {
    return this.deactivateAccount(accountId);
  }
}

// Singleton
export const scheduler = new AdvancedScheduler();

export default scheduler;
