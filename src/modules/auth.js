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
}

export default GameAuth;
