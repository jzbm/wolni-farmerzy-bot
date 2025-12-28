/**
 * Moduł farmy - obsługa pól uprawnych
 * Wolni Farmerzy - struktura:
 * - 4 farmy (farm1-farm4)
 * - 6 budynków na farmę (pos1-pos6) - klikamy #farm1_pos1_click
 * - Speedlinki do nawigacji: #speedlink_farm1, #speedlink_farm2, etc. (TYLKO PREMIUM)
 * - W budynku są pola do sadzenia/zbierania/podlewania
 * 
 * RÓŻNICE PREMIUM vs NON-PREMIUM:
 * - Premium: speedlinki, waterall, cropall, plantall
 * - Non-premium: nawigacja przez mapę, ręczne klikanie każdego pola (120 pól!)
 */
import { config } from '../config.js';
import { updateField, logAction, scheduleTask, getFarmConfig } from '../database.js';

// Flaga statyczna - czy roślina została już wybrana w tej sesji
let cropAlreadySelected = false;
let selectedCropType = null;

// Typy przeszkód na polach (chwasty, kamienie, itp.)
const OBSTACLE_PATTERNS = [
  'steine',      // kamienie - steine_04.gif
  'unkraut',     // chwasty - unkraut_04.gif
  'baumstumpf',  // pieniek - baumstumpf_04.gif
  'maulwurf',    // kret - maulwurf_04.gif
];

// Mapowanie ID roślin na nazwy (z frontendu używamy ID)
const CROP_ID_TO_NAME = {
  1: 'Zboże', 17: 'Marchewka', 18: 'Ogórki', 20: 'Truskawki',
  2: 'Kukurydza', 19: 'Rzodkiewka', 21: 'Pomidory', 22: 'Cebula',
  23: 'Szpinak', 3: 'Koniczyna', 4: 'Rzepak', 24: 'Kalafior',
  5: 'Buraki cukrowe', 6: 'Zioła', 109: 'Stokrotki', 108: 'Bodziszki',
  26: 'Ziemniaki', 7: 'Słoneczniki', 8: 'Bławatki', 29: 'Szparagi',
  31: 'Cukinia', 32: 'Jagody', 33: 'Maliny', 34: 'Porzeczki',
  35: 'Jeżyny', 36: 'Mirabelki', 37: 'Jabłka', 38: 'Dynie',
  39: 'Gruszki', 40: 'Wiśnie', 41: 'Śliwki', 42: 'Orzechy włoskie',
  44: 'Czosnek', 43: 'Oliwki', 45: 'Czerwona kapusta', 46: 'Chili',
  47: 'Kalarepa', 48: 'Mlecz', 49: 'Bazylia', 50: 'Borowiki',
  51: 'Dalia', 52: 'Rabarbar', 53: 'Arbuzy', 54: 'Brokuły',
  55: 'Fasola', 56: 'Oberżyna', 57: 'Papryka', 58: 'Groch',
  59: 'Seler', 60: 'Awokado', 61: 'Por', 62: 'Brukselka', 63: 'Koper',
  97: 'Gwiazdka betlejemska', 104: 'Żonkil', 107: 'Winogrona',
  129: 'Herbata', 158: 'Pomarańczowy tulipan',
};

export class FarmModule {
  constructor(browserSession, accountData, playerInfo = null) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
    this.currentFarm = 1;
    this.currentBuilding = null;
    
    // Informacje o koncie (premium, pieniądze, poziom)
    this.playerInfo = playerInfo || {
      isPremium: true,  // Domyślnie zakładamy premium (zachowanie wstecznej kompatybilności)
      money: 0,
      level: 1
    };
    
