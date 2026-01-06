/**
 * Dashboard JavaScript - Wolni Farmerzy Bot
 */

// Lista produktów do straganów (zsynchronizowana z backendem)
const STALL_PRODUCTS = [
  { id: 1, name: 'Zboże' },
  { id: 2, name: 'Kukurydza' },
  { id: 3, name: 'Koniczyna' },
  { id: 4, name: 'Rzepak' },
  { id: 5, name: 'Buraki pastewne' },
  { id: 6, name: 'Zioła' },
  { id: 7, name: 'Słoneczniki' },
  { id: 8, name: 'Bławatki' },
  { id: 17, name: 'Marchewki' },
  { id: 18, name: 'Ogórki' },
  { id: 19, name: 'Rzodkiewki' },
  { id: 20, name: 'Truskawki' },
  { id: 21, name: 'Pomidory' },
  { id: 22, name: 'Cebule' },
  { id: 23, name: 'Szpinak' },
  { id: 24, name: 'Kalafiory' },
  { id: 26, name: 'Ziemniaki' },
  { id: 29, name: 'Szparagi' },
  { id: 31, name: 'Cukinie' },
  { id: 32, name: 'Jagody' },
  { id: 33, name: 'Maliny' },
  { id: 34, name: 'Porzeczki' },
  { id: 35, name: 'Jeżyny' },
  { id: 36, name: 'Mirabelki' },
  { id: 37, name: 'Jabłka' },
  { id: 38, name: 'Dynie' },
  { id: 39, name: 'Gruszki' },
  { id: 40, name: 'Wiśnie' },
  { id: 108, name: 'Bodziszki' },
  { id: 109, name: 'Stokrotki' },
];

// Produkty tartaku (budynek 1) - z forestry.js
const SAWMILL_PRODUCTS = [
  { id: 41, name: 'Deski (Świerk posp.)' },
  { id: 42, name: 'Kantówki (Świerk posp.)' },
  { id: 43, name: 'Okrąglaki (Świerk posp.)' },
  { id: 44, name: 'Deski (Brzoza)' },
  { id: 45, name: 'Kantówki (Brzoza)' },
  { id: 46, name: 'Okrąglaki (Brzoza)' },
  { id: 47, name: 'Deski (Buk czerw.)' },
  { id: 48, name: 'Kantówki (Buk czerw.)' },
  { id: 49, name: 'Okrąglaki (Buk czerw.)' },
  { id: 50, name: 'Deski (Topola)' },
  { id: 51, name: 'Kantówki (Topola)' },
  { id: 52, name: 'Okrąglaki (Topola)' },
];

// Produkty stolarni (budynek 2) - z forestry.js
const CARPENTRY_PRODUCTS = [
  { id: 101, name: 'Drewniane ramy' },
  { id: 102, name: 'Drewniana balia' },
  { id: 103, name: 'Paśnik' },
  { id: 104, name: 'Drewniane grabie' },
  { id: 105, name: 'Konik na biegunach' },
  { id: 106, name: 'Chochla' },
  { id: 107, name: 'Miotła' },
  { id: 108, name: 'Parkiet' },
  { id: 109, name: 'Korytko' },
  { id: 111, name: 'Drewniaki' },
  { id: 112, name: 'Drewniana kolejka' },
  { id: 113, name: 'Dziadek do orzechów' },
  { id: 114, name: 'Świecznik bożonarodzeniowy' },
  { id: 133, name: 'Piramida bożonarodzeniowa' },
  { id: 200, name: 'Chwastownik' },
  { id: 201, name: 'Grabie' },
  { id: 202, name: 'Kompostownik' },
  { id: 203, name: 'Frezerka' },
  { id: 204, name: 'Zestaw czyszczący' },
  { id: 205, name: 'Komplet do masażu zwierząt' },
  { id: 206, name: 'Miseczka' },
  { id: 207, name: 'Dokarmiarka' },
  { id: 208, name: 'Mieszalnik' },
  { id: 209, name: 'Maszyna sortująca' },
  { id: 210, name: 'Regał magazynu' },
  { id: 211, name: 'Wirówka' },
  { id: 212, name: 'Igły do haftowania' },
  { id: 213, name: 'Kołowrotek' },
  { id: 214, name: 'Komplecik do dziergania' },
  { id: 215, name: 'Krosno' },
];

// Lista roślin farmy z ID gry i wymaganym poziomem
const FARM_CROPS = [
  { id: 1, name: 'Zboże', time: '00:20', level: 1 },
  { id: 17, name: 'Marchewki', time: '00:15', level: 1 },
  { id: 18, name: 'Ogórki', time: '01:30', level: 3 },
  { id: 20, name: 'Truskawki', time: '08:00', level: 4 },
  { id: 2, name: 'Kukurydza', time: '00:45', level: 6 },
  { id: 19, name: 'Rzodkiewki', time: '04:00', level: 7 },
  { id: 21, name: 'Pomidory', time: '10:00', level: 8 },
  { id: 22, name: 'Cebule', time: '08:20', level: 9 },
  { id: 23, name: 'Szpinak', time: '13:20', level: 10 },
  { id: 3, name: 'Koniczyna', time: '00:45', level: 11 },
  { id: 4, name: 'Rzepak', time: '01:30', level: 12 },
  { id: 24, name: 'Kalafiory', time: '12:00', level: 13 },
  { id: 5, name: 'Buraki pastewne', time: '02:00', level: 14 },
  { id: 6, name: 'Zioła', time: '04:00', level: 15 },
  { id: 109, name: 'Stokrotki', time: '02:15', level: 15 },
  { id: 108, name: 'Bodziszki', time: '06:00', level: 16 },
  { id: 26, name: 'Ziemniaki', time: '13:00', level: 17 },
  { id: 7, name: 'Słoneczniki', time: '08:00', level: 19 },
  { id: 8, name: 'Bławatki', time: '16:00', level: 20 },
  { id: 29, name: 'Szparagi', time: '15:50', level: 22 },
  { id: 31, name: 'Cukinie', time: '16:40', level: 24 },
  { id: 32, name: 'Jagody', time: '12:00', level: 25 },
  { id: 33, name: 'Maliny', time: '20:00', level: 26 },
  { id: 34, name: 'Porzeczki', time: '13:20', level: 27 },
  { id: 35, name: 'Jeżyny', time: '33:20', level: 28 },
  { id: 36, name: 'Mirabelki', time: '14:40', level: 29 },
  { id: 37, name: 'Jabłka', time: '50:00', level: 30 },
  { id: 38, name: 'Dynie', time: '16:00', level: 31 },
  { id: 39, name: 'Gruszki', time: '66:40', level: 32 },
  { id: 40, name: 'Wiśnie', time: '80:00', level: 33 },
  { id: 41, name: 'Śliwki', time: '91:40', level: 34 },
  { id: 42, name: 'Orzechy włoskie', time: '103:20', level: 35 },
  { id: 44, name: 'Czosnek', time: '24:00', level: 35 },
  { id: 43, name: 'Oliwki', time: '113:20', level: 36 },
  { id: 45, name: 'Czerwona kapusta', time: '120:00', level: 37 },
  { id: 46, name: 'Chili', time: '28:00', level: 37 },
  { id: 47, name: 'Kalarepa', time: '24:00', level: 37 },
  { id: 48, name: 'Mlecz', time: '32:00', level: 37 },
  { id: 49, name: 'Bazylia', time: '09:00', level: 38 },
  { id: 50, name: 'Borowiki', time: '85:00', level: 39 },
  { id: 51, name: 'Dalia', time: '106:40', level: 46 },
  { id: 52, name: 'Rabarbar', time: '123:20', level: 47 },
  { id: 53, name: 'Arbuzy', time: '130:00', level: 48 },
  { id: 54, name: 'Brokuły', time: '19:00', level: 49 },
  { id: 55, name: 'Fasola', time: '120:00', level: 49 },
  { id: 56, name: 'Oberżyna', time: '48:00', level: 49 },
  { id: 57, name: 'Papryka', time: '20:00', level: 49 },
  { id: 58, name: 'Groch', time: '115:00', level: 50 },
  { id: 59, name: 'Seler', time: '85:00', level: 50 },
  { id: 60, name: 'Awokado', time: '130:00', level: 51 },
  { id: 61, name: 'Por', time: '48:00', level: 51 },
  { id: 62, name: 'Brukselka', time: '43:00', level: 52 },
  { id: 63, name: 'Koper', time: '85:00', level: 52 },
  // Rośliny specjalne/eventowe
  { id: 97, name: 'Gwiazdka betlejemska', time: '12:00', level: 0 },
  { id: 104, name: 'Żonkil', time: '12:20', level: 0 },
  { id: 107, name: 'Winogrona', time: '11:40', level: 0 },
  { id: 129, name: 'Herbata', time: '10:40', level: 1 },
  { id: 158, name: 'Pomarańczowy tulipan', time: '10:00', level: 1 },
];

// Aktualny poziom gracza (domyślnie 1, pobierany z gry)
let playerLevel = 1;

let selectedAccountId = null;
let currentStallsConfig = null;
let currentForestryConfig = null;
let currentFarmConfig = null;

