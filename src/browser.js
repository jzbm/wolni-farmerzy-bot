/**
 * Moduł przeglądarki - zarządza instancjami Playwright
 */
import { chromium } from 'playwright';
import { config } from './config.js';
import logger, { createAccountLogger } from './logger.js';
import { mkdirSync, existsSync } from 'fs';

// Upewnij się że folder screenshots istnieje
if (!existsSync(config.screenshotsDir)) {
  mkdirSync(config.screenshotsDir, { recursive: true });
}

/**
 * Klasa zarządzająca sesją przeglądarki dla jednego konta
 */
export class BrowserSession {
  constructor(accountEmail) {
    this.accountEmail = accountEmail;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.log = createAccountLogger(accountEmail);
  }

  /**
   * Uruchamia przeglądarkę
   */
  async launch() {
    this.log.info('Uruchamianie przeglądarki...');
    
    this.browser = await chromium.launch({
      headless: config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'pl-PL',
    });

    this.page = await this.context.newPage();
    
    // Timeout domyślny
    this.page.setDefaultTimeout(30000);
    
    this.log.info('Przeglądarka uruchomiona');
    return this;
  }

  /**
   * Zamyka przeglądarkę
   */
  async close() {
    if (this.browser) {
      this.log.info('Zamykanie przeglądarki...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }

  /**
   * Losowe opóźnienie (aby symulować ludzkie zachowanie)
   */
  async randomDelay(min = config.minDelay, max = config.maxDelay) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.page.waitForTimeout(delay);
  }

  /**
   * Zamyka wszystkie popupy (cookies, reklamy, promocje, newsy)
   */
  async closePopups() {
    const popupSelectors = [
      // ===== WOLNI FARMERZY SPECIFIC =====
      // Newsbox (aktualności gry)
      '#newsbox_close',
      '.newsbox_close',
      '#newsbox .big_close',
      
      // Inne popupy w grze (ALE NIE #gardencancel - to zamyka budynek pól!)
      '#farmersmarket_howto_close',
      '#farm_dog_box_close',
      
      // Codzienny bonus logowania - zamknij przez mini_close w kontenerze loginbonus
      '#loginbonusbox .mini_close',
      '[onclick*="loginbonus.close"]',
      
      // UWAGA: NIE dodawaj tutaj .big_close.link ani .mini_close.link
      // bo to zamyka też okna budynków!
      
      // Special offers / Oferty specjalne - TYLKO przyciski zamykające!
      '#specialoffer_new .mini_close',
      '#specialoffer_close',
      
      // Zimowa oferta / Winter offer - TYLKO przyciski zamykające!
      '#winteroffer_close',
      '#winteroffer .mini_close',
      '#winteroffer .big_close',
      '#winter_close',
      
      // Inne oferty sezonowe - TYLKO close elementy
      '#summeroffer_close',
      '#easteroffer_close', 
      '#halloween_close',
      
      // Tutoriale i pomoc
      '#tutorial_close',
      '#help_close',
      '.tutorial-close',
      
      // Oferty premium
      '#premium_offer_close',
      '#special_offer_close',
      '.offer-popup .close',
      
      // ===== COOKIES =====
      'button:has-text("Zaakceptuj")',
      'button:has-text("Akceptuj")',
      'button:has-text("Accept")',
      'button:has-text("Zgadzam się")',
      '.cookiemon-btn-accept',
      '[id*="cookie"] button',
      '[class*="cookie"] button',
      '.cookie-consent button',
      '#cookie-banner button',
      
      // ===== OGÓLNE ZAMKNIJ PRZYCISKI =====
      '.modal .close',
      '.popup .close',
      '[class*="modal"] [class*="close"]',
      '[class*="popup"] [class*="close"]',
      'button[aria-label="Close"]',
      'button[aria-label="Zamknij"]',
      '.btn-close',
      '[class*="dismiss"]',
      
      // ===== REKLAMY =====
      '[class*="ad-close"]',
      '[class*="ad"] .close',
      '.advertisement .close',
      '#bubbleiframe', // iframe z reklamami
      
      // ===== PROMOCJE =====
      '[class*="promo"] .close',
      '[class*="promotion"] .close',
      '.offer-close',
      
      // ===== UPJERS SPECIFIC =====
      '.upjers-popup .close',
      '#popup-close',
      '.game-popup .close',
    ];

    for (const selector of popupSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          this.log.debug(`Zamknięto popup: ${selector}`);
          await this.randomDelay(300, 600);
        }
      } catch (e) {
        // Ignoruj błędy - popup może nie istnieć
      }
    }
    
    // Zamknij nowe okna/karty które mogły się otworzyć (np. mikropłatności)
    await this.closeExtraPages();
  }
  
