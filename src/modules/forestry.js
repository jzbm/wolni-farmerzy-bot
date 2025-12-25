/**
 * Moduł tartaku (Forestry) - obsługa drzew i produkcji drewna
 * Wolni Farmerzy - struktura:
 * - Nawigacja: #speedlink_forestry
 * - 25 pól z drzewami: #forestry_pos_status1 do #forestry_pos_status25
 * - Przyciski główne:
 *   - #forestry_forest_button1 - Podlej wszystkie (forestryWater())
 *   - #forestry_forest_button2 - Zbierz wszystkie (forestryAjaxAction('cropall'))
 *   - #forestry_forest_button3 - Nawoź (forestryFertilize())
 *   - #forestry_forest_button6 - Pomocnik w sadzeniu (forestryAutoplant())
 * - Wybór sadzonki: #forestry_stock1_select → #f_stock_item{1-10}
 * - 2 budynki produkcyjne:
 *   - Tartak (building 1): #forestry_building_click1
 *   - Stolarnia (building 2): #forestry_building_click2
 * 
 * Typy drzew (ID):
 * 1=Świerk (10h), 2=Brzoza (16h), 3=Buk (36h), 4=Topola (8h),
 * 5=Kasztan, 7=Dąb, 8=Jesion, 9=Klon, 10=Wierzba
 */
import { config } from '../config.js';
import { logAction } from '../database.js';

export class ForestryModule {
  constructor(browserSession, accountData) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
    this.currentBuilding = null; // 1 = Tartak, 2 = Stolarnia
    
