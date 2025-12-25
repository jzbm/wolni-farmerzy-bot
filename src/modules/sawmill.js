/**
 * Moduł tartaku/leśnictwa - obsługa drzew
 * Wolni Farmerzy - nawigacja przez speedlink #speedlink_forestry
 */
import { config } from '../config.js';
import { updateField, logAction, scheduleTask } from '../database.js';

/**
 * Klasa obsługująca tartak/leśnictwo
 */
export class SawmillModule {
  constructor(browserSession, accountData) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
  }

  /**
   * Nawiguje do widoku tartaku/leśnictwa używając speedlinka
   */
  async navigateToSawmill() {
    this.log.info('Nawigacja do tartaku...');
    
    const page = this.session.page;
    await this.session.closePopups();
    
    // Użyj speedlinka do tartaku
    try {
      const speedlink = await page.$('#speedlink_forestry');
      if (speedlink) {
        await speedlink.click();
        await this.session.randomDelay(1000, 2000);
        await this.session.waitForPageReady();
        this.log.info('Przeszliśmy do tartaku przez speedlink');
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd speedlinka forestry: ${e.message}`);
    }
    
    // Alternatywne metody
    const sawmillSelectors = [
      '#mainmenue5', // Menu tartaku
      '#forestry',
      '[onclick*="forestry"]',
      'area[onclick*="forestry"]',
      '#map_forestry',
    ];
    
    for (const selector of sawmillSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          await this.session.randomDelay(1000, 2000);
          await this.session.waitForPageReady();
          this.log.info('Przeszło do tartaku');
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    this.log.warn('Nie znaleziono tartaku');
    return false;
  }

  /**
   * Skanuje sloty drzew
   */
  async scanTreeSlots() {
    this.log.info('Skanowanie slotów drzew...');
    
    await this.session.closePopups();
    
    const slots = [];
    const page = this.session.page;
    
    // Szukaj elementów drzew
    const slotSelectors = [
      '[id^="tree"]',
      '.forestry_tree',
      '.tree-slot',
      '[class*="tree"]',
    ];
    
    for (const selector of slotSelectors) {
      try {
        const slotElements = await page.$$(selector);
        
        if (slotElements.length > 0) {
          this.log.info(`Znaleziono ${slotElements.length} slotów drzew`);
          
          for (let i = 0; i < slotElements.length; i++) {
            const slotData = await this.analyzeTreeSlot(slotElements[i], i);
            if (slotData) {
              slots.push(slotData);
              
              updateField(this.account.id, i, 'sawmill', {
                plant: slotData.treeType,
                plantedAt: slotData.plantedAt,
                harvestAt: slotData.harvestAt,
                status: slotData.status
              });
            }
          }
          
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    this.log.info(`Przeskanowano ${slots.length} slotów`);
    return slots;
  }

  /**
   * Analizuje pojedynczy slot drzewa
   */
  async analyzeTreeSlot(slotElement, index) {
    try {
      const slotData = {
        index,
        status: 'unknown',
        treeType: null,
        timeRemaining: null,
        harvestAt: null,
        plantedAt: null,
        isReady: false,
        isEmpty: false,
      };

      const className = await slotElement.getAttribute('class') || '';
      const dataTree = await slotElement.getAttribute('data-tree');
      
      if (className.includes('empty') || className.includes('free')) {
        slotData.status = 'empty';
        slotData.isEmpty = true;
      } else if (className.includes('ready') || className.includes('grown')) {
        slotData.status = 'ready';
        slotData.isReady = true;
      } else if (className.includes('growing') || className.includes('planted')) {
        slotData.status = 'growing';
      }
      
      if (dataTree) {
        slotData.treeType = dataTree;
      }

      // Szukaj timera
      const timerSelectors = ['.timer', '.countdown', '[class*="time"]'];
      for (const selector of timerSelectors) {
        try {
          const timer = await slotElement.$(selector);
          if (timer) {
            const timeText = await timer.textContent();
            slotData.timeRemaining = this.parseTimeString(timeText);
            if (slotData.timeRemaining > 0) {
              slotData.status = 'growing';
              slotData.harvestAt = new Date(Date.now() + slotData.timeRemaining * 1000).toISOString();
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }

      return slotData;
      
    } catch (error) {
      this.log.warn(`Błąd analizy slotu ${index}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parsuje string czasu do sekund
   */
  parseTimeString(timeStr) {
    if (!timeStr) return 0;
    
    const cleanStr = timeStr.trim();
    
    const hmsMatch = cleanStr.match(/(\d+):(\d+):(\d+)/);
    if (hmsMatch) {
      return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
    }
    
    const msMatch = cleanStr.match(/(\d+):(\d+)/);
    if (msMatch) {
      return parseInt(msMatch[1]) * 60 + parseInt(msMatch[2]);
    }
    
    let seconds = 0;
    const hoursMatch = cleanStr.match(/(\d+)\s*[hg]/i);
    const minsMatch = cleanStr.match(/(\d+)\s*m/i);
    const secsMatch = cleanStr.match(/(\d+)\s*s/i);
    
    if (hoursMatch) seconds += parseInt(hoursMatch[1]) * 3600;
    if (minsMatch) seconds += parseInt(minsMatch[1]) * 60;
    if (secsMatch) seconds += parseInt(secsMatch[1]);
    
    return seconds;
  }

  /**
   * Ścina gotowe drzewa
   */
  async cutReadyTrees() {
    this.log.info('Ścinanie gotowych drzew...');
    
    let cutCount = 0;
    const slots = await this.scanTreeSlots();
    
    for (const slot of slots) {
      if (slot.isReady || slot.status === 'ready') {
        const success = await this.cutTree(slot.index);
        if (success) {
          cutCount++;
        }
      }
    }
    
    this.log.info(`Ścięto ${cutCount} drzew`);
    logAction(this.account.id, 'cut_tree', `Ścięto ${cutCount} drzew`, true);
    
    return cutCount;
  }

  /**
   * Ścina pojedyncze drzewo
   */
  async cutTree(slotIndex) {
    try {
      this.log.debug(`Ścinanie drzewa ${slotIndex}...`);
      
      const slotSelectors = ['.tree-slot', '.tree', '[class*="tree"]'];
      
      for (const selector of slotSelectors) {
        const slots = await this.session.page.$$(selector);
        if (slots[slotIndex]) {
          await slots[slotIndex].click();
          await this.session.randomDelay(500, 1000);
          
          const cutBtnSelectors = [
            'button:has-text("Ścinaj")',
            'button:has-text("Tnij")',
            'button:has-text("Cut")',
            '.cut-btn',
            '.btn-cut',
            '[class*="cut"]',
          ];
          
          for (const btnSelector of cutBtnSelectors) {
            const clicked = await this.session.safeClick(btnSelector);
            if (clicked) {
              await this.session.randomDelay();
              
              updateField(this.account.id, slotIndex, 'sawmill', {
                plant: null,
                plantedAt: null,
                harvestAt: null,
                status: 'empty'
              });
              
              return true;
            }
          }
          
          break;
        }
      }
      
      return false;
    } catch (error) {
      this.log.warn(`Błąd ścinania drzewa ${slotIndex}: ${error.message}`);
      return false;
    }
  }

  /**
   * Sadzi drzewa na pustych slotach
   */
  async plantTrees(treeType = 'sosna') {
    this.log.info(`Sadzenie ${treeType} na pustych slotach...`);
    
    let plantedCount = 0;
    const slots = await this.scanTreeSlots();
    
    for (const slot of slots) {
      if (slot.isEmpty || slot.status === 'empty') {
        const success = await this.plantTree(slot.index, treeType);
        if (success) {
          plantedCount++;
        }
      }
    }
    
    this.log.info(`Zasadzono ${plantedCount} drzew`);
    logAction(this.account.id, 'plant_tree', `Zasadzono ${plantedCount} drzew (${treeType})`, true);
    
    return plantedCount;
  }

  /**
   * Sadzi drzewo na pojedynczym slocie
   */
  async plantTree(slotIndex, treeType) {
    try {
      this.log.debug(`Sadzenie ${treeType} na slocie ${slotIndex}...`);
      
      const slotSelectors = ['.tree-slot', '.tree', '[class*="tree"]'];
      
      for (const selector of slotSelectors) {
        const slots = await this.session.page.$$(selector);
        if (slots[slotIndex]) {
          await slots[slotIndex].click();
          await this.session.randomDelay(500, 1000);
          
          const treeSelectors = [
            `[data-tree="${treeType}"]`,
            `img[alt*="${treeType}"]`,
            `button:has-text("${treeType}")`,
            `.tree-${treeType}`,
            `[class*="${treeType}"]`,
          ];
          
          for (const treeSelector of treeSelectors) {
            const clicked = await this.session.safeClick(treeSelector);
            if (clicked) {
              await this.session.randomDelay();
              
              const growthTime = config.plantGrowthTimes[treeType] || 600;
              const harvestAt = new Date(Date.now() + growthTime * 1000);
              
              updateField(this.account.id, slotIndex, 'sawmill', {
                plant: treeType,
                plantedAt: new Date().toISOString(),
                harvestAt: harvestAt.toISOString(),
                status: 'growing'
              });
              
              scheduleTask(
                this.account.id,
                'cut_tree',
                harvestAt.toISOString(),
                slotIndex,
                { treeType, fieldType: 'sawmill' }
              );
              
              return true;
            }
          }
          
          break;
        }
      }
      
      return false;
    } catch (error) {
      this.log.warn(`Błąd sadzenia drzewa ${slotIndex}: ${error.message}`);
      return false;
    }
  }

  /**
   * Obsługuje budynki tartaku
   */
  async processBuildings() {
    this.log.info('Obsługa budynków tartaku...');
    
    let processedCount = 0;
    
    const buildingSelectors = [
      '.sawmill-building',
      '.building',
      '[class*="building"]',
      '[data-type="building"]',
    ];
    
    for (const selector of buildingSelectors) {
      try {
        const buildings = await this.session.page.$$(selector);
        
        for (let i = 0; i < buildings.length; i++) {
          const building = buildings[i];
          const className = await building.getAttribute('class') || '';
          
          // Sprawdź czy budynek ma gotową produkcję
          if (className.includes('ready') || className.includes('done')) {
            await building.click();
            await this.session.randomDelay(500, 1000);
            
            // Szukaj przycisku odbioru
            const collectClicked = await this.session.safeClick(
              'button:has-text("Odbierz"), button:has-text("Collect"), .collect-btn'
            );
            
            if (collectClicked) {
              processedCount++;
              await this.session.randomDelay();
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    this.log.info(`Obsłużono ${processedCount} budynków`);
    logAction(this.account.id, 'building', `Obsłużono ${processedCount} budynków`, true);
    
    return processedCount;
  }

  /**
   * Wykonuje pełny cykl tartaku
   */
  async runCycle(preferredTree = 'sosna') {
    this.log.info('Rozpoczynam cykl tartaku...');
    
    const navigated = await this.navigateToSawmill();
    if (!navigated) {
      return { error: 'Nie udało się przejść do tartaku' };
    }
    
    await this.session.closePopups();
    
    // 1. Ścinaj gotowe drzewa
    const cut = await this.cutReadyTrees();
    
    // 2. Obsłuż budynki
    const buildings = await this.processBuildings();
    
    // 3. Zasadź nowe drzewa
    const planted = await this.plantTrees(preferredTree);
    
    // 4. Przeskanuj sloty końcowo
    const slots = await this.scanTreeSlots();
    
    return {
      cut,
      buildings,
      planted,
      slots,
      nextHarvest: this.getNextHarvestTime(slots)
    };
  }

  /**
   * Oblicza czas następnego zbioru
   */
  getNextHarvestTime(slots) {
    let nextTime = null;
    
    for (const slot of slots) {
      if (slot.harvestAt) {
        const harvestDate = new Date(slot.harvestAt);
        if (!nextTime || harvestDate < nextTime) {
          nextTime = harvestDate;
        }
      }
    }
    
    return nextTime;
  }
}

export default SawmillModule;