// Cache statusu gry per konto - używa localStorage dla persystencji
const CACHE_TTL = 30 * 60 * 1000; // 30 minut w ms
const TIMER_UPDATE_INTERVAL = 1000; // 1 sekunda - aktualizacja timerów
let statusRefreshInterval = null;
let timerUpdateInterval = null;

// Funkcje cache localStorage
function getStatusCache(accountId) {
  try {
    const key = `gameStatus_${accountId}`;
    const cached = localStorage.getItem(key);
    if (cached && cached !== 'undefined' && cached !== 'null') {
      const parsed = JSON.parse(cached);
      // Sprawdź czy to prawidłowy obiekt cache
      if (parsed && typeof parsed === 'object' && parsed.data) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Błąd odczytu cache:', e);
    // Usuń uszkodzony cache
    localStorage.removeItem(`gameStatus_${accountId}`);
  }
  return null;
}

function setStatusCache(accountId, data) {
  try {
    const key = `gameStatus_${accountId}`;
    const cacheData = {
      data: data,
      fetchedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Błąd zapisu cache:', e);
  }
}

// ============ API HELPER ============

async function api(method, url, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Błąd API');
  }
  
  return result;
}

// ============ TOAST NOTIFICATIONS ============

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.error('Toast container not found');
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Force reflow to enable animation
  toast.offsetHeight;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============ REAL-TIME NOTIFICATIONS (Socket.IO) ============

let socket = null;
let notificationSound = null;

/**
 * Inicjalizuje połączenie WebSocket i powiadomienia w czasie rzeczywistym
 */
function initRealtimeNotifications() {
  // Utwórz element audio dla dźwięku powiadomienia
  notificationSound = new Audio('data:audio/wav;base64,UklGRl4DAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToDAABkAGQAZABkAGQAZABkAGQAZABkAHgAeACWAKYAwgDSAO4A/gAaASoBRgFWAXIBggGeAa4BugHKAdYB5gHyAQICDgIeAioCOgJGAlYCYgJyAn4CjgKaAqoCrgK+AsIC0gLWAuYC6gL6Av4CDgMSAx4DIgMuAzIDPgNCA04DUgNeA2IDbgNyA34DggOOA5IDngOiA64DsgO2A7YDtgO2A7YDtgOyA64DqgOmA6IDngOaA5YDkgOOA4oDhgOCA34DegN2A3IDcgNuA24DbgNuA24DbgNuA24DcgNyA3YDdgN6A34DggOGA4oDjgOSA5YDmgOeA6IDpgOqA64DsgOyA7YDtgO2A7YDtgOyA64DqgOmA6IDngOaA5YDkgOOA4YDggN+A3oDdgNyA24DagNmA2IDXgNaA1YDUgNOA0oDRgNCA0IDPgM6AzYDMgMuAyoDJgMiAx4DGgMWAxIDDgMKAwYDAgP+AvoCAAAA');
  notificationSound.volume = 0.5;
  
  // Połącz z Socket.IO
  try {
    socket = io();
    
    socket.on('connect', () => {
      console.log('🔌 Połączono z serwerem WebSocket');
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Rozłączono z serwerem WebSocket');
    });
    
    // Nasłuchuj na powiadomienia o modułach
    socket.on('module_started', (data) => {
      console.log('📢 Moduł uruchomiony:', data);
      showModuleNotification(data);
    });
    
    socket.on('module_completed', (data) => {
      console.log('✅ Moduł zakończony:', data);
      showModuleCompletedNotification(data);
    });
    
    socket.on('module_error', (data) => {
      console.log('❌ Błąd modułu:', data);
      showModuleErrorNotification(data);
    });
    
    // Nasłuchuj na aktualizacje statusu
    socket.on('update', (data) => {
      console.log('📊 Aktualizacja:', data);
      handleSocketUpdate(data);
    });
    
  } catch (e) {
    console.error('Błąd inicjalizacji Socket.IO:', e);
  }
}

/**
 * Subskrybuje powiadomienia dla wybranego konta
 */
function subscribeToAccount(accountId) {
  if (socket && socket.connected) {
    socket.emit('subscribe', accountId);
    console.log(`📡 Subskrybuję powiadomienia dla konta ${accountId}`);
  }
}

/**
 * Wyświetla powiadomienie o uruchomieniu modułu
 */
function showModuleNotification(data) {
  const { accountEmail, module, message } = data;
  
  const moduleIcons = {
    'farm': '🌾',
    'forestry': '🌲',
    'stalls': '🏪',
    'cycle': '🔄',
    'status': '📊'
  };
  
  const icon = moduleIcons[module] || '🤖';
  const notificationMsg = message || `${icon} Moduł ${module} uruchomiony`;
  
  // Odtwórz dźwięk
  playNotificationSound();
  
  // Pokaż toast
  showToast(`${icon} [${accountEmail}] ${notificationMsg}`, 'info');
  
  // Pokaż natywne powiadomienie przeglądarki (jeśli dozwolone)
  showBrowserNotification(`${icon} ${module}`, `${accountEmail}: ${notificationMsg}`);
}

/**
 * Wyświetla powiadomienie o zakończeniu modułu
 */
function showModuleCompletedNotification(data) {
  const { accountEmail, module, results } = data;
  
  const moduleIcons = {
    'farm': '🌾',
    'forestry': '🌲',
    'stalls': '🏪',
    'cycle': '🔄'
  };
  
  const icon = moduleIcons[module] || '✅';
  let resultMsg = '';
  
  if (results) {
    if (module === 'farm' && results.harvested !== undefined) {
      resultMsg = ` Zebrano: ${results.harvested}, Posadzono: ${results.planted}, Podlano: ${results.watered}`;
    } else if (module === 'forestry' && results.treesHarvested !== undefined) {
      resultMsg = ` Drzewa: ${results.treesHarvested}, Produkty: ${results.productsCollected || 0}`;
    }
  }
  
  showToast(`${icon} [${accountEmail}] Moduł ${module} zakończony!${resultMsg}`, 'success');
}

/**
 * Wyświetla powiadomienie o błędzie modułu
 */
function showModuleErrorNotification(data) {
  const { accountEmail, module, error } = data;
  
  showToast(`❌ [${accountEmail}] Błąd ${module}: ${error}`, 'error');
  
  // Odtwórz dźwięk błędu (inny ton)
  playNotificationSound();
}

/**
 * Odtwarza dźwięk powiadomienia
 */
function playNotificationSound() {
  try {
    if (notificationSound) {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(e => {
        // Przeglądarka może blokować autoplay
        console.debug('Nie można odtworzyć dźwięku:', e.message);
      });
    }
  } catch (e) {
    console.debug('Błąd odtwarzania dźwięku:', e);
  }
}

/**
 * Wyświetla natywne powiadomienie przeglądarki
 */
function showBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        tag: 'wf-bot-notification'
      });
    } catch (e) {
      console.debug('Błąd powiadomienia przeglądarki:', e);
    }
  }
}

/**
 * Prosi o pozwolenie na powiadomienia przeglądarki
 */
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Uprawnienia powiadomień:', permission);
    });
  }
}

/**
 * Obsługuje aktualizacje z socketa
 */
function handleSocketUpdate(data) {
  if (data.type === 'status' && selectedAccountId) {
    // Odśwież status gry
    refreshGameStatusFromCache();
  }
}

// ============ INICJALIZACJA ============

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  initProductSelects();
  initForestrySelects();
  initFarmSelects();
  initEventListeners();
  initRealtimeNotifications(); // Inicjalizuj WebSocket
  requestNotificationPermission(); // Poproś o pozwolenie na powiadomienia
  await loadAccounts();
  await loadSchedulerStatus();
  await loadAppSettings();
  startStatusAutoRefresh(); // Auto-refresh statusu gry co 30 min
});

async function checkAuth() {
  try {
    const data = await api('GET', '/api/me');
    document.getElementById('userName').textContent = data.user.username;
  } catch (e) {
    window.location.href = '/login.html';
  }
}

function initEventListeners() {
  // Formularz dodawania konta
  document.getElementById('addAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api('POST', '/api/accounts', Object.fromEntries(formData));
      showToast('Konto dodane!', 'success');
      closeModal();
      await loadAccounts();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

// ============ PRODUKTY DO STRAGANÓW ============

function initProductSelects() {
  const selects = ['stall1_slot1', 'stall1_slot2', 'stall2_slot1', 'stall2_slot2'];
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Wyczyść i dodaj opcje
    select.innerHTML = '<option value="">-- Wyłączony --</option>';
    
    STALL_PRODUCTS.forEach(product => {
      const option = document.createElement('option');
      option.value = JSON.stringify({ id: product.id, name: product.name });
      option.textContent = product.name;
      select.appendChild(option);
    });
  });
}

