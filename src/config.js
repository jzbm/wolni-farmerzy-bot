/**
 * Konfiguracja aplikacji Wolni Farmerzy Bot
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Ścieżki
  rootDir: join(__dirname, '..'),
  dataDir: join(__dirname, '..', 'data'),
  screenshotsDir: join(__dirname, '..', 'screenshots'),
  
  // Serwer webowy
  port: parseInt(process.env.APP_PORT) || 3000,
  sessionSecret: process.env.APP_SECRET || 'zmien-to-na-produkcji',
  
  // Przeglądarka
  headless: process.env.HEADLESS === 'true',
  
  // Gra
  gameUrl: 'https://wolnifarmerzy.pl',
  defaultServer: parseInt(process.env.DEFAULT_SERVER) || 1,
  
  // Opóźnienia
  minDelay: parseInt(process.env.MIN_ACTION_DELAY) || 1000,
  maxDelay: parseInt(process.env.MAX_ACTION_DELAY) || 3000,
  
  // Logi
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Czasy wzrostu roślin (w sekundach) - będą aktualizowane po analizie gry
  plantGrowthTimes: {
    'pszenica': 60,          // 1 minuta
    'kukurydza': 120,        // 2 minuty
    'marchew': 180,          // 3 minuty
    'ziemniak': 240,         // 4 minuty
    'truskawka': 300,        // 5 minut
    'pomidor': 360,          // 6 minut
    'salata': 90,            // 1.5 minuty
    'cebula': 150,           // 2.5 minuty
    'dynia': 420,            // 7 minut
    'slonecznik': 480,       // 8 minut
    // Drzewa (tartak)
    'sosna': 600,            // 10 minut
    'dab': 900,              // 15 minut
    'brzoza': 450,           // 7.5 minut
  },
  
  // Selektory CSS (zaktualizowane 2025-12-23 po pełnej analizie gry)
  selectors: {
    // Logowanie
    login: {
      serverSelect: '#loginserver, select[name="server"]',
      usernameInput: '#loginusername, input[name="username"]',
      passwordInput: '#loginpassword, input[name="password"]',
      submitButton: '#loginbutton, input[type="submit"]',
    },
    
    // Nawigacja speedlinki (WAŻNE - główna nawigacja w grze)
    speedlinks: {
      farm1: '#speedlink_farm1',
      farm2: '#speedlink_farm2',
      farm3: '#speedlink_farm3',
      farm4: '#speedlink_farm4',
      forestry: '#speedlink_forestry',
    },
    
    // Budynki pól na farmie (#farm1_pos1_click - #farm4_pos6_click)
    farmBuildings: {
      // Wzorzec: #farm{farmNum}_pos{posNum}_click
      buildingClick: (farmNum, posNum) => `#farm${farmNum}_pos${posNum}_click`,
      buildingLock: (farmNum, posNum) => `.farm_pos_lock[onmouseover*="farm_pos_lock${farmNum}_${posNum}"]`,
    },
    
    // Wewnątrz budynku pola (120 pól 1x1)
    garden: {
      // Pola: #field1 - #field120, wewnątrz #f1 - #f120
      field: (num) => `#field${num}`,
      fieldInner: (num) => `#f${num}`,
      waterIndicator: (num) => `#w${num}`,
      
      // Toolbar akcji
      plantMode: '#anpflanzen',      // Tryb sadzenia
      waterMode: '#giessen',         // Tryb podlewania
      harvestMode: '#ernten',        // Tryb zbierania
      waterAll: '#waterall',         // Podlej wszystko
      harvestAll: '#cropall',        // Zbierz wszystko
      autoPlant: '#autoplantbuttoninner',  // Automat do sadzenia
      speedUp: '#speedupbuttoninner',      // Przyspieszenie wzrostu
      clearAll: '#gardenclearer',          // Wyczyść całe pole
      
      // Zamknięcie budynku
      close: '#gardencancel',
      
      // Globalbox (okno wyboru rośliny)
      globalBox: '#globalbox_content',
      globalBoxConfirm: '#globalbox_button1',
      globalBoxCancel: '#globalbox_button2',
      globalBoxClose: '#globalbox_close',
    },
    
    // Tartak/Leśnictwo
    sawmill: {
      container: '#forestry, [id*="forestry"]',
      treeSlots: '[id^="tree"], .forestry_tree',
      treeTimer: '[id^="treetime"]',
    },
    
    // Mapa/Stragany
    map: {
      mapButton: '#mainmenue4',
      stallOverview: (num) => `#map_stall_overview_link_tt${num}`,
      stallAlert: (num) => `#map_stall_overview_link_alert${num}`,
    },
  },
  
  // ID roślin do automatu sadzenia (autoPlantCommit)
  cropIds: {
    'zboze': 1, 'wheat': 1, 'pszenica': 1,
    'kukurydza': 2, 'corn': 2,
    'koniczyna': 3, 'clover': 3,
    'rzepak': 4, 'rapeseed': 4,
    'buraki': 5, 'beets': 5,
    'ziola': 6, 'herbs': 6,
    'sloneczniki': 7, 'sunflowers': 7,
    'blawatki': 8, 'cornflowers': 8,
    'marchewki': 17, 'carrots': 17,
    'ogorki': 18, 'cucumbers': 18,
    'rzodkiewki': 19, 'radishes': 19,
    'truskawki': 20, 'strawberries': 20,
    'pomidory': 21, 'tomatoes': 21,
    'cebule': 22, 'onions': 22,
    'szpinak': 23, 'spinach': 23,
    'kalafiory': 24, 'cauliflower': 24,
    'ziemniaki': 26, 'potatoes': 26,
    'szparagi': 29, 'asparagus': 29,
    'cukinie': 31, 'zucchini': 31,
    'jagody': 32, 'blueberries': 32,
    'maliny': 33, 'raspberries': 33,
    'porzeczki': 34, 'currants': 34,
    'jezyny': 35, 'blackberries': 35,
    'mirabelki': 36, 'mirabelles': 36,
    'jablka': 37, 'apples': 37,
    'dynie': 38, 'pumpkins': 38,
    'gruszki': 39, 'pears': 39,
    'wisnie': 40, 'cherries': 40,
    'winogrona': 107, 'grapes': 107,
    'herbata': 129, 'tea': 129,
  }
};
