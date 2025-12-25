/**
 * Scheduler - zarządza automatycznym wykonywaniem zadań
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
  logAction 
} from './database.js';
import logger from './logger.js';

/**
 * Klasa zarządzająca harmonogramem zadań
 */
class Scheduler {
  constructor() {
    this.isRunning = false;
    this.activeJobs = new Map();
    this.checkInterval = null;
  }

  /**
   * Uruchamia scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler już działa');
      return;
    }

    logger.info('Uruchamianie schedulera...');
    this.isRunning = true;

    // Sprawdzaj zaplanowane zadania co minutę
    this.checkInterval = setInterval(() => {
      this.processScheduledTasks();
    }, 60000);

    // Pierwsze sprawdzenie od razu
    this.processScheduledTasks();

    logger.info('Scheduler uruchomiony');
  }

  /**
   * Zatrzymuje scheduler
   */
  async stop() {
    logger.info('Zatrzymywanie schedulera...');
    
    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Anuluj wszystkie aktywne joby
    for (const [accountId, job] of this.activeJobs) {
      if (job.task) {
        job.task.stop();
      }
    }
    this.activeJobs.clear();

    // Zamknij wszystkie przeglądarki
    await browserManager.closeAll();

    logger.info('Scheduler zatrzymany');
  }

  /**
   * Przetwarza zaplanowane zadania
   */
  async processScheduledTasks() {
    if (!this.isRunning) return;

    try {
      const now = new Date().toISOString();
      const tasks = getPendingTasks(now);

      if (tasks.length === 0) {
        return;
      }

      logger.info(`Znaleziono ${tasks.length} zadań do wykonania`);

      for (const task of tasks) {
        await this.executeTask(task);
      }
    } catch (error) {
      logger.error(`Błąd przetwarzania zadań: ${error.message}`);
    }
  }

  /**
   * Wykonuje pojedyncze zadanie
   */
  async executeTask(task) {
    logger.info(`Wykonywanie zadania: ${task.task_type} dla ${task.email}`);

    let session = null;

    try {
      // Pobierz lub utwórz sesję
      session = await browserManager.getSession(task.email);
      
      // Upewnij się że jesteśmy zalogowani
      const auth = new GameAuth(session, {
        id: task.account_id,
        email: task.email,
        password: task.password,
        server: task.server
      });

      const loggedIn = await auth.ensureLoggedIn();
      if (!loggedIn) {
        throw new Error('Nie udało się zalogować');
      }

      // Wykonaj zadanie w zależności od typu
      const data = task.data ? JSON.parse(task.data) : {};
      
      switch (task.task_type) {
        case 'harvest':
          const farm = new FarmModule(session, { id: task.account_id });
          await farm.navigateToFarm();
          await farm.harvestField(task.target_id);
          // Po zbiorze zasadź ponownie
          if (data.plant) {
            await farm.plantOnField(task.target_id, data.plant);
          }
          break;

        case 'cut_tree':
          const sawmill = new SawmillModule(session, { id: task.account_id });
          await sawmill.navigateToSawmill();
          await sawmill.cutTree(task.target_id);
          if (data.treeType) {
            await sawmill.plantTree(task.target_id, data.treeType);
          }
          break;

        case 'full_cycle':
          await this.runFullCycle(task.account_id);
          break;

        default:
          logger.warn(`Nieznany typ zadania: ${task.task_type}`);
      }

      markTaskExecuted(task.id, true);
      logger.info(`Zadanie ${task.id} wykonane pomyślnie`);

    } catch (error) {
      logger.error(`Błąd wykonywania zadania ${task.id}: ${error.message}`);
      markTaskExecuted(task.id, false);
      logAction(task.account_id, task.task_type, `Błąd: ${error.message}`, false);
    }
  }

  /**
   * Uruchamia pełny cykl dla konta
   */
  async runFullCycle(accountId) {
    const account = getGameAccount(accountId);
    if (!account) {
      throw new Error(`Nie znaleziono konta ${accountId}`);
    }

    logger.info(`Pełny cykl dla ${account.email}...`);
    logger.info(`Ustawienia: farm_enabled=${account.farm_enabled}, forestry_enabled=${account.forestry_enabled}, stalls_enabled=${account.stalls_enabled}`);

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
        nextAction: null
      };