function validateStallProducts(stallNumber) {
  // Sprawdź czy nie ma duplikatów w tym samym straganie
  if (stallNumber === 1) {
    const slot1 = document.getElementById('stall1_slot1').value;
    const slot2 = document.getElementById('stall1_slot2').value;
    
    if (slot1 && slot2 && slot1 === slot2) {
      showToast('W jednym straganie nie mogą być dwa takie same produkty!', 'error');
      document.getElementById('stall1_slot2').value = '';
    }
  } else if (stallNumber === 2) {
    const slot1 = document.getElementById('stall2_slot1').value;
    const slot2 = document.getElementById('stall2_slot2').value;
    
    if (slot1 && slot2 && slot1 === slot2) {
      showToast('W jednym straganie nie mogą być dwa takie same produkty!', 'error');
      document.getElementById('stall2_slot2').value = '';
    }
  }
}

async function loadStallsConfig() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/stalls-config`);
    currentStallsConfig = data.config;
    
    if (currentStallsConfig) {
      // Ustaw wartości w selectach - szukaj po ID produktu
      if (currentStallsConfig.stall1?.slot1?.productId) {
        setSelectByProductId('stall1_slot1', currentStallsConfig.stall1.slot1.productId);
      }
      if (currentStallsConfig.stall1?.slot2?.productId) {
        setSelectByProductId('stall1_slot2', currentStallsConfig.stall1.slot2.productId);
      }
      if (currentStallsConfig.stall2?.slot1?.productId) {
        setSelectByProductId('stall2_slot1', currentStallsConfig.stall2.slot1.productId);
      }
      if (currentStallsConfig.stall2?.slot2?.productId) {
        setSelectByProductId('stall2_slot2', currentStallsConfig.stall2.slot2.productId);
      }
    }
  } catch (error) {
    console.error('Błąd ładowania konfiguracji straganów:', error);
  }
}

// Ustawia wartość selecta produktu po ID
function setSelectByProductId(selectId, productId) {
  const select = document.getElementById(selectId);
  if (!select || !productId) return;
  
  for (const option of select.options) {
    if (!option.value || option.value === '') continue;
    try {
      const parsed = JSON.parse(option.value);
      if (parsed && parsed.id === productId) {
        option.selected = true;
        return;
      }
    } catch (e) {
      // Ignoruj błędy parsowania - niektóre opcje mogą nie być JSON
    }
  }
}

function setSelectValue(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  for (const option of select.options) {
    if (option.value === value) {
      option.selected = true;
      return;
    }
  }
}

async function saveStallsConfig() {
  if (!selectedAccountId) return;
  
  const config = {
    stall1: {},
    stall2: {}
  };
  
  // Slot 1 straganu 1
  const s1s1 = document.getElementById('stall1_slot1').value;
  if (s1s1 && s1s1.trim() !== '') {
    try {
      const p = JSON.parse(s1s1);
      config.stall1.slot1 = { productId: p.id, productName: p.name, enabled: true };
    } catch (e) { console.error('Błąd parsowania s1s1:', e); }
  }
  
  // Slot 2 straganu 1
  const s1s2 = document.getElementById('stall1_slot2').value;
  if (s1s2 && s1s2.trim() !== '') {
    try {
      const p = JSON.parse(s1s2);
      config.stall1.slot2 = { productId: p.id, productName: p.name, enabled: true };
    } catch (e) { console.error('Błąd parsowania s1s2:', e); }
  }
  
  // Slot 1 straganu 2
  const s2s1 = document.getElementById('stall2_slot1').value;
  if (s2s1 && s2s1.trim() !== '') {
    try {
      const p = JSON.parse(s2s1);
      config.stall2.slot1 = { productId: p.id, productName: p.name, enabled: true };
    } catch (e) { console.error('Błąd parsowania s2s1:', e); }
  }
  
  // Slot 2 straganu 2
  const s2s2 = document.getElementById('stall2_slot2').value;
  if (s2s2 && s2s2.trim() !== '') {
    try {
      const p = JSON.parse(s2s2);
      config.stall2.slot2 = { productId: p.id, productName: p.name, enabled: true };
    } catch (e) { console.error('Błąd parsowania s2s2:', e); }
  }
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/stalls-config`, { config });
    showToast('Konfiguracja straganów zapisana!', 'success');
    currentStallsConfig = config;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ KONFIGURACJA TARTAKU ============

function initForestrySelects() {
  // Produkty tartaku (budynek 1)
  const sawmillSelects = ['building1_slot1', 'building1_slot2'];
  sawmillSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Auto (dowolny) --</option>';
    SAWMILL_PRODUCTS.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  });
  
  // Produkty stolarni (budynek 2)
  const carpentrySelects = ['building2_slot1', 'building2_slot2'];
  carpentrySelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Auto (dowolny) --</option>';
    CARPENTRY_PRODUCTS.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  });
}

async function loadForestryConfig() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/forestry-config`);
    currentForestryConfig = data.config;
    
    // Ustaw preferowane drzewo
    if (data.preferredTree) {
      document.getElementById('forestryPreferredTree').value = data.preferredTree;
    }
    
    // Ustaw produkty budynków - konwertuj na string dla pewności
    if (currentForestryConfig) {
      if (currentForestryConfig.building1?.slot1?.productId) {
        document.getElementById('building1_slot1').value = String(currentForestryConfig.building1.slot1.productId);
      }
      if (currentForestryConfig.building1?.slot2?.productId) {
        document.getElementById('building1_slot2').value = String(currentForestryConfig.building1.slot2.productId);
      }
      if (currentForestryConfig.building2?.slot1?.productId) {
        document.getElementById('building2_slot1').value = String(currentForestryConfig.building2.slot1.productId);
      }
      if (currentForestryConfig.building2?.slot2?.productId) {
        document.getElementById('building2_slot2').value = String(currentForestryConfig.building2.slot2.productId);
      }
    }
  } catch (error) {
    console.error('Błąd ładowania konfiguracji tartaku:', error);
  }
}

async function saveForestryConfig() {
  if (!selectedAccountId) return;
  
  const preferredTree = document.getElementById('forestryPreferredTree').value;
  
  const config = {
    building1: {
      slot1: { productId: document.getElementById('building1_slot1').value ? parseInt(document.getElementById('building1_slot1').value) : null },
      slot2: { productId: document.getElementById('building1_slot2').value ? parseInt(document.getElementById('building1_slot2').value) : null },
    },
    building2: {
      slot1: { productId: document.getElementById('building2_slot1').value ? parseInt(document.getElementById('building2_slot1').value) : null },
      slot2: { productId: document.getElementById('building2_slot2').value ? parseInt(document.getElementById('building2_slot2').value) : null },
    }
  };
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/forestry-config`, { config, preferredTree });
    showToast('Konfiguracja tartaku zapisana!', 'success');
    currentForestryConfig = config;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ KONFIGURACJA FARMY ============

/**
 * Inicjalizuje selecty farmy - filtruje rośliny po poziomie gracza
 */
function initFarmSelects() {
  const farmSelects = ['farm1_crop', 'farm2_crop', 'farm3_crop', 'farm4_crop'];
  
  // Filtruj rośliny dostępne dla poziomu gracza i sortuj po poziomie
  const availableCrops = FARM_CROPS
    .filter(crop => crop.level <= playerLevel)
    .sort((a, b) => a.level - b.level);
  
  farmSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    availableCrops.forEach(crop => {
      const option = document.createElement('option');
      option.value = crop.id;
      option.textContent = `${crop.name} (${crop.time})`;
      select.appendChild(option);
    });
  });
}

/**
 * Aktualizuje selecty po zmianie poziomu gracza
 */
function updateFarmSelectsForLevel() {
  // Zapamiętaj obecne wartości
  const currentValues = {
    farm1: document.getElementById('farm1_crop')?.value,
    farm2: document.getElementById('farm2_crop')?.value,
    farm3: document.getElementById('farm3_crop')?.value,
    farm4: document.getElementById('farm4_crop')?.value,
  };
  
  // Przebuduj selecty
  initFarmSelects();
  
  // Przywróć wartości jeśli są nadal dostępne
  if (currentValues.farm1) document.getElementById('farm1_crop').value = currentValues.farm1;
  if (currentValues.farm2) document.getElementById('farm2_crop').value = currentValues.farm2;
  if (currentValues.farm3) document.getElementById('farm3_crop').value = currentValues.farm3;
  if (currentValues.farm4) document.getElementById('farm4_crop').value = currentValues.farm4;
}