    // Mapa typów drzew
    this.treeTypes = {
      'swierk': 1, 'świerk': 1, 'spruce': 1,
      'brzoza': 2, 'birch': 2,
      'buk': 3, 'beech': 3,
      'topola': 4, 'poplar': 4,
      'kasztan': 5, 'chestnut': 5,
      'dab': 7, 'dąb': 7, 'oak': 7,
      'jesion': 8, 'ash': 8,
      'klon': 9, 'maple': 9,
      'wierzba': 10, 'willow': 10,
    };
  }

  /**
   * Nawiguje do tartaku używając speedlinka
   */
  async navigateToForestry() {
    this.log.info('Nawigacja do tartaku...');
    
    const page = this.session.page;
    await this.session.closePopups();
    
    try {
      const speedlink = await page.$('#speedlink_forestry');
      if (speedlink) {
        await speedlink.click();
        await this.session.randomDelay(1000, 2000);
        await this.session.waitForPageReady();
        this.currentBuilding = null;
        this.log.info('Przeszliśmy do tartaku');
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd nawigacji do tartaku: ${e.message}`);
    }
    
    // Alternatywnie - przez menu
    try {
      await page.click('#mainmenue1', { timeout: 3000 });
      await this.session.randomDelay(500, 1000);
      await page.click('#speedlink_forestry', { timeout: 3000 });
      await this.session.randomDelay(1000, 2000);
      this.currentBuilding = null;
      this.log.info('Przeszliśmy do tartaku (przez menu)');
      return true;
    } catch (e) {
      this.log.warn('Nie udało się przejść do tartaku');
      return false;
    }
  }

  /**
   * Zbiera wszystkie gotowe drzewa jednym kliknięciem
   * Używa przycisku #forestry_forest_button2 (Zbierz wszystkie)
   */
  async harvestAllTrees() {
    const page = this.session.page;
    this.log.info('Zbieranie wszystkich gotowych drzew...');
    
    try {
      const harvestBtn = await page.$('#forestry_forest_button2');
      if (harvestBtn) {
        await harvestBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('Użyto "Zbierz wszystkie" drzewa');
        
        // Obsłuż popup jeśli się pojawi
        await this.handleGlobalPopup();
        
        return true;
      }
      
      this.log.debug('Nie znaleziono przycisku zbierania');
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd zbierania drzew: ${e.message}`);
      return false;
    }
  }

  /**
   * Otwiera okno wyboru sadzonki
   */
  async openSeedlingSelection() {
    const page = this.session.page;
    
    try {
      const selectBtn = await page.$('#forestry_stock1_select');
      if (selectBtn) {
        await selectBtn.click();
        await this.session.randomDelay(500, 1000);
        this.log.debug('Otwarto okno wyboru sadzonki');
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd otwierania wyboru sadzonki: ${e.message}`);
    }
    
    return false;
  }

  /**
   * Wybiera typ sadzonki do posadzenia
   * @param {string|number} treeType - nazwa lub ID drzewa (np. 'swierk', 1, 'topola', 4)
   */
  async selectSeedling(treeType = 'swierk') {
    const page = this.session.page;
    
    // Konwertuj nazwę na ID
    let treeId = typeof treeType === 'number' ? treeType : this.treeTypes[treeType.toLowerCase()];
    if (!treeId) treeId = 1; // Domyślnie świerk
    
    this.log.info(`Wybieranie sadzonki: ID ${treeId}...`);
    
    // Otwórz okno wyboru sadzonki
    const opened = await this.openSeedlingSelection();
    if (!opened) {
      this.log.debug('Nie udało się otworzyć wyboru sadzonki');
      return false;
    }
    
    await this.session.randomDelay(500, 1000);
    
    try {
      // Kliknij na wybraną sadzonkę: #f_stock_item{ID}
      const itemSelector = `#f_stock_item${treeId}`;
      const stockItem = await page.$(itemSelector);
      
      if (stockItem) {
        // Sprawdź czy mamy sadzonki tego typu
        const amountSelector = `#f_stock_amount_${treeId}`;
        const amount = await page.$eval(amountSelector, el => parseInt(el.textContent || '0')).catch(() => 0);
        
        if (amount <= 0) {
          this.log.warn(`Brak sadzonek typu ${treeId}`);
          return false;
        }
        
        await stockItem.click();
        await this.session.randomDelay(500, 1000);
        this.log.info(`Wybrano sadzonkę ID ${treeId} (dostępne: ${amount})`);
        return true;
      }
      
      this.log.debug(`Nie znaleziono sadzonki: ${itemSelector}`);
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd wybierania sadzonki: ${e.message}`);
      return false;
    }
  }

  /**
   * Sadzi drzewa używając pomocnika do sadzenia
   * Używa przycisku #forestry_forest_button6 (Pomocnik w sadzeniu)
   */
  async plantAllTrees() {
    const page = this.session.page;
    this.log.info('Sadzenie drzew pomocnikiem...');
    
    try {
      const plantBtn = await page.$('#forestry_forest_button6');
      if (plantBtn) {
        await plantBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('Użyto "Pomocnik w sadzeniu"');
        
        // Obsłuż popup ze szkodnikiem jeśli się pojawi
        let pestHandled = await this.handlePestPopup();
        let attempts = 0;
        
        // Powtarzaj dopóki są szkodniki (max 25 razy)
        while (pestHandled && attempts < 25) {
          this.log.debug('Obsłużono szkodnika, próbuję posadzić ponownie...');
          await this.session.randomDelay(500, 1000);
          
          // Kliknij ponownie pomocnika do sadzenia
          const plantBtnRetry = await page.$('#forestry_forest_button6');
          if (plantBtnRetry) {
            await plantBtnRetry.click();
            await this.session.randomDelay(1000, 2000);
          }
          
          pestHandled = await this.handlePestPopup();
          attempts++;
        }
        
        // Obsłuż inne popupy
        await this.handleGlobalPopup();
        
        return true;
      }
      
      this.log.debug('Nie znaleziono przycisku pomocnika sadzenia');
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd sadzenia drzew: ${e.message}`);
      return false;
    }
  }

  /**
   * Podlewa wszystkie drzewa
   * Używa przycisku #forestry_forest_button1 (Nawodnij)
   * Możliwe co 24h
   */
  async waterAllTrees() {
    const page = this.session.page;
    this.log.info('Podlewanie wszystkich drzew...');
    
    try {
      const waterBtn = await page.$('#forestry_forest_button1');
      if (waterBtn) {
        await waterBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('Użyto "Nawodnij" drzewa');
        
        // Obsłuż popup (może być info że już podlane dzisiaj)
        await this.handleGlobalPopup();
        
        return true;
      }
      
      this.log.debug('Nie znaleziono przycisku podlewania');
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd podlewania drzew: ${e.message}`);
      return false;
    }
  }

  /**
   * Obsługuje popup ze szkodnikiem ("Wyczyścić pole?")
   * @returns {boolean} true jeśli był i został obsłużony szkodnik
   */
  async handlePestPopup() {
    const page = this.session.page;
    
    try {
      await this.session.randomDelay(300, 500);
      
      const globalbox = await page.$('#globalbox');
      if (!globalbox || !(await globalbox.isVisible())) {
        return false;
      }
      
      const content = await page.$eval('#globalbox_content', el => el.textContent || '').catch(() => '');
      const headline = await page.$eval('#globalbox_headline', el => el.textContent || '').catch(() => '');
      
      // Sprawdź czy to popup ze szkodnikiem
      if (headline.includes('Wyczyścić pole') || content.includes('Wywab natręta') || content.includes('szkodnik')) {
        // Kliknij "Tak" aby usunąć szkodnika
        const yesBtn = await page.$('#globalbox_button1');
        if (yesBtn) {
          await yesBtn.click();
          await this.session.randomDelay(500, 1000);
          this.log.info('Usunięto szkodnika z pola');
          return true;
        }
      }
    } catch (e) {}
    
    return false;
  }

  /**
   * Obsługuje ogólne popupy (potwierdzenia, błędy)
   */
  async handleGlobalPopup() {
    const page = this.session.page;
    
    try {
      await this.session.randomDelay(300, 500);
      
      const globalbox = await page.$('#globalbox');
      if (!globalbox || !(await globalbox.isVisible())) {
        return false;
      }
      
      // Zamknij popup
      const closeBtn = await page.$('#globalbox_button1');
      if (closeBtn && await closeBtn.isVisible()) {
        await closeBtn.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
      
      const closeX = await page.$('#globalbox_close');
      if (closeX && await closeX.isVisible()) {
        await closeX.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
    } catch (e) {}
    
    return false;
  }

  /**
   * Sprawdza stan pola z drzewem (1-25)
   * @returns {Object} { status: 'growing'|'ready'|'empty'|'pest', timeLeft: string|null }
   */
  async getTreeFieldStatus(fieldNum) {
    const page = this.session.page;
    
    try {
      const infoSelector = `#forestry_pos_info${fieldNum}`;
      const statusSelector = `#forestry_pos_status${fieldNum}`;
      
      const fieldInfo = await page.evaluate((infoSel, statusSel, num) => {
        const info = document.querySelector(infoSel);
        const status = document.querySelector(statusSel);
        
        // Sprawdź info (zawiera nazwę drzewa i status "Gotowe!")
        const infoText = info ? (info.innerText || info.textContent || '') : '';
        const isReady = infoText.includes('Gotowe');
        
        // Sprawdź czy jest drzewo (crop element)
        const crop = document.querySelector(`#forestry_pos_crop${num}`);
        const hasCrop = crop && crop.className && crop.className.length > 0;
        
        // Sprawdź timer w statusie
        const statusText = status ? (status.innerText || status.textContent || '') : '';
        const timerMatch = statusText.match(/(\d{2}:\d{2}:\d{2})/);
        
        // Sprawdź blokadę/szkodnika
        const block = document.querySelector(`#forestry_pos_block${num}`);
        const isBlocked = block && block.style.display !== 'none';
        
        return {
          infoText: infoText.substring(0, 100),
          isReady: isReady,
          hasCrop: hasCrop,
          timer: timerMatch ? timerMatch[1] : null,
          isBlocked: isBlocked
        };
      }, infoSelector, statusSelector, fieldNum);
      
      if (!fieldInfo) {
        return { status: 'unknown', timeLeft: null };
      }
      
      if (fieldInfo.isBlocked) {
        return { status: 'pest', timeLeft: null };
      }
      
      if (fieldInfo.isReady) {
        return { status: 'ready', timeLeft: '00:00:00' };
      }
      
      if (fieldInfo.timer) {
        if (fieldInfo.timer === '00:00:00') {
          return { status: 'ready', timeLeft: '00:00:00' };
        }
        return { status: 'growing', timeLeft: fieldInfo.timer };
      }
      
      if (fieldInfo.hasCrop) {
        return { status: 'growing', timeLeft: null };
      }
      
      return { status: 'empty', timeLeft: null };
      
    } catch (e) {
      this.log.debug(`Błąd sprawdzania pola drzewa ${fieldNum}: ${e.message}`);
      return { status: 'unknown', timeLeft: null };
    }
  }

  /**
   * Sprawdza stan wszystkich 25 pól z drzewami
   */
  async getAllTreeFieldsStatus() {
    const statuses = [];
    
    for (let i = 1; i <= 25; i++) {
      const status = await this.getTreeFieldStatus(i);
      statuses.push({
        field: i,
        ...status
      });
    }
    
    // Podsumowanie
    const summary = {
      ready: statuses.filter(s => s.status === 'ready').length,
      growing: statuses.filter(s => s.status === 'growing').length,
      empty: statuses.filter(s => s.status === 'empty').length,
      pest: statuses.filter(s => s.status === 'pest').length,
    };
    
    this.log.info(`Pola drzew: ${summary.ready} gotowe, ${summary.growing} rośnie, ${summary.empty} puste, ${summary.pest} ze szkodnikiem`);
    
    return { fields: statuses, summary };
  }

  /**
   * Pobiera dostępne sadzonki i ich ilości
   */
  async getAvailableSeedlings() {
    const page = this.session.page;
    const seedlings = [];
    
    const treeNames = {
      1: 'Świerk', 2: 'Brzoza', 3: 'Buk', 4: 'Topola',
      5: 'Kasztan', 7: 'Dąb', 8: 'Jesion', 9: 'Klon', 10: 'Wierzba'
    };
    
    for (const [id, name] of Object.entries(treeNames)) {
      try {
        const amountSelector = `#f_stock_amount_${id}`;
        const amount = await page.$eval(amountSelector, el => parseInt(el.textContent || '0')).catch(() => 0);
        
        seedlings.push({
          id: parseInt(id),
          name: name,
          amount: amount
        });
      } catch (e) {}
    }
    
    return seedlings.filter(s => s.amount > 0);
  }

  /**
   * Wchodzi do budynku produkcyjnego
   * @param {number} buildingNum - 1 = Tartak, 2 = Stolarnia
   */
  async enterBuilding(buildingNum) {
    const page = this.session.page;
    
    if (buildingNum < 1 || buildingNum > 2) {
      this.log.warn('Nieprawidłowy numer budynku (1-2)');
      return false;
    }
    
    const buildingNames = { 1: 'Tartak', 2: 'Stolarnia' };
    this.log.info(`Wchodzenie do budynku: ${buildingNames[buildingNum]}...`);
    
    try {
      const clickSelector = `#forestry_building_click${buildingNum}`;
      const building = await page.$(clickSelector);
      
      if (building) {
        await building.click();
        await this.session.randomDelay(1000, 2000);
        await this.session.waitForPageReady();
        this.currentBuilding = buildingNum;
        this.log.info(`Weszliśmy do budynku ${buildingNames[buildingNum]}`);
        return true;
      }
      
      this.log.debug(`Nie znaleziono budynku: ${clickSelector}`);
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd wchodzenia do budynku ${buildingNum}: ${e.message}`);
      return false;
    }
  }

  /**
   * Wychodzi z budynku produkcyjnego
   */
  async exitBuilding() {
    const page = this.session.page;
    
    try {
      // Najpierw zamknij ewentualne okno wyboru produkcji
      const closeSelection = await page.$('[onclick*="closeForestrySelection"]');
      if (closeSelection && await closeSelection.isVisible()) {
        await closeSelection.click();
        await this.session.randomDelay(300, 500);
      }
      
      // Zamknij budynek - priorytetowo używamy closeForestryBuildingInner()
      const closeSelectors = [
        '[onclick*="closeForestryBuildingInner"]', // Główny przycisk zamknięcia budynku tartaku
        '.big_close.link',
        '#forestry_building_inner_close',
        '.forestry_building_close',
        '.mini_close.link',
        '#gardencancel',
      ];
      
      for (const selector of closeSelectors) {
        const closeBtn = await page.$(selector);
        if (closeBtn && await closeBtn.isVisible()) {
          this.log.info(`Wychodzę z budynku używając: ${selector}`);
          await closeBtn.click();
          await this.session.randomDelay(500, 1000);
          this.currentBuilding = null;
          return true;
        }
      }
      
      this.log.warn('Nie znaleziono przycisku zamknięcia budynku');
    } catch (e) {
      this.log.error(`Błąd przy wychodzeniu z budynku: ${e.message}`);
    }
    
    this.currentBuilding = null;
    return false;
  }

  /**
   * Sprawdza status slotów produkcyjnych w aktualnym budynku
   * @returns {Array} Lista slotów z ich statusem
   */
  async getProductionSlotsStatus() {
    const page = this.session.page;
    const slots = [];
    
    for (let slotNum = 1; slotNum <= 3; slotNum++) {
      try {
        const slotSelector = `#forestry_building_inner_slot${slotNum}`;
        const slot = await page.$(slotSelector);
        
        if (!slot) continue;
        
        const slotInfo = await page.evaluate((num) => {
          const slot = document.querySelector(`#forestry_building_inner_slot${num}`);
          if (!slot) return null;
          
          // Sprawdź czy slot jest zablokowany
          const lockedEl = document.querySelector(`#forestry_building_inner_slot_locked${num}`);
          const isLocked = lockedEl && lockedEl.style.display !== 'none';
          
          // Sprawdź czy jest w trakcie produkcji
          const cancelBtn = document.querySelector(`#forestry_building_inner_slot_cancel${num}`);
          const isProducing = cancelBtn && cancelBtn.style.display !== 'none';
          
          // Sprawdź info slotu
          const infoEl = document.querySelector(`#forestry_building_inner_slot_info${num}`);
          const infoText = infoEl ? (infoEl.innerText || infoEl.textContent || '') : '';
          
          // Sprawdź czy można rozpocząć produkcję
          const canStart = infoText.includes('Rozpocznij produkcję') && !isLocked && !isProducing;
          
          return {
            slotNum: num,
            isLocked: isLocked,
            isProducing: isProducing,
            canStart: canStart,
            infoText: infoText.substring(0, 100)
          };
        }, slotNum);
        
        if (slotInfo) {
          slots.push(slotInfo);
          this.log.debug(`Slot ${slotNum}: ${slotInfo.isLocked ? 'zablokowany' : slotInfo.isProducing ? 'produkuje' : slotInfo.canStart ? 'wolny' : 'nieznany'}`);
        }
        
      } catch (e) {
        this.log.debug(`Błąd sprawdzania slotu ${slotNum}: ${e.message}`);
      }
    }
    
    return slots;
  }

  /**
   * Otwiera okno wyboru produkcji dla slotu
   * @param {number} slotNum - numer slotu (1-3)
   */
  async openProductionSelection(slotNum) {
    const page = this.session.page;
    
    try {
      // Kliknij na slot aby otworzyć wybór produkcji
      const slotInfoSelector = `#forestry_building_inner_slot_info${slotNum}`;
      const slotInfo = await page.$(slotInfoSelector);
      
      if (slotInfo && await slotInfo.isVisible()) {
        await slotInfo.click();
        await this.session.randomDelay(500, 1000);
        return true;
      }
      
      // Alternatywnie - kliknij na obrazek slotu
      const slotImgSelector = `#forestry_building_inner_slot_img_main${slotNum}`;
      const slotImg = await page.$(slotImgSelector);
      
      if (slotImg && await slotImg.isVisible()) {
        await slotImg.click();
        await this.session.randomDelay(500, 1000);
        return true;
      }
      
    } catch (e) {
      this.log.debug(`Błąd otwierania wyboru produkcji: ${e.message}`);
    }
    
    return false;
  }

  /**
   * Pobiera listę dostępnych produktów do wyprodukowania
   */
  async getAvailableProducts() {
    const page = this.session.page;
    const products = [];
    
    try {
      const items = await page.$$('.forestry_selectproduction_item');
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        const productInfo = await item.evaluate((el) => {
          const onclick = el.getAttribute('onclick') || '';
          
          // Sprawdź czy produkt jest dostępny (ma onclick z dialogForestry)
          const isAvailable = onclick.includes('dialogForestry') && onclick.includes('startproduction');
          
          // Parsuj parametry: dialogForestry('startproduction', buildingNum, slotNum, productId, quantity)
          const match = onclick.match(/dialogForestry\('startproduction',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
          
          // Pobierz nazwę produktu
          const nameEl = el.querySelector('[style*="font-weight:bold"]');
          const name = nameEl ? (nameEl.innerText || nameEl.textContent || '').trim() : 'Nieznany';
          
          // Pobierz czas produkcji
          const timeMatch = (el.innerText || '').match(/(\d{2}:\d{2}:\d{2})\s*h/);
          
          // Sprawdź czy ma wymagane surowce (klasa "important" = brak)
          const hasImportant = el.querySelector('.important') !== null;
          const hasMaterials = !hasImportant;
          
          return {
            name: name,
            isAvailable: isAvailable && hasMaterials,
            hasMaterials: hasMaterials,
            productionTime: timeMatch ? timeMatch[1] : null,
            buildingNum: match ? parseInt(match[1]) : null,
            slotNum: match ? parseInt(match[2]) : null,
            productId: match ? parseInt(match[3]) : null,
            quantity: match ? parseInt(match[4]) : null,
          };
        });
        
        if (productInfo.productId) {
          products.push(productInfo);
        }
      }
      
    } catch (e) {
      this.log.debug(`Błąd pobierania produktów: ${e.message}`);
    }
    
    return products;
  }

  /**
   * Rozpoczyna produkcję wybranego produktu
   * @param {number} productId - ID produktu
   * @param {number} buildingNum - numer budynku (1 lub 2)
   * @param {number} slotNum - numer slotu (1-3)
   */
  async startProduction(productId, buildingNum = null, slotNum = null) {
    const page = this.session.page;
    
    try {
      // Znajdź element produktu i kliknij
      const productSelector = `[onclick*="dialogForestry('startproduction'"][onclick*="${productId}"]`;
      const product = await page.$(productSelector);
      
      if (product) {
        await product.click();
        await this.session.randomDelay(500, 1000);
        
        // Sprawdź czy pojawił się popup potwierdzenia
        const confirmBtn = await page.$('#globalbox_button1');
        if (confirmBtn && await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await this.session.randomDelay(500, 1000);
          this.log.info(`Rozpoczęto produkcję (ID: ${productId})`);
          return true;
        }
        
        return true;
      }
      
      this.log.debug(`Nie znaleziono produktu ID: ${productId}`);
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd rozpoczynania produkcji: ${e.message}`);
      return false;
    }
  }

  /**
   * Zamyka okno wyboru produkcji
   */
  async closeProductionSelection() {
    const page = this.session.page;
    
    try {
      const closeBtn = await page.$('[onclick*="closeForestrySelection"]');
      if (closeBtn && await closeBtn.isVisible()) {
        await closeBtn.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
      
      // Alternatywnie - mini_close
      const miniClose = await page.$('#forestry_production_select .mini_close');
      if (miniClose && await miniClose.isVisible()) {
        await miniClose.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
    } catch (e) {}
    
    return false;
  }

  /**
   * Automatycznie rozpoczyna produkcję w wolnych slotach
   * @param {number} buildingNum - numer budynku (1 = Tartak, 2 = Stolarnia)
   * @param {Array} preferredProducts - lista preferowanych ID produktów (opcjonalnie)
   */
  async autoStartProduction(buildingNum, preferredProducts = []) {
    this.log.info(`Auto-produkcja w budynku ${buildingNum}...`);
    
    // Wejdź do budynku jeśli nie jesteśmy w środku
    if (this.currentBuilding !== buildingNum) {
      const entered = await this.enterBuilding(buildingNum);
      if (!entered) {
        this.log.warn('Nie można wejść do budynku');
        return 0;
      }
    }
    
    // Sprawdź wolne sloty
    const slots = await this.getProductionSlotsStatus();
    const freeSlots = slots.filter(s => s.canStart);
    
    if (freeSlots.length === 0) {
      this.log.info('Brak wolnych slotów produkcyjnych');
      return 0;
    }
    
    this.log.info(`Znaleziono ${freeSlots.length} wolnych slotów`);
    
    let started = 0;
    
    for (const slot of freeSlots) {
      // Otwórz wybór produkcji
      const opened = await this.openProductionSelection(slot.slotNum);
      if (!opened) continue;
      
      await this.session.randomDelay(500, 1000);
      
      // Pobierz dostępne produkty
      const products = await this.getAvailableProducts();
      const availableProducts = products.filter(p => p.isAvailable);
      
      if (availableProducts.length === 0) {
        this.log.debug(`Brak dostępnych produktów dla slotu ${slot.slotNum}`);
        await this.closeProductionSelection();
        continue;
      }
      
      // Wybierz produkt (preferowany lub pierwszy dostępny)
      let selectedProduct = null;
      
      if (preferredProducts.length > 0) {
        selectedProduct = availableProducts.find(p => preferredProducts.includes(p.productId));
      }
      
      if (!selectedProduct) {
        selectedProduct = availableProducts[0];
      }
      
      // Rozpocznij produkcję
      const success = await this.startProduction(selectedProduct.productId);
      if (success) {
        started++;
        this.log.info(`Rozpoczęto produkcję: ${selectedProduct.name}`);
      }
      
      await this.session.randomDelay(500, 1000);
    }
    
    return started;
  }

  /**
   * Wykonuje pełny cykl tartaku
   * Sekwencja: 1. Zbierz wszystkie → 2. Wybierz sadzonkę → 3. Posadź wszystkie → 4. Podlej wszystkie
   */
  async fullForestryCycle(options = {}) {
    const {
      harvestTrees = true,
      plantTrees = true,
      waterTrees = true,
      preferredTreeType = 'swierk', // Domyślnie świerk (najszybszy po topoli)
      startProduction = true,
      productionBuildings = [1, 2], // 1 = Tartak, 2 = Stolarnia
    } = options;
    
    this.log.info('=== Rozpoczynam cykl tartaku ===');
    
    const results = {
      treesHarvested: false,
      treesPlanted: false,
      treesWatered: false,
      productionsStarted: 0,
    };
    
    // Przejdź do tartaku
    const navigated = await this.navigateToForestry();
    if (!navigated) {
      this.log.warn('Nie można przejść do tartaku');
      return results;
    }
    
    // KROK 1: Zbierz wszystkie gotowe drzewa
    if (harvestTrees) {
      this.log.info('KROK 1: Zbieranie drzew...');
      results.treesHarvested = await this.harvestAllTrees();
      await this.session.randomDelay(500, 1000);
    }
    
    // KROK 2: Wybierz sadzonkę i KROK 3: Posadź wszystkie
    if (plantTrees) {
      this.log.info('KROK 2: Wybieranie sadzonki...');
      
      // Sprawdź dostępne sadzonki
      const seedlings = await this.getAvailableSeedlings();
      this.log.info(`Dostępne sadzonki: ${seedlings.map(s => `${s.name}(${s.amount})`).join(', ')}`);
      
      // Wybierz preferowaną sadzonkę lub pierwszą dostępną
      let treeId = this.treeTypes[preferredTreeType.toLowerCase()] || 1;
      const hasSeedling = seedlings.find(s => s.id === treeId);
      
      if (!hasSeedling || hasSeedling.amount <= 0) {
        // Wybierz pierwszą dostępną sadzonkę
        const firstAvailable = seedlings.find(s => s.amount > 0);
        if (firstAvailable) {
          treeId = firstAvailable.id;
          this.log.info(`Brak preferowanej sadzonki, używam: ${firstAvailable.name}`);
        } else {
          this.log.warn('Brak dostępnych sadzonek!');
          treeId = null;
        }
      }
      
      if (treeId) {
        const selected = await this.selectSeedling(treeId);
        if (selected) {
          await this.session.randomDelay(500, 1000);
          
          this.log.info('KROK 3: Sadzenie drzew...');
          results.treesPlanted = await this.plantAllTrees();
          await this.session.randomDelay(500, 1000);
        }
      }
    }
    
    // KROK 4: Podlej wszystkie (możliwe raz na 24h)
    if (waterTrees) {
      this.log.info('KROK 4: Podlewanie drzew...');
      results.treesWatered = await this.waterAllTrees();
      await this.session.randomDelay(500, 1000);
    }
    
    // KROK 5: Rozpocznij produkcję w budynkach (opcjonalnie)
    if (startProduction) {
      for (const buildingNum of productionBuildings) {
        const buildingNames = { 1: 'Tartak', 2: 'Stolarnia' };
        this.log.info(`KROK 5: Produkcja w ${buildingNames[buildingNum]}...`);
        
        const started = await this.autoStartProduction(buildingNum);
        results.productionsStarted += started;
        
        await this.exitBuilding();
        await this.session.randomDelay(500, 1000);
      }
    }
    
    this.log.info('=== Podsumowanie cyklu tartaku ===');
    this.log.info(`Zebrano: ${results.treesHarvested ? 'TAK' : 'NIE'}, Posadzono: ${results.treesPlanted ? 'TAK' : 'NIE'}, Podlano: ${results.treesWatered ? 'TAK' : 'NIE'}, Produkcje: ${results.productionsStarted}`);
    
    // Loguj do bazy
    await logAction(this.account.id, 'forestry_cycle', results);
    
    return results;
  }
}
