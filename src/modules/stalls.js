/**
 * Moduł straganów (Stalls)
 * Wolni Farmerzy - obsługa straganów 1 i 2
 * 
 * Logika:
 * 1. Otwórz stragan przez kliknięcie na #map_stall_overview_link{N}
 * 2. Sprawdź sloty - tylko te bez klasy .locked są dostępne
 * 3. Dla każdego dostępnego slotu uzupełnij przypisany produkt
 * 
 * WAŻNE: W jednym straganie nie mogą być dwa takie same produkty!
 */
import { config } from '../config.js';
import { logAction, getStallSlotConfig, updateStallSlotConfig } from '../database.js';

// Lista wszystkich produktów dostępnych w straganach
export const STALL_PRODUCTS = [
  { id: 1, name: 'Zboże' },
  { id: 2, name: 'Kukurydza' },
  { id: 3, name: 'Koniczyna' },
  { id: 4, name: 'Rzepak' },
  { id: 5, name: 'Buraki pastewne' },
  { id: 6, name: 'Zioła' },
  { id: 7, name: 'Słoneczniki' },
  { id: 8, name: 'Bławatki' },
  { id: 17, name: 'Marchewki' },
  { id: 18, name: 'Ogórki' },
  { id: 19, name: 'Rzodkiewki' },
  { id: 20, name: 'Truskawki' },
  { id: 21, name: 'Pomidory' },
  { id: 22, name: 'Cebule' },
  { id: 23, name: 'Szpinak' },
  { id: 24, name: 'Kalafiory' },
  { id: 26, name: 'Ziemniaki' },
  { id: 29, name: 'Szparagi' },
  { id: 31, name: 'Cukinie' },
  { id: 32, name: 'Jagody' },
  { id: 33, name: 'Maliny' },
  { id: 34, name: 'Porzeczki' },
  { id: 35, name: 'Jeżyny' },
  { id: 36, name: 'Mirabelki' },
  { id: 37, name: 'Jabłka' },
  { id: 38, name: 'Dynie' },
  { id: 39, name: 'Gruszki' },
  { id: 40, name: 'Wiśnie' },
  { id: 108, name: 'Bodziszki' },
  { id: 109, name: 'Stokrotki' },
];

/**
 * Klasa obsługująca stragany
 */