async function loadFarmConfig() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/farm-config`);
    currentFarmConfig = data.config;
    console.log('Załadowano konfigurację farmy:', currentFarmConfig);
    
    if (currentFarmConfig) {
      // Ustaw wartości selectów
      const farm1Select = document.getElementById('farm1_crop');
      const farm2Select = document.getElementById('farm2_crop');
      const farm3Select = document.getElementById('farm3_crop');
      const farm4Select = document.getElementById('farm4_crop');
      
      // Użyj String() dla pewności że porównanie zadziała
      if (farm1Select && currentFarmConfig.farm1) {
        farm1Select.value = String(currentFarmConfig.farm1);
      }
      if (farm2Select && currentFarmConfig.farm2) {
        farm2Select.value = String(currentFarmConfig.farm2);
      }
      if (farm3Select && currentFarmConfig.farm3) {
        farm3Select.value = String(currentFarmConfig.farm3);
      }
      if (farm4Select && currentFarmConfig.farm4) {
        farm4Select.value = String(currentFarmConfig.farm4);
      }
    }
  } catch (error) {
    console.error('Błąd ładowania konfiguracji farmy:', error);
  }
}

async function saveFarmConfig() {
  console.log('saveFarmConfig called, selectedAccountId:', selectedAccountId);
  
  if (!selectedAccountId) {
    showToast('Najpierw wybierz konto!', 'error');
    return;
  }
  
  const config = {};
  
  // Zapisz tylko konfigurację dla widocznych (odblokowanych) farm
  for (let farmNum = 1; farmNum <= 4; farmNum++) {
    const farmCard = document.getElementById(`farm${farmNum}_config`);
    const farmSelect = document.getElementById(`farm${farmNum}_crop`);
    
    // Zapisz tylko jeśli karta farmy jest widoczna
    if (farmCard && farmSelect && farmCard.style.display !== 'none') {
      config[`farm${farmNum}`] = farmSelect.value || '1';
    }
  }
  
  console.log('Config to save (only visible farms):', config);
  
  // Jeśli nie ma żadnej widocznej farmy, zapisz przynajmniej farm1
  if (Object.keys(config).length === 0) {
    const farm1El = document.getElementById('farm1_crop');
    config.farm1 = farm1El?.value || '1';
  }
  
  try {
    const result = await api('POST', `/api/accounts/${selectedAccountId}/farm-config`, { config });
    console.log('Save result:', result);
    currentFarmConfig = config;
    showToast('Konfiguracja farmy zapisana!', 'success');
  } catch (error) {
    console.error('Save error:', error);
    showToast(error.message, 'error');
  }
}

// ============ KONTA ============

async function loadAccounts() {
  try {
    const data = await api('GET', '/api/accounts');
    const container = document.getElementById('accountsList');
    
    if (data.accounts.length === 0) {
      container.innerHTML = '<p class="no-data">Brak kont</p>';
      return;
    }
    
    container.innerHTML = data.accounts.map(acc => `
      <div class="account-item ${acc.id == selectedAccountId ? 'active' : ''}" 
           onclick="selectAccount(${acc.id})">
        <div class="account-name">${acc.email}</div>
        <div class="account-server">Serwer ${acc.server}</div>
      </div>
    `).join('');
    
    // Automatycznie wybierz ostatnie używane konto z localStorage
    const savedAccountId = localStorage.getItem('selectedAccountId');
    if (savedAccountId && data.accounts.some(acc => acc.id == savedAccountId)) {
      await selectAccount(parseInt(savedAccountId));
    }
  } catch (error) {
    showToast('Błąd ładowania kont', 'error');
  }
}

async function deleteAccount() {
  if (!selectedAccountId) return;
  
  const confirmed = confirm('Czy na pewno chcesz usunąć to konto gry? Ta operacja jest nieodwracalna!');
  if (!confirmed) return;
  
  try {
    await api('DELETE', `/api/accounts/${selectedAccountId}`);
    showToast('Konto zostało usunięte', 'success');
    
    // Wyczyść localStorage
    localStorage.removeItem('selectedAccountId');
    localStorage.removeItem(`gameStatus_${selectedAccountId}`);
    
    // Resetuj UI
    selectedAccountId = null;
    document.getElementById('accountDetails').classList.add('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    
    // Przeładuj listę kont
    await loadAccounts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function selectAccount(accountId) {
  selectedAccountId = accountId;
  
  // Zapisz wybrane konto do localStorage
  localStorage.setItem('selectedAccountId', accountId);
  
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('accountDetails').classList.remove('hidden');
  
  // Zaznacz aktywne konto
  document.querySelectorAll('.account-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.account-item[onclick="selectAccount(${accountId})"]`)?.classList.add('active');
  
  // Załaduj dane konta
  try {
    const data = await api('GET', `/api/accounts/${accountId}`);
    const account = data.account;
    
    document.getElementById('accountEmail').textContent = account.email;
    
    // Załaduj konfigurację straganów
    await loadStallsConfig();
    
    // Załaduj konfigurację tartaku
    await loadForestryConfig();
    
    // Załaduj konfigurację farmy
    await loadFarmConfig();
    
    // Załaduj logi
    await loadLogs();
    
    // Załaduj status harmonogramu
    await refreshSchedulerStatus();
    
    // Załaduj status gry z cache bazy danych (nie wymuszaj odświeżenia)
    await loadGameStatusFromCache();
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ STATUS GRY ============

/**
 * Ładuje status gry z cache bazy danych (bez uruchamiania przeglądarki)
 */
async function loadGameStatusFromCache() {
  if (!selectedAccountId) return;
  
  try {
    // Pobierz status z cache bazy danych
    const data = await api('GET', `/api/accounts/${selectedAccountId}/game-status-cache`);
    
    if (data && data.updatedAt) {
      // Przelicz timery
      const fetchedAt = new Date(data.updatedAt).getTime();
      const adjustedData = adjustTimersFromCache(data, fetchedAt);
      displayGameStatus(adjustedData);
      
      const cacheAge = Math.round((Date.now() - fetchedAt) / 60000);
      document.getElementById('statusFetchTime').textContent = 
        `(z cache DB, ${cacheAge} min temu)`;
      
      // Uruchom live timery
      startLiveTimers();
      
      console.log('Cache DB załadowany:', data.updatedAt);
      return; // Sukces - nie sprawdzaj localStorage
    }
  } catch (error) {
    console.log('Brak cache statusu gry w DB:', error.message);
  }
  
  // Brak cache w DB - wyświetl komunikat
  document.getElementById('statusFetchTime').textContent = 
    '(kliknij "Odśwież status" aby pobrać dane)';
}

// Pobiera status tylko z lokalnego cache (szybkie, bez wchodzenia do gry)
function refreshGameStatusFromCache() {
  if (!selectedAccountId) return;
  
  const cached = getStatusCache(selectedAccountId);
  const now = Date.now();
  
  if (cached) {
    const adjustedData = adjustTimersFromCache(cached.data, cached.fetchedAt);
    displayGameStatus(adjustedData);
    const cacheAge = Math.round((now - cached.fetchedAt) / 60000);
    document.getElementById('statusFetchTime').textContent = 
      `(z cache, ${cacheAge} min temu)`;
    startLiveTimers();
    showToast('Załadowano z cache', 'success');
  } else {
    showToast('Brak danych w cache - użyj "Odśwież z gry"', 'warning');
  }
}

// Pobiera status na żywo z gry (wymaga uruchomienia przeglądarki)
async function refreshGameStatusLive() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Loguję do gry i pobieram status...');
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/game-status`);
    
    // Zapisz do cache w localStorage
    setStatusCache(selectedAccountId, data);
    
    // Wyświetl dane
    displayGameStatus(data);
    
    // Aktualizuj czas pobrania
    document.getElementById('statusFetchTime').textContent = 
      `(${new Date().toLocaleTimeString()})`;
    
    // Uruchom live timery
    startLiveTimers();
    
    showModuleStatus('Status pobrany z gry!', 'success');
    setTimeout(hideModuleStatus, 2000);
    
  } catch (error) {
    showModuleStatus(`Błąd: ${error.message}`, 'error');
    setTimeout(hideModuleStatus, 5000);
  }
}

// Stara funkcja - zachowana dla kompatybilności, używa cache jeśli świeży
async function refreshGameStatus(forceRefresh = false) {
  if (!selectedAccountId) return;
  
  // Sprawdź cache w localStorage
  const cached = getStatusCache(selectedAccountId);
  const now = Date.now();
  
  if (!forceRefresh && cached && (now - cached.fetchedAt) < CACHE_TTL) {
    // Użyj danych z cache - przelicz czasy na podstawie upływu czasu
    const adjustedData = adjustTimersFromCache(cached.data, cached.fetchedAt);
    displayGameStatus(adjustedData);
    const cacheAge = Math.round((now - cached.fetchedAt) / 60000);
    document.getElementById('statusFetchTime').textContent = 
      `(z cache, ${cacheAge} min temu)`;
    
    // Uruchom live timery
    startLiveTimers();
    return;
  }
  
  // Brak świeżego cache - pobierz z gry
  await refreshGameStatusLive();
}

// Przelicza timery z cache na podstawie upływu czasu
function adjustTimersFromCache(data, fetchedAt) {
  const elapsedSeconds = Math.floor((Date.now() - fetchedAt) / 1000);
  
  // Kopiuj dane żeby nie modyfikować oryginału
  const adjusted = JSON.parse(JSON.stringify(data));
  
  // Dostosuj czasy pól (fieldsStatus)
  if (adjusted.fieldsStatus) {
    adjusted.fieldsStatus = adjusted.fieldsStatus.map(field => {
      if (field.timeLeft && field.status !== 'ready') {
        const newSeconds = Math.max(0, parseTimeToSeconds(field.timeLeft) - elapsedSeconds);
        if (newSeconds <= 0) {
          field.status = 'ready';
          field.timeLeft = 'Gotowe!';
        } else {
          field.timeLeft = formatSecondsToTime(newSeconds);
        }
      }
      return field;
    });
  }
  
  // Dostosuj czasy tartaku (forestryStatus)
  if (adjusted.forestryStatus) {
    if (adjusted.forestryStatus.trees) {
      adjusted.forestryStatus.trees = adjusted.forestryStatus.trees.map(tree => {
        if (tree.timeLeft && tree.status !== 'ready') {
          const newSeconds = Math.max(0, parseTimeToSeconds(tree.timeLeft) - elapsedSeconds);
          if (newSeconds <= 0) {
            tree.status = 'ready';
            tree.timeLeft = 'Gotowe!';
          } else {
            tree.timeLeft = formatSecondsToTime(newSeconds);
          }
        }
        return tree;
      });
    }
  }
  
  return adjusted;
}

// Parsuje czas "HH:MM:SS" lub "MM:SS" na sekundy
function parseTimeToSeconds(timeStr) {
  if (!timeStr || timeStr === 'Gotowe!' || timeStr === 'Gotowy!' || timeStr === 'ready') {
    return 0;
  }
  
  const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Formatuje sekundy na "HH:MM:SS" lub "MM:SS"
function formatSecondsToTime(totalSeconds) {
  if (totalSeconds <= 0) return 'Gotowe!';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Uruchamia live timery - co sekundę aktualizuje wyświetlane czasy
function startLiveTimers() {
  // Zatrzymaj poprzedni interval
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
  }
  
  timerUpdateInterval = setInterval(() => {
    updateDisplayedTimers();
  }, TIMER_UPDATE_INTERVAL);
}

// Aktualizuje wyświetlane timery - odejmuje 1 sekundę od każdego
function updateDisplayedTimers() {
  // Aktualizuj timery pól
  document.querySelectorAll('.field-time:not(.ready)').forEach(el => {
    const currentTime = el.textContent;
    const seconds = parseTimeToSeconds(currentTime);
    if (seconds > 0) {
      el.textContent = formatSecondsToTime(seconds - 1);
    } else {
      el.textContent = 'Gotowe!';
      el.classList.add('ready');
    }
  });
  
  // Aktualizuj timery tartaku (drzewa)
  document.querySelectorAll('.tree-time:not(.ready)').forEach(el => {
    const currentTime = el.textContent;
    const seconds = parseTimeToSeconds(currentTime);
    if (seconds > 0) {
      el.textContent = formatSecondsToTime(seconds - 1);
    } else {
      el.textContent = 'Gotowe!';
      el.classList.add('ready');
    }
  });
  
  // Aktualizuj timery produkcji tartaku
  document.querySelectorAll('.production-time:not(.ready)').forEach(el => {
    const currentTime = el.textContent;
    const seconds = parseTimeToSeconds(currentTime);
    if (seconds > 0) {
      el.textContent = formatSecondsToTime(seconds - 1);
    } else {
      el.textContent = 'Gotowe!';
      el.classList.add('ready');
    }
  });
}

// Zatrzymuje live timery
function stopLiveTimers() {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
    timerUpdateInterval = null;
  }
}

// Wyświetla status gry (używane przez cache i fresh fetch)
function displayGameStatus(data) {
  // Aktualizuj widoczność sekcji na podstawie odblokowanych funkcji
  // Tylko jeśli mamy rzeczywiste dane o odblokowaniu (nie null)
  if (data.unlockedFeatures && typeof data.unlockedFeatures === 'object') {
    updateFeatureVisibility(data.unlockedFeatures);
  } else {
    // Brak danych o odblokowaniu - pokaż wszystkie sekcje
    showAllFeatureSections();
  }
  
  displayStallsStatus(data.stallsStatus);
  displayFieldsStatus(data.fieldsStatus);
  displayForestryStatus(data.forestryStatus);
  
  // Aktualizuj widoczność farm na podstawie odblokowanych budynków
  updateFarmCardsVisibility(data.fieldsStatus, data.unlockedFeatures);
  
  // Aktualizuj poziom gracza i przefiltruj rośliny
  if (data.playerInfo && data.playerInfo.level) {
    updatePlayerLevel(data.playerInfo.level);
    displayPlayerInfo(data.playerInfo);
  }
}

/**
 * Pokazuje wszystkie sekcje funkcji (gdy brak danych o odblokowaniu)
 * Używane gdy cache nie ma zapisanych informacji o odblokowaniu
 */
function showAllFeatureSections() {
  const stallsConfigPanel = document.getElementById('stallsConfigPanel');
  const stallsStatusSection = document.getElementById('stallsStatusSection');
  const forestryConfigPanel = document.getElementById('forestryConfigPanel');
  const forestryStatusSection = document.getElementById('forestryStatusSection');
  const forestryBtn = document.querySelector('.btn-forestry');
  const stallsBtn = document.querySelector('.btn-stalls');
  
  // Pokaż wszystko - użytkownik musi odświeżyć status aby sprawdzić odblokownie
  if (stallsConfigPanel) stallsConfigPanel.style.display = 'block';
  if (stallsStatusSection) stallsStatusSection.style.display = 'block';
  if (forestryConfigPanel) forestryConfigPanel.style.display = 'block';
  if (forestryStatusSection) forestryStatusSection.style.display = 'block';
  if (forestryBtn) forestryBtn.style.display = 'inline-block';
  if (stallsBtn) stallsBtn.style.display = 'inline-block';
  
  console.log('Brak danych o odblokowaniu - pokazuję wszystkie sekcje');
}

/**
 * Aktualizuje widoczność sekcji konfiguracji na podstawie odblokowanych funkcji
 * @param {Object} features - obiekt z informacjami o odblokowaniu { farms, stalls, forestry }
 */
function updateFeatureVisibility(features) {
  // Ukryj sekcję straganów jeśli nie odblokowane
  const stallsConfigPanel = document.getElementById('stallsConfigPanel');
  const stallsStatusSection = document.getElementById('stallsStatusSection');
  
  if (stallsConfigPanel) {
    stallsConfigPanel.style.display = features.stalls ? 'block' : 'none';
  }
  if (stallsStatusSection) {
    stallsStatusSection.style.display = features.stalls ? 'block' : 'none';
  }
  
  // Ukryj sekcję tartaku jeśli nie odblokowany
  const forestryConfigPanel = document.getElementById('forestryConfigPanel');
  const forestryStatusSection = document.getElementById('forestryStatusSection');
  
  if (forestryConfigPanel) {
    forestryConfigPanel.style.display = features.forestry ? 'block' : 'none';
  }
  if (forestryStatusSection) {
    forestryStatusSection.style.display = features.forestry ? 'block' : 'none';
  }
  
  // Ukryj przyciski modułów dla niedostępnych funkcji
  const forestryBtn = document.querySelector('.btn-forestry');
  const stallsBtn = document.querySelector('.btn-stalls');
  
  if (forestryBtn) {
    forestryBtn.style.display = features.forestry ? 'inline-block' : 'none';
  }
  if (stallsBtn) {
    stallsBtn.style.display = features.stalls ? 'inline-block' : 'none';
  }
  
  console.log(`Widoczność funkcji: Stragany=${features.stalls}, Tartak=${features.forestry}`);
}

// Aktualizuje poziom gracza i przeładowuje selektory
function updatePlayerLevel(level) {
  if (level && level > 0 && level !== playerLevel) {
    console.log(`Aktualizacja poziomu gracza: ${playerLevel} -> ${level}`);
    playerLevel = level;
    // Przeładuj selektory roślin z nowym poziomem
    initFarmSelects();
  }
}

// Wyświetla informacje o graczu
function displayPlayerInfo(info) {
  // Sprawdź czy istnieje element do wyświetlenia poziomu
  let playerInfoEl = document.getElementById('playerInfoDisplay');
  if (!playerInfoEl) {
    // Stwórz element jeśli nie istnieje (można wstawić w odpowiednie miejsce)
    const statusSection = document.querySelector('.status-section h4');
    if (statusSection) {
      playerInfoEl = document.createElement('div');
      playerInfoEl.id = 'playerInfoDisplay';
      playerInfoEl.className = 'player-info-badge';
      statusSection.parentNode.insertBefore(playerInfoEl, statusSection.nextSibling);
    }
  }
  
  if (playerInfoEl && info) {
    // money jest w formacie liczby np. 464365.28, sformatuj do wyświetlenia
    const money = info.money || info.cash || 0;
    const formattedMoney = money.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ft';
    
    playerInfoEl.innerHTML = `
      <span class="badge bg-primary">Poziom: ${info.level || 1}</span>
      <span class="badge bg-success">💰 ${formattedMoney}</span>
      ${info.isPremium ? '<span class="badge bg-warning text-dark">⭐ Premium</span>' : ''}
    `;
  }
}

/**
 * Aktualizuje widoczność kart farm na podstawie statusu pól i odblokowanych funkcji
 * Ukrywa farmy które są całkowicie zablokowane lub nieodblokowane na mapie
 * @param {Array} fieldsStatus - status pól
 * @param {Object} unlockedFeatures - informacje o odblokowanych funkcjach
 */
function updateFarmCardsVisibility(fieldsStatus, unlockedFeatures = null) {
  // Domyślnie ukryj wszystkie farmy oprócz 1
  for (let farmNum = 1; farmNum <= 4; farmNum++) {
    const farmCard = document.getElementById(`farm${farmNum}_config`);
    if (farmCard) {
      // Farma 1 zawsze widoczna, pozostałe domyślnie ukryte
      farmCard.style.display = farmNum === 1 ? 'block' : 'none';
    }
  }
  
  // Jeśli mamy informacje o odblokowanych funkcjach z mapy, użyj ich
  if (unlockedFeatures && unlockedFeatures.farms) {
    for (let farmNum = 1; farmNum <= 4; farmNum++) {
      const farmCard = document.getElementById(`farm${farmNum}_config`);
      if (farmCard) {
        if (unlockedFeatures.farms[farmNum]) {
          farmCard.style.display = 'block';
        } else {
          farmCard.style.display = 'none';
          console.log(`Ukryto farmę ${farmNum} - zablokowana na mapie`);
        }
      }
    }
    return; // Użyj tylko informacji z mapy
  }
  
  // Fallback: Jeśli mamy dane o polach, sprawdź które farmy mają aktywne budynki
  if (fieldsStatus && fieldsStatus.length > 0) {
    // Grupuj pola wg farmy
    const farmHasUnlockedBuilding = { 1: false, 2: false, 3: false, 4: false };
    
    fieldsStatus.forEach(field => {
      if (field.farm && field.status !== 'locked') {
        farmHasUnlockedBuilding[field.farm] = true;
      }
    });
    
    // Ukryj karty farm bez odblokowanych budynków
    for (let farmNum = 1; farmNum <= 4; farmNum++) {
      const farmCard = document.getElementById(`farm${farmNum}_config`);
      if (farmCard) {
        if (farmHasUnlockedBuilding[farmNum]) {
          farmCard.style.display = 'block';
        } else {
          farmCard.style.display = 'none';
          console.log(`Ukryto farmę ${farmNum} - wszystkie budynki zablokowane`);
        }
      }
    }
  }
}

// Uruchamia automatyczne odświeżanie statusu co 30 min
function startStatusAutoRefresh() {
  // Zatrzymaj poprzedni interval jeśli istnieje
  if (statusRefreshInterval) {
    clearInterval(statusRefreshInterval);
  }
  
  // Odświeżaj co 30 minut (tylko jeśli jest wybrane konto)
  statusRefreshInterval = setInterval(() => {
    if (selectedAccountId) {
      console.log('Auto-refresh statusu gry...');
      refreshGameStatus(true); // force refresh
    }
  }, CACHE_TTL);
}

// Zatrzymuje automatyczne odświeżanie
function stopStatusAutoRefresh() {
  if (statusRefreshInterval) {
    clearInterval(statusRefreshInterval);
    statusRefreshInterval = null;
  }
}

function displayStallsStatus(stallsStatus) {
  const container = document.getElementById('stallsStatus');
  
  if (!stallsStatus || stallsStatus.length === 0) {
    container.innerHTML = '<p class="no-data">Brak danych o straganach</p>';
    return;
  }
  
  container.innerHTML = stallsStatus.map(stall => `
    <div class="stall-status-card">
      <h5>Stragan ${stall.stallNumber}</h5>
      <div class="slots-list">
        ${stall.slots.map(slot => {
          if (slot.locked) {
            return `<div class="slot-status locked">🔒 Slot ${slot.slotNumber}: Zablokowany</div>`;
          }
          if (slot.empty) {
            return `<div class="slot-status empty">⬜ Slot ${slot.slotNumber}: Pusty</div>`;
          }
          const percent = slot.max > 0 ? Math.round((slot.current / slot.max) * 100) : 0;
          const statusClass = percent >= 100 ? 'full' : percent > 50 ? 'partial' : 'low';
          return `
            <div class="slot-status ${statusClass}">
              📦 Slot ${slot.slotNumber}: ${slot.productName || '?'}
              <span class="slot-amount">${slot.current}/${slot.max} (${percent}%)</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="stall-summary">
        Sloty: ${stall.unlockedSlots} dostępnych, ${stall.needsRefill} wymaga uzupełnienia
      </div>
    </div>
  `).join('');
}

function displayFieldsStatus(fields) {
  const container = document.getElementById('fieldsStatus');
  
  if (!fields || fields.length === 0) {
    container.innerHTML = '<p class="no-data">Brak aktywnych upraw</p>';
    return;
  }
  
  // Filtruj - ukryj zablokowane i puste pola
  const activeFields = fields.filter(f => f.status !== 'locked' && f.status !== 'empty');
  
  if (activeFields.length === 0) {
    container.innerHTML = '<p class="no-data">Brak aktywnych upraw (wszystkie pola puste lub zablokowane)</p>';
    return;
  }
  
  // Sortuj - gotowe na górze, potem po czasie
  const sortedFields = [...activeFields].sort((a, b) => {
    if (a.status === 'ready' && b.status !== 'ready') return -1;
    if (a.status !== 'ready' && b.status === 'ready') return 1;
    return 0;
  });
  
  container.innerHTML = sortedFields.map(field => {
    const isReady = field.status === 'ready';
    const statusClass = isReady ? 'ready' : 'growing';
    const timeDisplay = isReady ? '✓ Gotowe' : (field.timeLeft || '?');
    
    return `
      <div class="field-status-item ${statusClass}">
        <span class="field-location">F${field.farm}/P${field.field}</span>
        <span class="field-plant">${field.plantType || '?'}</span>
        <span class="field-time ${isReady ? 'ready' : ''}">${timeDisplay}</span>
      </div>
    `;
  }).join('');
}

function displayForestryStatus(forestryStatus) {
  const container = document.getElementById('forestryStatus');
  
  if (!forestryStatus) {
    container.innerHTML = '<p class="no-data">Brak danych o tartaku</p>';
    return;
  }
  
  const items = [];
  
  // Budynek 1 - Tartak
  if (forestryStatus.building1) {
    const b1 = forestryStatus.building1;
    const isReady = b1.status === 'ready' || b1.timeLeft === 'Gotowe!';
    const statusClass = isReady ? 'ready' : (b1.status === 'working' ? 'working' : 'empty');
    const icon = isReady ? '✅' : (b1.status === 'working' ? '⚙️' : '⬜');
    items.push(`
      <div class="forestry-status-item ${statusClass}">
        <span class="forestry-icon">${icon}</span>
        <span class="forestry-name">🏭 ${b1.name}</span>
        <span class="production-time ${isReady ? 'ready' : ''}">${b1.timeLeft}</span>
      </div>
    `);
  }
  
  // Budynek 2 - Stolarnia
  if (forestryStatus.building2) {
    const b2 = forestryStatus.building2;
    const isReady = b2.status === 'ready' || b2.timeLeft === 'Gotowe!';
    const statusClass = isReady ? 'ready' : (b2.status === 'working' ? 'working' : 'empty');
    const icon = isReady ? '✅' : (b2.status === 'working' ? '⚙️' : '⬜');
    items.push(`
      <div class="forestry-status-item ${statusClass}">
        <span class="forestry-icon">${icon}</span>
        <span class="forestry-name">🪚 ${b2.name}</span>
        <span class="production-time ${isReady ? 'ready' : ''}">${b2.timeLeft}</span>
      </div>
    `);
  }
  
  // Pierwsze drzewo
  if (forestryStatus.firstTree) {
    const tree = forestryStatus.firstTree;
    const isReady = tree.status === 'ready' || tree.timeLeft === 'Gotowe!';
    const statusClass = isReady ? 'ready' : (tree.status === 'growing' ? 'growing' : 'empty');
    const icon = isReady ? '✅' : (tree.status === 'growing' ? '🌲' : '⬜');
    items.push(`
      <div class="forestry-status-item ${statusClass}">
        <span class="forestry-icon">${icon}</span>
        <span class="forestry-name">🌲 ${tree.name}</span>
        <span class="tree-time ${isReady ? 'ready' : ''}">${tree.timeLeft}</span>
      </div>
    `);
  }
  
  if (items.length === 0) {
    container.innerHTML = '<p class="no-data">Brak danych o tartaku</p>';
    return;
  }
  
  container.innerHTML = items.join('');
}

// ============ AKCJE MODUŁÓW ============

function showModuleStatus(text, type = 'loading') {
  const statusDiv = document.getElementById('moduleStatus');
  const icon = statusDiv.querySelector('.status-icon');
  const textEl = statusDiv.querySelector('.status-text');
  
  statusDiv.classList.remove('hidden', 'success', 'error');
  
  if (type === 'loading') {
    icon.textContent = '⏳';
  } else if (type === 'success') {
    icon.textContent = '✅';
    statusDiv.classList.add('success');
  } else if (type === 'error') {
    icon.textContent = '❌';
    statusDiv.classList.add('error');
  }
  
  textEl.textContent = text;
}

function hideModuleStatus() {
  document.getElementById('moduleStatus').classList.add('hidden');
}

function setModuleButtonsDisabled(disabled) {
  document.querySelectorAll('.btn-module').forEach(btn => btn.disabled = disabled);
}

async function runFarm() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Wykonuję moduł farmy...');
  setModuleButtonsDisabled(true);
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/run-farm`);
    showModuleStatus('Farma - zakończono!', 'success');
    showToast('Farma zakończona', 'success');
    setTimeout(hideModuleStatus, 3000);
    await loadLogs();
  } catch (error) {
    showModuleStatus(`Błąd: ${error.message}`, 'error');
    showToast(error.message, 'error');
    setTimeout(hideModuleStatus, 5000);
  } finally {
    setModuleButtonsDisabled(false);
  }
}

async function runForestry() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Wykonuję moduł tartaku...');
  setModuleButtonsDisabled(true);
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/run-forestry`);
    showModuleStatus('Tartak - zakończono!', 'success');
    showToast('Tartak zakończony', 'success');
    setTimeout(hideModuleStatus, 3000);
    await loadLogs();
  } catch (error) {
    showModuleStatus(`Błąd: ${error.message}`, 'error');
    showToast(error.message, 'error');
    setTimeout(hideModuleStatus, 5000);
  } finally {
    setModuleButtonsDisabled(false);
  }
}