      // FARMA
      if (account.farm_enabled) {
        logger.info('Uruchamiam moduł farmy...');
        const farm = new FarmModule(session, account);
        const preferredPlants = JSON.parse(account.farm_preferred_plants || '["pszenica"]');
        
        results.farm = await farm.fullFarmCycle({
          farms: [1, 2, 3, 4],
          harvest: account.farm_auto_harvest,
          plant: account.farm_auto_plant,
          water: account.farm_auto_water,
          cropType: preferredPlants[0] || 'pszenica',
        });
      }

      // TARTAK
      if (account.forestry_enabled) {
        logger.info('Uruchamiam moduł tartaku...');
        const forestry = new ForestryModule(session, account);
        results.forestry = await forestry.fullForestryCycle({
          harvestTrees: account.forestry_auto_harvest,
          plantTrees: account.forestry_auto_plant,
          waterTrees: account.forestry_auto_water,
          preferredTreeType: account.forestry_preferred_tree || 'swierk',
          startProduction: account.forestry_auto_production,
          productionBuildings: [1, 2],
        });
      }

      // STRAGANY
      if (account.stalls_enabled && account.stalls_auto_restock) {
        logger.info('Uruchamiam moduł straganów...');
        const stalls = new StallsModule(session, account);
        results.stalls = await stalls.runCycle();
      }

      // Oblicz czas następnej akcji
      const nextTimes = [];
      if (results.farm?.nextHarvest) nextTimes.push(new Date(results.farm.nextHarvest));

      if (nextTimes.length > 0) {
        results.nextAction = new Date(Math.min(...nextTimes));
      }

      logAction(accountId, 'full_cycle', JSON.stringify(results), true);
      logger.info(`Cykl zakończony dla ${account.email}`);
      
      // Zamknij przeglądarkę po zakończeniu cyklu
      logger.info(`Zamykam przeglądarkę dla ${account.email}...`);
      await browserManager.closeSession(account.email);
      
      // Zresetuj flagi wyboru roślin/sadzonek dla następnego cyklu
      FarmModule.resetCropSelection();
      
      return results;

    } catch (error) {
      logger.error(`Błąd pełnego cyklu: ${error.message}`);
      logAction(accountId, 'full_cycle', `Błąd: ${error.message}`, false);
      
      // Zamknij przeglądarkę nawet przy błędzie
      try {
        await browserManager.closeSession(account.email);
        logger.info(`Zamknięto przeglądarkę po błędzie dla ${account.email}`);
      } catch (e) {
        logger.debug(`Nie udało się zamknąć przeglądarki: ${e.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Uruchamia automatyzację dla konta
   */
  async startAccountAutomation(accountId) {
    const account = getGameAccount(accountId);
    if (!account) {
      throw new Error(`Nie znaleziono konta ${accountId}`);
    }

    if (this.activeJobs.has(accountId)) {
      logger.warn(`Automatyzacja dla ${account.email} już działa`);
      return;
    }

    logger.info(`Uruchamianie automatyzacji dla ${account.email}...`);

    // Uruchom pierwszy cykl
    await this.runFullCycle(accountId);

    // Ustaw cykliczne sprawdzanie
    const intervalMinutes = account.check_interval_minutes || 5;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    const task = cron.schedule(cronExpression, async () => {
      if (!this.isRunning) return;
      
      try {
        await this.runFullCycle(accountId);
      } catch (error) {
        logger.error(`Błąd cyklicznego sprawdzania: ${error.message}`);
      }
    });

    this.activeJobs.set(accountId, {
      task,
      account: account.email,
      startedAt: new Date()
    });

    logger.info(`Automatyzacja dla ${account.email} uruchomiona (co ${intervalMinutes} min)`);
  }

  /**
   * Zatrzymuje automatyzację dla konta
   */
  async stopAccountAutomation(accountId) {
    const job = this.activeJobs.get(accountId);
    if (!job) {
      return false;
    }

    if (job.task) {
      job.task.stop();
    }

    this.activeJobs.delete(accountId);
    
    // Zamknij sesję przeglądarki
    const account = getGameAccount(accountId);
    if (account) {
      await browserManager.closeSession(account.email);
    }

    logger.info(`Automatyzacja dla konta ${accountId} zatrzymana`);
    return true;
  }

  /**
   * Zwraca status wszystkich aktywnych automatyzacji
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      activeJobs: []
    };

    for (const [accountId, job] of this.activeJobs) {
      status.activeJobs.push({
        accountId,
        email: job.account,
        startedAt: job.startedAt
      });
    }

    return status;
  }
}

// Singleton
export const scheduler = new Scheduler();

export default scheduler;