  /**
   * Zamyka wszystkie dodatkowe okna/karty oprócz głównej
   */
  async closeExtraPages() {
    try {
      const pages = this.context.pages();
      if (pages.length > 1) {
        this.log.info(`Znaleziono ${pages.length} okien, zamykam dodatkowe...`);
        for (let i = pages.length - 1; i > 0; i--) {
          await pages[i].close();
          this.log.debug(`Zamknięto dodatkowe okno`);
        }
        // Upewnij się że główna strona jest aktywna
        await this.page.bringToFront();
      }
    } catch (e) {
      this.log.debug(`Błąd zamykania okien: ${e.message}`);
    }
  }

  /**
   * Czeka na załadowanie strony i zamyka popupy
   */
  async waitForPageReady() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.randomDelay(500, 1000);
    await this.closePopups();
  }

  /**
   * Robi screenshot (do debugowania)
   */
  async screenshot(name) {
    const filename = `${Date.now()}_${name}.png`;
    const path = `${config.screenshotsDir}/${filename}`;
    await this.page.screenshot({ path, fullPage: true });
    this.log.debug(`Screenshot zapisany: ${filename}`);
    return path;
  }

  /**
   * Bezpieczne kliknięcie z obsługą błędów
   */
  async safeClick(selector, options = {}) {
    try {
      await this.closePopups();
      const element = await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: options.timeout || 10000 
      });
      await element.click();
      await this.randomDelay();
      return true;
    } catch (error) {
      this.log.warn(`Nie udało się kliknąć: ${selector}`);
      return false;
    }
  }

  /**
   * Bezpieczne wpisanie tekstu
   */
  async safeType(selector, text, options = {}) {
    try {
      const element = await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: options.timeout || 10000 
      });
      await element.fill(text);
      await this.randomDelay(200, 500);
      return true;
    } catch (error) {
      this.log.warn(`Nie udało się wpisać tekstu w: ${selector}`);
      return false;
    }
  }

  /**
   * Sprawdza czy element istnieje
   */
  async exists(selector, timeout = 3000) {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pobiera tekst z elementu
   */
  async getText(selector, timeout = 5000) {
    try {
      const element = await this.page.waitForSelector(selector, { state: 'visible', timeout });
      return await element.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Pobiera wszystkie elementy pasujące do selektora
   */
  async getElements(selector) {
    return await this.page.$$(selector);
  }

  /**
   * Wykonuje JavaScript w kontekście strony
   */
  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  /**
   * Czeka na nawigację
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Manager przeglądarek - zarządza wieloma sesjami
 */
class BrowserManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Pobiera lub tworzy sesję dla konta
   */
  async getSession(accountEmail) {
    if (!this.sessions.has(accountEmail)) {
      const session = new BrowserSession(accountEmail);
      await session.launch();
      this.sessions.set(accountEmail, session);
    }
    return this.sessions.get(accountEmail);
  }

  /**
   * Zamyka sesję dla konta
   */
  async closeSession(accountEmail) {
    const session = this.sessions.get(accountEmail);
    if (session) {
      await session.close();
      this.sessions.delete(accountEmail);
    }
  }

  /**
   * Zamyka wszystkie sesje
   */
  async closeAll() {
    for (const [email, session] of this.sessions) {
      await session.close();
    }
    this.sessions.clear();
    logger.info('Wszystkie sesje przeglądarek zamknięte');
  }
}

// Singleton
export const browserManager = new BrowserManager();

export default BrowserSession;