export class StallsModule {
  constructor(browserSession, accountData) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
  }

  /**
   * Pobiera konfigurację slotów dla konta
   * Domyślnie: Stragan1 Slot1=Zboże, Slot2=Kukurydza; Stragan2 Slot1=Koniczyna
   */
  getSlotConfig() {
    try {
      const config = getStallSlotConfig(this.account.id);
      if (config) {
        return JSON.parse(config);
      }
    } catch (e) {
      this.log.debug('Błąd pobierania konfiguracji slotów: ' + e.message);
    }
    
    // Domyślna konfiguracja
    return {
      stall1: {
        slot1: { productId: 1, productName: 'Zboże', enabled: true },
        slot2: { productId: 2, productName: 'Kukurydza', enabled: true },
      },
      stall2: {
        slot1: { productId: 3, productName: 'Koniczyna', enabled: true },
      }
    };
  }

  /**
   * Nawiguje do głównego widoku farmy (gdzie widać stragany)
   */
  async navigateToFarmView() {
    this.log.info('Nawigacja do widoku farmy (stragany)...');
    
    const page = this.session.page;
    await this.session.closePopups();
    
    try {
      const mainMenu = await page.$('#mainmenue1');
      if (mainMenu) {
        await mainMenu.click();
        await this.session.randomDelay(1000, 2000);
        await this.session.waitForPageReady();
        await this.session.closePopups();
        this.log.info('Przeszliśmy do widoku farmy');
        return true;
      }
    } catch (e) {
      this.log.debug('Błąd nawigacji do farmy: ' + e.message);
    }
    
    return false;
  }

  /**
   * Otwiera stragan o podanym numerze
   */
  async openStall(stallNumber) {
    this.log.info(`Otwieranie straganu ${stallNumber}...`);
    
    const page = this.session.page;
    await this.session.closePopups();
    
    const stallSelector = `#map_stall_overview_link${stallNumber}`;
    
    try {
      await page.waitForSelector(stallSelector, { timeout: 5000 });
      await page.click(stallSelector);
      await this.session.randomDelay(1000, 2000);
      
      // Sprawdź czy pojawił się komunikat o zbyt niskim poziomie
      const levelRestricted = await this.checkLevelRestriction();
      if (levelRestricted) {
        this.log.info(`Stragan ${stallNumber} - zbyt niski poziom gracza`);
        return false;
      }
      
      await this.session.waitForPageReady();
      
      const slotSelector = `#map_stall${stallNumber}_slot1`;
      await page.waitForSelector(slotSelector, { timeout: 5000 });
      
      this.log.info(`Stragan ${stallNumber} otwarty`);
      return true;
    } catch (e) {
      this.log.warn(`Nie udało się otworzyć straganu ${stallNumber}: ${e.message}`);
      return false;
    }
  }

  /**
   * Sprawdza czy pojawił się komunikat o zbyt niskim poziomie gracza
   * @returns {boolean} true jeśli poziom zbyt niski
   */
  async checkLevelRestriction() {
    const page = this.session.page;
    
    try {
      const globalbox = await page.$('#globalbox');
      if (globalbox) {
        const isVisible = await globalbox.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (isVisible) {
          const text = await globalbox.textContent();
          if (text && text.includes('Twój poziom jest jeszcze zbyt niski')) {
            // Zamknij popup
            const closeBtn = await page.$('#globalbox_close');
            if (closeBtn) {
              await closeBtn.click();
              await this.session.randomDelay(300, 500);
            }
            return true;
          }
        }
      }
    } catch (e) {
      this.log.debug(`Błąd sprawdzania globalbox: ${e.message}`);
    }
    
    return false;
  }

  /**
   * Zamyka stragan
   */
  async closeStall() {
    const page = this.session.page;
    
    try {
      const closeSelectors = [
        '.stall_close',
        '[onclick*="stall.close"]',
        '#stallbox .mini_close',
      ];
      
      for (const selector of closeSelectors) {
        const closeBtn = await page.$(selector);
        if (closeBtn && await closeBtn.isVisible()) {
          await closeBtn.click();
          await this.session.randomDelay(500, 1000);
          return true;
        }
      }
      
      await page.keyboard.press('Escape');
      await this.session.randomDelay(300, 500);
    } catch (e) {
      this.log.debug('Błąd zamykania straganu: ' + e.message);
    }
    
    return false;
  }

  /**
   * Pobiera status slotu z gry (ilość, produkt, czy pełny)
   */
  async getSlotStatus(stallNumber, slotNumber) {
    const page = this.session.page;
    const slotId = `#map_stall${stallNumber}_slot${slotNumber}`;
    
    const status = {
      slotNumber,
      exists: false,
      locked: false,
      empty: true,
      productName: null,
      productId: null,
      current: 0,
      max: 0,
      full: false,
      needsRefill: false,
    };
    
    try {
      const slot = await page.$(slotId);
      if (!slot) return status;
      
      status.exists = true;
      
      // Sprawdź czy zablokowany
      const lockedDiv = await page.$(`${slotId} .locked`);
      if (lockedDiv) {
        status.locked = true;
        return status;
      }
      
      // Sprawdź ilość produktu (np. "56/280")
      const amountDiv = await page.$(`${slotId}_amount`);
      if (amountDiv) {
        const amountText = await amountDiv.textContent();
        const match = amountText.match(/(\d+)\/(\d+)/);
        if (match) {
          status.current = parseInt(match[1]);
          status.max = parseInt(match[2]);
          status.empty = false;
          status.full = status.current >= status.max;
          status.needsRefill = status.current < status.max;
        }
        
        // Pobierz nazwę produktu z tooltipu
        const tooltipDiv = await page.$(`${slotId}_amount_tt`);
        if (tooltipDiv) {
          const tooltipHtml = await tooltipDiv.innerHTML();
          const nameMatch = tooltipHtml.match(/<div[^>]*font-weight:\s*bold[^>]*>([^<]+)<\/div>/i);
          if (nameMatch) {
            status.productName = nameMatch[1].trim();
          }
        }
      }
      
      // Sprawdź czy slot ma produkt przez .pid
      const pidDiv = await page.$(`${slotId} .pid`);
      if (pidDiv) {
        status.empty = false;
      }
      
    } catch (e) {
      this.log.debug(`Błąd sprawdzania slotu ${slotNumber}: ${e.message}`);
    }
    
    return status;
  }

  /**
   * Pobiera pełny status straganu (tylko odblokowane sloty)
   * Stragan 1: 2 sloty, Stragan 2: 1 slot
   */
  async getStallStatus(stallNumber) {
    const slots = [];
    
    // Tylko odblokowane sloty
    const maxSlots = stallNumber === 1 ? 2 : 1;
    
    for (let i = 1; i <= maxSlots; i++) {
      const status = await this.getSlotStatus(stallNumber, i);
      if (status.exists && !status.locked) {
        slots.push(status);
      }
    }
    
    return {
      stallNumber,
      slots,
      unlockedSlots: slots.length,
      emptySlots: slots.filter(s => s.empty).length,
      needsRefill: slots.filter(s => s.needsRefill).length,
    };
  }

  /**
   * Uzupełnia slot określonym produktem
   */
  async fillSlotWithProduct(stallNumber, slotNumber, productId, productName) {
    this.log.info(`Uzupełnianie slotu ${slotNumber} produktem ${productName} (ID: ${productId})...`);
    
    const page = this.session.page;
    
    try {
      // Najpierw sprawdź status slotu
      const status = await this.getSlotStatus(stallNumber, slotNumber);
      
      if (status.locked) {
        this.log.debug(`Slot ${slotNumber} jest zablokowany`);
        return false;
      }
      
      // Slot jest pełny - nic nie rób
      if (status.full) {
        this.log.debug(`Slot ${slotNumber} jest pełny`);
        return true;
      }
      
      // Slot ma inny produkt niż przypisany - wyczyść go
      if (!status.empty && status.productName && status.productName !== productName) {
        this.log.info(`Slot ${slotNumber} ma ${status.productName}, a powinien mieć ${productName} - czyszczę`);
        await this.clearSlot(stallNumber, slotNumber);
        await this.session.randomDelay(500, 1000);
      }
      
      // Slot wymaga tylko napełnienia (ten sam produkt)
      if (!status.empty && status.needsRefill && status.productName === productName) {
        return await this.refillSlot(stallNumber, slotNumber);
      }
      
      // Slot jest pusty - uzupełnij nowym produktem
      return await this.fillEmptySlot(stallNumber, slotNumber, productId, productName);
      
    } catch (e) {
      this.log.warn(`Błąd uzupełniania slotu ${slotNumber}: ${e.message}`);
      return false;
    }
  }

  /**
   * Uzupełnia pusty slot nowym produktem
   */
  async fillEmptySlot(stallNumber, slotNumber, productId, productName) {
    this.log.info(`Dodaję ${productName} do slotu ${slotNumber}...`);
    
    const page = this.session.page;
    
    try {
      // Kliknij na slot
      await page.evaluate(({ sN, slN }) => {
        stall.fillSlotCommit(sN, slN);
      }, { sN: stallNumber, slN: slotNumber });
      
      await this.session.randomDelay(500, 1000);
      
      // Otwórz dropdown
      const dropdownSelector = '#stallProductDropdownListSelector';
      await page.waitForSelector(dropdownSelector, { timeout: 5000 });
      await page.click(dropdownSelector);
      await this.session.randomDelay(300, 500);
      
      // Wybierz produkt
      await page.evaluate((pId) => {
        stall.fillSlotCommitSetProduct(pId);
      }, productId);
      
      this.log.info(`Wybrano produkt: ${productName}`);
      await this.session.randomDelay(300, 500);
      
      // Kliknij Dodaj
      await page.evaluate(() => {
        stall.fillSlot();
      });
      
      this.log.info(`Slot ${slotNumber} uzupełniony produktem ${productName}`);
      await this.session.randomDelay(500, 1000);
      return true;
      
    } catch (e) {
      this.log.warn(`Błąd dodawania produktu do slotu ${slotNumber}: ${e.message}`);
      return false;
    }
  }

  /**
   * Napełnia istniejący slot (refill)
   */
  async refillSlot(stallNumber, slotNumber) {
    this.log.info(`Napełnianie slotu ${slotNumber}...`);
    
    const page = this.session.page;
    
    try {
      // Kliknij na ilość
      await page.evaluate(({ sN, slN }) => {
        stall.refillSlotCommit(sN, slN);
      }, { sN: stallNumber, slN: slotNumber });
      
      await this.session.randomDelay(300, 500);
      
      // Kliknij Napełnij
      await page.evaluate(() => {
        stall.refillSlot();
      });
      
      this.log.info(`Slot ${slotNumber} napełniony`);
      await this.session.randomDelay(500, 1000);
      return true;
      
    } catch (e) {
      this.log.warn(`Błąd napełniania slotu ${slotNumber}: ${e.message}`);
      return false;
    }
  }

  /**
   * Czyści slot (usuwa produkt)
   */
  async clearSlot(stallNumber, slotNumber) {
    this.log.info(`Czyszczenie slotu ${slotNumber}...`);
    
    const page = this.session.page;
    
    try {
      await page.evaluate(({ sN, slN }) => {
        stall.clearSlotCommit(sN, slN);
      }, { sN: stallNumber, slN: slotNumber });
      
      await this.session.randomDelay(500, 1000);
      
      // Potwierdź
      await page.evaluate(({ sN, slN }) => {
        stall.clearSlot(sN, slN);
      }, { sN: stallNumber, slN: slotNumber });
      
      this.log.info(`Slot ${slotNumber} wyczyszczony`);
      await this.session.randomDelay(500, 1000);
      return true;
      
    } catch (e) {
      this.log.warn(`Błąd czyszczenia slotu ${slotNumber}: ${e.message}`);
      return false;
    }
  }

  /**
   * Obsługuje wszystkie sloty w straganie zgodnie z konfiguracją
   */
  async handleStall(stallNumber, stallConfig) {
    this.log.info(`Obsługa straganu ${stallNumber}...`);
    
    const opened = await this.openStall(stallNumber);
    if (!opened) {
      return { handled: 0, errors: 1 };
    }
    
    await this.session.closePopups();
    
    let handled = 0;
    let errors = 0;
    
    // Obsłuż każdy skonfigurowany slot
    for (const [slotKey, slotCfg] of Object.entries(stallConfig)) {
      if (!slotCfg.enabled) continue;
      
      const slotNumber = parseInt(slotKey.replace('slot', ''));
      
      try {
        const success = await this.fillSlotWithProduct(
          stallNumber, 
          slotNumber, 
          slotCfg.productId, 
          slotCfg.productName
        );
        if (success) handled++;
      } catch (e) {
        this.log.warn(`Błąd obsługi slotu ${slotNumber}: ${e.message}`);
        errors++;
      }
      
      await this.session.randomDelay(300, 500);
    }
    
    await this.closeStall();
    
    this.log.info(`Stragan ${stallNumber}: obsłużono ${handled} slotów, błędów: ${errors}`);
    return { handled, errors };
  }

  /**
   * Wykonuje pełny cykl straganów
   */
  async runCycle() {
    this.log.info('Rozpoczynam cykl straganów...');
    
    const slotConfig = this.getSlotConfig();
    
    const results = {
      stall1: null,
      stall2: null,
      totalHandled: 0,
      totalErrors: 0,
    };
    
    await this.navigateToFarmView();
    await this.session.closePopups();
    
    // Stragan 1
    if (slotConfig.stall1) {
      results.stall1 = await this.handleStall(1, slotConfig.stall1);
      results.totalHandled += results.stall1.handled;
      results.totalErrors += results.stall1.errors;
    }
    
    await this.session.randomDelay(500, 1000);
    await this.navigateToFarmView();
    await this.session.closePopups();
    
    // Stragan 2
    if (slotConfig.stall2) {
      results.stall2 = await this.handleStall(2, slotConfig.stall2);
      results.totalHandled += results.stall2.handled;
      results.totalErrors += results.stall2.errors;
    }
    
    logAction(
      this.account.id, 
      'stalls_cycle', 
      `Obsłużono ${results.totalHandled} slotów w straganach`, 
      results.totalErrors === 0
    );
    
    this.log.info(`Cykl straganów zakończony: ${results.totalHandled} slotów obsłużonych`);
    
    return results;
  }

  /**
   * Pobiera aktualny status wszystkich straganów (do wyświetlenia na dashboardzie)
   */
  async getAllStallsStatus() {
    this.log.info('Pobieranie statusu straganów...');
    
    await this.navigateToFarmView();
    await this.session.closePopups();
    
    const stallsStatus = [];
    
    for (const stallNum of [1, 2]) {
      const opened = await this.openStall(stallNum);
      if (opened) {
        const status = await this.getStallStatus(stallNum);
        stallsStatus.push(status);
        await this.closeStall();
        await this.session.randomDelay(300, 500);
      }
    }
    
    return stallsStatus;
  }
}

export default StallsModule;
