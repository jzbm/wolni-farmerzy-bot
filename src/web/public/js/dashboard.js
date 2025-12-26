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

// Lista roślin farmy
const FARM_CROPS = [
  { id: 'zboze', name: 'Zboże', time: '10 min' },
  { id: 'kukurydza', name: 'Kukurydza', time: '15 min' },
  { id: 'koniczyna', name: 'Koniczyna', time: '2h' },
  { id: 'rzepak', name: 'Rzepak', time: '4h' },
  { id: 'buraki', name: 'Buraki cukrowe', time: '10h' },
  { id: 'ziola', name: 'Zioła', time: '6h' },
  { id: 'sloneczniki', name: 'Słoneczniki', time: '12h' },
  { id: 'blawatki', name: 'Bławatki', time: '24h' },
  { id: 'marchewki', name: 'Marchewki', time: '35 min' },
  { id: 'ogorki', name: 'Ogórki', time: '1h 15min' },
  { id: 'rzodkiewki', name: 'Rzodkiewki', time: '20 min' },
  { id: 'truskawki', name: 'Truskawki', time: '45 min' },
  { id: 'pomidory', name: 'Pomidory', time: '2h' },
  { id: 'cebule', name: 'Cebule', time: '3h' },
  { id: 'szpinak', name: 'Szpinak', time: '1h 30min' },
  { id: 'kalafiory', name: 'Kalafiory', time: '6h' },
  { id: 'ziemniaki', name: 'Ziemniaki', time: '4h' },
  { id: 'szparagi', name: 'Szparagi', time: '8h' },
  { id: 'cukinie', name: 'Cukinie', time: '5h' },
  { id: 'jagody', name: 'Jagody', time: '4h' },
  { id: 'maliny', name: 'Maliny', time: '3h' },
  { id: 'jablka', name: 'Jabłka', time: '12h' },
  { id: 'dynie', name: 'Dynie', time: '24h' },
];

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
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Błąd odczytu cache:', e);
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
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ INICJALIZACJA ============

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadAccounts();
  initProductSelects();
  initForestrySelects();
  initFarmSelects();
  initEventListeners();
  loadSchedulerStatus();
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
  const selects = ['stall1_slot1', 'stall1_slot2', 'stall2_slot1'];
  
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
  }
}

