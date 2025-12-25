/**
 * Narzędzie do analizy struktury gry Wolni Farmerzy
 * Uruchom: node src/tools/analyzer.js
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dane logowania testowego
const TEST_ACCOUNT = {
  email: 'gadziorpl2@gmail.com',
  password: 'Danielek16!',
  server: 1
};

const GAME_URL = 'https://wolnifarmerzy.pl';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeGame() {
  console.log('🔍 Uruchamianie analizatora gry Wolni Farmerzy...\n');
  
  const outputDir = join(__dirname, '..', '..', 'analysis');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const browser = await chromium.launch({
    headless: false, // Otwórz okno przeglądarki aby widzieć co się dzieje
    slowMo: 500 // Spowolnij akcje
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  const analysis = {
    timestamp: new Date().toISOString(),
    loginPage: {},
    gamePage: {},
    selectors: {},
    iframes: [],
    plantTimes: {},
    screenshots: []
  };
  
  try {
    // 1. Analiza strony logowania
    console.log('📄 Analizuję stronę logowania...');
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
    await delay(2000);
    
    // Zrób screenshot
    await page.screenshot({ path: join(outputDir, '01_login_page.png'), fullPage: true });
    analysis.screenshots.push('01_login_page.png');
    
    // Znajdź formularz logowania
    analysis.loginPage.html = await page.content();
    
    // Znajdź wszystkie inputy
    const inputs = await page.$$eval('input', elements => 
      elements.map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        class: el.className,
        placeholder: el.placeholder
      }))
    );
    analysis.loginPage.inputs = inputs;
    console.log('  Znalezione inputy:', inputs.length);
    
    // Znajdź selecty
    const selects = await page.$$eval('select', elements =>
      elements.map(el => ({
        name: el.name,
        id: el.id,
        class: el.className,
        options: Array.from(el.options).map(opt => ({ value: opt.value, text: opt.text }))
      }))
    );
    analysis.loginPage.selects = selects;
    console.log('  Znalezione selecty:', selects.length);
    
    // Znajdź przyciski
    const buttons = await page.$$eval('button, input[type="submit"]', elements =>
      elements.map(el => ({
        type: el.type,
        text: el.textContent || el.value,
        class: el.className,
        id: el.id
      }))
    );
    analysis.loginPage.buttons = buttons;
    console.log('  Znalezione przyciski:', buttons.length);
    
    // Zamknij popup cookies jeśli istnieje
    console.log('\n🍪 Szukam popup cookies...');
    const cookieSelectors = [
      'button:has-text("Zaakceptuj")',
      'button:has-text("Akceptuj")',
      'button:has-text("Accept")',
      '[class*="cookie"] button'
    ];
    
    for (const selector of cookieSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
          console.log(`  Znaleziono cookie button: ${selector}`);
          await btn.click();
          await delay(1000);
          break;
        }
      } catch (e) {}
    }
    
    // 2. Logowanie
    console.log('\n🔐 Próbuję się zalogować...');
    
    // Wybierz serwer
    const serverSelect = await page.$('#loginserver, select[name="server"]');
    if (serverSelect) {
      await serverSelect.selectOption(String(TEST_ACCOUNT.server));
      console.log('  Wybrano serwer:', TEST_ACCOUNT.server);
    } else {
      console.log('  ❌ Nie znaleziono selecta serwera!');
    }
    
    // Wpisz login
    const userInput = await page.$('#loginusername, input[name="username"]');
    if (userInput) {
      await userInput.fill(TEST_ACCOUNT.email);
      console.log('  Wpisano login');
    } else {
      console.log('  ❌ Nie znaleziono pola loginu!');
    }
    
    // Wpisz hasło
    const passInput = await page.$('#loginpassword, input[name="password"]');
    if (passInput) {
      await passInput.fill(TEST_ACCOUNT.password);
      console.log('  Wpisano hasło');
    } else {
      console.log('  ❌ Nie znaleziono pola hasła!');
    }
    
    await page.screenshot({ path: join(outputDir, '02_before_login.png') });
    analysis.screenshots.push('02_before_login.png');
    
    // Kliknij przycisk logowania
    const loginBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (loginBtn) {
      await loginBtn.click();
      console.log('  Kliknięto przycisk logowania');
    } else {
      await page.keyboard.press('Enter');
    }
    
    // Czekaj na załadowanie
    await delay(5000);
    await page.screenshot({ path: join(outputDir, '03_after_login.png'), fullPage: true });
    analysis.screenshots.push('03_after_login.png');
    
    console.log('  Obecny URL:', page.url());
    analysis.gamePage.url = page.url();
    
    // 3. Analiza strony gry
    console.log('\n🎮 Analizuję stronę gry...');
    
    // Sprawdź czy są iframe'y
    const iframes = await page.$$('iframe');
    console.log('  Znalezione iframe:', iframes.length);
    
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const src = await iframe.getAttribute('src');
      const name = await iframe.getAttribute('name');
      const id = await iframe.getAttribute('id');
      
      analysis.iframes.push({ src, name, id });
      console.log(`    iframe ${i}: src=${src}, name=${name}, id=${id}`);
      
      // Jeśli to iframe gry, wejdź do niego
      if (src && (src.includes('game') || src.includes('main') || src.includes('farm') || src.includes('marketing'))) {
        console.log('  📦 Wchodzę do iframe gry...');
        
        const frame = await iframe.contentFrame();
        if (frame) {
          await delay(2000);
          
          // Zrób screenshot całej strony (frame nie ma metody screenshot)
          await page.screenshot({ path: join(outputDir, `04_game_iframe_${i}.png`) });
          analysis.screenshots.push(`04_game_iframe_${i}.png`);
          
          // Analizuj zawartość iframe
          await analyzeGameContent(frame, analysis, outputDir);
        }
      }
    }
    
    // Analizuj też główną stronę gry (nie tylko iframe)
    if (page.url().includes('main.php') || page.url().includes('s1.wolnifarmerzy')) {
      console.log('  📦 Analizuję główną stronę gry...');
      await analyzeGameContent(page, analysis, outputDir);
    }
    
    // Zamknij popupy w grze
    console.log('\n🚫 Szukam popupów w grze...');
    await closeGamePopups(page);
    
    await delay(2000);
    await page.screenshot({ path: join(outputDir, '05_game_clean.png'), fullPage: true });
    analysis.screenshots.push('05_game_clean.png');
    
    // 4. Zapisz analizę
    console.log('\n💾 Zapisuję analizę...');
    
    // Zapisz pełny HTML
    const fullHtml = await page.content();
    writeFileSync(join(outputDir, 'page_source.html'), fullHtml);
    
    // Zapisz analizę JSON
    writeFileSync(
      join(outputDir, 'analysis.json'), 
      JSON.stringify(analysis, null, 2)
    );
    
    // Wygeneruj raport
    generateReport(analysis, outputDir);
    
    console.log('\n✅ Analiza zakończona!');
    console.log(`   Wyniki zapisane w: ${outputDir}`);
    
    // Zostaw przeglądarkę otwartą przez chwilę
    console.log('\n⏳ Przeglądarka pozostanie otwarta przez 30 sekund...');
    console.log('   Możesz ręcznie przejrzeć strukturę gry.');
    await delay(30000);
    
  } catch (error) {
    console.error('\n❌ Błąd podczas analizy:', error.message);
    await page.screenshot({ path: join(outputDir, 'error.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

async function analyzeGameContent(frame, analysis, outputDir) {
  console.log('\n📊 Analizuję zawartość gry...');
  
  // Znajdź elementy nawigacji
  const navElements = await frame.$$eval('[class*="nav"], [class*="menu"], [id*="nav"], [id*="menu"]', elements =>
    elements.map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      text: el.textContent?.substring(0, 100)
    }))
  );
  analysis.gamePage.navigation = navElements;
  console.log('  Elementy nawigacji:', navElements.length);
  
  // Znajdź elementy pól/farmy
  const farmElements = await frame.$$eval(
    '[class*="field"], [class*="farm"], [class*="crop"], [class*="plant"], [id*="field"], [id*="farm"]',
    elements => elements.map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      dataAttributes: Object.keys(el.dataset)
    }))
  );
  analysis.gamePage.farmElements = farmElements;
  console.log('  Elementy farmy:', farmElements.length);
  
  // Znajdź timery
  const timerElements = await frame.$$eval(
    '[class*="timer"], [class*="time"], [class*="countdown"], [class*="clock"]',
    elements => elements.map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      text: el.textContent?.trim()
    }))
  );
  analysis.gamePage.timerElements = timerElements;
  console.log('  Elementy czasowe:', timerElements.length);
  
  // Znajdź przyciski akcji
  const actionButtons = await frame.$$eval(
    'button, [class*="btn"], [class*="button"], [onclick]',
    elements => elements.map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      text: el.textContent?.trim().substring(0, 50),
      onclick: el.getAttribute('onclick')?.substring(0, 100)
    }))
  );
  analysis.gamePage.actionButtons = actionButtons;
  console.log('  Przyciski akcji:', actionButtons.length);
  
  // Znajdź obrazki (mogą być klikalne pola)
  const images = await frame.$$eval('img[onclick], img[class*="field"], img[class*="crop"]', elements =>
    elements.map(el => ({
      src: el.src,
      alt: el.alt,
      class: el.className,
      onclick: el.getAttribute('onclick')?.substring(0, 100)
    }))
  );
  analysis.gamePage.clickableImages = images;
  console.log('  Klikalne obrazki:', images.length);
  
  // Znajdź elementy mapy
  const mapElements = await frame.$$eval('[class*="map"], [id*="map"], area', elements =>
    elements.map(el => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      coords: el.getAttribute('coords'),
      href: el.getAttribute('href'),
      onclick: el.getAttribute('onclick')?.substring(0, 100)
    }))
  );
  analysis.gamePage.mapElements = mapElements;
  console.log('  Elementy mapy:', mapElements.length);
  
  // Generuj selektory
  analysis.selectors = {
    login: {
      serverSelect: 'select[name="server"]',
      usernameInput: 'input[name="user"]',
      passwordInput: 'input[name="pass"]',
      submitButton: 'input[type="submit"]'
    },
    navigation: extractSelectors(navElements, 'nav'),
    farm: extractSelectors(farmElements, 'farm'),
    timers: extractSelectors(timerElements, 'timer'),
    actions: extractSelectors(actionButtons, 'action'),
    map: extractSelectors(mapElements, 'map')
  };
}

function extractSelectors(elements, prefix) {
  const selectors = {};
  
  elements.forEach((el, i) => {
    if (el.id) {
      selectors[`${prefix}_${i}_id`] = `#${el.id}`;
    }
    if (el.class) {
      const mainClass = el.class.split(' ')[0];
      if (mainClass) {
        selectors[`${prefix}_${i}_class`] = `.${mainClass}`;
      }
    }
  });
  
  return selectors;
}

async function closeGamePopups(page) {
  const popupSelectors = [
    '.modal .close',
    '.popup .close',
    '[class*="modal"] [class*="close"]',
    '[class*="popup"] [class*="close"]',
    'button[aria-label="Close"]',
    '.btn-close',
    '[class*="dismiss"]',
    '.ad-close',
    '.promo-close'
  ];
  
  for (const selector of popupSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const el of elements) {
        if (await el.isVisible()) {
          console.log(`  Zamykam popup: ${selector}`);
          await el.click();
          await delay(500);
        }
      }
    } catch (e) {}
  }
}

function generateReport(analysis, outputDir) {
  let report = `# Raport analizy gry Wolni Farmerzy
Data: ${analysis.timestamp}

## Strona logowania
- Inputy: ${analysis.loginPage.inputs?.length || 0}
- Selecty: ${analysis.loginPage.selects?.length || 0}
- Przyciski: ${analysis.loginPage.buttons?.length || 0}

## Strona gry
- URL: ${analysis.gamePage.url || 'N/A'}
- iFrame'y: ${analysis.iframes?.length || 0}

### Znalezione elementy
- Nawigacja: ${analysis.gamePage.navigation?.length || 0}
- Farma: ${analysis.gamePage.farmElements?.length || 0}
- Timery: ${analysis.gamePage.timerElements?.length || 0}
- Przyciski: ${analysis.gamePage.actionButtons?.length || 0}
- Mapa: ${analysis.gamePage.mapElements?.length || 0}

## Rekomendowane selektory

### Logowanie
\`\`\`javascript
${JSON.stringify(analysis.selectors?.login || {}, null, 2)}
\`\`\`

### Nawigacja
\`\`\`javascript
${JSON.stringify(analysis.selectors?.navigation || {}, null, 2)}
\`\`\`

### Farma
\`\`\`javascript
${JSON.stringify(analysis.selectors?.farm || {}, null, 2)}
\`\`\`

## Screenshots
${analysis.screenshots?.map(s => `- ${s}`).join('\n') || 'Brak'}

## Uwagi
- Gra może używać iframe'ów - trzeba wchodzić do odpowiedniego frame'a
- Selektory mogą wymagać dostosowania po ręcznym przeglądzie
- Timery pokazują czasy wzrostu roślin
`;

  writeFileSync(join(outputDir, 'REPORT.md'), report);
}

// Uruchom analizę
analyzeGame().catch(console.error);
