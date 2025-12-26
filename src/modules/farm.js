/**
 * Moduł farmy - obsługa pól uprawnych
 * Wolni Farmerzy - struktura:
 * - 4 farmy (farm1-farm4)
 * - 6 budynków na farmę (pos1-pos6) - klikamy #farm1_pos1_click
 * - Speedlinki do nawigacji: #speedlink_farm1, #speedlink_farm2, etc.
 * - W budynku są pola do sadzenia/zbierania/podlewania
 */
import { config } from '../config.js';
import { updateField, logAction, scheduleTask, getFarmConfig } from '../database.js';

// Flaga statyczna - czy roślina została już wybrana w tej sesji
let cropAlreadySelected = false;
let selectedCropType = null;

export class FarmModule {
  constructor(browserSession, accountData) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
    this.currentFarm = 1;
    this.currentBuilding = null;
  }
  
  /**
   * Resetuje flagę wybranej rośliny (np. przy nowej sesji)
   */
  static resetCropSelection() {
    cropAlreadySelected = false;
    selectedCropType = null;
  }

  /**
   * Nawiguje do konkretnej farmy używając speedlinków
   */
  async navigateToFarm(farmNumber = 1) {
    this.log.info(`Nawigacja do farmy ${farmNumber}...`);
    
    const page = this.session.page;
    await this.session.closePopups();
    
    // Użyj speedlinka do farmy
    const speedlink = `#speedlink_farm${farmNumber}`;
    
    try {
      const link = await page.$(speedlink);
      if (link) {
        await link.click();
        await this.session.randomDelay(1000, 2000);
        await this.session.waitForPageReady();
        this.currentFarm = farmNumber;
        this.currentBuilding = null;
        this.log.info(`Przeszliśmy do farmy ${farmNumber}`);
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd nawigacji do farmy: ${e.message}`);
    }
    
    // Alternatywnie - menu główne
    try {
      await page.click('#mainmenue1', { timeout: 3000 });
      await this.session.randomDelay(500, 1000);
      
      if (farmNumber > 1) {
        await page.click(speedlink, { timeout: 3000 });
        await this.session.randomDelay(500, 1000);
      }
      
      this.currentFarm = farmNumber;
      this.currentBuilding = null;
      await this.session.waitForPageReady();
      return true;
    } catch (e) {
      this.log.warn(`Nie udało się przejść do farmy ${farmNumber}`);
      return false;
    }
  }

  /**
   * Sprawdza czy budynek jest zablokowany (gracz nie ma jeszcze dostępu)
   */
  async isBuildingLocked(farmNum, position) {
    const page = this.session.page;
    
    // Różne możliwe selektory dla zablokowanych budynków
    const lockSelectors = [
      `#farm_pos_lock${farmNum}_${position}`,
      `#farm${farmNum}_pos${position}_lock`,
      `.farm_pos_lock[id*="${farmNum}_${position}"]`,
      `#farm${farmNum}_pos${position} .farm_pos_lock`,
      `.farm_pos_lock`,  // Generyczny - sprawdzimy w kontekście budynku
    ];
    
    try {
      // Najpierw sprawdź specyficzne selektory
      for (const selector of lockSelectors.slice(0, -1)) {
        const lock = await page.$(selector);
        if (lock) {
          const isVisible = await lock.isVisible().catch(() => false);
          if (isVisible) return true;
        }
      }
      
      // Sprawdź czy w kontenerze budynku jest lock
      const buildingSelector = `#farm${farmNum}_pos${position}`;
      const hasLock = await page.evaluate((bSelector) => {
        const building = document.querySelector(bSelector);
        if (!building) return false;
        
        // Sprawdź czy jest element z "lock" w klasie lub id
        const lockEl = building.querySelector('[class*="lock"], [id*="lock"]');
        if (lockEl) {
          // Sprawdź czy jest widoczny (display != none)
          const style = window.getComputedStyle(lockEl);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }
        return false;
      }, buildingSelector);
      
      if (hasLock) return true;
      
      // Sprawdź też czy przycisk klikalny budynku istnieje i jest widoczny
      const clickSelector = `#farm${farmNum}_pos${position}_click`;
      const clickBtn = await page.$(clickSelector);
      if (!clickBtn) {
        // Brak przycisku do kliknięcia = prawdopodobnie zablokowany
        return true;
      }
      
      // Sprawdź czy przycisk jest widoczny
      const btnVisible = await clickBtn.isVisible().catch(() => false);
      if (!btnVisible) {
        return true; // Przycisk niewidoczny = zablokowany
      }
      
    } catch (e) {
      this.log.debug(`Błąd sprawdzania locka budynku ${position}: ${e.message}`);
    }
    
    return false;
  }

  /**
   * Sprawdza stan budynku z poziomu widoku farmy (bez wchodzenia)
   * Analizuje timer wyświetlany przy budynku
   * @returns {Object} { status: 'growing'|'ready'|'empty'|'locked'|'unknown', timeLeft: string|null }
   */
  async getBuildingStatus(farmNum, position) {
    const page = this.session.page;
    
    // Najpierw sprawdź czy budynek jest zablokowany
    const isLocked = await this.isBuildingLocked(farmNum, position);
    if (isLocked) {
      return { status: 'locked', timeLeft: null };
    }
    
    try {
      // Szukaj timera w kontenerze budynku
      // Timer jest w divie obok ikony rośliny (.kpX) w kontenerze budynku
      // Struktura: #farm1_pos1 zawiera timer jeśli coś rośnie
      const buildingSelector = `#farm${farmNum}_pos${position}`;
      const building = await page.$(buildingSelector);
      
      if (!building) {
        // Brak kontenera budynku - prawdopodobnie nie istnieje/zablokowany
        return { status: 'locked', timeLeft: null };
      }
      
      // Pobierz tekst timera z budynku
      const timerInfo = await page.evaluate((selector) => {
        const container = document.querySelector(selector);
        if (!container) return null;
        
        // Szukaj tekstu z czasem (format: XX:XX:XX h lub podobny)
        const text = container.innerText || container.textContent;
        
        // Regex dla timera: 00:15:18 h
        const timerMatch = text.match(/(\d{2}:\d{2}:\d{2})\s*h?/);
        
        // Sprawdź też czy jest ikona rośliny
        const hasCrop = container.querySelector('[class^="kp"]') !== null;
        
        // Sprawdź czy jest element lock
        const hasLock = container.querySelector('[class*="lock"], [id*="lock"]') !== null;
        
        return {
          timer: timerMatch ? timerMatch[1] : null,
          hasCrop: hasCrop,
          hasLock: hasLock,
          rawText: text.substring(0, 100)
        };
      }, buildingSelector);
      
      if (!timerInfo) {
        return { status: 'unknown', timeLeft: null };
      }
      
      // Jeśli wykryto lock w HTML
      if (timerInfo.hasLock) {
        return { status: 'locked', timeLeft: null };
      }
      
      // Interpretuj stan
      if (timerInfo.timer) {
        // Jest timer - sprawdź czy to 00:00:00 (gotowe do zebrania)
        if (timerInfo.timer === '00:00:00') {
          return { status: 'ready', timeLeft: '00:00:00' };
        }
        // Timer > 0 - rośliny rosną
        return { status: 'growing', timeLeft: timerInfo.timer };
      }
      
      // Brak timera
      if (timerInfo.hasCrop) {
        // Jest ikona rośliny ale brak timera - prawdopodobnie gotowe
        return { status: 'ready', timeLeft: null };
      }
      
      // Brak timera i brak ikony - puste lub nieznane
      return { status: 'empty', timeLeft: null };
      
    } catch (e) {
      this.log.debug(`Błąd sprawdzania stanu budynku ${position}: ${e.message}`);
      return { status: 'unknown', timeLeft: null };
    }
  }

  /**
   * Sprawdza stan wszystkich budynków na aktualnej farmie
   * @returns {Array} Lista stanów budynków
   */
  async getAllBuildingsStatus() {
    const statuses = [];
    
    for (let pos = 1; pos <= 6; pos++) {
      const status = await this.getBuildingStatus(this.currentFarm, pos);
      statuses.push({
        position: pos,
        ...status
      });
      this.log.debug(`Budynek ${pos}: ${status.status}${status.timeLeft ? ` (${status.timeLeft})` : ''}`);
    }
    
    return statuses;
  }

  /**
   * Wchodzi do budynku pól uprawnych (pos1-pos6)
   */
  async enterFieldBuilding(position = 1) {
    const page = this.session.page;
    await this.session.closePopups();
    
    // Sprawdź czy budynek jest zablokowany
    const isLocked = await this.isBuildingLocked(this.currentFarm, position);
    if (isLocked) {
      this.log.debug(`Budynek ${position} na farmie ${this.currentFarm} jest zablokowany`);
      return false;
    }
    
    this.log.info(`Wchodzenie do budynku pól ${position} na farmie ${this.currentFarm}...`);
    
    // Selektor budynku: #farm1_pos1_click, #farm1_pos2_click, etc.
    const buildingSelector = `#farm${this.currentFarm}_pos${position}_click`;
    
    try {
      const building = await page.$(buildingSelector);
      if (building) {
        await building.click({ timeout: 5000 });
        await this.session.randomDelay(1000, 2000);
        await this.session.waitForPageReady();
        this.currentBuilding = position;
        this.log.info(`Weszliśmy do budynku ${position}`);
        return true;
      } else {
        this.log.debug(`Nie znaleziono budynku: ${buildingSelector}`);
        return false;
      }
    } catch (e) {
      this.log.debug(`Budynek ${position} niedostępny: ${e.message.split('\n')[0]}`);
      return false;
    }
  }

  /**
   * Wraca z budynku do widoku farmy
   * Używa #gardencancel (big_close) do zamknięcia
   */
  async exitBuilding() {
    const page = this.session.page;
    this.log.debug('Wychodzenie z budynku...');
    
    // Główny przycisk zamknięcia w grze Wolni Farmerzy
    try {
      const gardenCancel = await page.$('#gardencancel');
      if (gardenCancel) {
        await gardenCancel.click();
        await this.session.randomDelay(500, 1000);
        this.currentBuilding = null;
        this.log.debug('Wyszliśmy z budynku przez #gardencancel');
        return true;
      }
    } catch (e) {}
    
    // Alternatywne selektory
    const exitSelectors = [
      '.big_close.link',
      '#garden_close',
      '[onclick*="killGardenTimeruns"]',
    ];
    
    for (const selector of exitSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click();
          await this.session.randomDelay(500, 1000);
          this.currentBuilding = null;
          return true;
        }
      } catch (e) {}
    }
    
    this.currentBuilding = null;
    return false;
  }

  /**
   * Skanuje pola w aktualnym budynku
   */
  async scanFields() {
    this.log.info('Skanowanie pól uprawnych w budynku...');
    
    await this.session.closePopups();
    await this.session.randomDelay(300, 500);
    
    const fields = [];
    const page = this.session.page;
    
    // W budynku pola mają format: area lub div z onclick
    // Sprawdź różne możliwe selektory
    const possibleSelectors = [
      'area[onclick*="fieldclick"]',
      'area[onclick*="garden"]',
      '[id^="gardenfeld"]',
      '.feld',
      'area[id^="feld"]',
      '[onclick*="feld"]',
    ];
    
    let fieldElements = [];
    let usedSelector = '';
    
    for (const selector of possibleSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          fieldElements = elements;
          usedSelector = selector;
          this.log.info(`Znaleziono ${elements.length} pól używając selektora: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    // Jeśli nie znaleziono, sprawdź HTML
    if (fieldElements.length === 0) {
      this.log.warn('Nie znaleziono pól standardowymi selektorami, analizuję HTML...');
      
      const htmlSample = await page.evaluate(() => {
        const content = document.querySelector('#content') || document.body;
        return content.innerHTML.substring(0, 2000);
      });
      
      this.log.debug(`HTML sample: ${htmlSample.substring(0, 500)}`);
      
      // Szukaj wzorców w HTML
      const fieldPatterns = [
        /id="([^"]*feld[^"]*)"/gi,
        /onclick="[^"]*field[^"]*\((\d+)\)"/gi,
        /id="field(\d+)"/gi,
      ];
      
      for (const pattern of fieldPatterns) {
        const matches = htmlSample.match(pattern);
        if (matches) {
          this.log.info(`Znaleziono wzorce pól: ${matches.slice(0, 5).join(', ')}`);
        }
      }
    }
    
    // Analizuj znalezione pola
    for (let i = 0; i < fieldElements.length; i++) {
      try {
        const fieldData = await this.analyzeFieldElement(fieldElements[i], i);
        if (fieldData) {
          fields.push(fieldData);
        }
      } catch (e) {
        this.log.debug(`Błąd analizy pola ${i}: ${e.message}`);
      }
    }
    
    this.log.info(`Przeskanowano ${fields.length} pól`);
    return fields;
  }

  /**
   * Analizuje pojedyncze pole
   */
  async analyzeFieldElement(element, index) {
    const page = this.session.page;
    
    try {
      const fieldData = {
        index: index,
        farmNumber: this.currentFarm,
        buildingNumber: this.currentBuilding,
        status: 'unknown',
        plant: null,
        isReady: false,
        needsWater: false,
      };
      
      // Sprawdź atrybuty elementu
      const attrs = await element.evaluate(el => ({
        id: el.id,
        className: el.className,
        onclick: el.getAttribute('onclick'),
        style: el.getAttribute('style'),
      }));
      
      this.log.debug(`Pole ${index}: id=${attrs.id}, class=${attrs.className}`);
      
      // Sprawdź czy pole jest puste (zazwyczaj ma klasę 'empty' lub brak background)
      if (attrs.className.includes('empty') || attrs.className.includes('leer')) {
        fieldData.status = 'empty';
      } else if (attrs.className.includes('ready') || attrs.className.includes('done')) {
        fieldData.status = 'ready';
        fieldData.isReady = true;
      } else if (attrs.className.includes('growing') || attrs.className.includes('water')) {
        fieldData.status = 'growing';
      }
      
      return fieldData;
    } catch (e) {
      return null;
    }
  }

  /**
   * Zbiera gotowe plony z wszystkich budynków na farmie
   */
  async harvestAll() {
    this.log.info(`--- Zbieranie plonów na farmie ${this.currentFarm} ---`);
    
    let totalHarvested = 0;
    
    // Przejdź przez wszystkie 6 budynków
    for (let pos = 1; pos <= 6; pos++) {
      const entered = await this.enterFieldBuilding(pos);
      if (!entered) {
        this.log.debug(`Budynek ${pos} niedostępny, pomijam`);
        continue;
      }
      
      // Zbierz plony w tym budynku
      const harvested = await this.harvestInCurrentBuilding();
      totalHarvested += harvested;
      
      // Wróć do widoku farmy
      await this.exitBuilding();
      await this.session.randomDelay(500, 1000);
    }
    
    this.log.info(`Zebrano plony z ${totalHarvested} pól na farmie ${this.currentFarm}`);
    return totalHarvested;
  }

  /**
   * Zbiera plony w aktualnym budynku
   * Używa #cropall (span.cropall) - "Zbierz wszystko"
   * Po zebraniu akceptuje powiadomienie przez #globalbox_button1
   */
  async harvestInCurrentBuilding() {
    const page = this.session.page;
    
    // Najpierw włącz tryb zbierania klikając #ernten
    try {
      const harvestMode = await page.$('#ernten');
      if (harvestMode) {
        await harvestMode.click();
        await this.session.randomDelay(300, 500);
      }
    } catch (e) {}
    
    // Kliknij "Zbierz wszystko" - #cropall
    let harvested = false;
    try {
      const cropAllBtn = await page.$('#cropall');
      if (cropAllBtn) {
        await cropAllBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('Użyto "Zbierz wszystko" (#cropall)');
        harvested = true;
      }
    } catch (e) {
      this.log.debug(`Błąd zbierania: ${e.message}`);
    }
    
    // Alternatywne selektory jeśli #cropall nie zadziałał
    if (!harvested) {
      const harvestSelectors = [
        '.cropall',
        'span.cropall',
        '#tooltipcropall',
      ];
      
      for (const selector of harvestSelectors) {
        try {
          const btn = await page.$(selector);
          if (btn && await btn.isVisible()) {
            await btn.click();
            await this.session.randomDelay(1000, 2000);
            harvested = true;
            break;
          }
        } catch (e) {}
      }
    }
    
    // Akceptuj powiadomienie po zebraniu (jeśli się pojawi)
    // #globalbox_button1 - przycisk "Tak" / "OK" w oknie powiadomienia
    // Może być: potwierdzenie zbiorów LUB "Nie ma nic do zebrania"
    if (harvested) {
      await this.session.randomDelay(500, 1000);
      try {
        const globalbox = await page.$('#globalbox');
        if (globalbox && await globalbox.isVisible()) {
          // Sprawdź treść powiadomienia
          const content = await page.$eval('#globalbox_content', el => el.textContent || '').catch(() => '');
          
          if (content.includes('Nie ma nic do zebrania') || content.includes('nic do zebrania')) {
            // Nic nie było do zebrania - zamknij popup
            this.log.debug('Nie ma nic do zebrania, zamykam popup');
            harvested = false; // Faktycznie nic nie zebrano
          }
          
          // Zamknij popup (niezależnie od treści)
          const confirmBtn = await page.$('#globalbox_button1');
          if (confirmBtn && await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await this.session.randomDelay(300, 500);
          }
        }
      } catch (e) {}
    }
    
    return harvested ? 1 : 0;
  }

  /**
   * Sadzi rośliny na pustych polach używając automatu do sadzenia
   * NOWA LOGIKA: Szukamy sadzonki na regałach 1, 2, 3
   * 
   * 1. Kliknij #autoplantbuttoninner (otwiera okno wyboru)
   * 2. Przeszukaj regały (rackswitch1, rackswitch2, rackswitch3) szukając sadzonki
   * 3. Kliknij na sadzonkę gdy znajdziemy (rackitem z odpowiednią nazwą w tooltip)
   * 4. Zatwierdź przyciskiem #globalbox_button1
   */
  async plantInCurrentBuilding(cropType = 'zboze') {
    const page = this.session.page;
    
    // Mapa nazw roślin - jak wyświetlane w tooltipach (headline)
    const cropNames = {
      'zboze': 'Zboże', 'wheat': 'Zboże', 'pszenica': 'Zboże',
      'kukurydza': 'Kukurydza', 'corn': 'Kukurydza',
      'koniczyna': 'Koniczyna', 'clover': 'Koniczyna',
      'rzepak': 'Rzepak', 'rapeseed': 'Rzepak',
      'buraki': 'Buraki cukrowe', 'beets': 'Buraki cukrowe',
      'ziola': 'Zioła', 'herbs': 'Zioła',
      'sloneczniki': 'Słoneczniki', 'sunflowers': 'Słoneczniki',
      'blawatki': 'Bławatki', 'cornflowers': 'Bławatki',
      'marchewki': 'Marchewka', 'carrots': 'Marchewka',
      'ogorki': 'Ogórki', 'cucumbers': 'Ogórki',
      'rzodkiewki': 'Rzodkiewka', 'radishes': 'Rzodkiewka',
      'truskawki': 'Truskawki', 'strawberries': 'Truskawki',
      'pomidory': 'Pomidory', 'tomatoes': 'Pomidory',
      'cebule': 'Cebula', 'onions': 'Cebula',
      'szpinak': 'Szpinak', 'spinach': 'Szpinak',
      'kalafiory': 'Kalafior', 'cauliflower': 'Kalafior',
      'ziemniaki': 'Ziemniaki', 'potatoes': 'Ziemniaki',
      'szparagi': 'Szparagi', 'asparagus': 'Szparagi',
      'cukinie': 'Cukinia', 'zucchini': 'Cukinia',
      'jagody': 'Jagody', 'blueberries': 'Jagody',
      'maliny': 'Maliny', 'raspberries': 'Maliny',
      'jablka': 'Jabłka', 'apples': 'Jabłka',
      'dynie': 'Dynie', 'pumpkins': 'Dynie',
    };
    
    const cropName = cropNames[cropType.toLowerCase()] || 'Zboże';
    
    // Sprawdź czy musimy zmienić roślinę (inna niż poprzednio wybrana)
    const needToSelectCrop = !cropAlreadySelected || selectedCropType !== cropType;
    
    if (needToSelectCrop) {
      this.log.info(`Sadzenie rośliny "${cropName}" (${cropType}) - szukam na regałach...`);
    } else {
      this.log.info(`Sadzenie rośliny "${cropName}" - roślina już wybrana, tylko akceptacja...`);
    }
    
    // Krok 1: Kliknij automat do sadzenia (główny przycisk)
    try {
      const autoPlantBtn = await page.$('#autoplantbuttoninner');
      if (!autoPlantBtn) {
        this.log.debug('Nie znaleziono przycisku automatu do sadzenia');
        return 0;
      }
      
      await autoPlantBtn.click();
      await this.session.randomDelay(500, 1000);
      this.log.debug('Otwarto okno automatu do sadzenia');
    } catch (e) {
      this.log.debug(`Błąd otwierania automatu: ${e.message}`);
      return 0;
    }
    
    // Krok 2: Wybierz roślinę TYLKO jeśli jeszcze nie wybrana lub zmiana typu
    if (needToSelectCrop) {
      let cropFound = false;
      
      // Przeszukaj regały 1, 2, 3 szukając sadzonki
      for (const rackNum of [1, 2, 3]) {
        if (cropFound) break;
        
        // Sprawdź czy regał jest odblokowany (ma klasę rackswitch_active lub rackswitch bez lock)
        const rackUnlocked = await page.evaluate((num) => {
          const rackImg = document.querySelector(`#rackswitch${num}_img`);
          if (!rackImg) return false;
          // Sprawdź czy nie ma blokady
          const lock = document.querySelector(`#rackswitch${num}_lock`);
          if (lock && lock.style.display !== 'none' && lock.classList.contains('rack_lock_page')) {
            return false;
          }
          return true;
        }, rackNum);
        
        if (!rackUnlocked) {
          this.log.debug(`Regał ${rackNum} jest zablokowany, pomijam`);
          continue;
        }
        
        // Kliknij na regał aby go aktywować
        try {
          const rackBtn = await page.$(`#rackswitch${rackNum}_img`);
          if (rackBtn) {
            await rackBtn.click();
            await this.session.randomDelay(300, 500);
            this.log.debug(`Przełączono na regał ${rackNum}`);
          }
        } catch (e) {
          continue;
        }
        
        // Szukaj sadzonki na tym regale - sprawdź wszystkie rackitem (1-20 na regał)
        const foundItem = await page.evaluate((searchName) => {
          // Przeszukaj wszystkie widoczne rackitem
          for (let i = 1; i <= 40; i++) {
            const tooltip = document.querySelector(`#rackitem${i}_tt`);
            if (tooltip) {
              const headline = tooltip.querySelector('.headline');
              if (headline && headline.textContent.trim() === searchName) {
                // Znaleziono! Kliknij na element
                const rackItem = document.querySelector(`#rackitem${i}`);
                if (rackItem) {
                  rackItem.click();
                  return i;
                }
              }
            }
          }
          return null;
        }, cropName);
        
        if (foundItem) {
          this.log.info(`Znaleziono "${cropName}" na regale ${rackNum} (rackitem${foundItem})`);
          cropAlreadySelected = true;
          selectedCropType = cropType;
          cropFound = true;
          await this.session.randomDelay(500, 1000);
        }
      }
      
      if (!cropFound) {
        this.log.warn(`Nie znaleziono sadzonki "${cropName}" na żadnym regale!`);
      }
    }
    
    // Krok 3: Sprawdź czy pojawił się popup i obsłuż go (akceptacja sadzenia)
    await this.session.randomDelay(300, 500);
    
    try {
      // Sprawdź czy globalbox jest widoczny
      const globalbox = await page.$('#globalbox');
      if (globalbox && await globalbox.isVisible()) {
        // Sprawdź treść powiadomienia
        const content = await page.$eval('#globalbox_content', el => el.textContent || '').catch(() => '');
        
        if (content.includes('nie ma więcej miejsca') || content.includes('brak miejsca')) {
          // Pole jest pełne - zamknij popup i wróć
          this.log.debug('Pole jest już pełne, zamykam popup');
          const closeBtn = await page.$('#globalbox_button1');
          if (closeBtn) {
            await closeBtn.click();
            await this.session.randomDelay(300, 500);
          }
          return 0; // Nic nie zasadzono
        }
        
        // Inny popup (np. potwierdzenie sadzenia) - kliknij Tak
        const confirmBtn = await page.$('#globalbox_button1');
        if (confirmBtn) {
          await confirmBtn.click();
          await this.session.randomDelay(1000, 2000);
          this.log.info('Zasadzono rośliny automatem');
          
          // Sprawdź czy po zatwierdzeniu nie pojawił się kolejny popup (np. "nie ma miejsca")
          await this.session.randomDelay(500, 800);
          const afterBox = await page.$('#globalbox');
          if (afterBox && await afterBox.isVisible()) {
            const afterContent = await page.$eval('#globalbox_content', el => el.textContent || '').catch(() => '');
            if (afterContent.includes('nie ma więcej miejsca') || afterContent.includes('brak miejsca')) {
              this.log.debug('Dodatkowy popup - pole pełne, zamykam');
              const closeBtn2 = await page.$('#globalbox_button1');
              if (closeBtn2) await closeBtn2.click();
            }
          }
          
          return 1;
        }
      }
    } catch (e) {
      this.log.debug(`Błąd obsługi popup: ${e.message}`);
    }
    
    // Zamknij okno jeśli coś poszło nie tak
    try {
      const closeBtn = await page.$('#globalbox_close');
      if (closeBtn && await closeBtn.isVisible()) await closeBtn.click();
    } catch (e) {}
    
    return 0;
  }

  /**
   * Podlewa pola w aktualnym budynku
   * Używa #waterall (span.waterall) - "Podlej wszystko"
   */
  async waterInCurrentBuilding() {
    const page = this.session.page;
    
    // Najpierw włącz tryb podlewania klikając #giessen
    try {
      const waterMode = await page.$('#giessen');
      if (waterMode) {
        await waterMode.click();
        await this.session.randomDelay(300, 500);
      }
    } catch (e) {}
    
    // Kliknij "Podlej wszystko" - #waterall
    let watered = false;
    try {
      const waterAllBtn = await page.$('#waterall');
      if (waterAllBtn) {
        await waterAllBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('Użyto "Podlej wszystko" (#waterall)');
        watered = true;
      }
    } catch (e) {
      this.log.debug(`Błąd podlewania: ${e.message}`);
    }
    
    // Alternatywne selektory jeśli #waterall nie zadziałał
    if (!watered) {
      const waterSelectors = [
        '.waterall',
        'span.waterall',
        '#tooltipwaterall',
      ];
      
      for (const selector of waterSelectors) {
        try {
          const btn = await page.$(selector);
          if (btn && await btn.isVisible()) {
            await btn.click();
            await this.session.randomDelay(1000, 2000);
            watered = true;
            break;
          }
        } catch (e) {}
      }
    }
    
    // Akceptuj powiadomienie po podlaniu (jeśli się pojawi)
    if (watered) {
      await this.session.randomDelay(500, 1000);
      try {
        const confirmBtn = await page.$('#globalbox_button1');
        if (confirmBtn && await confirmBtn.isVisible()) {
          await confirmBtn.click();
          this.log.debug('Zaakceptowano powiadomienie po podlewaniu (#globalbox_button1)');
          await this.session.randomDelay(300, 500);
        }
      } catch (e) {}
    }
    
    return watered ? 1 : 0;
  }

  /**
   * Wykonuje pełny cykl farmy dla wszystkich farm i budynków
   */
  async fullFarmCycle(options = {}) {
    const {
      farms = [1, 2, 3, 4],
      harvest = true,
      plant = true,
      water = true,
      cropType = null, // jeśli null, użyj konfiguracji z bazy danych per farma
    } = options;
    
    this.log.info('=== Rozpoczynam pełny cykl farmy ===');
    
    // Pobierz konfigurację roślin dla farm z bazy danych
    let farmConfig = null;
    if (!cropType) {
      try {
        farmConfig = getFarmConfig(this.account.id);
        this.log.info(`Załadowano konfigurację farmy: ${JSON.stringify(farmConfig)}`);
      } catch (e) {
        this.log.warn(`Nie udało się pobrać konfiguracji farmy, używam domyślnej (zboże): ${e.message}`);
      }
    }
    
    const results = {
      harvested: 0,
      planted: 0,
      watered: 0,
    };
    
    for (const farmNum of farms) {
      this.log.info(`--- Farma ${farmNum} ---`);
      
      // Określ roślinę dla tej farmy
      let farmCrop = cropType || 'zboze'; // domyślnie zboże
      if (!cropType && farmConfig) {
        const farmKey = `farm${farmNum}`;
        farmCrop = farmConfig[farmKey] || 'zboze';
        this.log.info(`Farma ${farmNum}: wybrana roślina "${farmCrop}" z konfiguracji`);
      }
      
      // Przejdź do farmy
      const navigated = await this.navigateToFarm(farmNum);
      if (!navigated) {
        this.log.warn(`Nie można przejść do farmy ${farmNum}, pomijam`);
        continue;
      }
      
      // Sprawdź stan wszystkich budynków PRZED wchodzeniem
      this.log.info(`Sprawdzam stan budynków na farmie ${farmNum}...`);
      const buildingStatuses = await this.getAllBuildingsStatus();
      
      // Przejdź przez wszystkie 6 budynków
      for (let pos = 1; pos <= 6; pos++) {
        const status = buildingStatuses.find(s => s.position === pos);
        
        // Loguj stan budynku
        if (status) {
          this.log.info(`Budynek ${pos}: ${status.status}${status.timeLeft ? ` (zostało: ${status.timeLeft})` : ''}`);
        }
        
        // Pomiń budynki które rosną (timer > 00:00:00)
        if (status && status.status === 'growing') {
          this.log.debug(`Budynek ${pos} - rośliny rosną, pomijam`);
          continue;
        }
        
        // Pomiń zablokowane budynki
        if (status && status.status === 'locked') {
          this.log.debug(`Budynek ${pos} - zablokowany, pomijam`);
          continue;
        }
        
        // Wchodzimy tylko do budynków: ready (do zebrania), empty (puste), unknown (nieznane)
        const entered = await this.enterFieldBuilding(pos);
        if (!entered) {
          this.log.debug(`Budynek ${pos} niedostępny`);
          continue;
        }
        
        await this.session.closePopups();
        
        // Zbieranie - tylko jeśli status był 'ready' lub nieznany
        if (harvest && (!status || status.status === 'ready' || status.status === 'unknown')) {
          const h = await this.harvestInCurrentBuilding();
          results.harvested += h;
          if (h > 0) this.log.info(`Zebrano ${h} plonów`);
        }
        
        // Sadzenie - tylko jeśli status był 'empty', 'ready' (po zebraniu) lub nieznany
        if (plant && (!status || status.status === 'empty' || status.status === 'ready' || status.status === 'unknown')) {
          const p = await this.plantInCurrentBuilding(farmCrop);
          results.planted += p;
          if (p > 0) this.log.info(`Posadzono ${p} roślin`);
        }
        
        // Podlewanie (po sadzeniu)
        if (water) {
          const w = await this.waterInCurrentBuilding();
          results.watered += w;
          if (w > 0) this.log.info(`Podlano ${w} pól`);
        }
        
        // Wróć do widoku farmy
        await this.exitBuilding();
        await this.session.randomDelay(500, 1000);
      }
    }
    
    this.log.info('=== Podsumowanie cyklu farmy ===');
    this.log.info(`Zebrano: ${results.harvested}, Posadzono: ${results.planted}, Podlano: ${results.watered}`);
    
    // Loguj do bazy
    await logAction(this.account.id, 'farm_cycle', results);
    
    return results;
  }

  /**
   * Pobiera live status wszystkich pól (czasy do zbioru)
   * Format timerów: #farm_production_timer{farmNum}_{fieldNum}
   * Zawartość: "Gotowe!" lub czas np. "02:15:30"
   */
  async getAllFieldsStatus() {
    this.log.info('Pobieranie statusu pól...');
    
    const page = this.session.page;
    const fieldsStatus = [];
    
    // Sprawdź farmy 1-4, pola 1-6
    for (let farmNum = 1; farmNum <= 4; farmNum++) {
      // Nawiguj do farmy
      const navigated = await this.navigateToFarm(farmNum);
      if (!navigated) continue;
      
      await this.session.closePopups();
      await this.session.randomDelay(500, 1000);
      
      for (let fieldNum = 1; fieldNum <= 6; fieldNum++) {
        try {
          const timerId = `#farm_production_timer${farmNum}_${fieldNum}`;
          const timerDiv = await page.$(timerId);
          
          if (timerDiv) {
            const isVisible = await timerDiv.isVisible();
            if (isVisible) {
              const timerText = await timerDiv.textContent();
              const cleanText = timerText.trim();
              
              // Sprawdź czy gotowe czy jeszcze rośnie
              const isReady = cleanText.toLowerCase().includes('gotowe');
              
              // Pobierz typ rośliny (klasa kp1, kp2, etc.)
              const plantDiv = await timerDiv.$('[class*="kp"]');
              let plantType = null;
              if (plantDiv) {
                const className = await plantDiv.getAttribute('class');
                const kpMatch = className?.match(/kp(\d+)/);
                if (kpMatch) {
                  plantType = this.getPlantNameById(parseInt(kpMatch[1]));
                }
              }
              
              // Parsuj czas jeśli nie gotowe
              let timeLeft = null;
              if (!isReady) {
                const timeMatch = cleanText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  const minutes = parseInt(timeMatch[2]);
                  const seconds = parseInt(timeMatch[3]);
                  timeLeft = `${hours}h ${minutes}m`;
                }
              }
              
              fieldsStatus.push({
                farm: farmNum,
                field: fieldNum,
                status: isReady ? 'ready' : 'growing',
                timeLeft: isReady ? 'Gotowe!' : timeLeft,
                plantType: plantType,
                raw: cleanText,
              });
            }
          }
        } catch (e) {
          this.log.debug(`Błąd sprawdzania pola ${farmNum}_${fieldNum}: ${e.message}`);
        }
      }
    }
    
    this.log.info(`Znaleziono ${fieldsStatus.length} aktywnych pól`);
    return fieldsStatus;
  }

  /**
   * Mapuje ID rośliny na nazwę
   */
  getPlantNameById(id) {
    const plants = {
      1: 'Zboże',
      2: 'Kukurydza', 
      3: 'Koniczyna',
      4: 'Rzepak',
      5: 'Buraki pastewne',
      6: 'Zioła',
      7: 'Słoneczniki',
      8: 'Bławatki',
      17: 'Marchewki',
      18: 'Ogórki',
      19: 'Rzodkiewki',
      20: 'Truskawki',
      21: 'Pomidory',
      22: 'Cebule',
      23: 'Szpinak',
      24: 'Kalafiory',
      26: 'Ziemniaki',
    };
    return plants[id] || `Roślina ${id}`;
  }
}
