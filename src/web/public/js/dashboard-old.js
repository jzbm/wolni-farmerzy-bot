/**
 * Dashboard JavaScript
 */

// Socket.io connection
const socket = io();

// State
let currentUser = null;
let accounts = [];
let selectedAccountId = null;
let automationStatus = {};

// ============ INIT ============

document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  await loadAccounts();
  await loadSchedulerStatus();
  setupEventListeners();
  
  // Odświeżaj status co 30 sekund
  setInterval(loadSchedulerStatus, 30000);
});

// ============ API HELPERS ============

async function api(method, url, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const res = await fetch(url, options);
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(json.error || 'Błąd API');
  }
  
  return json;
}

// ============ TOASTS ============

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ============ USER ============

async function loadUser() {
  try {
    const data = await api('GET', '/api/me');
    currentUser = data.user;
    document.getElementById('userName').textContent = currentUser.username;
  } catch (error) {
    window.location.href = '/';
  }
}

async function logout() {
  await api('POST', '/api/logout');
  window.location.href = '/';
}

// ============ ACCOUNTS ============

async function loadAccounts() {
  try {
    const data = await api('GET', '/api/accounts');
    accounts = data.accounts;
    renderAccountsList();
    updateQuickStats();
  } catch (error) {
    showToast('Błąd ładowania kont', 'error');
  }
}

function renderAccountsList() {
  const list = document.getElementById('accountsList');
  
  if (accounts.length === 0) {
    list.innerHTML = '<p class="no-data">Brak kont</p>';
    return;
  }
  
  list.innerHTML = accounts.map(acc => `
    <div class="account-item ${acc.id === selectedAccountId ? 'active' : ''}" 
         onclick="selectAccount(${acc.id})">
      <div class="email">${acc.email}</div>
      <div class="server">Serwer ${acc.server}</div>
      <span class="status-badge ${automationStatus[acc.id] ? 'active' : 'inactive'}">
        ${automationStatus[acc.id] ? 'Aktywne' : 'Nieaktywne'}
      </span>
    </div>
  `).join('');
}

function updateQuickStats() {
  document.getElementById('totalAccounts').textContent = accounts.length;
  document.getElementById('activeAutomations').textContent = 
    Object.values(automationStatus).filter(Boolean).length;
}

// ============ ACCOUNT SELECTION ============

async function selectAccount(accountId) {
  selectedAccountId = accountId;
  const account = accounts.find(a => a.id === accountId);
  
  if (!account) return;
  
  // Aktualizuj UI
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('accountDetails').classList.remove('hidden');
  document.getElementById('accountEmail').textContent = account.email;
  
  // Aktualizuj przycisk automatyzacji
  updateAutomationButton();
  
  // Załaduj dane
  await Promise.all([
    loadAccountStats(),
    loadFields(),
    loadSettings(),
    loadLogs()
  ]);
  
  // Subskrybuj aktualizacje websocket
  socket.emit('subscribe', accountId);
  
  // Odśwież listę kont
  renderAccountsList();
}

function updateAutomationButton() {
  const btn = document.getElementById('automationBtn');
  const isActive = automationStatus[selectedAccountId];
  
  btn.textContent = isActive ? 'Zatrzymaj automatyzację' : 'Uruchom automatyzację';
  btn.className = `btn ${isActive ? 'btn-danger' : 'btn-success'}`;
}

// ============ STATS ============