async function runStalls() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Wykonuję moduł straganów...');
  setModuleButtonsDisabled(true);
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/run-stalls`);
    showModuleStatus('Stragany - zakończono!', 'success');
    showToast('Stragany zakończone', 'success');
    setTimeout(hideModuleStatus, 3000);
    await loadLogs();
  } catch (error) {
    showModuleStatus(`Błąd: ${error.message}`, 'error');
    showToast(error.message, 'error');
    setTimeout(hideModuleStatus, 5000);
  } finally {
    setModuleButtonsDisabled(false);
  }
}

// ============ LOGI ============

async function loadLogs() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/logs`);
    const container = document.getElementById('logsList');
    
    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = '<p class="no-data">Brak logów</p>';
      return;
    }
    
    container.innerHTML = data.logs.slice(0, 10).map(log => `
      <div class="log-item ${log.success ? 'success' : 'error'}">
        <span class="log-time">${new Date(log.created_at).toLocaleString()}</span>
        <span class="log-type">${log.action_type}</span>
        <span class="log-status">${log.success ? '✅' : '❌'}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Błąd ładowania logów:', error);
  }
}

// ============ MODALS & AUTH ============

function showAddAccountModal() {
  document.getElementById('addAccountModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('addAccountModal').classList.add('hidden');
}

async function logout() {
  try {
    await api('POST', '/api/logout');
    window.location.href = '/login.html';
  } catch (e) {
    window.location.href = '/login.html';
  }
}

// ============ HARMONOGRAM ============

/**
 * Pokazuje zakładkę harmonogramu
 */
function showSchedulerTab(tabName) {
  // Usuń aktywną klasę ze wszystkich zakładek
  document.querySelectorAll('.scheduler-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Ukryj wszystkie panele
  document.querySelectorAll('.scheduler-tab-panel').forEach(panel => {
    panel.classList.add('hidden');
    panel.classList.remove('active');
  });
  
  // Aktywuj wybraną zakładkę
  event.target.classList.add('active');
  
  // Pokaż wybrany panel
  const panelId = 'schedulerTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('active');
  }
}

/**
 * Uruchamia harmonogram
 */
async function startScheduler() {
  if (!selectedAccountId) {
    showToast('Najpierw wybierz konto', 'error');
    return;
  }
  
  const farmInterval = parseInt(document.getElementById('farmInterval').value) || 0;
  const forestryInterval = parseInt(document.getElementById('forestryInterval').value) || 0;
  const stallsInterval = parseInt(document.getElementById('stallsInterval').value) || 0;
  const smartMode = document.getElementById('smartModeEnabled').checked;
  const cacheInterval = parseInt(document.getElementById('cacheInterval').value) || 60;
  
  if (farmInterval === 0 && forestryInterval === 0 && stallsInterval === 0 && !smartMode) {
    showToast('Ustaw interwał dla co najmniej jednego modułu lub włącz tryb inteligentny', 'error');
    return;
  }
  
  try {
    await api('POST', `/api/scheduler/accounts/${selectedAccountId}/activate`, {
      farmInterval,
      forestryInterval,
      stallsInterval,
      smartMode,
      cacheInterval
    });
    showToast('Harmonogram uruchomiony!', 'success');
    await refreshSchedulerStatus();
  } catch (error) {
    showToast(`Błąd: ${error.message}`, 'error');
  }
}

/**
 * Zatrzymuje harmonogram
 */
async function stopScheduler() {
  if (!selectedAccountId) {
    showToast('Najpierw wybierz konto', 'error');
    return;
  }
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/stop-automation`);
    showToast('Harmonogram zatrzymany', 'success');
    await refreshSchedulerStatus();
  } catch (error) {
    showToast(`Błąd: ${error.message}`, 'error');
  }
}

