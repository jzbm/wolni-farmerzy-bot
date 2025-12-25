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

let selectedAccountId = null;
let currentStallsConfig = null;

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
  initEventListeners();
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
    
    // Załaduj logi
    await loadLogs();
    
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
    
    // Wyświetl status pól
    displayFieldsStatus(data.fields);
    
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
    container.innerHTML = '<p class="no-data">Brak danych o polach</p>';
    return;
  }
  
  // Sortuj po czasie zbioru
  const sortedFields = fields
    .filter(f => f.harvest_at && f.status === 'growing')
    .sort((a, b) => new Date(a.harvest_at) - new Date(b.harvest_at))
    .slice(0, 10);
  
  if (sortedFields.length === 0) {
    container.innerHTML = '<p class="no-data">Brak upraw do zbioru</p>';
    return;
  }
  
  container.innerHTML = sortedFields.map(field => {
    const harvestTime = new Date(field.harvest_at);
    const now = new Date();
    const diff = harvestTime - now;
    const isReady = diff <= 0;
    
    let timeStr;
    if (isReady) {
      timeStr = '✅ Gotowe!';
    } else {
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      timeStr = `⏱️ ${hours}h ${minutes}m`;
    }
    
    return `
      <div class="field-status-item ${isReady ? 'ready' : ''}">
        <span class="field-name">${field.current_plant || 'Nieznana roślina'}</span>
        <span class="field-type">${field.field_type === 'farm' ? '🌾' : '🌲'} ${field.field_index}</span>
        <span class="field-time">${timeStr}</span>
      </div>
    `;
  }).join('');
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
