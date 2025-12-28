/**
 * Moduł logowania do gry Wolni Farmerzy
 */
import { config } from '../config.js';
import { updateLastLogin, logAction } from '../database.js';

/**
 * Klasa obsługująca logowanie do gry
 */
export class GameAuth {
  constructor(browserSession, accountData) {
    this.session = browserSession;
    this.account = accountData;
    this.log = this.session.log;
  }

  /**
   * Loguje się do gry
   */
  async login() {
    this.log.info('Rozpoczynam logowanie...');
    
    try {
      // Przejdź na stronę główną
      await this.session.page.goto(config.gameUrl, { waitUntil: 'domcontentloaded' });
      await this.session.waitForPageReady();
      
      // Znajdź i wypełnij formularz logowania
      // Najpierw wybierz serwer
      const serverSelect = await this.session.page.$('#loginserver, select[name="server"]');
      if (serverSelect) {
        await serverSelect.selectOption(String(this.account.server || config.defaultServer));
        this.log.debug(`Wybrano serwer: ${this.account.server || config.defaultServer}`);
        await this.session.randomDelay(300, 600);
      }

      // Wpisz login (email)
      const loginSuccess = await this.session.safeType(
        '#loginusername, input[name="username"]',
        this.account.email
      );
      
      if (!loginSuccess) {
        this.log.warn('Nie udało się wpisać loginu standardową metodą');
      }

      // Wpisz hasło
      const passwordSuccess = await this.session.safeType(
        '#loginpassword, input[name="password"]',
        this.account.password
      );

      // Kliknij przycisk logowania
      const submitClicked = await this.session.safeClick(
        '#loginbutton, input[type="submit"]'
      );

      if (!submitClicked) {
        // Alternatywna metoda - naciśnij Enter
        await this.session.page.keyboard.press('Enter');
      }

      // Czekaj na załadowanie gry
      await this.session.page.waitForTimeout(3000);
      await this.session.waitForPageReady();
      
      // Sprawdź czy zalogowano
      const isLogged = await this.checkIfLoggedIn();
      
      if (isLogged) {
        this.session.isLoggedIn = true;
        this.log.info('Zalogowano pomyślnie!');
        updateLastLogin(this.account.id);
        logAction(this.account.id, 'login', 'Pomyślne logowanie', true);
        return true;
      } else {
        this.log.error('Logowanie nie powiodło się');
        logAction(this.account.id, 'login', 'Nieudane logowanie', false);
        return false;
      }
      
    } catch (error) {
      this.log.error(`Błąd podczas logowania: ${error.message}`, error);
      logAction(this.account.id, 'login', `Błąd: ${error.message}`, false);
      return false;
    }
  }