/**
 * Odświeża status harmonogramu
 */
async function refreshSchedulerStatus() {
  if (!selectedAccountId) return;
  
  try {
    // Pobierz status schedulera (aktywne konta w pamięci)
    const statusData = await api('GET', '/api/scheduler/status');
    
    // Pobierz konfigurację z bazy (zapisane interwały)
    const configData = await api('GET', `/api/scheduler/accounts/${selectedAccountId}/config`);
    const config = configData.config || {};
    
    // Znajdź status dla aktualnego konta
    const accountStatus = statusData.activeAccounts?.find(a => a.accountId === selectedAccountId);
    
    // Aktualizuj wskaźnik statusu
    const statusEl = document.getElementById('schedulerActiveStatus');
    const smartModeCheckbox = document.getElementById('smartModeEnabled');
    const cacheIntervalInput = document.getElementById('cacheInterval');
    
    if (accountStatus) {
      statusEl.innerHTML = '<span class="status-indicator active"></span><span>Aktywny</span>';
      
      // Wypełnij interwały z aktywnego schedulera
      if (accountStatus.intervals) {
        document.getElementById('farmInterval').value = accountStatus.intervals.farm || 0;
        document.getElementById('forestryInterval').value = accountStatus.intervals.forestry || 0;
        document.getElementById('stallsInterval').value = accountStatus.intervals.stalls || 0;
      }
      
      // Smart mode z aktywnego schedulera
      if (smartModeCheckbox) {
        smartModeCheckbox.checked = accountStatus.smartMode || false;
      }
      
      // Cache interval z aktywnego schedulera
      if (cacheIntervalInput && accountStatus.cacheInterval) {
        cacheIntervalInput.value = accountStatus.cacheInterval;
      }
      
      // Ostatnie uruchomienia
      if (accountStatus.lastRun) {
        document.getElementById('farmLastRun').textContent = 
          accountStatus.lastRun.farm ? new Date(accountStatus.lastRun.farm).toLocaleTimeString() : '-';
        document.getElementById('forestryLastRun').textContent = 
          accountStatus.lastRun.forestry ? new Date(accountStatus.lastRun.forestry).toLocaleTimeString() : '-';
        document.getElementById('stallsLastRun').textContent = 
          accountStatus.lastRun.stalls ? new Date(accountStatus.lastRun.stalls).toLocaleTimeString() : '-';
      }
    } else {
      statusEl.innerHTML = '<span class="status-indicator inactive"></span><span>Nieaktywny</span>';
      
      // Wypełnij interwały z bazy danych (zapisana konfiguracja)
      document.getElementById('farmInterval').value = config.scheduler_farm_interval || 0;
      document.getElementById('forestryInterval').value = config.scheduler_forestry_interval || 0;
      document.getElementById('stallsInterval').value = config.scheduler_stalls_interval || 0;
      
      // Smart mode z bazy
      if (smartModeCheckbox) {
        smartModeCheckbox.checked = config.scheduler_smart_mode === 1;
      }
      
      // Cache interval z bazy
      if (cacheIntervalInput) {
        cacheIntervalInput.value = config.scheduler_cache_interval || 60;
      }
      
      // Wyczyść ostatnie uruchomienia
      document.getElementById('farmLastRun').textContent = '-';
      document.getElementById('forestryLastRun').textContent = '-';
      document.getElementById('stallsLastRun').textContent = '-';
    }
    
    // Aktualizuj kolejkę
    document.getElementById('queueCount').textContent = statusData.queueLength || 0;
    
    // Aktualizuj aktualne zadanie
    const currentTaskEl = document.getElementById('currentTaskInfo');
    if (statusData.currentTask) {
      currentTaskEl.classList.remove('hidden');
      document.getElementById('currentTaskName').textContent = 
        statusData.currentTask.moduleType === 'farm' ? '🌾 Farma' :
        statusData.currentTask.moduleType === 'forestry' ? '🌲 Tartak' :
        statusData.currentTask.moduleType === 'stalls' ? '🏪 Stragany' : statusData.currentTask.moduleType;
    } else {
      currentTaskEl.classList.add('hidden');
    }
    
    // Aktualizuj statystyki wykonań
    if (accountStatus?.stats) {
      const stats = accountStatus.stats;
      document.getElementById('statFarm').textContent = 
        `✓${stats.farm?.success || 0} / ✗${stats.farm?.error || 0}`;
      document.getElementById('statForestry').textContent = 
        `✓${stats.forestry?.success || 0} / ✗${stats.forestry?.error || 0}`;
      document.getElementById('statStalls').textContent = 
        `✓${stats.stalls?.success || 0} / ✗${stats.stalls?.error || 0}`;
    } else {
      // Wyczyść statystyki gdy nieaktywny
      document.getElementById('statFarm').textContent = '✓0 / ✗0';
      document.getElementById('statForestry').textContent = '✓0 / ✗0';
      document.getElementById('statStalls').textContent = '✓0 / ✗0';
    }
    
  } catch (error) {
    console.error('Błąd pobierania statusu harmonogramu:', error);
  }
}