async function loadAccountStats() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/stats`);
    const stats = data.stats;
    
    document.getElementById('statTotalActions').textContent = stats.totalActions || 0;
    document.getElementById('statSuccessRate').textContent = `${stats.successRate || 0}%`;
    document.getElementById('statPendingTasks').textContent = stats.pendingTasks || 0;
    
    const account = accounts.find(a => a.id === selectedAccountId);
    document.getElementById('statLastLogin').textContent = 
      account?.last_login ? formatDate(account.last_login) : '-';
    
    // Nadchodzące zbiory
    renderUpcomingHarvests(stats.upcomingHarvests);
    
    // Akcje wg typu
    renderActionsByType(stats.actionsByType);
    
  } catch (error) {
    console.error('Błąd ładowania statystyk:', error);
  }
}

function renderUpcomingHarvests(harvests) {
  const container = document.getElementById('upcomingHarvests');
  
  if (!harvests || harvests.length === 0) {
    container.innerHTML = '<p class="no-data">Brak nadchodzących zbiorów</p>';
    return;
  }
  
  container.innerHTML = harvests.map(h => {
    const timeRemaining = getTimeRemaining(h.harvest_at);
    return `
      <div class="harvest-item">
        <div class="harvest-info">
          <span class="harvest-plant">${h.current_plant || 'Nieznane'}</span>
          <span class="harvest-field">Pole ${h.field_index + 1} (${h.field_type})</span>
        </div>
        <span class="harvest-time">${timeRemaining}</span>
      </div>
    `;
  }).join('');
}

function renderActionsByType(actions) {
  const container = document.getElementById('actionsByType');
  
  if (!actions || Object.keys(actions).length === 0) {
    container.innerHTML = '<p class="no-data">Brak danych</p>';
    return;
  }
  
  const labels = {
    'login': 'Logowania',
    'harvest': 'Zbiory',
    'plant': 'Sadzenie',
    'water': 'Podlewanie',
    'cut_tree': 'Ścinanie drzew',
    'plant_tree': 'Sadzenie drzew',
    'fill_stall': 'Uzupełnianie straganów',
    'full_cycle': 'Pełne cykle'
  };
  
  container.innerHTML = Object.entries(actions).map(([type, count]) => `
    <div class="action-stat">
      <span class="count">${count}</span>
      <span class="label">${labels[type] || type}</span>
    </div>
  `).join('');
}

// ============ FIELDS ============

async function loadFields(type = null) {
  if (!selectedAccountId) return;
  
  try {
    const farmData = await api('GET', `/api/accounts/${selectedAccountId}/fields?type=farm`);
    const sawmillData = await api('GET', `/api/accounts/${selectedAccountId}/fields?type=sawmill`);
    
    renderFields('farmFields', farmData.fields);
    renderFields('sawmillFields', sawmillData.fields);
  } catch (error) {
    console.error('Błąd ładowania pól:', error);
  }
}

function renderFields(containerId, fields) {
  const container = document.getElementById(containerId);
  
  if (!fields || fields.length === 0) {
    container.innerHTML = '<p class="no-data">Brak danych - uruchom cykl aby przeskanować</p>';
    return;
  }
  
  container.innerHTML = fields.map(f => {
    const timeRemaining = f.harvest_at ? getTimeRemaining(f.harvest_at) : null;
    return `
      <div class="field-card ${f.status}">
        <div class="field-index">Pole ${f.field_index + 1}</div>
        <div class="plant-name">${f.current_plant || 'Puste'}</div>
        ${timeRemaining ? `<div class="time-remaining">${timeRemaining}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ============ SETTINGS ============

async function loadSettings() {
  if (!selectedAccountId) return;
  
  const account = accounts.find(a => a.id === selectedAccountId);
  if (!account) return;
  
  // Ustawienia ogólne
  document.getElementById('checkInterval').value = account.check_interval_minutes || 5;
  
  // FARMA
  document.getElementById('farmEnabled').checked = account.farm_enabled;
  document.getElementById('farmAutoHarvest').checked = account.farm_auto_harvest;
  document.getElementById('farmAutoPlant').checked = account.farm_auto_plant;
  document.getElementById('farmAutoWater').checked = account.farm_auto_water;
  
  // Preferowane rośliny
  try {
    const plants = JSON.parse(account.farm_preferred_plants || '["pszenica"]');
    const select = document.getElementById('farmPreferredPlants');
    Array.from(select.options).forEach(opt => {
      opt.selected = plants.includes(opt.value);
    });
  } catch (e) {}
  
  // STRAGANY
  document.getElementById('stallsEnabled').checked = account.stalls_enabled;
  document.getElementById('stallsAutoRestock').checked = account.stalls_auto_restock;
  
  // TARTAK
  document.getElementById('forestryEnabled').checked = account.forestry_enabled;
  document.getElementById('forestryAutoHarvest').checked = account.forestry_auto_harvest;
  document.getElementById('forestryAutoPlant').checked = account.forestry_auto_plant;
  document.getElementById('forestryAutoWater').checked = account.forestry_auto_water;
  document.getElementById('forestryAutoProduction').checked = account.forestry_auto_production;
  document.getElementById('forestryPreferredTree').value = account.forestry_preferred_tree || 'swierk';
  
  // PIKNIK (todo)
  document.getElementById('picnicEnabled').checked = account.picnic_enabled;
}

async function saveSettings(e) {
  e.preventDefault();
  
  if (!selectedAccountId) return;
  
  const settings = {
    // Ustawienia ogólne
    check_interval_minutes: parseInt(document.getElementById('checkInterval').value),
    
    // FARMA
    farm_enabled: document.getElementById('farmEnabled').checked,
    farm_auto_harvest: document.getElementById('farmAutoHarvest').checked,
    farm_auto_plant: document.getElementById('farmAutoPlant').checked,
    farm_auto_water: document.getElementById('farmAutoWater').checked,
    farm_preferred_plants: Array.from(document.getElementById('farmPreferredPlants').selectedOptions)
      .map(opt => opt.value),
    
    // STRAGANY
    stalls_enabled: document.getElementById('stallsEnabled').checked,
    stalls_auto_restock: document.getElementById('stallsAutoRestock').checked,
    
    // TARTAK
    forestry_enabled: document.getElementById('forestryEnabled').checked,
    forestry_auto_harvest: document.getElementById('forestryAutoHarvest').checked,
    forestry_auto_plant: document.getElementById('forestryAutoPlant').checked,
    forestry_auto_water: document.getElementById('forestryAutoWater').checked,
    forestry_auto_production: document.getElementById('forestryAutoProduction').checked,
    forestry_preferred_tree: document.getElementById('forestryPreferredTree').value,
    
    // PIKNIK
    picnic_enabled: document.getElementById('picnicEnabled').checked,
  };
  
  console.log('Zapisuję ustawienia:', settings);
  
  try {
    await api('PUT', `/api/accounts/${selectedAccountId}/settings`, settings);
    showToast('Ustawienia zapisane', 'success');
    await loadAccounts();
  } catch (error) {
    console.error('Błąd zapisywania:', error);
    showToast('Błąd zapisywania ustawień: ' + error.message, 'error');
  }
}

// ============ LOGS ============

async function loadLogs() {
  if (!selectedAccountId) return;
  
  try {
    const data = await api('GET', `/api/accounts/${selectedAccountId}/logs?limit=50`);
    renderLogs(data.logs);
  } catch (error) {
    console.error('Błąd ładowania logów:', error);
  }
}

function renderLogs(logs) {
  const container = document.getElementById('logsList');
  
  if (!logs || logs.length === 0) {
    container.innerHTML = '<p class="no-data">Brak logów</p>';
    return;
  }
  
  container.innerHTML = logs.map(log => `
    <div class="log-item">
      <span class="log-time">${formatDate(log.created_at)}</span>
      <span class="log-type">${log.action_type}</span>
      <span class="log-details">${log.details || '-'}</span>
      <span class="log-status ${log.success ? 'success' : 'failed'}"></span>
    </div>
  `).join('');
}

// ============ SCHEDULER STATUS ============

async function loadSchedulerStatus() {
  try {
    const data = await api('GET', '/api/scheduler/status');
    
    // Aktualizuj status indicator
    const statusBox = document.getElementById('schedulerStatus');
    const indicator = statusBox.querySelector('.status-indicator');
    const text = statusBox.querySelector('.status-text');
    
    indicator.classList.toggle('running', data.isRunning);
    text.textContent = data.isRunning ? 'Działa' : 'Zatrzymany';
    
    // Aktualizuj status automatyzacji dla każdego konta
    automationStatus = {};
    data.activeJobs.forEach(job => {
      automationStatus[job.accountId] = true;
    });
    
    renderAccountsList();
    updateQuickStats();
    
    if (selectedAccountId) {
      updateAutomationButton();
    }
  } catch (error) {
    console.error('Błąd ładowania statusu schedulera:', error);
  }
}

// ============ ACTIONS ============

async function testLogin() {
  if (!selectedAccountId) return;
  
  showToast('Testuję logowanie...', 'info');
  
  try {
    const data = await api('POST', `/api/accounts/${selectedAccountId}/test-login`);
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ MODUŁY - OSOBNE AKCJE ============

function showModuleStatus(text, type = 'loading') {
  const statusDiv = document.getElementById('moduleStatus');
  const icon = statusDiv.querySelector('.status-icon');
  const textEl = statusDiv.querySelector('.status-text');
  
  statusDiv.classList.remove('hidden', 'success', 'error');
  
  if (type === 'loading') {
    icon.textContent = '⏳';
    statusDiv.className = 'module-status';
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
  document.querySelectorAll('.btn-module').forEach(btn => {
    btn.disabled = disabled;
  });
}

async function runFarm() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Wykonuję moduł farmy...');
  setModuleButtonsDisabled(true);
  
  try {
    const data = await api('POST', `/api/accounts/${selectedAccountId}/run-farm`);
    showModuleStatus('Farma - zakończono!', 'success');
    showToast('Farma zakończona pomyślnie', 'success');
    
    // Odśwież dane
    await Promise.all([loadAccountStats(), loadFields(), loadLogs()]);
    
    setTimeout(hideModuleStatus, 3000);
  } catch (error) {
    showModuleStatus(`Farma - błąd: ${error.message}`, 'error');
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
    const data = await api('POST', `/api/accounts/${selectedAccountId}/run-forestry`);
    showModuleStatus('Tartak - zakończono!', 'success');
    showToast('Tartak zakończony pomyślnie', 'success');
    
    await Promise.all([loadAccountStats(), loadLogs()]);
    
    setTimeout(hideModuleStatus, 3000);
  } catch (error) {
    showModuleStatus(`Tartak - błąd: ${error.message}`, 'error');
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
    const data = await api('POST', `/api/accounts/${selectedAccountId}/run-stalls`);
    showModuleStatus('Stragany - zakończono!', 'success');
    showToast('Stragany zakończone pomyślnie', 'success');
    
    await Promise.all([loadAccountStats(), loadLogs()]);
    
    setTimeout(hideModuleStatus, 3000);
  } catch (error) {
    showModuleStatus(`Stragany - błąd: ${error.message}`, 'error');
    showToast(error.message, 'error');
    setTimeout(hideModuleStatus, 5000);
  } finally {
    setModuleButtonsDisabled(false);
  }
}

async function runCycle() {
  if (!selectedAccountId) return;
  
  showModuleStatus('Wykonuję pełny cykl (wszystkie moduły)...');
  setModuleButtonsDisabled(true);
  
  try {
    const data = await api('POST', `/api/accounts/${selectedAccountId}/run-cycle`);
    showModuleStatus('Pełny cykl - zakończono!', 'success');
    showToast('Pełny cykl zakończony pomyślnie', 'success');
    
    // Odśwież dane
    await Promise.all([
      loadAccountStats(),
      loadFields(),
      loadLogs()
    ]);
    
    setTimeout(hideModuleStatus, 3000);
  } catch (error) {
    showModuleStatus(`Pełny cykl - błąd: ${error.message}`, 'error');
    showToast(error.message, 'error');
    setTimeout(hideModuleStatus, 5000);
  } finally {
    setModuleButtonsDisabled(false);
  }
}

async function toggleAutomation() {
  if (!selectedAccountId) return;
  
  const isActive = automationStatus[selectedAccountId];
  const endpoint = isActive ? 'stop-automation' : 'start-automation';
  
  showToast(isActive ? 'Zatrzymuję automatyzację...' : 'Uruchamiam automatyzację...', 'info');
  
  try {
    const data = await api('POST', `/api/accounts/${selectedAccountId}/${endpoint}`);
    showToast(data.message, 'success');
    
    await loadSchedulerStatus();
    
    if (!isActive) {
      // Odśwież dane po uruchomieniu
      setTimeout(async () => {
        await Promise.all([
          loadAccountStats(),
          loadFields(),
          loadLogs()
        ]);
      }, 3000);
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ MODAL ============

function showAddAccountModal() {
  document.getElementById('addAccountModal').classList.remove('hidden');
  document.getElementById('gameEmail').focus();
}

function closeModal() {
  document.getElementById('addAccountModal').classList.add('hidden');
  document.getElementById('addAccountForm').reset();
}

async function addAccount(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  try {
    await api('POST', '/api/accounts', {
      email: formData.get('email'),
      password: formData.get('password'),
      server: parseInt(formData.get('server'))
    });
    
    showToast('Konto dodane', 'success');
    closeModal();
    await loadAccounts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ TABS ============

function setupTabs() {
  document.querySelectorAll('.tabs-container .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Przełącz aktywną zakładkę
      document.querySelectorAll('.tabs-container .tab').forEach(t => 
        t.classList.toggle('active', t.dataset.tab === tabName)
      );
      
      // Przełącz zawartość
      document.querySelectorAll('.tab-content').forEach(content => 
        content.classList.toggle('hidden', content.id !== `tab-${tabName}`)
      );
      document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    });
  });
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
  setupTabs();
  
  document.getElementById('addAccountForm').addEventListener('submit', addAccount);
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  
  // Zamknij modal klikając poza nim
  document.getElementById('addAccountModal').addEventListener('click', (e) => {
    if (e.target.id === 'addAccountModal') {
      closeModal();
    }
  });
  
  // WebSocket updates
  socket.on('update', (data) => {
    console.log('WebSocket update:', data);
    
    switch (data.type) {
      case 'stats':
        loadAccountStats();
        break;
      case 'fields':
        loadFields();
        break;
      case 'logs':
        loadLogs();
        break;
    }
  });
}

// ============ HELPERS ============

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTimeRemaining(dateStr) {
  if (!dateStr) return null;
  
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target - now;
  
  if (diff <= 0) return 'Gotowe!';
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