    this.isPremium = this.playerInfo.isPremium;
  }
  
  /**
   * Ustawia informacje o graczu (wywoływane po zalogowaniu)
   */
  setPlayerInfo(playerInfo) {
    this.playerInfo = playerInfo;
    this.isPremium = playerInfo.isPremium;
    this.log.info(`FarmModule: isPremium=${this.isPremium}, money=${playerInfo.money}, level=${playerInfo.level}`);
  }
  
  /**
   * Resetuje flagę wybranej rośliny (np. przy nowej sesji)
   */
  static resetCropSelection() {
    cropAlreadySelected = false;
    selectedCropType = null;
  }

  /**
   * Nawiguje do konkretnej farmy
   * - Premium: używa speedlinków
   * - Non-premium: używa mapy
   */
  async navigateToFarm(farmNumber = 1) {
    if (this.isPremium) {
      return await this.navigateToFarmPremium(farmNumber);
    } else {
      return await this.navigateToFarmViaMap(farmNumber);
    }
  }

  /**
   * Nawiguje do farmy używając speedlinków (PREMIUM)
   */
  async navigateToFarmPremium(farmNumber = 1) {
    this.log.info(`[PREMIUM] Nawigacja do farmy ${farmNumber}...`);
    
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
   * Nawiguje do farmy przez mapę (NON-PREMIUM)
   * Mapa jest dostępna przez menu lub przycisk mapy
   */
  async navigateToFarmViaMap(farmNumber = 1) {
    this.log.info(`[NON-PREMIUM] Nawigacja do farmy ${farmNumber} przez mapę...`);
    
    const page = this.session.page;
    await this.session.closePopups();
    
    try {
      // Otwórz mapę - może być #map, .maplink, lub w menu
      const mapSelectors = [
        '#map',
        '.maplink', 
        'a[href*="map"]',
        '#mainmenue_map',
        '[onclick*="map"]'
      ];
      
      let mapOpened = false;
      for (const selector of mapSelectors) {
        try {
          const mapBtn = await page.$(selector);
          if (mapBtn && await mapBtn.isVisible()) {
            await mapBtn.click();
            await this.session.randomDelay(1000, 2000);
            mapOpened = true;
            break;
          }
        } catch (e) {}
      }
      
      if (!mapOpened) {
        // Spróbuj przez menu główne
        try {
          await page.click('#mainmenue1', { timeout: 3000 });
          await this.session.randomDelay(500, 1000);
        } catch (e) {}
      }
      
      // Na mapie kliknij na odpowiednią farmę
      // Farmy mogą być oznaczone jako farm1, farm2, etc. lub mieć inne identyfikatory
      const farmSelectors = [
        `#mapfarm${farmNumber}`,
        `#farm${farmNumber}`,
        `.map-farm-${farmNumber}`,
        `[onclick*="farm${farmNumber}"]`,
        `a[href*="farm=${farmNumber}"]`
      ];
      
      for (const selector of farmSelectors) {
        try {
          const farmEl = await page.$(selector);
          if (farmEl) {
            await farmEl.click();
            await this.session.randomDelay(1000, 2000);
            await this.session.waitForPageReady();
            this.currentFarm = farmNumber;
            this.currentBuilding = null;
            this.log.info(`Przeszliśmy do farmy ${farmNumber} przez mapę`);
            return true;
          }
        } catch (e) {}
      }
      
      // Ostatnia próba - bezpośredni URL
      const currentUrl = page.url();
      if (currentUrl.includes('wolnifarmerzy')) {
        const farmUrl = currentUrl.replace(/farm=\d+/, `farm=${farmNumber}`);
        if (!farmUrl.includes(`farm=${farmNumber}`)) {
          // Dodaj parametr farm jeśli nie istnieje
          const separator = farmUrl.includes('?') ? '&' : '?';
          await page.goto(`${farmUrl}${separator}farm=${farmNumber}`);
        } else {
          await page.goto(farmUrl);
        }
        await this.session.waitForPageReady();
        this.currentFarm = farmNumber;
        return true;
      }
      
      this.log.warn(`Nie udało się przejść do farmy ${farmNumber} przez mapę`);
      return false;
      
    } catch (e) {
      this.log.warn(`Błąd nawigacji przez mapę: ${e.message}`);
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

  // Lista typów budynków które NIE są polami uprawnymi (pomijamy ich obsługę)
  static NON_FIELD_BUILDINGS = [
    'Kurnik',
    'Obora', 
    'Owczarnia',
    'Pasieka',
    'Stajnia',
    'Chlewnia',
    'Kaczkarnia',
    'Gęsiarnia',
    'Zagroda dla królików',
  ];

  /**
   * Sprawdza typ budynku na podstawie tooltipa
   * @returns {string|null} nazwa budynku lub null
   */
  async getBuildingType(position) {
    const page = this.session.page;
    const ttSelector = `#farm${this.currentFarm}_pos${position}_tt .farm_pos_tt_name`;
    
    try {
      const nameEl = await page.$(ttSelector);
      if (nameEl) {
        const name = await nameEl.textContent();
        return name ? name.trim() : null;
      }
    } catch (e) {
      this.log.debug(`Nie udało się pobrać typu budynku: ${e.message}`);
    }
    
    return null;
  }

  /**
   * Sprawdza czy budynek to pole uprawne (nie kurnik, obora itp.)
   */
  async isFieldBuilding(position) {
    const buildingType = await this.getBuildingType(position);
    
    if (!buildingType) {
      // Jeśli nie możemy określić typu, zakładamy że to pole
      return true;
    }
    
    const isNonField = FarmModule.NON_FIELD_BUILDINGS.some(type => 
      buildingType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (isNonField) {
      this.log.debug(`Budynek ${position} to ${buildingType} - pomijam (nie jest polem uprawnym)`);
      return false;
    }
    
    return true;
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
    
    // Sprawdź czy to pole uprawne (nie kurnik, obora itp.)
    const isField = await this.isFieldBuilding(position);
    if (!isField) {
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
        
        // Sprawdź i obsłuż wszystkie możliwe popupy (poziom, premium, przeszkody)
        const popupResult = await this.handleBuildingPopups();
        
        if (popupResult === 'level_restricted') {
          this.log.info(`Budynek ${position} na farmie ${this.currentFarm} - zbyt niski poziom gracza`);
          return false;
        }
        
        if (popupResult === 'premium_required') {
          this.log.info(`Budynek ${position} na farmie ${this.currentFarm} - wymaga konta premium`);
          return false;
        }
        
        if (popupResult === 'obstacle_cleared') {
          this.log.info(`Usunięto przeszkodę na polu ${position}`);
          // Po wyczyszczeniu trzeba ponownie kliknąć w budynek
          await this.session.randomDelay(500, 1000);
          await building.click({ timeout: 5000 });
          await this.session.randomDelay(1000, 2000);
        } else if (popupResult === 'cannot_afford') {
          this.log.info(`Nie stać na usunięcie przeszkody na polu ${position}`);
          return false;
        }
        
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
   * Obsługuje wszystkie możliwe popupy przy wchodzeniu do budynku
   * @returns {'ok'|'level_restricted'|'premium_required'|'obstacle_cleared'|'cannot_afford'} status
   */
  async handleBuildingPopups() {
    const page = this.session.page;
    
    try {
      const globalbox = await page.$('#globalbox');
      if (!globalbox) return 'ok';
      
      const isVisible = await globalbox.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      if (!isVisible) return 'ok';
      
      // Pobierz treść popupa
      const content = await page.$('#globalbox_content');
      const contentText = content ? await content.textContent() : '';
      
      const headline = await page.$('#globalbox_headline');
      const headlineText = headline ? await headline.textContent() : '';
      
      this.log.debug(`Popup globalbox - nagłówek: "${headlineText}", treść: "${contentText}"`);
      
      // 1. Sprawdź czy to komunikat o zbyt niskim poziomie
      if (contentText.includes('Twój poziom jest jeszcze zbyt niski')) {
        await this.closeGlobalBox();
        return 'level_restricted';
      }
      
      // 2. Sprawdź czy wymaga premium
      if (contentText.includes('Wymaga konta premium') || contentText.includes('premium')) {
        await this.closeGlobalBox();
        return 'premium_required';
      }
      
      // 3. Sprawdź czy to popup czyszczenia przeszkód
      if (headlineText.includes('Wyczyścić pole') || contentText.includes('Usunięcie kosztuje')) {
        return await this.handleObstaclePopup(contentText);
      }
      
      // Nieznany popup - zamknij i kontynuuj
      this.log.debug('Nieznany popup globalbox - zamykam');
      await this.closeGlobalBox();
      return 'ok';
      
    } catch (e) {
      this.log.debug(`Błąd obsługi popupów: ${e.message}`);
      return 'ok';
    }
  }

  /**
   * Zamyka globalbox
   */
  async closeGlobalBox() {
    const page = this.session.page;
    try {
      const closeBtn = await page.$('#globalbox_close');
      if (closeBtn) {
        await closeBtn.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
      // Alternatywnie kliknij button1 (często jest to "OK")
      const btn1 = await page.$('#globalbox_button1');
      if (btn1) {
        await btn1.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd zamykania globalbox: ${e.message}`);
    }
    return false;
  }

  /**
   * Obsługuje popup usuwania przeszkód
   * @param {string} contentText - treść popupa
   * @returns {'obstacle_cleared'|'cannot_afford'|'ok'}
   */
  async handleObstaclePopup(contentText) {
    const page = this.session.page;
    
    this.log.info(`Wykryto przeszkodę do usunięcia: ${contentText}`);
    
    // Parsuj koszt z tekstu "Usunięcie kosztuje 30,00 ft."
    const costMatch = contentText.match(/([\d\s.,]+)\s*ft/i);
    if (costMatch) {
      const costStr = costMatch[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const cost = parseFloat(costStr);
      
      this.log.debug(`Koszt usunięcia przeszkody: ${cost} ft`);
      
      // Sprawdź czy gracza stać
      if (this.playerInfo && this.playerInfo.money !== undefined) {
        if (cost > this.playerInfo.money) {
          this.log.info(`Nie stać na usunięcie przeszkody (koszt: ${cost} ft, kasa: ${this.playerInfo.money} ft)`);
          await this.closeGlobalBox();
          return 'cannot_afford';
        }
        this.log.info(`Stać na usunięcie przeszkody (koszt: ${cost} ft, kasa: ${this.playerInfo.money} ft)`);
      }
    }
    
    // Kliknij "Tak" aby usunąć przeszkodę
    const yesBtn = await page.$('#globalbox_button1');
    if (yesBtn) {
      this.log.info('Usuwam przeszkodę z pola...');
      await yesBtn.click();
      await this.session.randomDelay(1500, 2500);
      return 'obstacle_cleared';
    }
    
    return 'ok';
  }

  /**
   * Sprawdza czy pojawił się komunikat o zbyt niskim poziomie gracza
   * Zamyka popup jeśli istnieje
   * @returns {boolean} true jeśli poziom zbyt niski
   * @deprecated Użyj handleBuildingPopups() zamiast tego
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
   * Obsługuje popup usuwania przeszkód (chwasty, kamienie itp.)
   * @returns {'cleared'|'cannot_afford'|'no_obstacle'} status operacji
   * @deprecated Użyj handleBuildingPopups() zamiast tego
   */
  async handleObstacleClearing() {
    const page = this.session.page;
    
    try {
      const globalbox = await page.$('#globalbox');
      if (!globalbox) return 'no_obstacle';
      
      const isVisible = await globalbox.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      if (!isVisible) return 'no_obstacle';
      
      // Sprawdź czy to popup "Wyczyścić pole?"
      const headline = await page.$('#globalbox_headline');
      if (!headline) return 'no_obstacle';
      
      const headlineText = await headline.textContent();
      if (!headlineText || !headlineText.includes('Wyczyścić pole')) {
        return 'no_obstacle';
      }
      
      // Pobierz koszt usunięcia
      const content = await page.$('#globalbox_content');
      if (content) {
        const contentText = await content.textContent();
        this.log.debug(`Popup usuwania przeszkody: ${contentText}`);
        
        // Parsuj koszt z tekstu "Usunięcie kosztuje 30,00 ft."
        const costMatch = contentText.match(/([\d\s,]+)\s*ft/i);
        if (costMatch) {
          const costStr = costMatch[1].replace(/\s/g, '').replace(',', '.');
          const cost = parseFloat(costStr);
          
          // Sprawdź czy gracza stać (jeśli mamy info o kasie)
          if (this.playerInfo && this.playerInfo.money !== undefined) {
            if (cost > this.playerInfo.money) {
              this.log.info(`Nie stać na usunięcie przeszkody (koszt: ${cost} ft, kasa: ${this.playerInfo.money} ft)`);
              // Zamknij popup
              const closeBtn = await page.$('#globalbox_close');
              if (closeBtn) {
                await closeBtn.click();
                await this.session.randomDelay(300, 500);
              }
              return 'cannot_afford';
            }
          }
        }
      }
      
      // Kliknij "Tak" aby usunąć przeszkodę
      const yesBtn = await page.$('#globalbox_button1');
      if (yesBtn) {
        this.log.info('Usuwam przeszkodę z pola...');
        await yesBtn.click();
        await this.session.randomDelay(1000, 2000);
        return 'cleared';
      }
      
    } catch (e) {
      this.log.debug(`Błąd obsługi przeszkody: ${e.message}`);
    }
    
    return 'no_obstacle';
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
   * - Premium: używa #cropall ("Zbierz wszystko")
   * - Non-premium: klika ręcznie na każde gotowe pole
   */
  async harvestInCurrentBuilding() {
    if (this.isPremium) {
      return await this.harvestInCurrentBuildingPremium();
    } else {
      return await this.harvestInCurrentBuildingManual();
    }
  }

  /**
   * Zbiera plony używając "Zbierz wszystko" (PREMIUM)
   */
  async harvestInCurrentBuildingPremium() {
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
        // Sprawdź czy przycisk jest aktywny (nie ma klasy _inactive)
        const className = await cropAllBtn.getAttribute('class');
        if (className && className.includes('_inactive')) {
          this.log.debug('Przycisk cropall nieaktywny - brak pól do zbioru');
          return 0;
        }
        
        await cropAllBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('[PREMIUM] Użyto "Zbierz wszystko" (#cropall)');
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
    
    // Akceptuj powiadomienie po zebraniu
    if (harvested) {
      await this.acceptGlobalBoxIfVisible();
    }
    
    return harvested ? 1 : 0;
  }

  /**
   * Zbiera plony ręcznie klikając na każde pole (NON-PREMIUM)
   * Budynek ma 120 pól (12x10)
   */
  async harvestInCurrentBuildingManual() {
    const page = this.session.page;
    this.log.info('[NON-PREMIUM] Ręczne zbieranie plonów...');
    
    // Najpierw włącz tryb zbierania klikając #ernten
    try {
      const harvestMode = await page.$('#ernten');
      if (harvestMode) {
        await harvestMode.click();
        await this.session.randomDelay(300, 500);
      }
    } catch (e) {
      this.log.warn('Nie można włączyć trybu zbierania');
      return 0;
    }
    
    let harvestedCount = 0;
    
    // Pobierz wszystkie pola gotowe do zbioru
    // Gotowe pola mają w URL produktu końcówkę _04.gif (faza 4 = dojrzałe)
    // np. getreide_04.gif, karotte_04.gif
    const readyFields = await page.$$eval('#gardenarea .feld', (fields) => {
      const ready = [];
      fields.forEach((field, index) => {
        const innerField = field.querySelector('[id^="f"]');
        if (innerField) {
          const style = innerField.getAttribute('style') || '';
          const bgMatch = style.match(/background:url\(['"]?([^'"]+)['"]?\)/);
          if (bgMatch) {
            const bgUrl = bgMatch[1];
            // Sprawdź czy to gotowa roślina (faza 4, ale nie 04.1.1 ani 04.1.2 - te rosną)
            // Gotowe: produkt_04.gif (bez dodatkowych numerów)
            // Rosnące: produkt_04.1.1.gif, produkt_04.1.2.gif itd.
            if (bgUrl.includes('_04.gif') && !bgUrl.includes('_04.1') && !bgUrl.includes('steine') && !bgUrl.includes('unkraut') && !bgUrl.includes('baumstumpf') && !bgUrl.includes('maulwurf') && !bgUrl.includes('/0.gif')) {
              ready.push({
                index: index + 1,
                fieldId: field.id,
                innerId: innerField.id,
                bgUrl: bgUrl
              });
            }
          }
        }
      });
      return ready;
    });
    
    this.log.info(`Znaleziono ${readyFields.length} pól gotowych do zbioru`);
    
    // Kliknij na każde gotowe pole
    for (const field of readyFields) {
      try {
        const fieldEl = await page.$(`#${field.innerId}`);
        if (fieldEl) {
          await fieldEl.click();
          await this.session.randomDelay(150, 300);
          harvestedCount++;
        }
      } catch (e) {
        this.log.debug(`Błąd zbierania pola ${field.index}: ${e.message}`);
      }
    }
    
    // Poczekaj na przetworzenie i zamknij ewentualny popup
    await this.session.randomDelay(500, 1000);
    await this.acceptGlobalBoxIfVisible();
    
    this.log.info(`[NON-PREMIUM] Zebrano ${harvestedCount} pól`);
    return harvestedCount;
  }

  /**
   * Zamyka popup globalbox jeśli jest widoczny
   */
  async acceptGlobalBoxIfVisible() {
    const page = this.session.page;
    
    try {
      const globalbox = await page.$('#globalbox');
      if (globalbox && await globalbox.isVisible()) {
        const confirmBtn = await page.$('#globalbox_button1');
        if (confirmBtn && await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await this.session.randomDelay(300, 500);
        } else {
          // Zamknij przez X
          const closeBtn = await page.$('#globalbox_close');
          if (closeBtn) {
            await closeBtn.click();
            await this.session.randomDelay(200, 400);
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Sadzi rośliny na pustych polach używając automatu do sadzenia (PREMIUM)
   * NOWA LOGIKA: Szukamy sadzonki na regałach 1, 2, 3
   * 
   * 1. Kliknij #autoplantbuttoninner (otwiera okno wyboru)
   * 2. Przeszukaj regały (rackswitch1, rackswitch2, rackswitch3) szukając sadzonki
   * 3. Kliknij na sadzonkę gdy znajdziemy (rackitem z odpowiednią nazwą w tooltip)
   * 4. Zatwierdź przyciskiem #globalbox_button1
   */
  async plantInCurrentBuildingPremium(cropType = 'Zboże') {
    const page = this.session.page;
    
    // Mapa nazw roślin - obsługuje różne formaty wejścia
    // cropType może być: nazwą polską z diakrytykami, nazwą bez diakrytyków, lub angielską
    const cropNameMap = {
      // Polskie nazwy bez diakrytyków -> z diakrytykami
      'zboze': 'Zboże', 'wheat': 'Zboże', 'pszenica': 'Zboże',
      'kukurydza': 'Kukurydza', 'corn': 'Kukurydza',
      'koniczyna': 'Koniczyna', 'clover': 'Koniczyna',
      'rzepak': 'Rzepak', 'rapeseed': 'Rzepak',
      'buraki': 'Buraki cukrowe', 'beets': 'Buraki cukrowe', 'buraki cukrowe': 'Buraki cukrowe',
      'ziola': 'Zioła', 'herbs': 'Zioła', 'zioła': 'Zioła',
      'sloneczniki': 'Słoneczniki', 'sunflowers': 'Słoneczniki', 'słoneczniki': 'Słoneczniki',
      'blawatki': 'Bławatki', 'cornflowers': 'Bławatki', 'bławatki': 'Bławatki',
      'marchewki': 'Marchewka', 'carrots': 'Marchewka', 'marchewka': 'Marchewka',
      'ogorki': 'Ogórki', 'cucumbers': 'Ogórki', 'ogórki': 'Ogórki',
      'rzodkiewki': 'Rzodkiewka', 'radishes': 'Rzodkiewka', 'rzodkiewka': 'Rzodkiewka',
      'truskawki': 'Truskawki', 'strawberries': 'Truskawki',
      'pomidory': 'Pomidory', 'tomatoes': 'Pomidory',
      'cebule': 'Cebula', 'onions': 'Cebula', 'cebula': 'Cebula',
      'szpinak': 'Szpinak', 'spinach': 'Szpinak',
      'kalafiory': 'Kalafior', 'cauliflower': 'Kalafior', 'kalafior': 'Kalafior',
      'ziemniaki': 'Ziemniaki', 'potatoes': 'Ziemniaki',
      'szparagi': 'Szparagi', 'asparagus': 'Szparagi',
      'cukinie': 'Cukinia', 'zucchini': 'Cukinia', 'cukinia': 'Cukinia',
      'jagody': 'Jagody', 'blueberries': 'Jagody',
      'maliny': 'Maliny', 'raspberries': 'Maliny',
      'jablka': 'Jabłka', 'apples': 'Jabłka', 'jabłka': 'Jabłka',
      'dynie': 'Dynie', 'pumpkins': 'Dynie',
      'gwiazdka betlejemska': 'Gwiazdka betlejemska',
      'żonkil': 'Żonkil', 'zonkil': 'Żonkil',
      'winogrona': 'Winogrona',
      'herbata': 'Herbata',
      'pomarańczowy tulipan': 'Pomarańczowy tulipan', 'pomaranczowy tulipan': 'Pomarańczowy tulipan',
    };
    
    // Jeśli cropType już jest pełną nazwą (np. z CROP_ID_TO_NAME), użyj jej bezpośrednio
    // W przeciwnym razie spróbuj zmapować
    const cropName = cropNameMap[cropType.toLowerCase()] || cropType;
    
    // Sprawdź czy musimy zmienić roślinę (inna niż poprzednio wybrana)
    const needToSelectCrop = !cropAlreadySelected || selectedCropType !== cropName;
    
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
   * - Premium: używa #waterall ("Podlej wszystko")
   * - Non-premium: klika ręcznie na każde niepodlane pole
   */
  async waterInCurrentBuilding() {
    if (this.isPremium) {
      return await this.waterInCurrentBuildingPremium();
    } else {
      return await this.waterInCurrentBuildingManual();
    }
  }

  /**
   * Podlewa używając "Podlej wszystko" (PREMIUM)
   */
  async waterInCurrentBuildingPremium() {
    const page = this.session.page;
    
    this.log.info('[PREMIUM] Rozpoczynam podlewanie...');
    
    // Najpierw włącz tryb podlewania klikając #giessen
    try {
      const waterMode = await page.$('#giessen');
      if (waterMode) {
        await waterMode.click();
        await this.session.randomDelay(300, 500);
        this.log.debug('Włączono tryb podlewania (#giessen)');
      }
    } catch (e) {
      this.log.debug(`Nie znaleziono #giessen: ${e.message}`);
    }
    
    // Kliknij "Podlej wszystko" - #waterall
    let watered = false;
    try {
      const waterAllBtn = await page.$('#waterall');
      if (waterAllBtn) {
        // Sprawdź czy przycisk jest aktywny
        const className = await waterAllBtn.getAttribute('class');
        if (className && className.includes('_inactive')) {
          this.log.debug('Przycisk waterall nieaktywny - brak pól do podlania');
          return 0;
        }
        
        await waterAllBtn.click();
        await this.session.randomDelay(1000, 2000);
        this.log.info('[PREMIUM] Użyto "Podlej wszystko" (#waterall)');
        watered = true;
      }
    } catch (e) {
      this.log.debug(`Błąd podlewania #waterall: ${e.message}`);
    }
    
    // Alternatywne selektory
    if (!watered) {
      const waterSelectors = ['.waterall', 'span.waterall'];
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
    
    if (watered) {
      await this.acceptGlobalBoxIfVisible();
    }
    
    return watered ? 1 : 0;
  }

  /**
   * Podlewa ręcznie klikając na każde pole z rośliną (NON-PREMIUM)
   * Flow: 1) Klik #giessen 2) Klik na każde pole z rośliną
   */
  async waterInCurrentBuildingManual() {
    const page = this.session.page;
    this.log.info('[NON-PREMIUM] Ręczne podlewanie pól...');
    
    // Krok 1: Włącz tryb podlewania (#giessen)
    try {
      const waterMode = await page.$('#giessen');
      if (waterMode) {
        await waterMode.click();
        await this.session.randomDelay(400, 700);
        this.log.debug('Włączono tryb podlewania');
      } else {
        this.log.warn('Nie znaleziono przycisku #giessen');
        return 0;
      }
    } catch (e) {
      this.log.warn(`Nie można włączyć trybu podlewania: ${e.message}`);
      return 0;
    }
    
    let wateredCount = 0;
    
    // Krok 2: Znajdź wszystkie pola z roślinami
    try {
      const fieldsWithPlants = await page.$$eval('#gardenarea .feld', (fields) => {
        return fields.map((field, index) => {
          const innerField = field.querySelector('[id^="f"]');
          if (!innerField) return null;
          
          const style = innerField.getAttribute('style') || '';
          const bgMatch = style.match(/background[^;]*url\(['"]?([^'")\s]+)['"]?\)/i);
          const bgUrl = bgMatch ? bgMatch[1] : '';
          
          // Pole z rośliną: ma tło inne niż /0.gif i nie jest przeszkodą
          const isEmpty = bgUrl.includes('/0.gif') || bgUrl === '';
          const isObstacle = bgUrl.includes('steine') || 
                            bgUrl.includes('unkraut') || 
                            bgUrl.includes('baumstumpf') || 
                            bgUrl.includes('maulwurf');
          
          // Roślina: nie jest puste i nie jest przeszkodą
          const hasPlant = !isEmpty && !isObstacle && bgUrl !== '';
          
          if (hasPlant) {
            return {
              index,
              innerId: innerField.id,
              bgUrl
            };
          }
          return null;
        }).filter(f => f !== null);
      });
      
      this.log.info(`Znaleziono ${fieldsWithPlants.length} pól z roślinami do podlania`);
      
      // Kliknij na każde pole z rośliną
      for (const fieldInfo of fieldsWithPlants) {
        try {
          const fieldEl = await page.$(`#${fieldInfo.innerId}`);
          if (fieldEl) {
            await fieldEl.click();
            await this.session.randomDelay(100, 200);
            wateredCount++;
          }
        } catch (e) {
          this.log.debug(`Błąd podlewania pola ${fieldInfo.index}: ${e.message}`);
        }
      }
      
    } catch (e) {
      this.log.warn(`Błąd pobierania pól do podlania: ${e.message}`);
    }
    
    this.log.info(`[NON-PREMIUM] Podlano ${wateredCount} pól`);
    return wateredCount;
  }

  /**
   * Sadzi rośliny na pustych polach
   * - Premium: używa automatu do sadzenia
   * - Non-premium: klika ręcznie na każde puste pole
   */
  async plantInCurrentBuilding(cropType = 'zboze') {
    if (this.isPremium) {
      return await this.plantInCurrentBuildingPremium(cropType);
    } else {
      return await this.plantInCurrentBuildingManual(cropType);
    }
  }

  /**
   * Sadzi rośliny ręcznie klikając na każde puste pole (NON-PREMIUM)
   * Flow: 1) Klik #anpflanzen 2) Klik #rackitemXX 3) Klik na wolne pola
   */
  async plantInCurrentBuildingManual(cropType = 'Zboże') {
    const page = this.session.page;
    
    // Mapowanie nazwy rośliny na ID (dla #rackitemXX)
    const cropNameToId = {
      'zboże': 1, 'zboze': 1,
      'kukurydza': 2,
      'koniczyna': 3,
      'rzepak': 4,
      'buraki cukrowe': 5, 'buraki': 5,
      'zioła': 6, 'ziola': 6,
      'słoneczniki': 7, 'sloneczniki': 7,
      'bławatki': 8, 'blawatki': 8,
      'marchewka': 17, 'marchewki': 17,
      'ogórki': 18, 'ogorki': 18,
      'rzodkiewka': 19, 'rzodkiewki': 19,
      'truskawki': 20,
      'pomidory': 21,
      'cebula': 22, 'cebule': 22,
      'szpinak': 23,
      'kalafior': 24, 'kalafiory': 24,
      'ziemniaki': 26,
      'szparagi': 29,
      'cukinia': 31, 'cukinie': 31,
      'jagody': 32,
      'maliny': 33,
      'porzeczki': 34,
      'jeżyny': 35, 'jezyny': 35,
      'mirabelki': 36,
      'jabłka': 37, 'jablka': 37,
      'dynie': 38,
      'gwiazdka betlejemska': 97,
      'żonkil': 104, 'zonkil': 104,
      'winogrona': 107,
      'herbata': 129,
      'pomarańczowy tulipan': 158, 'pomaranczowy tulipan': 158,
    };
    
    // Znajdź ID rośliny
    const cropId = cropNameToId[cropType.toLowerCase()] || 1;
    this.log.info(`[NON-PREMIUM] Sadzenie "${cropType}" (ID: ${cropId}) - tryb ręczny`);
    
    // Krok 1: Kliknij przycisk "Zasiej" (#anpflanzen)
    try {
      const plantModeBtn = await page.$('#anpflanzen');
      if (plantModeBtn) {
        await plantModeBtn.click();
        await this.session.randomDelay(500, 800);
        this.log.debug('Włączono tryb sadzenia');
      } else {
        this.log.warn('Nie znaleziono przycisku #anpflanzen');
        return 0;
      }
    } catch (e) {
      this.log.warn(`Nie można włączyć trybu sadzenia: ${e.message}`);
      return 0;
    }
    
    // Krok 2: Wybierz sadzonkę z regału (#rackitemXX)
    try {
      const rackItemSelector = `#rackitem${cropId}`;
      const rackItem = await page.$(rackItemSelector);
      
      if (rackItem) {
        // Sprawdź czy mamy sadzonki w magazynie (counter > 0)
        const counterText = await page.$eval(`${rackItemSelector} .counter_sack`, el => el.textContent).catch(() => '0');
        const seedCount = parseInt(counterText) || 0;
        
        if (seedCount === 0) {
          this.log.warn(`Brak sadzonek ${cropType} w magazynie`);
          return 0;
        }
        
        this.log.debug(`Znaleziono ${seedCount} sadzonek ${cropType}, wybieram...`);
        await rackItem.click();
        await this.session.randomDelay(300, 500);
      } else {
        this.log.warn(`Nie znaleziono sadzonki ${rackItemSelector} - może brak w magazynie`);
        return 0;
      }
    } catch (e) {
      this.log.warn(`Błąd wybierania sadzonki: ${e.message}`);
      return 0;
    }
    
    // Krok 3: Znajdź wszystkie wolne pola i kliknij na każde
    let plantedCount = 0;
    
    try {
      // Pobierz informacje o wszystkich polach
      const fieldsInfo = await page.$$eval('#gardenarea .feld', (fields) => {
        return fields.map((field, index) => {
          const innerField = field.querySelector(`[id^="f"]`);
          if (!innerField) return { index, isEmpty: false, isObstacle: false };
          
          const style = innerField.getAttribute('style') || '';
          const bgMatch = style.match(/background[^;]*url\(['"]?([^'")\s]+)['"]?\)/i);
          const bgUrl = bgMatch ? bgMatch[1] : '';
          
          // Sprawdź czy pole jest puste (/0.gif lub brak tła)
          const isEmpty = bgUrl.includes('/0.gif') || bgUrl === '';
          
          // Sprawdź czy to przeszkoda
          const isObstacle = bgUrl.includes('steine') || 
                            bgUrl.includes('unkraut') || 
                            bgUrl.includes('baumstumpf') || 
                            bgUrl.includes('maulwurf');
          
          return {
            index,
            innerId: innerField.id,
            isEmpty,
            isObstacle,
            bgUrl
          };
        });
      });
      
      // Filtruj tylko puste pola (bez przeszkód)
      const emptyFields = fieldsInfo.filter(f => f.isEmpty && !f.isObstacle);
      this.log.info(`Znaleziono ${emptyFields.length} pustych pól do zasadzenia`);
      
      // Kliknij na każde puste pole
      for (const fieldInfo of emptyFields) {
        try {
          const fieldEl = await page.$(`#${fieldInfo.innerId}`);
          if (fieldEl) {
            await fieldEl.click();
            await this.session.randomDelay(150, 300);
            plantedCount++;
          }
        } catch (e) {
          this.log.debug(`Błąd sadzenia na polu ${fieldInfo.index}: ${e.message}`);
        }
      }
      
    } catch (e) {
      this.log.warn(`Błąd pobierania pól: ${e.message}`);
    }
    
    this.log.info(`[NON-PREMIUM] Posadzono ${plantedCount} roślin`);
    return plantedCount;
  }

  /**
   * Próbuje usunąć przeszkodę z pola (chwasty, kamienie, etc.)
   * Sprawdza koszt i porównuje z dostępnymi pieniędzmi
   */
  async tryToClearObstacle(fieldIndex) {
    const page = this.session.page;
    
    try {
      // Najpierw zamknij wszelkie otwarte popupy
      await this.closeFundPopup();
      await this.session.closePopups();
      await this.session.randomDelay(200, 400);
      
      // Kliknij na pole z przeszkodą
      const field = await page.$(`#f${fieldIndex}`);
      if (!field) return false;
      
      await field.click();
      await this.session.randomDelay(800, 1200);
      
      // Sprawdź czy pojawił się globalbox z informacją o koszcie
      const globalBox = await page.$('#globalbox');
      if (!globalBox) {
        // Może przeszkoda została już usunięta lub to nie przeszkoda
        await this.closeFundPopup();
        return false;
      }
      
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }, globalBox);
      
      if (!isVisible) {
        await this.closeFundPopup();
        return false;
      }
      
      // Pobierz tekst z globalbox_content
      const content = await page.$eval('#globalbox_content', el => el.innerText).catch(() => '');
      
      // Szukaj kosztu (format: "XX.XXX ft" lub "XX ft")
      const costMatch = content.match(/([\d.,]+)\s*ft/i);
      if (!costMatch) {
        // Brak informacji o koszcie - może być darmowe, spróbuj zaakceptować
        await this.acceptGlobalBoxIfVisible();
        await this.session.randomDelay(500, 800);
        await this.closeFundPopup();
        return true;
      }
      
      // Parsuj koszt (format niemiecki: 1.234,56)
      const costStr = costMatch[1].replace(/\./g, '').replace(',', '.');
      const cost = parseFloat(costStr);
      
      // Sprawdź czy stać nas
      if (this.playerInfo && this.playerInfo.money >= cost) {
        this.log.info(`Usuwam przeszkodę za ${cost} ft`);
        await this.acceptGlobalBoxIfVisible();
        await this.session.randomDelay(800, 1200);
        
        // Zamknij popup ze znalezioną gotówką jeśli się pojawił
        await this.closeFundPopup();
        await this.session.randomDelay(300, 500);
        
        return true;
      } else {
        this.log.debug(`Brak funduszy na usunięcie przeszkody (koszt: ${cost} ft, mamy: ${this.playerInfo?.money || 0} ft)`);
        // Zamknij okno
        const cancelBtn = await page.$('#globalbox_button2');
        if (cancelBtn) {
          await cancelBtn.click();
          await this.session.randomDelay(300, 500);
        }
        return false;
      }
      
    } catch (e) {
      this.log.debug(`Błąd przy usuwaniu przeszkody: ${e.message}`);
      await this.closeFundPopup();
      return false;
    }
  }

  /**
   * Zamyka popup "Znalazłeś gotówkę" który pojawia się po usunięciu niektórych przeszkód
   */
  async closeFundPopup() {
    const page = this.session.page;
    
    try {
      const fundPopup = await page.$('#fundpopup');
      if (fundPopup) {
        const isVisible = await page.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none';
        }, fundPopup);
        
        if (isVisible) {
          // Kliknij X aby zamknąć
          const closeImg = await page.$('#fundpopup img.link');
          if (closeImg) {
            await closeImg.click();
            this.log.debug('Zamknięto popup ze znalezioną gotówką');
            await this.session.randomDelay(300, 500);
          }
        }
      }
    } catch (e) {
      // Ignoruj błędy
    }
  }

  /**
   * Znajduje pierwszą przeszkodę w budynku
   * @returns {Object|null} Dane przeszkody lub null
   */
  async findFirstObstacle() {
    const page = this.session.page;
    
    try {
      const obstacle = await page.$$eval('#gardenarea .feld', (fields) => {
        for (let index = 0; index < fields.length; index++) {
          const field = fields[index];
          const innerField = field.querySelector('[id^="f"]');
          if (innerField) {
            const style = innerField.getAttribute('style') || '';
            const bgMatch = style.match(/background:url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch) {
              const bgUrl = bgMatch[1].toLowerCase();
              // Sprawdź czy to przeszkoda
              if (bgUrl.includes('unkraut') ||    // chwasty
                  bgUrl.includes('steine') ||     // kamienie  
                  bgUrl.includes('baumstumpf') || // pniaki
                  bgUrl.includes('maulwurf')) {   // kretowisko
                return {
                  index: index + 1,
                  fieldId: field.id,
                  innerId: innerField.id,
                  type: bgUrl.includes('unkraut') ? 'chwasty' :
                        bgUrl.includes('steine') ? 'kamienie' :
                        bgUrl.includes('baumstumpf') ? 'pniaki' : 'kretowisko'
                };
              }
            }
          }
        }
        return null;
      });
      
      return obstacle;
    } catch (e) {
      return null;
    }
  }

  /**
   * Liczy przeszkody w budynku
   * @returns {number} Liczba przeszkód
   */
  async countObstacles() {
    const page = this.session.page;
    
    try {
      const count = await page.$$eval('#gardenarea .feld', (fields) => {
        let count = 0;
        fields.forEach((field) => {
          const innerField = field.querySelector('[id^="f"]');
          if (innerField) {
            const style = innerField.getAttribute('style') || '';
            const bgMatch = style.match(/background:url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch) {
              const bgUrl = bgMatch[1].toLowerCase();
              if (bgUrl.includes('unkraut') || bgUrl.includes('steine') || 
                  bgUrl.includes('baumstumpf') || bgUrl.includes('maulwurf')) {
                count++;
              }
            }
          }
        });
        return count;
      });
      
      return count;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Czyści wszystkie przeszkody (chwasty, kamienie, korzenie) w aktualnym budynku
   * Przeszkody mają specyficzne tła: unkraut (chwasty), steine (kamienie), baumstumpf (pniaki)
   * Używa podejścia "znajdź i usuń jedną" aby uniknąć problemów ze starym DOM
   */
  async clearObstaclesInCurrentBuilding() {
    const page = this.session.page;
    this.log.info('Sprawdzam pola pod kątem przeszkód (chwasty, kamienie, pniaki)...');
    
    let clearedCount = 0;
    let failedAttempts = 0;
    const maxFailedAttempts = 3; // Po 3 nieudanych próbach z rzędu przerywamy
    
    try {
      // Najpierw policz ile jest przeszkód
      const initialCount = await this.countObstacles();
      
      if (initialCount === 0) {
        this.log.debug('Brak przeszkód do usunięcia');
        return 0;
      }
      
      this.log.info(`Znaleziono ${initialCount} przeszkód do usunięcia`);
      
      // Usuwaj przeszkody jedna po drugiej, za każdym razem szukając pierwszej
      // To zapewnia że zawsze pracujemy z aktualnym DOM
      while (failedAttempts < maxFailedAttempts) {
        // Zamknij wszelkie popupy przed szukaniem
        await this.closeFundPopup();
        await this.session.closePopups();
        
        // Znajdź pierwszą przeszkodę
        const obstacle = await this.findFirstObstacle();
        
        if (!obstacle) {
          // Nie ma więcej przeszkód
          this.log.debug('Nie znaleziono więcej przeszkód');
          break;
        }
        
        this.log.debug(`Usuwam ${obstacle.type} z pola ${obstacle.index}...`);
        const cleared = await this.tryToClearObstacle(obstacle.index);
        
        if (cleared) {
          clearedCount++;
          failedAttempts = 0; // Reset licznika błędów
          this.log.info(`Usunięto ${obstacle.type} z pola ${obstacle.index}`);
        } else {
          failedAttempts++;
          this.log.debug(`Nie udało się usunąć ${obstacle.type} z pola ${obstacle.index} (próba ${failedAttempts}/${maxFailedAttempts})`);
          
          // Może brakuje pieniędzy - sprawdź czy są jeszcze inne przeszkody
          if (failedAttempts >= maxFailedAttempts) {
            this.log.info('Przerywam usuwanie przeszkód - zbyt wiele nieudanych prób');
          }
        }
        
        // Krótka przerwa między przeszkodami
        await this.session.randomDelay(300, 500);
      }
      
    } catch (e) {
      this.log.debug(`Błąd podczas czyszczenia przeszkód: ${e.message}`);
    }
    
    // Końcowe sprzątanie popupów
    await this.closeFundPopup();
    await this.session.closePopups();
    
    if (clearedCount > 0) {
      this.log.info(`Usunięto ${clearedCount} przeszkód w budynku`);
    }
    
    return clearedCount;
  }

  /**
   * Szuka sadzonki na regałach w oknie wyboru roślin
   */
  async selectSeedFromRacks(cropName) {
    const page = this.session.page;
    
    // Przeszukaj regały 1, 2, 3
    for (let rack = 1; rack <= 3; rack++) {
      try {
        // Kliknij na zakładkę regału
        const rackTab = await page.$(`#rackswitch${rack}`);
        if (rackTab) {
          await rackTab.click();
          await this.session.randomDelay(300, 500);
        }
        
        // Szukaj sadzonki na tym regale
        const items = await page.$$('.rackitem');
        for (const item of items) {
          const tooltip = await page.evaluate(el => {
            const headline = el.querySelector('.headline');
            return headline ? headline.innerText : '';
          }, item);
          
          if (tooltip.includes(cropName)) {
            await item.click();
            await this.session.randomDelay(200, 400);
            return true;
          }
        }
      } catch (e) {
        this.log.debug(`Błąd przy szukaniu na regale ${rack}: ${e.message}`);
      }
    }
    
    return false;
  }

  /**
   * Wykonuje pełny cykl farmy dla wszystkich farm i budynków
   */
  async fullFarmCycle(options = {}) {
    const {
      farms = null, // null = użyj farm z konfiguracji, nie wszystkich 4
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
        const configStr = getFarmConfig(this.account.id);
        farmConfig = configStr ? JSON.parse(configStr) : null;
        this.log.info(`Załadowano konfigurację farmy: ${JSON.stringify(farmConfig)}`);
      } catch (e) {
        this.log.warn(`Nie udało się pobrać konfiguracji farmy, używam domyślnej (zboże): ${e.message}`);
      }
    }
    
    // Określ które farmy iterować - tylko te z konfiguracji lub podane w opcjach
    let farmsToProcess = farms;
    if (!farmsToProcess && farmConfig) {
      // Pobierz numery farm z konfiguracji (np. jeśli jest farm1 i farm2, to [1, 2])
      farmsToProcess = [];
      for (let i = 1; i <= 4; i++) {
        if (farmConfig[`farm${i}`]) {
          farmsToProcess.push(i);
        }
      }
      if (farmsToProcess.length === 0) {
        farmsToProcess = [1]; // fallback do farmy 1
      }
      this.log.info(`Iteruję przez farmy z konfiguracji: ${farmsToProcess.join(', ')}`);
    } else if (!farmsToProcess) {
      farmsToProcess = [1]; // fallback jeśli brak konfiguracji
    }
    
    const results = {
      harvested: 0,
      planted: 0,
      watered: 0,
    };
    
    for (const farmNum of farmsToProcess) {
      this.log.info(`--- Farma ${farmNum} ---`);
      
      // Określ roślinę dla tej farmy - rozwiąż ID na nazwę
      let farmCropId = cropType || '1'; // domyślnie zboże (ID 1)
      if (!cropType && farmConfig) {
        const farmKey = `farm${farmNum}`;
        farmCropId = farmConfig[farmKey] || '1';
      }
      
      // Rozwiąż ID rośliny na nazwę wyświetlaną w grze
      const cropId = parseInt(farmCropId) || 1;
      const farmCropName = CROP_ID_TO_NAME[cropId] || 'Zboże';
      this.log.info(`Farma ${farmNum}: wybrana roślina "${farmCropName}" (ID: ${cropId})`);
      
      // Przejdź do farmy
      const navigated = await this.navigateToFarm(farmNum);
      if (!navigated) {
        this.log.warn(`Nie można przejść do farmy ${farmNum}, pomijam`);
        continue;
      }
      
      // Sprawdź stan wszystkich budynków PRZED wchodzeniem
      this.log.info(`Sprawdzam stan budynków na farmie ${farmNum}...`);
      const buildingStatuses = await this.getAllBuildingsStatus();
      
      // Sprawdź czy wszystkie budynki są zablokowane - jeśli tak, pomiń farmę
      const allLocked = buildingStatuses.every(s => s.status === 'locked');
      if (allLocked) {
        this.log.info(`Farma ${farmNum}: wszystkie budynki zablokowane, pomijam całą farmę`);
        continue;
      }
      
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
        
        // NAJPIERW: Usuń przeszkody (chwasty, kamienie, pniaki) przed zbieraniem/sadzeniem
        const obstaclesCleared = await this.clearObstaclesInCurrentBuilding();
        if (obstaclesCleared > 0) {
          this.log.info(`Wyczyszczono ${obstaclesCleared} przeszkód w budynku ${pos}`);
        }
        
        // Zbieranie - tylko jeśli status był 'ready' lub nieznany
        if (harvest && (!status || status.status === 'ready' || status.status === 'unknown')) {
          let h = await this.harvestInCurrentBuilding();
          results.harvested += h;
          if (h > 0) this.log.info(`Zebrano ${h} plonów`);
          
          // WERYFIKACJA: Sprawdź czy nie pominięto żadnych pól do zebrania
          await this.session.randomDelay(300, 500);
          const missedHarvest = await this.harvestInCurrentBuilding();
          if (missedHarvest > 0) {
            this.log.info(`Weryfikacja zbierania: zebrano dodatkowo ${missedHarvest} pominiętych pól`);
            results.harvested += missedHarvest;
          }
        }
        
        // Sadzenie - tylko jeśli status był 'empty', 'ready' (po zebraniu) lub nieznany
        let planted = 0;
        if (plant && (!status || status.status === 'empty' || status.status === 'ready' || status.status === 'unknown')) {
          planted = await this.plantInCurrentBuilding(farmCropName);
          results.planted += planted;
          if (planted > 0) this.log.info(`Posadzono ${planted} roślin`);
          
          // WERYFIKACJA: Sprawdź czy nie pominięto żadnych pól do zasadzenia
          await this.session.randomDelay(300, 500);
          const missedPlant = await this.plantInCurrentBuilding(farmCropName);
          if (missedPlant > 0) {
            this.log.info(`Weryfikacja sadzenia: posadzono dodatkowo ${missedPlant} pominiętych pól`);
            planted += missedPlant;
            results.planted += missedPlant;
          }
        }
        
        // Podlewanie - TYLKO jeśli posadzono rośliny w tym budynku
        this.log.info(`DEBUG podlewanie: water=${water}, planted=${planted}`);
        if (water && planted > 0) {
          this.log.info('Wywołuję waterInCurrentBuilding()...');
          let w = await this.waterInCurrentBuilding();
          results.watered += w;
          if (w > 0) this.log.info(`Podlano ${w} pól`);
          
          // WERYFIKACJA: Sprawdź czy nie pominięto żadnych pól do podlania
          await this.session.randomDelay(300, 500);
          const missedWater = await this.waterInCurrentBuilding();
          if (missedWater > 0) {
            this.log.info(`Weryfikacja podlewania: podlano dodatkowo ${missedWater} pominiętych pól`);
            results.watered += missedWater;
          }
          
          // Poczekaj sekundę przed przejściem do kolejnego budynku
          this.log.debug('Czekam 1 sekundę po podlaniu...');
          await this.session.randomDelay(1000, 1200);
        }
        
        // Wróć do widoku farmy
        await this.exitBuilding();
        await this.session.randomDelay(500, 1000);
      }
      
      // Dodatkowa pauza między farmami
      this.log.debug('Czekam 1 sekundę przed przejściem do kolejnej farmy...');
      await this.session.randomDelay(1000, 1500);
    }
    
    this.log.info('=== Podsumowanie cyklu farmy ===');
    this.log.info(`Zebrano: ${results.harvested}, Posadzono: ${results.planted}, Podlano: ${results.watered}`);
    
    // Loguj do bazy
    await logAction(this.account.id, 'farm_cycle', results);
    
    return results;
  }

  /**
   * Pobiera live status wszystkich pól (czasy do zbioru)
   * Zwraca też informacje o zablokowanych budynkach dla frontendu
   * Format timerów: #farm_production_timer{farmNum}_{fieldNum}
   * Zawartość: "Gotowe!" lub czas np. "02:15:30"
   * @param {Array<number>|null} farmNumbers - opcjonalna tablica numerów farm do sprawdzenia (domyślnie [1,2,3,4])
   */
  async getAllFieldsStatus(farmNumbers = null) {
    const farmsToCheck = farmNumbers || [1, 2, 3, 4];
    this.log.info(`Pobieranie statusu pól dla farm: ${farmsToCheck.join(', ')}...`);
    
    const page = this.session.page;
    const fieldsStatus = [];
    
    // Sprawdź wybrane farmy
    for (const farmNum of farmsToCheck) {
      // Nawiguj do farmy
      const navigated = await this.navigateToFarm(farmNum);
      if (!navigated) {
        // Nie udało się nawigować - oznacz całą farmę jako locked
        for (let fieldNum = 1; fieldNum <= 6; fieldNum++) {
          fieldsStatus.push({
            farm: farmNum,
            field: fieldNum,
            status: 'locked',
            timeLeft: null,
            plantType: null,
            raw: 'Farma zablokowana',
          });
        }
        continue;
      }
      
      await this.session.closePopups();
      await this.session.randomDelay(500, 1000);
      
      // Sprawdź stan budynków na tej farmie
      const buildingStatuses = await this.getAllBuildingsStatus();
      
      for (let fieldNum = 1; fieldNum <= 6; fieldNum++) {
        try {
          // Sprawdź czy budynek jest zablokowany
          const buildingStatus = buildingStatuses.find(b => b.position === fieldNum);
          if (buildingStatus && buildingStatus.status === 'locked') {
            fieldsStatus.push({
              farm: farmNum,
              field: fieldNum,
              status: 'locked',
              timeLeft: null,
              plantType: null,
              raw: 'Budynek zablokowany',
            });
            continue;
          }
          
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
                // Próbuj różne formaty czasu
                const timeMatch = cleanText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  const minutes = parseInt(timeMatch[2]);
                  const seconds = parseInt(timeMatch[3]);
                  // Zwróć w formacie HH:MM:SS dla timerów na frontendzie
                  timeLeft = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                  // Użyj surowego tekstu jako fallback
                  timeLeft = cleanText;
                }
              }
              
              fieldsStatus.push({
                farm: farmNum,
                field: fieldNum,
                status: isReady ? 'ready' : 'growing',
                timeLeft: isReady ? 'Gotowe!' : (timeLeft || cleanText),
                plantType: plantType,
                raw: cleanText,
              });
            }
          } else {
            // Brak timera - budynek jest pusty lub nie ma uprawy
            fieldsStatus.push({
              farm: farmNum,
              field: fieldNum,
              status: 'empty',
              timeLeft: null,
              plantType: null,
              raw: 'Puste',
            });
          }
        } catch (e) {
          this.log.debug(`Błąd sprawdzania pola ${farmNum}_${fieldNum}: ${e.message}`);
        }
      }
    }
    
    this.log.info(`Znaleziono ${fieldsStatus.length} pól (w tym locked/empty)`);
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
      29: 'Szparagi',
      31: 'Cukinie',
      32: 'Jagody',
      33: 'Maliny',
      34: 'Porzeczki',
      35: 'Jeżyny',
      36: 'Mirabelki',
      37: 'Jabłka',
      38: 'Dynie',
      39: 'Gruszki',
      40: 'Wiśnie',
      41: 'Śliwki',
      42: 'Orzechy włoskie',
      43: 'Oliwki',
      44: 'Czosnek',
      45: 'Czerwona kapusta',
      46: 'Chili',
      47: 'Kalarepa',
      48: 'Mlecz',
      49: 'Bazylia',
      50: 'Borowiki',
      51: 'Dalia',
      52: 'Rabarbar',
      53: 'Arbuzy',
      54: 'Brokuły',
      55: 'Fasola',
      56: 'Oberżyna',
      57: 'Papryka',
      58: 'Groch',
      59: 'Seler',
      60: 'Awokado',
      61: 'Por',
      62: 'Brukselka',
      63: 'Koper',
      97: 'Gwiazdka betlejemska',
      104: 'Żonkil',
      107: 'Winogrona',
      108: 'Bodziszki',
      109: 'Stokrotki',
      129: 'Herbata',
      158: 'Pomarańczowy tulipan',
    };
    return plants[id] || `Roślina ${id}`;
  }
}