/**
 * Odświeża listę zaplanowanych zadań (dla kompatybilności)
 */
async function refreshTaskQueue() {
  await refreshSchedulerStatus();
}

/**
 * Formatuje typ zadania do wyświetlenia
 */
function formatTaskType(type) {
  const types = {
    'full_cycle': '🔄 Pełny cykl',
    'farm_harvest': '🌾 Zbiór farmy',
    'farm_plant': '🌱 Sadzenie farmy',
    'farm_water': '💧 Podlewanie farmy',
    'forestry_harvest': '🪓 Zbiór drzew',
    'forestry_plant': '🌲 Sadzenie drzew',
    'forestry_water': '💧 Podlewanie drzew',
    'forestry_production': '🏭 Produkcja tartaku',
    'stalls_restock': '🏪 Uzupełnianie straganów',
    'status_check': '🔍 Sprawdzanie statusu',
  };
  return types[type] || type;
}

/**
 * Formatuje tryb harmonogramu do wyświetlenia
 */
function formatScheduleMode(mode) {
  const modes = {
    'interval': '⏱️ Interwał',
    'smart_refresh': '🧠 Smart',
    'on_ready': '⚡ Gotowe',
    'daily': '📆 Dzienny',
    'window': '🕐 Okno',
    'chain': '🔗 Łańcuch',
    'conditional': '❓ Warunek',
  };
  return modes[mode] || mode;
}