  /**
   * Sprawdza czy użytkownik jest zalogowany
   */
  async checkIfLoggedIn() {
    // Sprawdź czy URL zawiera elementy wskazujące na grę
    const url = this.session.page.url();
    
    // Gra może przekierować na inny URL po zalogowaniu
    if (url.includes('/main') || url.includes('/game') || url.includes('/farm') || url.includes('/play')) {
      return true;
    }

    // Sprawdź obecność elementów gry
    const gameElements = [
      '#game-container',
      '.game-content',
      '.farm-view',
      '#farmland',
      '.game-frame',
      'iframe[src*="game"]',
      '.player-info',
      '#player-name',
      '.resources',
      '#gold',
      '#money',
    ];

    for (const selector of gameElements) {
      if (await this.session.exists(selector, 2000)) {
        return true;
      }
    }

    // Sprawdź czy jest iframe z grą
    const iframes = await this.session.page.$$('iframe');
    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src');
      if (src && (src.includes('game') || src.includes('farm') || src.includes('play'))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Wylogowuje z gry
   */
  async logout() {
    try {
      // Szukaj przycisku wylogowania
      const logoutClicked = await this.session.safeClick(
        'a:has-text("Wyloguj"), button:has-text("Wyloguj"), .logout, #logout, [href*="logout"]'
      );
      
      if (logoutClicked) {
        this.session.isLoggedIn = false;
        this.log.info('Wylogowano');
        logAction(this.account.id, 'logout', 'Pomyślne wylogowanie', true);
        return true;
      }
      
      return false;
    } catch (error) {
      this.log.error(`Błąd podczas wylogowania: ${error.message}`);
      return false;
    }
  }

  /**
   * Sprawdza sesję i loguje ponownie jeśli potrzeba
   */
  async ensureLoggedIn() {
    if (this.session.isLoggedIn) {
      // Sprawdź czy nadal jesteśmy zalogowani
      const stillLogged = await this.checkIfLoggedIn();
      if (stillLogged) {
        return true;
      }
    }
    
    // Trzeba się zalogować
    return await this.login();
  }

  /**
   * Pobiera poziom gracza z gry
   * @returns {number} Poziom gracza lub 1 jeśli nie można odczytać
   */
  async getPlayerLevel() {
    try {
      const page = this.session.page;
      
      // Selektor z gry: <span id="levelnum">33</span>
      const levelElement = await page.$('#levelnum');
      if (levelElement) {
        const levelText = await levelElement.textContent();
        const level = parseInt(levelText, 10);
        if (!isNaN(level) && level > 0) {
          this.log.debug(`Odczytano poziom gracza: ${level}`);
          return level;
        }
      }
      
      // Alternatywne selektory
      const altSelectors = [
        '.level-value',
        '[class*="level"]',
        'span:has-text("Poziom") + span'
      ];
      
      for (const selector of altSelectors) {
        try {
          const el = await page.$(selector);
          if (el) {
            const text = await el.textContent();
            const level = parseInt(text, 10);
            if (!isNaN(level) && level > 0) {
              this.log.debug(`Odczytano poziom gracza z ${selector}: ${level}`);
              return level;
            }
          }
        } catch (e) {}
      }
      
      this.log.warn('Nie udało się odczytać poziomu gracza, używam domyślnego: 1');
      return 1;
    } catch (error) {
      this.log.error(`Błąd podczas pobierania poziomu gracza: ${error.message}`);
      return 1;
    }
  }

  /**
   * Pobiera informacje o graczu (poziom, pieniądze, premium, itp.)
   * @returns {Object} Obiekt z informacjami o graczu
   */
  async getPlayerInfo() {
    try {
      const page = this.session.page;
      
      const playerInfo = {
        level: await this.getPlayerLevel(),
        money: 0,              // Pieniądze (ft)
        isPremium: false,      // Czy ma konto premium
        premiumEndDate: null,  // Data końca premium
        name: ''
      };
      
      // Sprawdź czy konto ma premium
      // Premium: <div id="sub_premium_info">Konto premium kończy się dnia <span id="premium_endtime">11.04.26, 19:54</span></div>
      try {
        const premiumInfo = await page.$('#sub_premium_info');
        if (premiumInfo) {
          const isVisible = await premiumInfo.isVisible();
          if (isVisible) {
            playerInfo.isPremium = true;
            
            // Pobierz datę końca premium
            const premiumEndEl = await page.$('#premium_endtime');
            if (premiumEndEl) {
              playerInfo.premiumEndDate = await premiumEndEl.textContent();
              this.log.debug(`Konto premium do: ${playerInfo.premiumEndDate}`);
            }
          }
        }
        
        // Alternatywne sprawdzenie - czy istnieje submenuecontainer z premium info
        if (!playerInfo.isPremium) {
          const subMenu = await page.$('#submenuecontainer');
          if (subMenu) {
            const premiumDiv = await subMenu.$('#sub_premium_info');
            if (premiumDiv) {
              const style = await premiumDiv.getAttribute('style');
              if (!style || !style.includes('display: none')) {
                playerInfo.isPremium = true;
              }
            }
          }
        }
      } catch (e) {
        this.log.debug(`Błąd sprawdzania premium: ${e.message}`);
      }
      
      // Pobierz pieniądze z paska: <span id="bar">464.365,28 ft</span>
      try {
        const moneyEl = await page.$('#bar');
        if (moneyEl) {
          const moneyText = await moneyEl.textContent();
          // Parsuj format "464.365,28 ft" -> 464365.28
          const cleanMoney = moneyText
            .replace(/\s*ft\s*/gi, '')  // usuń "ft"
            .replace(/\./g, '')          // usuń separatory tysięcy
            .replace(',', '.')           // zamień przecinek na kropkę
            .trim();
          playerInfo.money = parseFloat(cleanMoney) || 0;
          this.log.debug(`Pieniądze gracza: ${playerInfo.money} ft`);
        }
      } catch (e) {
        this.log.debug(`Błąd pobierania pieniędzy: ${e.message}`);
      }
      
      // Próba pobrania nazwy gracza
      try {
        const nameEl = await page.$('#playername, .player-name, .username');
        if (nameEl) {
          playerInfo.name = (await nameEl.textContent()).trim();
        }
      } catch (e) {}
      
      this.log.info(`Info gracza: Poziom ${playerInfo.level}, ${playerInfo.money} ft, Premium: ${playerInfo.isPremium}`);
      
      return playerInfo;
    } catch (error) {
      this.log.error(`Błąd podczas pobierania informacji o graczu: ${error.message}`);
      return { level: 1, money: 0, isPremium: false, premiumEndDate: null, name: '' };
    }
  }

  /**
   * Sprawdza dostępność funkcji gry z poziomu mapy
   * Sprawdza: farmy (1-4), stragany, tartak
   * @returns {Object} Obiekt z informacjami o odblokowaniu
   */
  async getUnlockedFeatures() {
    const page = this.session.page;
    
    const features = {
      farms: { 1: true, 2: false, 3: false, 4: false },  // Farma 1 zawsze dostępna
      stalls: false,     // Czy stragany są odblokowane
      forestry: false,   // Czy tartak jest odblokowany
    };
    
    this.log.info('Sprawdzam odblokowane funkcje z mapy...');
    
    try {
      // Przejdź do mapy
      try {
        const mapBtn = await page.$('#mainmenue4');
        if (mapBtn) {
          await mapBtn.click();
          await this.session.randomDelay(1000, 2000);
          await this.session.waitForPageReady();
        }
      } catch (e) {
        this.log.debug('Nie udało się przejść do mapy');
      }
      
      // Sprawdź farmy 2-4 (farm 1 zawsze odblokowana)
      // Zablokowane farmy mają: #map_farm{X}_block z display: block
      for (let farmNum = 2; farmNum <= 4; farmNum++) {
        try {
          const blockEl = await page.$(`#map_farm${farmNum}_block`);
          if (blockEl) {
            const style = await blockEl.getAttribute('style') || '';
            const isBlocked = style.includes('display: block') || style.includes('display:block');
            features.farms[farmNum] = !isBlocked;
            this.log.debug(`Farma ${farmNum}: ${isBlocked ? 'ZABLOKOWANA' : 'dostępna'}`);
          } else {
            // Brak elementu blokady - farma dostępna
            features.farms[farmNum] = true;
          }
        } catch (e) {
          this.log.debug(`Błąd sprawdzania farmy ${farmNum}: ${e.message}`);
        }
      }
      
      // Sprawdź stragany - #map_stall z display: none = niedostępne
      try {
        const stallEl = await page.$('#map_stall');
        if (stallEl) {
          const style = await stallEl.getAttribute('style') || '';
          const isHidden = style.includes('display: none') || style.includes('display:none');
          features.stalls = !isHidden;
          this.log.debug(`Stragany: ${isHidden ? 'NIEDOSTĘPNE' : 'dostępne'}`);
        } else {
          // Sprawdź alternatywnie przez #map_stall_overview_link1
          const stallLink = await page.$('#map_stall_overview_link1');
          features.stalls = stallLink !== null;
        }
      } catch (e) {
        this.log.debug(`Błąd sprawdzania straganów: ${e.message}`);
      }
      
      // Sprawdź tartak - #map_forestry_block z display: block = zablokowany
      try {
        const forestryBlock = await page.$('#map_forestry_block');
        if (forestryBlock) {
          const style = await forestryBlock.getAttribute('style') || '';
          const isBlocked = style.includes('display: block') || style.includes('display:block');
          features.forestry = !isBlocked;
          this.log.debug(`Tartak: ${isBlocked ? 'ZABLOKOWANY' : 'dostępny'}`);
        } else {
          // Sprawdź alternatywnie przez speedlink
          const forestryLink = await page.$('#speedlink_forestry');
          features.forestry = forestryLink !== null;
        }
      } catch (e) {
        this.log.debug(`Błąd sprawdzania tartaku: ${e.message}`);
      }
      
      this.log.info(`Odblokowane: Farmy=${Object.entries(features.farms).filter(([k,v])=>v).map(([k])=>k).join(',')}, Stragany=${features.stalls}, Tartak=${features.forestry}`);
      
    } catch (error) {
      this.log.error(`Błąd sprawdzania funkcji: ${error.message}`);
    }
    
    return features;
  }
}

export default GameAuth;
