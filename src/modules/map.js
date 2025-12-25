/**
 * Moduł mapy i straganów
 * Wolni Farmerzy - stragany dostępne przez mapę lub speedlinki
 * Stragany: #map_stall_overview_link_tt1, #map_stall_overview_link_alert1
 */
import { config } from '../config.js';
import { logAction } from '../database.js';

/**
 * Klasa obsługująca mapę i stragany
 */
export class MapModule {
  constructor(browserSession, accountData) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
  }

  /**
   * Nawiguje do widoku mapy
   */
  async navigateToMap() {
    this.log.info('Nawigacja do mapy...');
    
    const page = this.session.page;
    await this.session.closePopups();
    
    // Menu mapy
    try {
      await page.click('#mainmenue4', { timeout: 5000 });
      await this.session.randomDelay(1000, 2000);
      await this.session.waitForPageReady();
      this.log.info('Przeszliśmy do mapy');
      return true;
    } catch (e) {
      this.log.debug('Nie udało się kliknąć #mainmenue4');
    }
    
    this.log.warn('Nie znaleziono przycisku mapy');
    return false;
  }

  /**
   * Nawiguje do straganu używając speedlinków lub mapy
   */
  async navigateToStall(stallNumber = 1) {
    this.log.info(`Nawigacja do straganu ${stallNumber}...`);
    
    const page = this.session.page;
    await this.session.closePopups();
    
    // Spróbuj speedlink do straganu
    const stallSpeedlinks = [
      `#speedlink_stall${stallNumber}`,
      `#map_stall_overview_link_tt${stallNumber}`,
      `[onclick*="stall"][onclick*="${stallNumber}"]`,
    ];
    
    for (const selector of stallSpeedlinks) {
      try {
        const link = await page.$(selector);
        if (link) {
          await link.click();
          await this.session.randomDelay(1000, 2000);
          await this.session.waitForPageReady();
          this.log.info(`Przeszliśmy do straganu ${stallNumber}`);
          return true;
        }
      } catch (e) {}
    }
    
    // Jeśli nie ma speedlinka, przejdź przez mapę
    await this.navigateToMap();
    await this.session.randomDelay(500, 1000);
    
    // Kliknij na stragan na mapie
    const mapStallSelectors = [
      `#stall${stallNumber}`,
      `area[onclick*="stall${stallNumber}"]`,
      `.stall_${stallNumber}`,
    ];
    
    for (const selector of mapStallSelectors) {
      try {
        const stall = await page.$(selector);
        if (stall) {
          await stall.click();
          await this.session.randomDelay(1000, 2000);
          await this.session.waitForPageReady();
          this.log.info(`Przeszliśmy do straganu ${stallNumber} przez mapę`);
          return true;
        }
      } catch (e) {}
    }
    
    this.log.warn(`Nie znaleziono straganu ${stallNumber}`);
    return false;
  }

  /**
   * Skanuje dostępne stragany (szuka alertów o pustych slotach)
   */
  async scanStalls() {
    this.log.info('Skanowanie straganów...');
    
    await this.session.closePopups();
    
    const stalls = [];
    const page = this.session.page;
    
    // Szukaj alertów o straganach: #map_stall_overview_link_alert1, etc.
    for (let i = 1; i <= 10; i++) {
      try {
        const alertSelector = `#map_stall_overview_link_alert${i}`;
        const alert = await page.$(alertSelector);
        
        if (alert) {
          const hasEmptySlot = await alert.isVisible();
          stalls.push({
            number: i,
            hasAlert: hasEmptySlot,
          });
          
          if (hasEmptySlot) {
            this.log.info(`Stragan ${i} ma puste sloty!`);
          }
        }
      } catch (e) {}
    }
    
    // Alternatywne selektory
    const stallSelectors = [
      '[id^="map_stall"]',
      '[id^="stall"]',
      '.stall',
    ];
    
    for (const selector of stallSelectors) {
      try {
        const stallElements = await page.$$(selector);
        
        if (stallElements.length > 0) {
          this.log.info(`Znaleziono ${stallElements.length} straganów`);
          
          for (let i = 0; i < stallElements.length; i++) {
            const stallData = await this.analyzeStall(stallElements[i], i);
            if (stallData) {
              stalls.push(stallData);
            }
          }
          
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    this.log.info(`Przeskanowano ${stalls.length} straganów`);
    return stalls;
  }

  /**
   * Analizuje pojedynczy stragan
   */
  async analyzeStall(stallElement, index) {
    try {
      const stallData = {
        index,
        status: 'unknown',
        needsFilling: false,
        requiredItems: [],
        isFull: false,
        reward: null,
      };

      const className = await stallElement.getAttribute('class') || '';
      
      if (className.includes('empty') || className.includes('needs')) {
        stallData.status = 'needs_filling';
        stallData.needsFilling = true;
      } else if (className.includes('full') || className.includes('complete')) {
        stallData.status = 'full';
        stallData.isFull = true;
      } else if (className.includes('ready') || className.includes('reward')) {
        stallData.status = 'ready';
      }

      // Szukaj wymaganych przedmiotów
      const itemSelectors = ['.required-item', '.item-needed', '[class*="item"]'];
      for (const selector of itemSelectors) {
        try {
          const items = await stallElement.$$(selector);
          for (const item of items) {
            const itemName = await item.textContent();
            const itemImg = await item.$('img');
            const itemAlt = itemImg ? await itemImg.getAttribute('alt') : null;
            
            stallData.requiredItems.push({
              name: itemAlt || itemName?.trim(),
              fulfilled: (await item.getAttribute('class') || '').includes('fulfilled')
            });
          }
        } catch (e) {
          continue;
        }
      }

      // Szukaj nagrody
      const rewardSelectors = ['.reward', '.prize', '[class*="reward"]'];
      for (const selector of rewardSelectors) {
        try {
          const reward = await stallElement.$(selector);
          if (reward) {
            stallData.reward = await reward.textContent();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      return stallData;
      
    } catch (error) {
      this.log.warn(`Błąd analizy straganu ${index}: ${error.message}`);
      return null;
    }
  }

  /**
   * Uzupełnia stragany dostępnymi przedmiotami
   */
  async fillStalls() {
    this.log.info('Uzupełnianie straganów...');
    
    let filledCount = 0;
    const stalls = await this.scanStalls();
    
    for (const stall of stalls) {
      if (stall.needsFilling || stall.status === 'needs_filling') {
        const success = await this.fillStall(stall.index);
        if (success) {
          filledCount++;
        }
      }
    }
    
    this.log.info(`Uzupełniono ${filledCount} straganów`);
    logAction(this.account.id, 'fill_stall', `Uzupełniono ${filledCount} straganów`, true);
    
    return filledCount;
  }

  /**
   * Uzupełnia pojedynczy stragan
   */
  async fillStall(stallIndex) {
    try {
      this.log.debug(`Uzupełnianie straganu ${stallIndex}...`);
      
      const stallSelectors = ['.stall', '.market-stall', '[class*="stall"]'];
      
      for (const selector of stallSelectors) {
        const stalls = await this.session.page.$$(selector);
        if (stalls[stallIndex]) {
          await stalls[stallIndex].click();
          await this.session.randomDelay(500, 1000);
          
          // Szukaj przycisków uzupełniania
          const fillBtnSelectors = [
            'button:has-text("Uzupełnij")',
            'button:has-text("Wypełnij")',
            'button:has-text("Fill")',
            'button:has-text("Dostarcz")',
            '.fill-btn',
            '.btn-fill',
            '.supply-btn',
            '[class*="fill"]',
            'button:has-text("Dodaj")',
          ];
          
          let filled = false;
          for (const btnSelector of fillBtnSelectors) {
            const clicked = await this.session.safeClick(btnSelector);
            if (clicked) {
              filled = true;
              await this.session.randomDelay();
            }
          }
          
          // Zamknij okno straganu
          await this.session.safeClick('.close, .modal-close, button:has-text("Zamknij")');
          
          return filled;
        }
      }
      
      return false;
    } catch (error) {
      this.log.warn(`Błąd uzupełniania straganu ${stallIndex}: ${error.message}`);
      return false;
    }
  }

  /**
   * Odbiera nagrody z gotowych straganów
   */
  async collectRewards() {
    this.log.info('Odbieranie nagród ze straganów...');
    
    let collectedCount = 0;
    const stalls = await this.scanStalls();
    
    for (const stall of stalls) {
      if (stall.status === 'ready' || stall.isFull) {
        const success = await this.collectReward(stall.index);
        if (success) {
          collectedCount++;
        }
      }
    }
    
    this.log.info(`Odebrano ${collectedCount} nagród`);
    logAction(this.account.id, 'collect_reward', `Odebrano ${collectedCount} nagród ze straganów`, true);
    
    return collectedCount;
  }

  /**
   * Odbiera nagrodę z pojedynczego straganu
   */
  async collectReward(stallIndex) {
    try {
      this.log.debug(`Odbieranie nagrody ze straganu ${stallIndex}...`);
      
      const stallSelectors = ['.stall', '.market-stall', '[class*="stall"]'];
      
      for (const selector of stallSelectors) {
        const stalls = await this.session.page.$$(selector);
        if (stalls[stallIndex]) {
          await stalls[stallIndex].click();
          await this.session.randomDelay(500, 1000);
          
          const collectBtnSelectors = [
            'button:has-text("Odbierz")',
            'button:has-text("Collect")',
            'button:has-text("Zabierz")',
            '.collect-btn',
            '.btn-collect',
            '.reward-btn',
            '[class*="collect"]',
          ];
          
          for (const btnSelector of collectBtnSelectors) {
            const clicked = await this.session.safeClick(btnSelector);
            if (clicked) {
              await this.session.randomDelay();
              return true;
            }
          }
          
          // Zamknij okno
          await this.session.safeClick('.close, .modal-close');
          break;
        }
      }
      
      return false;
    } catch (error) {
      this.log.warn(`Błąd odbierania nagrody ${stallIndex}: ${error.message}`);
      return false;
    }
  }

  /**
   * Wykonuje pełny cykl mapy
   */
  async runCycle() {
    this.log.info('Rozpoczynam cykl mapy...');
    
    const navigated = await this.navigateToMap();
    if (!navigated) {
      return { error: 'Nie udało się przejść do mapy' };
    }
    
    await this.session.closePopups();
    
    // 1. Odbierz nagrody
    const collected = await this.collectRewards();
    
    // 2. Uzupełnij stragany
    const filled = await this.fillStalls();
    
    // 3. Przeskanuj stragany końcowo
    const stalls = await this.scanStalls();
    
    return {
      collected,
      filled,
      stalls
    };
  }
}

export default MapModule;