/**
 * Formatuje priorytet do wyświetlenia
 */
function formatPriority(priority) {
  const priorities = {
    1: '🔴 Krytyczny',
    2: '🟠 Wysoki',
    3: '🟡 Normalny',
    4: '🟢 Niski',
    5: '⚪ Tło',
  };
  return priorities[priority] || `P${priority}`;
}

/**
 * Formatuje czas zadania do wyświetlenia
 */
function formatTaskTime(date) {
  const now = new Date();
  const diff = date - now;
  
  if (diff < 0) {
    return 'Teraz';
  }
  
  if (diff < 60000) {
    return `za ${Math.floor(diff / 1000)}s`;
  }
  
  if (diff < 3600000) {
    return `za ${Math.floor(diff / 60000)}min`;
  }
  
  if (diff < 86400000) {
    return `za ${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}min`;
  }
  
  return date.toLocaleString('pl-PL', { 
    day: '2-digit', 
    month: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * Ładuje globalny status schedulera
 */
async function loadSchedulerStatus() {
  try {
    const status = await api('GET', '/api/scheduler/status');
    const container = document.getElementById('schedulerStatus');
    const activeCount = status.activeAccounts?.length || 0;
    
    if (status.isRunning && activeCount > 0) {
      container.innerHTML = `
        <span class="status-indicator running"></span>
        <span class="status-text">Aktywny (${activeCount} kont)</span>
      `;
    } else if (status.isRunning) {
      container.innerHTML = `
        <span class="status-indicator running"></span>
        <span class="status-text">Gotowy</span>
      `;
    } else {
      container.innerHTML = `
        <span class="status-indicator stopped"></span>
        <span class="status-text">Zatrzymany</span>
      `;
    }
  } catch (error) {
    console.error('Błąd pobierania statusu schedulera:', error);
    const container = document.getElementById('schedulerStatus');
    container.innerHTML = `
      <span class="status-indicator stopped"></span>
      <span class="status-text">Błąd połączenia</span>
    `;
  }
}

// Odświeżaj status schedulera co 30 sekund
setInterval(loadSchedulerStatus, 30000);

// ============ USTAWIENIA APLIKACJI ============

/**
 * Ładuje ustawienia aplikacji
 */
async function loadAppSettings() {
  try {
    const data = await api('GET', '/api/settings');
    const headlessToggle = document.getElementById('headlessModeToggle');
    if (headlessToggle) {
      headlessToggle.checked = data.headlessMode;
    }
  } catch (error) {
    console.error('Błąd ładowania ustawień:', error);
  }
}

/**
 * Przełącza tryb headless
 */
async function toggleHeadlessMode() {
  const headlessToggle = document.getElementById('headlessModeToggle');
  const enabled = headlessToggle.checked;
  
  try {
    await api('POST', '/api/settings', { headlessMode: enabled });
    showToast(enabled ? 
      'Tryb headless włączony - przeglądarka będzie niewidoczna' : 
      'Tryb headless wyłączony - przeglądarka będzie widoczna', 
      'success'
    );
  } catch (error) {
    showToast('Błąd zapisu ustawień', 'error');
    headlessToggle.checked = !enabled; // Przywróć poprzednią wartość
  }
}

// ============ DISCORD ============

/**
 * Otwiera modal ustawień Discord
 */
async function openDiscordSettings() {
  const modal = document.getElementById('discordModal');
  modal.classList.remove('hidden');
  
  try {
    const data = await api('GET', '/api/discord/settings');
    
    // Wypełnij formularz
    document.getElementById('webhookUrl').value = data.webhookUrl || '';
    document.getElementById('discordEnabled').checked = data.settings?.enabled || false;
    document.getElementById('notifyLevelUp').checked = data.settings?.notifyLevelUp !== false;
    document.getElementById('notifyModuleComplete').checked = data.settings?.notifyModuleComplete || false;
    document.getElementById('notifyModuleError').checked = data.settings?.notifyModuleError !== false;
    document.getElementById('notifyHarvest').checked = data.settings?.notifyHarvest || false;
    document.getElementById('notifyMoney').checked = data.settings?.notifyMoney || false;
    document.getElementById('notifySchedulerStart').checked = data.settings?.notifySchedulerStart || false;
    document.getElementById('notifySchedulerStop').checked = data.settings?.notifySchedulerStop || false;
  } catch (error) {
    console.error('Błąd ładowania ustawień Discord:', error);
  }
}

/**
 * Zamyka modal ustawień Discord
 */
function closeDiscordModal() {
  document.getElementById('discordModal').classList.add('hidden');
}

/**
 * Zapisuje ustawienia Discord
 */
async function saveDiscordSettings(event) {
  event.preventDefault();
  
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const settings = {
    enabled: document.getElementById('discordEnabled').checked,
    notifyLevelUp: document.getElementById('notifyLevelUp').checked,
    notifyModuleComplete: document.getElementById('notifyModuleComplete').checked,
    notifyModuleError: document.getElementById('notifyModuleError').checked,
    notifyHarvest: document.getElementById('notifyHarvest').checked,
    notifyMoney: document.getElementById('notifyMoney').checked,
    notifySchedulerStart: document.getElementById('notifySchedulerStart').checked,
    notifySchedulerStop: document.getElementById('notifySchedulerStop').checked,
  };
  
  try {
    await api('POST', '/api/discord/settings', { webhookUrl, settings });
    showToast('Ustawienia Discord zapisane!', 'success');
    closeDiscordModal();
  } catch (error) {
    showToast('Błąd zapisu ustawień: ' + error.message, 'error');
  }
}

/**
 * Wysyła testowe powiadomienie Discord
 */
async function testDiscordWebhook() {
  // Najpierw zapisz aktualne ustawienia
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const enabled = document.getElementById('discordEnabled').checked;
  
  if (!webhookUrl) {
    showToast('Wprowadź URL webhooka Discord', 'error');
    return;
  }
  
  if (!enabled) {
    showToast('Włącz powiadomienia Discord aby wysłać test', 'error');
    return;
  }
  
  try {
    // Zapisz ustawienia przed testem
    await api('POST', '/api/discord/settings', { 
      webhookUrl, 
      settings: { enabled: true } 
    });
    
    // Wyślij test
    const result = await api('POST', '/api/discord/test');
    showToast(result.message || 'Test wysłany!', 'success');
  } catch (error) {
    showToast('Błąd testu: ' + error.message, 'error');
  }
}

// ============ DARK MODE ============

/**
 * Inicjalizuje dark mode na podstawie zapisanych preferencji
 */
function initDarkMode() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const toggle = document.getElementById('darkModeToggle');
  
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (toggle) toggle.checked = true;
  }
}

/**
 * Przełącza dark mode
 */
function toggleDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const isDark = toggle.checked;
  
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    showToast('Dark mode włączony 🌙', 'success');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    showToast('Light mode włączony ☀️', 'success');
  }
}

// Inicjalizuj dark mode od razu (przed DOMContentLoaded)
initDarkMode();

// Załaduj ustawienia przy starcie
document.addEventListener('DOMContentLoaded', loadAppSettings);