async function loadStallsConfig() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/stalls-config`);
    currentStallsConfig = data.config;
    
    if (currentStallsConfig) {
      // Ustaw wartości w selectach
      if (currentStallsConfig.stall1?.slot1) {
        const val = JSON.stringify({ id: currentStallsConfig.stall1.slot1.productId, name: currentStallsConfig.stall1.slot1.productName });
        setSelectValue('stall1_slot1', val);
      }
      if (currentStallsConfig.stall1?.slot2) {
        const val = JSON.stringify({ id: currentStallsConfig.stall1.slot2.productId, name: currentStallsConfig.stall1.slot2.productName });
        setSelectValue('stall1_slot2', val);
      }
      if (currentStallsConfig.stall2?.slot1) {
        const val = JSON.stringify({ id: currentStallsConfig.stall2.slot1.productId, name: currentStallsConfig.stall2.slot1.productName });
        setSelectValue('stall2_slot1', val);
      }
    }
  } catch (error) {
    console.error('Błąd ładowania konfiguracji straganów:', error);
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
  if (s1s1) {
    const p = JSON.parse(s1s1);
    config.stall1.slot1 = { productId: p.id, productName: p.name, enabled: true };
  }
  
  // Slot 2 straganu 1
  const s1s2 = document.getElementById('stall1_slot2').value;
  if (s1s2) {
    const p = JSON.parse(s1s2);
    config.stall1.slot2 = { productId: p.id, productName: p.name, enabled: true };
  }
  
  // Slot 1 straganu 2
  const s2s1 = document.getElementById('stall2_slot1').value;
  if (s2s1) {
    const p = JSON.parse(s2s1);
    config.stall2.slot1 = { productId: p.id, productName: p.name, enabled: true };
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
    
    // Ustaw produkty budynków
    if (currentForestryConfig) {
      if (currentForestryConfig.building1?.slot1?.productId) {
        document.getElementById('building1_slot1').value = currentForestryConfig.building1.slot1.productId;
      }
      if (currentForestryConfig.building1?.slot2?.productId) {
        document.getElementById('building1_slot2').value = currentForestryConfig.building1.slot2.productId;
      }
      if (currentForestryConfig.building2?.slot1?.productId) {
        document.getElementById('building2_slot1').value = currentForestryConfig.building2.slot1.productId;
      }
      if (currentForestryConfig.building2?.slot2?.productId) {
        document.getElementById('building2_slot2').value = currentForestryConfig.building2.slot2.productId;
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

function initFarmSelects() {
  const farmSelects = ['farm1_crop', 'farm2_crop', 'farm3_crop', 'farm4_crop'];
  
  farmSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    FARM_CROPS.forEach(crop => {
      const option = document.createElement('option');
      option.value = crop.id;
      option.textContent = `${crop.name} (${crop.time})`;
      select.appendChild(option);
    });
  });
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
      
      if (farm1Select && currentFarmConfig.farm1) {
        farm1Select.value = currentFarmConfig.farm1;
        console.log('Ustawiono farm1:', currentFarmConfig.farm1, '-> wartość:', farm1Select.value);
      }
      if (farm2Select && currentFarmConfig.farm2) {
        farm2Select.value = currentFarmConfig.farm2;
        console.log('Ustawiono farm2:', currentFarmConfig.farm2, '-> wartość:', farm2Select.value);
      }
      if (farm3Select && currentFarmConfig.farm3) {
        farm3Select.value = currentFarmConfig.farm3;
        console.log('Ustawiono farm3:', currentFarmConfig.farm3, '-> wartość:', farm3Select.value);
      }
      if (farm4Select && currentFarmConfig.farm4) {
        farm4Select.value = currentFarmConfig.farm4;
        console.log('Ustawiono farm4:', currentFarmConfig.farm4, '-> wartość:', farm4Select.value);
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
  
  const farm1El = document.getElementById('farm1_crop');
  const farm2El = document.getElementById('farm2_crop');
  const farm3El = document.getElementById('farm3_crop');
  const farm4El = document.getElementById('farm4_crop');
  
  console.log('Farm selects:', { farm1El, farm2El, farm3El, farm4El });
  
  const config = {
    farm1: farm1El?.value || 'zboze',
    farm2: farm2El?.value || 'zboze',
    farm3: farm3El?.value || 'zboze',
    farm4: farm4El?.value || 'zboze',
  };
  
  console.log('Config to save:', config);
  
  try {
    const result = await api('POST', `/api/accounts/${selectedAccountId}/farm-config`, { config });
    console.log('Save result:', result);
    showToast('Konfiguracja farmy zapisana!', 'success');
    currentFarmConfig = config;
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
    
    // Załaduj status gry (z cache lub świeży)
    await refreshGameStatus();
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ STATUS GRY ============

// Pobiera status z cache (localStorage) lub z serwera jeśli cache jest nieaktualny
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
  
  showModuleStatus('Pobieranie statusu z gry...');
  
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
    
    showModuleStatus('Status pobrany!', 'success');
    setTimeout(hideModuleStatus, 2000);
    
  } catch (error) {
    // Przy błędzie spróbuj użyć cache nawet jeśli stary
    const cached = getStatusCache(selectedAccountId);
    if (cached) {
      const adjustedData = adjustTimersFromCache(cached.data, cached.fetchedAt);
      displayGameStatus(adjustedData);
      const cacheAge = Math.round((now - cached.fetchedAt) / 60000);
      document.getElementById('statusFetchTime').textContent = 
        `(stary cache, ${cacheAge} min temu)`;
      startLiveTimers();
    }
    showModuleStatus(`Błąd: ${error.message}`, 'error');
    setTimeout(hideModuleStatus, 5000);
  }
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
  displayStallsStatus(data.stallsStatus);
  displayFieldsStatus(data.fieldsStatus);
  displayForestryStatus(data.forestryStatus);
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
  
  // Sortuj - gotowe na górze, potem po czasie
  const sortedFields = [...fields].sort((a, b) => {
    if (a.status === 'ready' && b.status !== 'ready') return -1;
    if (a.status !== 'ready' && b.status === 'ready') return 1;
    return 0;
  });
  
  container.innerHTML = sortedFields.map(field => {
    const isReady = field.status === 'ready';
    const statusClass = isReady ? 'ready' : 'growing';
    
    return `
      <div class="field-status-item ${statusClass}">
        <span class="field-location">🌾 Farma ${field.farm} / Pole ${field.field}</span>
        <span class="field-plant">${field.plantType || 'Nieznana'}</span>
        <span class="field-time ${isReady ? 'ready' : ''}">${field.timeLeft || '?'}</span>
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
  
  if (farmInterval === 0 && forestryInterval === 0 && stallsInterval === 0 && !smartMode) {
    showToast('Ustaw interwał dla co najmniej jednego modułu lub włącz tryb inteligentny', 'error');
    return;
  }
  
  try {
    await api('POST', `/api/scheduler/accounts/${selectedAccountId}/activate`, {
      farmInterval,
      forestryInterval,
      stallsInterval,
      smartMode
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
    
    if (status.isRunning) {
      container.innerHTML = `
        <span class="status-indicator running"></span>
        <span class="status-text">Aktywny (${status.accounts.length} kont)</span>
      `;
    } else {
      container.innerHTML = `
        <span class="status-indicator stopped"></span>
        <span class="status-text">Zatrzymany</span>
      `;
    }
  } catch (error) {
    console.error('Błąd pobierania statusu schedulera:', error);
  }
}

// Odświeżaj status schedulera co 30 sekund
setInterval(loadSchedulerStatus, 30000);
