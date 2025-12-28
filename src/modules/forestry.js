/**
 * Moduł tartaku (Forestry) - obsługa drzew i produkcji drewna
 * Wolni Farmerzy - struktura:
 * 
 * NAWIGACJA:
 * - Speedlink: #speedlink_forestry
 * 
 * DRZEWA (25 pól):
 * - Pola: #forestry_pos1 do #forestry_pos25
 * - Info po hover: #forestry_pos_info{num} (zawiera nazwę drzewa i czas)
 * - Status: #forestry_pos_status{num}
 * - Zbiór: klik na pole → popup jeśli nie gotowe (NIE) lub szkodnik (TAK + ponów)
 * 
 * SADZONKI:
 * - Wybór: hover na #forestry_stock1_object → #forestry_stock1 (menu)
 * - Elementy: #f_stock_item{1-10}
 * - Ilość: #f_stock_amount_{id}
 * - Po wyborze sadzonka jest aktywna - klikamy na pola żeby sadzić
 * 
 * PRZYCISKI GŁÓWNE:
 * - #forestry_forest_button1 - Podlej wszystkie (forestryWater()) - raz na 24h
 * - #forestry_forest_button2 - Zbierz wszystkie (forestryAjaxAction('cropall'))
 * - #forestry_forest_button3 - Nawoź (forestryFertilize())
 * - #forestry_forest_button6 - Pomocnik w sadzeniu (forestryAutoplant())
 * 
 * BUDYNKI PRODUKCYJNE:
 * - Tartak (building 1): #forestry_building_click1
 * - Stolarnia (building 2): #forestry_building_click2
 * - 2 sloty każdy: #forestry_building_inner_slot_img_main{1,2}
 * - Klik na gotowy slot = zbiór
 * - Klik na pusty slot = menu wyboru produkcji #forestry_production_select
 * - Produkty: .forestry_selectproduction_item z onclick="dialogForestry('startproduction', ...)"
 * - Brak onclick lub klasa "important" = brak zasobów
 * - coins.gif = wymaga monet premium - POMIJAMY
 * - Nawigacja stron: #forestry_selectproduction_navi_next / _pre
 * - Potwierdzenie: #globalbox_button1
 * 
 * TYPY DRZEW (ID):
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
    
    // Nazwy drzew
    this.treeNames = {
      1: 'Świerk', 2: 'Brzoza', 3: 'Buk', 4: 'Topola',
      5: 'Kasztan', 7: 'Dąb', 8: 'Jesion', 9: 'Klon', 10: 'Wierzba'
    };
    
    // Produkty tartaku (building 1) - ID produktu => nazwa
    this.sawmillProducts = {
      41: 'Deski (Świerk posp.)',
      42: 'Kantówki (Świerk posp.)',
      43: 'Okrąglaki (Świerk posp.)',
      44: 'Deski (Brzoza)',
      45: 'Kantówki (Brzoza)',
      46: 'Okrąglaki (Brzoza)',
      47: 'Deski (Buk czerw.)',
      48: 'Kantówki (Buk czerw.)',
      49: 'Okrąglaki (Buk czerw.)',
      50: 'Deski (Topola)',
      51: 'Kantówki (Topola)',
      52: 'Okrąglaki (Topola)',
    };
    
    // Produkty stolarni (building 2) - ID produktu => nazwa
    this.carpentryProducts = {
      101: 'Drewniane ramy',
      102: 'Drewniana balia',
      103: 'Paśnik',
      104: 'Drewniane grabie',
      105: 'Konik na biegunach',
      106: 'Chochla',
      107: 'Miotła',
      108: 'Parkiet',
      109: 'Korytko',
      111: 'Drewniaki',
      112: 'Drewniana kolejka',
      113: 'Dziadek do orzechów',
      114: 'Świecznik bożonarodzeniowy',
      133: 'Piramida bożonarodzeniowa',
      200: 'Chwastownik',
      201: 'Grabie',
      202: 'Kompostownik',
      203: 'Frezerka',
      204: 'Zestaw czyszczący',
      205: 'Komplet do masażu zwierząt',
      206: 'Miseczka',
      207: 'Dokarmiarka',
      208: 'Mieszalnik',
      209: 'Maszyna sortująca',
      210: 'Regał magazynu',
      211: 'Wirówka',
      212: 'Igły do haftowania',
      213: 'Kołowrotek',
      214: 'Komplecik do dziergania',
      215: 'Krosno',
    };
  }

  // ========================================
  // NAWIGACJA
  // ========================================

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

  // ========================================
  // OBSŁUGA POPUPÓW
  // ========================================

  /**
   * Obsługuje popup - kliknięcie TAK (#globalbox_button1)
   */
  async clickPopupYes() {
    const page = this.session.page;
    try {
      await this.session.randomDelay(300, 500);
      const yesBtn = await page.$('#globalbox_button1');
      if (yesBtn && await yesBtn.isVisible()) {
        await yesBtn.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * Obsługuje popup - kliknięcie NIE (#globalbox_button2)
   */
  async clickPopupNo() {
    const page = this.session.page;
    try {
      await this.session.randomDelay(300, 500);
      const noBtn = await page.$('#globalbox_button2');
      if (noBtn && await noBtn.isVisible()) {
        await noBtn.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * Sprawdza czy jest widoczny popup
   */
  async isPopupVisible() {
    const page = this.session.page;
    try {
      const globalbox = await page.$('#globalbox');
      if (globalbox && await globalbox.isVisible()) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * Pobiera treść popupu
   */
  async getPopupContent() {
    const page = this.session.page;
    try {
      const content = await page.$eval('#globalbox_content', el => el.textContent || '').catch(() => '');
      const headline = await page.$eval('#globalbox_headline', el => el.textContent || '').catch(() => '');
      return { headline, content };
    } catch (e) {
      return { headline: '', content: '' };
    }
  }

  /**
   * Zamyka popup (klik na button1 - OK/TAK)
   */
  async closePopup() {
    return await this.clickPopupYes();
  }

  // ========================================
  // SADZONKI
  // ========================================

  /**
   * Otwiera menu wyboru sadzonki
   * Menu #forestry_stock1 ma domyślnie display:none
   * Trzeba wykonać hover na #forestry_stock1_object lub użyć JS
   */
  async openSeedlingMenu() {
    const page = this.session.page;
    
    try {
      // Metoda 1: Spróbuj hover na forestry_stock1_object
      const stockObject = await page.$('#forestry_stock1_object');
      if (stockObject) {
        this.log.debug('Znaleziono #forestry_stock1_object, wykonuję hover...');
        await stockObject.hover();
        await this.session.randomDelay(500, 800);
      }
      
      // Sprawdź czy menu jest widoczne
      const menuVisible = await page.evaluate(() => {
        const menu = document.querySelector('#forestry_stock1');
        if (menu) {
          const style = window.getComputedStyle(menu);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }
        return false;
      });
      
      if (menuVisible) {
        this.log.debug('Menu sadzonek jest widoczne po hover');
        return true;
      }
      
      // Metoda 2: Wymuś otwarcie menu przez JavaScript
      this.log.debug('Menu niewidoczne po hover, wymuszam otwarcie przez JS...');
      await page.evaluate(() => {
        const menu = document.querySelector('#forestry_stock1');
        if (menu) {
          menu.style.display = 'block';
          menu.style.visibility = 'visible';
        }
      });
      
      await this.session.randomDelay(300, 500);
      
      // Sprawdź ponownie
      const menuVisibleAfterJS = await page.evaluate(() => {
        const menu = document.querySelector('#forestry_stock1');
        return menu && menu.style.display !== 'none';
      });
      
      if (menuVisibleAfterJS) {
        this.log.debug('Menu sadzonek otwarte przez JS');
        return true;
      }
      
      this.log.warn('Nie udało się otworzyć menu sadzonek');
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd otwierania menu sadzonek: ${e.message}`);
      return false;
    }
  }

  /**
   * Pobiera dostępne sadzonki i ich ilości
   */
  async getAvailableSeedlings() {
    const page = this.session.page;
    const seedlings = [];
    
    // Otwórz menu sadzonek
    await this.openSeedlingMenu();
    await this.session.randomDelay(300, 500);
    
    for (const [id, name] of Object.entries(this.treeNames)) {
      try {
        const amountSelector = `#f_stock_amount_${id}`;
        const amountEl = await page.$(amountSelector);
        
        if (amountEl) {
          const amount = await page.$eval(amountSelector, el => parseInt(el.textContent || '0')).catch(() => 0);
          
          // Sprawdź czy sadzonka jest odblokowana (czy ma czas wzrostu widoczny)
          const growingSelector = `#f_stock_growing_${id}`;
          const growingEl = await page.$(growingSelector);
          const isUnlocked = growingEl ? await growingEl.isVisible().catch(() => false) : false;
          
          seedlings.push({
            id: parseInt(id),
            name: name,
            amount: amount,
            unlocked: isUnlocked || amount > 0
          });
        }
      } catch (e) {}
    }
    
    return seedlings;
  }

  /**
   * Wybiera sadzonkę do sadzenia
   * @param {number} treeId - ID drzewa (1-10)
   * 
   * Gra używa funkcji forestrySetStockItem(type, treeId) gdzie:
   * - type=1 oznacza drzewa/sadzonki
   * - treeId to ID drzewa (1-10)
   * Funkcja ustawia globalną zmienną forestry_plant = treeId
   */
  async selectSeedling(treeId) {
    const page = this.session.page;
    
    this.log.info(`Wybieranie sadzonki: ${this.treeNames[treeId] || treeId}...`);
    
    try {
      // Sprawdź ilość sadzonek i wywołaj funkcję gry forestrySetStockItem(1, treeId)
      const result = await page.evaluate((treeId) => {
        // Sprawdź ilość sadzonek
        const amountEl = document.querySelector(`#f_stock_amount_${treeId}`);
        const amount = amountEl ? parseInt(amountEl.textContent || '0') : 0;
        
        if (amount <= 0) {
          return { success: false, reason: 'no_seedlings', amount: 0 };
        }
        
        // Wywołaj funkcję gry do wyboru sadzonki
        // forestrySetStockItem(type, treeId) gdzie type=1 oznacza drzewa
        if (typeof forestrySetStockItem === 'function') {
          forestrySetStockItem(1, treeId);
          return { success: true, amount, method: 'forestrySetStockItem' };
        }
        
        // Fallback: bezpośrednio ustaw zmienną globalną
        if (typeof forestry_plant !== 'undefined') {
          forestry_plant = treeId;
          // Zaktualizuj ikonkę wybranej sadzonki
          const selectEl = document.querySelector('#forestry_stock1_select');
          if (selectEl) {
            selectEl.className = 'f_m_symbol' + treeId;
          }
          return { success: true, amount, method: 'direct_variable' };
        }
        
        return { success: false, reason: 'no_function_or_variable', amount };
      }, treeId);
      
      if (result.success) {
        this.log.info(`✓ Wybrano sadzonkę: ${this.treeNames[treeId]} (dostępne: ${result.amount}, metoda: ${result.method})`);
        
        // Ukryj menu sadzonek i przesuń kursor gdzieś indziej żeby zakończyć hover
        await page.evaluate(() => {
          const menu = document.querySelector('#forestry_stock1');
          if (menu) {
            menu.style.display = 'none';
          }
        });
        
        // Kliknij gdzieś neutralnie żeby wyjść z hover i rozpocząć sekwencję sadzenia
        try {
          const neutralElement = await page.$('#forestry_forest_button2'); // Przycisk "Zbierz wszystkie"
          if (neutralElement) {
            await neutralElement.hover();
          }
        } catch (e) {}
        
        await this.session.randomDelay(300, 500);
        return true;
      } else {
        if (result.reason === 'no_seedlings') {
          this.log.warn(`Brak sadzonek: ${this.treeNames[treeId]}`);
        } else if (result.reason === 'no_function_or_variable') {
          this.log.warn('Nie znaleziono funkcji forestrySetStockItem ani zmiennej forestry_plant');
        }
        return false;
      }
      
    } catch (e) {
      this.log.debug(`Błąd wybierania sadzonki: ${e.message}`);
      return false;
    }
  }

  // ========================================
  // ZBIERANIE DRZEW
  // ========================================

  /**
   * Zbiera drzewo z pojedynczego pola
   * @param {number} fieldNum - numer pola (1-25)
   * @returns {string} 'harvested' | 'not_ready' | 'pest_cleared' | 'empty' | 'error'
   */
  async harvestTreeField(fieldNum) {
    const page = this.session.page;
    
    try {
      const fieldSelector = `#forestry_pos${fieldNum}`;
      const field = await page.$(fieldSelector);
      
      if (!field) {
        return 'error';
      }
      
      // Sprawdź czy jest drzewo
      const className = await field.getAttribute('class');
      if (!className || !className.includes('tree')) {
        return 'empty';
      }
      
      // Kliknij na pole
      await field.click();
      await this.session.randomDelay(500, 800);
      
      // Sprawdź czy pojawił się popup
      if (await this.isPopupVisible()) {
        const { headline, content } = await this.getPopupContent();
        
        // Popup "Zebrać?" - drzewo niedojrzałe, zwrot sadzonki - kliknij NIE
        if (headline.includes('Zebrać') || content.includes('zwrot sadzonki') || content.includes('nie jest jeszcze dojrzałe') || content.includes('nie urósł') || content.includes('nie urosło')) {
          this.log.debug('Drzewo niedojrzałe - klikam NIE');
          await this.clickPopupNo();
          return 'not_ready';
        }
        
        // Popup ze szkodnikiem - kliknij TAK i spróbuj ponownie
        if (content.includes('szkodnik') || content.includes('Wywab') || headline.includes('Wyczyścić')) {
          await this.clickPopupYes();
          await this.session.randomDelay(500, 800);
          
          // Spróbuj zebrać ponownie
          await field.click();
          await this.session.randomDelay(500, 800);
          
          // Jeśli znów popup - sprawdź czy to nie pytanie o zebranie
          if (await this.isPopupVisible()) {
            const popup2 = await this.getPopupContent();
            if (popup2.headline.includes('Zebrać') || popup2.content.includes('zwrot sadzonki')) {
              await this.clickPopupNo();
            } else {
              await this.clickPopupNo(); // Bezpieczniej NIE niż TAK
            }
          }
          
          return 'pest_cleared';
        }
        
        // Inny popup - bezpieczniej kliknij NIE
        await this.clickPopupNo();
      }
      
      return 'harvested';
      
    } catch (e) {
      this.log.debug(`Błąd zbierania pola ${fieldNum}: ${e.message}`);
      return 'error';
    }
  }

  /**
   * Zbiera wszystkie gotowe drzewa (ręcznie, pole po polu)
   */
  async harvestAllTreesManual() {
    this.log.info('Zbieranie wszystkich gotowych drzew (manualnie)...');
    
    let harvested = 0;
    let pestCleared = 0;
    
    for (let i = 1; i <= 25; i++) {
      const result = await this.harvestTreeField(i);
      
      if (result === 'harvested') {
        harvested++;
        this.log.debug(`Pole ${i}: zebrane`);
      } else if (result === 'pest_cleared') {
        pestCleared++;
        harvested++;
        this.log.debug(`Pole ${i}: usunięto szkodnika i zebrane`);
      }
      
      await this.session.randomDelay(200, 400);
    }
    
    this.log.info(`Zebrano ${harvested} drzew, usunięto ${pestCleared} szkodników`);
    return { harvested, pestCleared };
  }

  /**
   * Zbiera wszystkie drzewa używając przycisku "Zbierz wszystkie"
   */
  async harvestAllTreesButton() {
    const page = this.session.page;
    this.log.info('Zbieranie wszystkich drzew (przycisk)...');
    
    try {
      const harvestBtn = await page.$('#forestry_forest_button2');
      if (harvestBtn) {
        await harvestBtn.click();
        await this.session.randomDelay(1000, 2000);
        
        // Obsłuż popup jeśli się pojawi - bezpieczniej NIE
        if (await this.isPopupVisible()) {
          const { headline, content } = await this.getPopupContent();
          if (headline.includes('Zebrać') || content.includes('zwrot sadzonki') || content.includes('nie jest jeszcze dojrzałe')) {
            await this.clickPopupNo();
          } else {
            await this.clickPopupYes(); // Potwierdzenie zbierania wszystkich
          }
        }
        
        this.log.info('Użyto "Zbierz wszystkie"');
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd zbierania: ${e.message}`);
    }
    
    return false;
  }

  // ========================================
  // SADZENIE DRZEW
  // ========================================

  /**
   * Sadzi drzewo na pojedynczym polu (wymaga wcześniej wybranej sadzonki)
   * @param {number} fieldNum - numer pola (1-25)
   */
  async plantTreeField(fieldNum) {
    const page = this.session.page;
    
    try {
      const fieldSelector = `#forestry_pos${fieldNum}`;
      const field = await page.$(fieldSelector);
      
      if (!field) {
        return false;
      }
      
      // Sprawdź czy pole jest puste
      const className = await field.getAttribute('class');
      if (className && className.includes('tree')) {
        // Już jest drzewo
        return false;
      }
      
      // Kliknij na pole żeby posadzić
      await field.click();
      await this.session.randomDelay(300, 500);
      
      // Sprawdź popup (np. szkodnik lub pytanie o usunięcie/zebranie niedojrzałego drzewa)
      if (await this.isPopupVisible()) {
        const { content, headline } = await this.getPopupContent();
        
        if (content.includes('szkodnik') || content.includes('Wywab')) {
          // Szkodnik - klikamy TAK żeby usunąć
          await this.clickPopupYes();
          await this.session.randomDelay(300, 500);
          
          // Spróbuj posadzić ponownie
          await field.click();
          await this.session.randomDelay(300, 500);
        } else if (headline.includes('Zebrać') || content.includes('zwrot sadzonki') || content.includes('nie jest jeszcze dojrzałe') || content.includes('usunąć') || content.includes('wyrzucić')) {
          // Pytanie o zebranie/usunięcie niedojrzałego drzewa - klikamy NIE (odmowa)
          this.log.debug('Popup o zebranie niedojrzałego drzewa - klikam NIE');
          await this.clickPopupNo();
          await this.session.randomDelay(300, 500);
          return false;
        } else {
          await this.closePopup();
        }
      }
      
      return true;
      
    } catch (e) {
      this.log.debug(`Błąd sadzenia pola ${fieldNum}: ${e.message}`);
      return false;
    }
  }

  /**
   * Sadzi drzewa na wszystkich pustych polach
   * @param {number} treeId - ID sadzonki do użycia
   */
  async plantAllTreesManual(treeId = 1) {
    this.log.info(`Sadzenie drzew: ${this.treeNames[treeId] || treeId}...`);
    
    // Wybierz sadzonkę
    const selected = await this.selectSeedling(treeId);
    if (!selected) {
      this.log.warn('Nie udało się wybrać sadzonki');
      return 0;
    }
    
    let planted = 0;
    
    for (let i = 1; i <= 25; i++) {
      const success = await this.plantTreeField(i);
      if (success) {
        planted++;
        this.log.debug(`Pole ${i}: posadzono`);
      }
      
      await this.session.randomDelay(200, 400);
    }
    
    this.log.info(`Posadzono ${planted} drzew`);
    return planted;
  }

  /**
   * Sadzi drzewa używając pomocnika do sadzenia
   */
  async plantAllTreesButton() {
    const page = this.session.page;
    this.log.info('Sadzenie drzew (pomocnik)...');
    
    try {
      const plantBtn = await page.$('#forestry_forest_button6');
      if (plantBtn) {
        await plantBtn.click();
        await this.session.randomDelay(1000, 2000);
        
        // Obsłuż popupy (szkodniki)
        let attempts = 0;
        while (await this.isPopupVisible() && attempts < 30) {
          const { content } = await this.getPopupContent();
          
          if (content.includes('szkodnik') || content.includes('Wywab')) {
            await this.clickPopupYes();
          } else {
            await this.closePopup();
            break;
          }
          
          await this.session.randomDelay(300, 500);
          
          // Kliknij ponownie pomocnika
          const plantBtnRetry = await page.$('#forestry_forest_button6');
          if (plantBtnRetry) {
            await plantBtnRetry.click();
            await this.session.randomDelay(500, 800);
          }
          
          attempts++;
        }
        
        this.log.info('Użyto "Pomocnik w sadzeniu"');
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd sadzenia: ${e.message}`);
    }
    
    return false;
  }

  // ========================================
  // PODLEWANIE
  // ========================================

  /**
   * Podlewa wszystkie drzewa
   */
  async waterAllTrees() {
    const page = this.session.page;
    this.log.info('Podlewanie wszystkich drzew...');
    
    try {
      const waterBtn = await page.$('#forestry_forest_button1');
      if (waterBtn) {
        await waterBtn.click();
        await this.session.randomDelay(1000, 2000);
        
        // Obsłuż popup (może być info że nic do podlania lub już podlane)
        if (await this.isPopupVisible()) {
          await this.closePopup();
        }
        
        this.log.info('Użyto "Nawodnij"');
        return true;
      }
    } catch (e) {
      this.log.debug(`Błąd podlewania: ${e.message}`);
    }
    
    return false;
  }

  // ========================================
  // BUDYNKI PRODUKCYJNE
  // ========================================

  /**
   * Wchodzi do budynku produkcyjnego
   * @param {number} buildingNum - 1 = Tartak, 2 = Stolarnia
   */
  async enterBuilding(buildingNum) {
    const page = this.session.page;
    const buildingNames = { 1: 'Tartak', 2: 'Stolarnia' };
    
    this.log.info(`Wchodzenie do: ${buildingNames[buildingNum]}...`);
    
    try {
      const clickSelector = `#forestry_building_click${buildingNum}`;
      const building = await page.$(clickSelector);
      
      if (building) {
        await building.click();
        await this.session.randomDelay(1000, 2000);
        
        // Sprawdź czy pojawił się komunikat o zbyt niskim poziomie
        const levelRestricted = await this.checkLevelRestriction();
        if (levelRestricted) {
          this.log.info(`${buildingNames[buildingNum]} - zbyt niski poziom gracza`);
          return false;
        }
        
        this.currentBuilding = buildingNum;
        this.log.info(`Weszliśmy do: ${buildingNames[buildingNum]}`);
        return true;
      }
      
      this.log.warn(`Nie znaleziono budynku: ${buildingNames[buildingNum]}`);
      return false;
      
    } catch (e) {
      this.log.debug(`Błąd wchodzenia do budynku: ${e.message}`);
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
   * Wychodzi z budynku produkcyjnego
   */
  async exitBuilding() {
    const page = this.session.page;
    
    try {
      // Zamknij ewentualne okno wyboru produkcji
      await this.closeProductionSelection();
      
      // Zamknij budynek
      const closeSelectors = [
        '[onclick*="closeForestryBuildingInner"]',
        '.big_close.link',
        '#forestry_building_inner_close',
      ];
      
      for (const selector of closeSelectors) {
        const closeBtn = await page.$(selector);
        if (closeBtn && await closeBtn.isVisible()) {
          await closeBtn.click();
          await this.session.randomDelay(500, 800);
          this.currentBuilding = null;
          return true;
        }
      }
    } catch (e) {
      this.log.debug(`Błąd wychodzenia z budynku: ${e.message}`);
    }
    
    this.currentBuilding = null;
    return false;
  }

  /**
   * Zamyka okno wyboru produkcji
   */
  async closeProductionSelection() {
    const page = this.session.page;
    
    try {
      const closeBtn = await page.$('#forestry_production_select .mini_close');
      if (closeBtn && await closeBtn.isVisible()) {
        await closeBtn.click();
        await this.session.randomDelay(300, 500);
        return true;
      }
    } catch (e) {}
    
    return false;
  }

  /**
   * Przechodzi do następnej strony produktów
   * @returns {boolean} true jeśli udało się przejść
   */
  async goToNextProductPage() {
    const page = this.session.page;
    
    try {
      const nextBtn = await page.$('#forestry_selectproduction_navi_next');
      if (nextBtn && await nextBtn.isVisible()) {
        await nextBtn.click();
        await this.session.randomDelay(500, 800);
        return true;
      }
    } catch (e) {}
    
    return false;
  }

  /**
   * Pobiera dostępne produkty z aktualnej strony
   * @returns {Array} Lista produktów z info o dostępności
   */
  async getAvailableProductsOnPage() {
    const page = this.session.page;
    const products = [];
    
    try {
      const items = await page.$$('.forestry_selectproduction_item');
      
      for (const item of items) {
        const productInfo = await item.evaluate((el) => {
          const onclick = el.getAttribute('onclick') || '';
          
          // Sprawdź czy wymaga monet (coins.gif)
          const requiresCoins = el.innerHTML.includes('coins.gif');
          
          // Sprawdź czy ma onclick z dialogForestry (= można produkować)
          const hasOnclick = onclick.includes('dialogForestry') && onclick.includes('startproduction');
          
          // Parsuj parametry: dialogForestry('startproduction', buildingNum, slotNum, productId, quantity)
          const match = onclick.match(/dialogForestry\('startproduction',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
          
          // Pobierz nazwę produktu
          const nameEl = el.querySelector('[style*="font-weight:bold"]');
          const name = nameEl ? nameEl.textContent?.trim() : 'Nieznany';
          
          // Pobierz czas produkcji
          const timeMatch = el.textContent?.match(/(\d{2}:\d{2}:\d{2})\s*h/);
          
          // Sprawdź czy ma wymagane surowce (klasa "important" = brak)
          const hasImportant = el.querySelector('.important') !== null;
          const hasMaterials = !hasImportant;
          
          return {
            name,
            productId: match ? parseInt(match[3]) : null,
            buildingNum: match ? parseInt(match[1]) : null,
            slotNum: match ? parseInt(match[2]) : null,
            quantity: match ? parseInt(match[4]) : null,
            productionTime: timeMatch ? timeMatch[1] : null,
            hasMaterials,
            hasOnclick,
            requiresCoins,
            canProduce: hasOnclick && hasMaterials && !requiresCoins
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
   * Pobiera wszystkie dostępne produkty (ze wszystkich stron)
   */
  async getAllAvailableProducts() {
    const allProducts = [];
    let pageNum = 1;
    const maxPages = 5;
    
    while (pageNum <= maxPages) {
      const products = await this.getAvailableProductsOnPage();
      allProducts.push(...products);
      
      // Spróbuj przejść do następnej strony
      const hasNext = await this.goToNextProductPage();
      if (!hasNext) break;
      
      pageNum++;
      await this.session.randomDelay(300, 500);
    }
    
    return allProducts;
  }

  /**
   * Rozpoczyna produkcję produktu
   * @param {number} productId - ID produktu
   * @param {Array} allProducts - lista wszystkich produktów (opcjonalnie)
   */
  async startProduction(productId, allProducts = null) {
    const page = this.session.page;
    
    this.log.info(`Rozpoczynanie produkcji produktu ID: ${productId}...`);
    
    // Jeśli nie mamy listy produktów, pobierz ją
    if (!allProducts) {
      allProducts = await this.getAllAvailableProducts();
    }
    
    // Znajdź produkt
    const product = allProducts.find(p => p.productId === productId);
    
    if (!product) {
      this.log.warn(`Nie znaleziono produktu ID: ${productId}`);
      return false;
    }
    
    if (!product.canProduce) {
      this.log.warn(`Nie można produkować ${product.name}: brak zasobów lub wymaga monet`);
      return false;
    }
    
    try {
      // Znajdź i kliknij element produktu
      const productSelector = `.forestry_selectproduction_item[onclick*="${productId}"]`;
      
      // Przeszukaj strony żeby znaleźć produkt
      let found = false;
      let pageNum = 1;
      
      while (!found && pageNum <= 5) {
        const productEl = await page.$(productSelector);
        if (productEl) {
          await productEl.click();
          await this.session.randomDelay(500, 800);
          found = true;
          break;
        }
        
        // Przejdź do następnej strony
        const hasNext = await this.goToNextProductPage();
        if (!hasNext) break;
        pageNum++;
        await this.session.randomDelay(300, 500);
      }
      
      if (!found) {
        this.log.warn(`Nie znaleziono elementu produktu ID: ${productId} na żadnej stronie`);
        return false;
      }
      
      // Potwierdź produkcję
      await this.session.randomDelay(300, 500);
      const confirmBtn = await page.$('#globalbox_button1');
      if (confirmBtn && await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await this.session.randomDelay(500, 800);
        this.log.info(`Rozpoczęto produkcję: ${product.name}`);
        return true;
      }
      
      return true;
      
    } catch (e) {
      this.log.debug(`Błąd rozpoczynania produkcji: ${e.message}`);
      return false;
    }
  }

  /**
   * Automatycznie zarządza produkcją w budynku
   * @param {number} buildingNum - 1 = Tartak, 2 = Stolarnia
   * @param {Array} preferredProductIds - preferowane ID produktów (opcjonalnie)
   */
  async autoManageBuilding(buildingNum, preferredProductIds = []) {
    const buildingNames = { 1: 'Tartak', 2: 'Stolarnia' };
    this.log.info(`=== Auto-zarządzanie: ${buildingNames[buildingNum]} ===`);
    
    // Wejdź do budynku
    const entered = await this.enterBuilding(buildingNum);
    if (!entered) {
      this.log.warn('Nie można wejść do budynku');
      return { collected: 0, started: 0 };
    }
    
    await this.session.randomDelay(500, 800);
    const page = this.session.page;
    
    let collected = 0;
    let started = 0;
    
    // Sprawdź oba sloty
    for (let slotNum = 1; slotNum <= 2; slotNum++) {
      this.log.info(`--- Sprawdzanie slotu ${slotNum} ---`);
      
      // Kliknij na slot
      const slotSelector = `#forestry_building_inner_slot_img_main${slotNum}`;
      const slot = await page.$(slotSelector);
      
      if (!slot) {
        this.log.debug(`Slot ${slotNum} nie istnieje`);
        continue;
      }
      
      await slot.click();
      await this.session.randomDelay(500, 800);
      
      // Sprawdź czy otworzyło się okno wyboru (= slot pusty)
      const selectDiv = await page.$('#forestry_production_select');
      const isSelectionOpen = selectDiv && await selectDiv.isVisible();
      
      if (isSelectionOpen) {
        this.log.info(`Slot ${slotNum}: pusty - szukam produktu do produkcji`);
        
        // Pobierz dostępne produkty
        const products = await this.getAllAvailableProducts();
        const canProduce = products.filter(p => p.canProduce);
        
        this.log.info(`Dostępne produkty do produkcji: ${canProduce.length}`);
        
        if (canProduce.length > 0) {
          // Wybierz produkt (preferowany lub pierwszy dostępny)
          let selectedProduct = null;
          
          for (const prefId of preferredProductIds) {
            selectedProduct = canProduce.find(p => p.productId === prefId);
            if (selectedProduct) break;
          }
          
          if (!selectedProduct) {
            selectedProduct = canProduce[0];
          }
          
          // Zamknij i otwórz ponownie żeby wrócić na początek
          await this.closeProductionSelection();
          await this.session.randomDelay(300, 500);
          await slot.click();
          await this.session.randomDelay(500, 800);
          
          const success = await this.startProduction(selectedProduct.productId, products);
          if (success) {
            started++;
          }
        } else {
          this.log.warn('Brak produktów do produkcji - brak zasobów');
          await this.closeProductionSelection();
        }
        
      } else {
        // Slot zajęty - sprawdź czy produkt gotowy (popup po kliknięciu = zebrany)
        if (await this.isPopupVisible()) {
          await this.closePopup();
          collected++;
          this.log.info(`Slot ${slotNum}: produkt zebrany`);
        } else {
          this.log.info(`Slot ${slotNum}: w produkcji`);
        }
      }
      
      await this.session.randomDelay(300, 500);
    }
    
    // Wyjdź z budynku
    await this.exitBuilding();
    
    this.log.info(`${buildingNames[buildingNum]}: zebrano ${collected}, rozpoczęto ${started}`);
    return { collected, started };
  }

  // ========================================
  // STATUS
  // ========================================

  /**
   * Pobiera status tartaku - budynki i pierwsze drzewo
   */
  async getForestryStatus() {
    this.log.info('Pobieranie statusu tartaku...');
    
    const page = this.session.page;
    const status = {
      building1: null,
      building2: null,
      firstTree: null,
    };
    
    // Nawiguj do tartaku
    const navigated = await this.navigateToForestry();
    if (!navigated) {
      return status;
    }
    
    await this.session.closePopups();
    await this.session.randomDelay(500, 1000);
    
    try {
      // Status budynku 1 (Tartak)
      const building1 = await page.$('#forestry_building1_production_line');
      if (building1) {
        const text = await building1.textContent();
        const cleanText = text?.trim() || '';
        const isReady = cleanText.toLowerCase().includes('gotowe');
        const isEmpty = cleanText === '' || cleanText.length < 2;
        
        status.building1 = {
          name: 'Tartak',
          status: isEmpty ? 'empty' : (isReady ? 'ready' : 'working'),
          timeLeft: isEmpty ? 'Brak produkcji' : (isReady ? 'Gotowe!' : cleanText),
        };
      }
      
      // Status budynku 2 (Stolarnia)
      const building2 = await page.$('#forestry_building2_production_line');
      if (building2) {
        const text = await building2.textContent();
        const cleanText = text?.trim() || '';
        const isReady = cleanText.toLowerCase().includes('gotowe');
        const isEmpty = cleanText === '' || cleanText.length < 2;
        
        status.building2 = {
          name: 'Stolarnia',
          status: isEmpty ? 'empty' : (isReady ? 'ready' : 'working'),
          timeLeft: isEmpty ? 'Brak produkcji' : (isReady ? 'Gotowe!' : cleanText),
        };
      }
      
      // Status pierwszego drzewa
      const treePos1 = await page.$('#forestry_pos1');
      if (treePos1) {
        await treePos1.hover();
        await this.session.randomDelay(300, 500);
        
        const infoBox = await page.$('#forestry_pos_info1');
        if (infoBox && await infoBox.isVisible()) {
          const html = await infoBox.innerHTML();
          const treeNameMatch = html.match(/<b>([^<]+)<\/b>/);
          const timeMatch = html.match(/(\d{2}:\d{2}:\d{2})/);
          const isReady = html.toLowerCase().includes('gotowe');
          
          status.firstTree = {
            name: treeNameMatch ? treeNameMatch[1] : 'Drzewo',
            status: isReady ? 'ready' : (timeMatch ? 'growing' : 'unknown'),
            timeLeft: isReady ? 'Gotowe!' : (timeMatch ? timeMatch[1] : 'Brak danych'),
          };
        } else {
          // Sprawdź czy pole puste
          const className = await treePos1.getAttribute('class');
          if (!className || !className.includes('tree')) {
            status.firstTree = {
              name: 'Puste pole',
              status: 'empty',
              timeLeft: 'Brak drzewa',
            };
          }
        }
      }
      
    } catch (e) {
      this.log.warn(`Błąd pobierania statusu: ${e.message}`);
    }
    
    return status;
  }

  // ========================================
  // PEŁNY CYKL
  // ========================================

  /**
   * Wykonuje pełny cykl tartaku
   * @param {Object} options - Opcje cyklu
   * @param {boolean} options.harvestTrees - Czy zbierać drzewa
   * @param {boolean} options.plantTrees - Czy sadzić drzewa
   * @param {boolean} options.waterTrees - Czy podlewać drzewa
   * @param {number} options.preferredTreeId - ID preferowanej sadzonki (1-10)
   * @param {boolean} options.manageBuildings - Czy zarządzać budynkami
   * @param {Array} options.preferredProductIds - Preferowane ID produktów (legacy)
   * @param {Object} options.buildingConfig - Konfiguracja budynków z frontendu
   */
  async fullForestryCycle(options = {}) {
    const {
      harvestTrees = true,
      plantTrees = true,
      waterTrees = true,
      preferredTreeId = 1, // Świerk
      manageBuildings = true,
      preferredProductIds = [], // Legacy - puste = dowolny dostępny
      buildingConfig = null, // Nowa konfiguracja z frontendu
    } = options;
    
    this.log.info('========================================');
    this.log.info('=== ROZPOCZYNAM CYKL TARTAKU ===');
    this.log.info('========================================');
    
    const results = {
      treesHarvested: 0,
      treesPlanted: 0,
      treesWatered: false,
      building1: { collected: 0, started: 0 },
      building2: { collected: 0, started: 0 },
    };
    
    // Przejdź do tartaku
    const navigated = await this.navigateToForestry();
    if (!navigated) {
      this.log.warn('Nie można przejść do tartaku');
      return results;
    }
    
    await this.session.closePopups();
    
    // KROK 1: Zbierz drzewa
    if (harvestTrees) {
      this.log.info('--- KROK 1: Zbieranie drzew ---');
      const harvestResult = await this.harvestAllTreesManual();
      results.treesHarvested = harvestResult.harvested;
      await this.session.randomDelay(500, 1000);
    }
    
    // KROK 2: Posadź drzewa
    if (plantTrees) {
      this.log.info('--- KROK 2: Sadzenie drzew ---');
      
      // Sprawdź dostępne sadzonki
      const seedlings = await this.getAvailableSeedlings();
      const preferred = seedlings.find(s => s.id === preferredTreeId && s.amount > 0);
      const treeToPlant = preferred || seedlings.find(s => s.amount > 0);
      
      if (treeToPlant) {
        results.treesPlanted = await this.plantAllTreesManual(treeToPlant.id);
      } else {
        this.log.warn('Brak dostępnych sadzonek!');
      }
      
      await this.session.randomDelay(500, 1000);
    }
    
    // KROK 3: Podlej drzewa
    if (waterTrees) {
      this.log.info('--- KROK 3: Podlewanie drzew ---');
      results.treesWatered = await this.waterAllTrees();
      await this.session.randomDelay(500, 1000);
    }
    
    // KROK 4: Zarządzaj budynkami
    if (manageBuildings) {
      this.log.info('--- KROK 4: Zarządzanie budynkami ---');
      
      // Przygotuj preferowane produkty z konfiguracji
      let building1Products = [];
      let building2Products = [];
      
      if (buildingConfig) {
        // Nowa konfiguracja z frontendu
        if (buildingConfig.building1?.slot1?.productId) {
          building1Products.push(buildingConfig.building1.slot1.productId);
        }
        if (buildingConfig.building1?.slot2?.productId) {
          building1Products.push(buildingConfig.building1.slot2.productId);
        }
        if (buildingConfig.building2?.slot1?.productId) {
          building2Products.push(buildingConfig.building2.slot1.productId);
        }
        if (buildingConfig.building2?.slot2?.productId) {
          building2Products.push(buildingConfig.building2.slot2.productId);
        }
      } else if (preferredProductIds.length > 0) {
        // Legacy - wszystkie produkty do obu budynków
        building1Products = preferredProductIds;
        building2Products = preferredProductIds;
      }
      
      this.log.info(`Tartak preferowane: ${building1Products.length > 0 ? building1Products.join(', ') : 'auto'}`);
      this.log.info(`Stolarnia preferowane: ${building2Products.length > 0 ? building2Products.join(', ') : 'auto'}`);
      
      // Tartak
      await this.navigateToForestry();
      await this.session.randomDelay(500, 800);
      results.building1 = await this.autoManageBuilding(1, building1Products);
      
      // Stolarnia
      await this.navigateToForestry();
      await this.session.randomDelay(500, 800);
      results.building2 = await this.autoManageBuilding(2, building2Products);
    }
    
    // Podsumowanie
    this.log.info('========================================');
    this.log.info('=== PODSUMOWANIE CYKLU TARTAKU ===');
    this.log.info(`Zebrano drzew: ${results.treesHarvested}`);
    this.log.info(`Posadzono drzew: ${results.treesPlanted}`);
    this.log.info(`Podlano: ${results.treesWatered ? 'TAK' : 'NIE'}`);
    this.log.info(`Tartak: zebrano ${results.building1.collected}, rozpoczęto ${results.building1.started}`);
    this.log.info(`Stolarnia: zebrano ${results.building2.collected}, rozpoczęto ${results.building2.started}`);
    this.log.info('========================================');
    
    // Loguj do bazy
    await logAction(this.account.id, 'forestry_cycle', results);
    
    return results;
  }
}
