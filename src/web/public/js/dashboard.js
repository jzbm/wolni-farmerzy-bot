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
  
  // Formularz ustawień
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
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
    
    if (currentFarmConfig) {
      if (currentFarmConfig.farm1) {
        document.getElementById('farm1_crop').value = currentFarmConfig.farm1;
      }
      if (currentFarmConfig.farm2) {
        document.getElementById('farm2_crop').value = currentFarmConfig.farm2;
      }
      if (currentFarmConfig.farm3) {
        document.getElementById('farm3_crop').value = currentFarmConfig.farm3;
      }
      if (currentFarmConfig.farm4) {
        document.getElementById('farm4_crop').value = currentFarmConfig.farm4;
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
  } catch (error) {
    showToast('Błąd ładowania kont', 'error');
  }
}

async function selectAccount(accountId) {
  selectedAccountId = accountId;
  
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
    
    // Ustawienia
    document.getElementById('farmEnabled').checked = account.farm_enabled;
    document.getElementById('farmAutoHarvest').checked = account.farm_auto_harvest;
    document.getElementById('farmAutoPlant').checked = account.farm_auto_plant;
    document.getElementById('farmAutoWater').checked = account.farm_auto_water;
    document.getElementById('stallsEnabled').checked = account.stalls_enabled;
    document.getElementById('stallsAutoRestock').checked = account.stalls_auto_restock;
    document.getElementById('forestryEnabled').checked = account.forestry_enabled;
    document.getElementById('forestryAutoHarvest').checked = account.forestry_auto_harvest;
    document.getElementById('forestryAutoPlant').checked = account.forestry_auto_plant;
    document.getElementById('forestryAutoProduction').checked = account.forestry_auto_production;
    
    // Załaduj konfigurację straganów
    await loadStallsConfig();
    
    // Załaduj konfigurację tartaku
    await loadForestryConfig();
    
    // Załaduj konfigurację farmy
    await loadFarmConfig();
    
    // Załaduj logi
    await loadLogs();
    
    // Załaduj kolejkę zadań harmonogramu
    await refreshTaskQueue();
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ STATUS GRY ============

async function refreshGameStatus() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Pobieranie statusu z gry...');
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/game-status`);
    
    // Aktualizuj czas pobrania
    document.getElementById('statusFetchTime').textContent = 
      `(${new Date(data.fetchedAt).toLocaleTimeString()})`;
    
    // Wyświetl status straganów
    displayStallsStatus(data.stallsStatus);
    
    // Wyświetl status pól (live z gry)
    displayFieldsStatus(data.fieldsStatus);
    
    // Wyświetl status tartaku
    displayForestryStatus(data.forestryStatus);
    
    showModuleStatus('Status pobrany!', 'success');
    setTimeout(hideModuleStatus, 2000);
    
  } catch (error) {
    showModuleStatus(`Błąd: ${error.message}`, 'error');
    setTimeout(hideModuleStatus, 5000);
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
    const statusClass = b1.status === 'ready' ? 'ready' : (b1.status === 'working' ? 'working' : 'empty');
    const icon = b1.status === 'ready' ? '✅' : (b1.status === 'working' ? '⚙️' : '⬜');
    items.push(`
      <div class="forestry-status-item ${statusClass}">
        <span class="forestry-icon">${icon}</span>
        <span class="forestry-name">🏭 ${b1.name}</span>
        <span class="forestry-time">${b1.timeLeft}</span>
      </div>
    `);
  }
  
  // Budynek 2 - Stolarnia
  if (forestryStatus.building2) {
    const b2 = forestryStatus.building2;
    const statusClass = b2.status === 'ready' ? 'ready' : (b2.status === 'working' ? 'working' : 'empty');
    const icon = b2.status === 'ready' ? '✅' : (b2.status === 'working' ? '⚙️' : '⬜');
    items.push(`
      <div class="forestry-status-item ${statusClass}">
        <span class="forestry-icon">${icon}</span>
        <span class="forestry-name">🪚 ${b2.name}</span>
        <span class="forestry-time">${b2.timeLeft}</span>
      </div>
    `);
  }
  
  // Pierwsze drzewo
  if (forestryStatus.firstTree) {
    const tree = forestryStatus.firstTree;
    const statusClass = tree.status === 'ready' ? 'ready' : (tree.status === 'growing' ? 'growing' : 'empty');
    const icon = tree.status === 'ready' ? '✅' : (tree.status === 'growing' ? '🌲' : '⬜');
    items.push(`
      <div class="forestry-status-item ${statusClass}">
        <span class="forestry-icon">${icon}</span>
        <span class="forestry-name">🌲 ${tree.name}</span>
        <span class="forestry-time">${tree.timeLeft}</span>
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

async function runCycle() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Wykonuję pełny cykl...');
  setModuleButtonsDisabled(true);
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/run-cycle`);
    showModuleStatus('Pełny cykl - zakończono!', 'success');
    showToast('Pełny cykl zakończony', 'success');
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

// ============ USTAWIENIA ============

async function saveSettings() {
  if (!selectedAccountId) return;
  
  const settings = {
    farm_enabled: document.getElementById('farmEnabled').checked,
    farm_auto_harvest: document.getElementById('farmAutoHarvest').checked,
    farm_auto_plant: document.getElementById('farmAutoPlant').checked,
    farm_auto_water: document.getElementById('farmAutoWater').checked,
    stalls_enabled: document.getElementById('stallsEnabled').checked,
    stalls_auto_restock: document.getElementById('stallsAutoRestock').checked,
    forestry_enabled: document.getElementById('forestryEnabled').checked,
    forestry_auto_harvest: document.getElementById('forestryAutoHarvest').checked,
    forestry_auto_plant: document.getElementById('forestryAutoPlant').checked,
    forestry_auto_production: document.getElementById('forestryAutoProduction').checked,
  };
  
  try {
    await api('PUT', `/api/accounts/${selectedAccountId}/settings`, settings);
    showToast('Ustawienia zapisane!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
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

async function testLogin() {
  if (!selectedAccountId) return;
  
  showToast('Testowanie logowania...', 'info');
  
  try {
    await api('POST', `/api/accounts/${selectedAccountId}/test-login`);
    showToast('Logowanie udane!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
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
 * Aktualizuje widoczność opcji harmonogramu w zależności od wybranego trybu
 */
function updateSchedulerOptions() {
  const mode = document.getElementById('schedulerMode').value;
  
  // Ukryj wszystkie opcje
  document.getElementById('intervalOptions').classList.add('hidden');
  document.getElementById('smartRefreshOptions').classList.add('hidden');
  document.getElementById('windowOptions').classList.add('hidden');
  document.getElementById('dailyOptions').classList.add('hidden');
  
  // Pokaż odpowiednie opcje
  switch (mode) {
    case 'interval':
      document.getElementById('intervalOptions').classList.remove('hidden');
      break;
    case 'smart_refresh':
      document.getElementById('smartRefreshOptions').classList.remove('hidden');
      break;
    case 'window':
      document.getElementById('windowOptions').classList.remove('hidden');
      break;
    case 'daily':
      document.getElementById('dailyOptions').classList.remove('hidden');
      break;
  }
}

/**
 * Zapisuje konfigurację harmonogramu
 */
async function saveSchedulerConfig() {
  if (!selectedAccountId) {
    showToast('Najpierw wybierz konto', 'error');
    return;
  }
  
  const mode = document.getElementById('schedulerMode').value;
  
  let config = { mode };
  
  switch (mode) {
    case 'interval':
      config.intervalMinutes = parseInt(document.getElementById('schedulerInterval').value) || 30;
      break;
      
    case 'smart_refresh':
      config.refreshMargin = parseInt(document.getElementById('refreshMargin').value) || 1;
      break;
      
    case 'window':
      config.windowStart = document.getElementById('windowStart').value || '08:00';
      config.windowEnd = document.getElementById('windowEnd').value || '22:00';
      config.intervalMinutes = parseInt(document.getElementById('windowInterval').value) || 30;
      break;
      
    case 'daily':
      const dailyTime = document.getElementById('dailyTime').value || '08:00';
      const [hour, minute] = dailyTime.split(':').map(Number);
      config.hour = hour;
      config.minute = minute;
      break;
  }
  
  try {
    await api('POST', `/api/scheduler/accounts/${selectedAccountId}/activate`, config);
    showToast('Harmonogram zapisany i aktywowany!', 'success');
    await refreshTaskQueue();
  } catch (error) {
    showToast(`Błąd: ${error.message}`, 'error');
  }
}

/**
 * Odświeża listę zaplanowanych zadań
 */
async function refreshTaskQueue() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/scheduler/accounts/${selectedAccountId}/queue`);
    const container = document.getElementById('taskQueueStatus');
    
    if (!data.queue || data.queue.length === 0) {
      container.innerHTML = '<p class="no-data">Brak zaplanowanych zadań</p>';
      return;
    }
    
    container.innerHTML = data.queue.map(task => {
      const executeAt = new Date(task.executeAt);
      const isNow = executeAt <= new Date();
      const statusIcon = task.status === 'running' ? '🔄' : 
                         task.status === 'completed' ? '✅' : 
                         task.status === 'failed' ? '❌' : 
                         isNow ? '⏰' : '📅';
      
      return `
        <div class="task-queue-item ${task.status}">
          <span class="task-icon">${statusIcon}</span>
          <span class="task-type">${formatTaskType(task.type)}</span>
          <span class="task-mode">${formatScheduleMode(task.mode)}</span>
          <span class="task-time">${formatTaskTime(executeAt)}</span>
          <span class="task-priority">${formatPriority(task.priority)}</span>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Błąd pobierania kolejki:', error);
    document.getElementById('taskQueueStatus').innerHTML = 
      '<p class="no-data">Błąd pobierania kolejki</p>';
  }
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
