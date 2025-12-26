/**
 * Baza danych SQLite
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import logger from './logger.js';

// Upewnij się że folder data istnieje
if (!existsSync(config.dataDir)) {
  mkdirSync(config.dataDir, { recursive: true });
}

const dbPath = join(config.dataDir, 'bot.db');
const db = new Database(dbPath);

// Włącz foreign keys
db.pragma('foreign_keys = ON');

// Inicjalizacja tabel
export function initDatabase() {
  logger.info('Inicjalizacja bazy danych...');
  
  // Tabela użytkowników aplikacji (do panelu webowego)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabela kont gry
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_user_id INTEGER,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      server INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )
  `);
  
  // Tabela pól uprawnych
  db.exec(`
    CREATE TABLE IF NOT EXISTS fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      field_index INTEGER NOT NULL,
      field_type TEXT DEFAULT 'farm',
      current_plant TEXT,
      planted_at DATETIME,
      harvest_at DATETIME,
      status TEXT DEFAULT 'empty',
      FOREIGN KEY (account_id) REFERENCES game_accounts(id) ON DELETE CASCADE,
      UNIQUE(account_id, field_index, field_type)
    )
  `);
  
  // Tabela zaplanowanych zadań
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      target_id INTEGER,
      scheduled_at DATETIME NOT NULL,
      executed_at DATETIME,
      status TEXT DEFAULT 'pending',
      data TEXT,
      FOREIGN KEY (account_id) REFERENCES game_accounts(id) ON DELETE CASCADE
    )
  `);
  
  // Tabela logów akcji
  db.exec(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      details TEXT,
      success BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES game_accounts(id) ON DELETE CASCADE
    )
  `);
  
  // Tabela ustawień automatyzacji per konto - podzielona na moduły
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER UNIQUE NOT NULL,
      
      -- Ustawienia ogólne
      check_interval_minutes INTEGER DEFAULT 5,
      
      -- FARMA
      farm_enabled BOOLEAN DEFAULT 1,
      farm_auto_harvest BOOLEAN DEFAULT 1,
      farm_auto_plant BOOLEAN DEFAULT 1,
      farm_auto_water BOOLEAN DEFAULT 0,
      farm_preferred_plants TEXT DEFAULT '["pszenica"]',
      farm_config TEXT DEFAULT '{"farm1":"zboze","farm2":"zboze","farm3":"zboze","farm4":"zboze"}',
      
      -- STRAGANY
      stalls_enabled BOOLEAN DEFAULT 1,
      stalls_auto_restock BOOLEAN DEFAULT 1,
      stalls_slot_config TEXT DEFAULT '{"stall1":{"slot1":{"productId":1,"productName":"Zboże","enabled":true},"slot2":{"productId":2,"productName":"Kukurydza","enabled":true}},"stall2":{"slot1":{"productId":3,"productName":"Koniczyna","enabled":true}}}',
      
      -- TARTAK
      forestry_enabled BOOLEAN DEFAULT 1,
      forestry_auto_harvest BOOLEAN DEFAULT 1,
      forestry_auto_plant BOOLEAN DEFAULT 1,
      forestry_auto_water BOOLEAN DEFAULT 0,
      forestry_preferred_tree TEXT DEFAULT 'swierk',
      forestry_auto_production BOOLEAN DEFAULT 1,
      forestry_building_config TEXT DEFAULT '{"building1":{"slot1":{"productId":null},"slot2":{"productId":null}},"building2":{"slot1":{"productId":null},"slot2":{"productId":null}}}',
      
      -- PIKNIK (todo)
      picnic_enabled BOOLEAN DEFAULT 0,
      
      FOREIGN KEY (account_id) REFERENCES game_accounts(id) ON DELETE CASCADE
    )
  `);
  
  // Tabela cache czasów roślin
  db.exec(`
    CREATE TABLE IF NOT EXISTS plant_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_name TEXT UNIQUE NOT NULL,
      growth_time_seconds INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Indeksy dla wydajności
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_time ON scheduled_tasks(scheduled_at, status);
    CREATE INDEX IF NOT EXISTS idx_fields_harvest ON fields(harvest_at, status);
    CREATE INDEX IF NOT EXISTS idx_action_logs_account ON action_logs(account_id, created_at);
  `);
  
  // Migracja: dodaj kolumnę stalls_slot_config jeśli nie istnieje
  try {
    db.exec(`ALTER TABLE automation_settings ADD COLUMN stalls_slot_config TEXT DEFAULT '{"stall1":{"slot1":{"productId":1,"productName":"Zboże","enabled":true},"slot2":{"productId":2,"productName":"Kukurydza","enabled":true}},"stall2":{"slot1":{"productId":3,"productName":"Koniczyna","enabled":true}}}'`);
    logger.info('Dodano kolumnę stalls_slot_config');
  } catch (e) {
    // Kolumna już istnieje - ignoruj
  }
  
  // Migracja: dodaj kolumnę forestry_building_config jeśli nie istnieje
  try {
    db.exec(`ALTER TABLE automation_settings ADD COLUMN forestry_building_config TEXT DEFAULT '{"building1":{"slot1":{"productId":null},"slot2":{"productId":null}},"building2":{"slot1":{"productId":null},"slot2":{"productId":null}}}'`);
    logger.info('Dodano kolumnę forestry_building_config');
  } catch (e) {
    // Kolumna już istnieje - ignoruj
  }
  
  // Migracja: dodaj kolumnę farm_config jeśli nie istnieje
  try {
    db.exec(`ALTER TABLE automation_settings ADD COLUMN farm_config TEXT DEFAULT '{"farm1":"zboze","farm2":"zboze","farm3":"zboze","farm4":"zboze"}'`);
    logger.info('Dodano kolumnę farm_config');
  } catch (e) {
    // Kolumna już istnieje - ignoruj
  }
  
  logger.info('Baza danych zainicjalizowana');
}

// ============ UŻYTKOWNICY APLIKACJI ============

export function createAppUser(username, password) {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO app_users (username, password_hash) VALUES (?, ?)');
  return stmt.run(username, hash);
}

export function verifyAppUser(username, password) {
  const stmt = db.prepare('SELECT * FROM app_users WHERE username = ?');
  const user = stmt.get(username);
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    return user;
  }
  return null;
}

export function getAppUser(id) {
  const stmt = db.prepare('SELECT id, username, created_at FROM app_users WHERE id = ?');
  return stmt.get(id);
}

// ============ KONTA GRY ============

export function addGameAccount(appUserId, email, password, server = 1) {
  const stmt = db.prepare(`
    INSERT INTO game_accounts (app_user_id, email, password, server) 
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(appUserId, email, password, server);
  
  // Utwórz domyślne ustawienia automatyzacji
  const settingsStmt = db.prepare(`
    INSERT INTO automation_settings (account_id) VALUES (?)
  `);
  settingsStmt.run(result.lastInsertRowid);
  
  return result.lastInsertRowid;
}

export function getGameAccounts(appUserId) {
  const stmt = db.prepare(`
    SELECT ga.*, as2.*
    FROM game_accounts ga
    LEFT JOIN automation_settings as2 ON ga.id = as2.account_id
    WHERE ga.app_user_id = ?
  `);
  return stmt.all(appUserId);
}

export function getGameAccount(accountId) {
  const stmt = db.prepare(`
    SELECT ga.*, as2.*
    FROM game_accounts ga
    LEFT JOIN automation_settings as2 ON ga.id = as2.account_id
    WHERE ga.id = ?
  `);
  return stmt.get(accountId);
}

export function updateGameAccount(accountId, data) {
  const allowedFields = ['email', 'password', 'server', 'is_active'];
  const updates = [];
  const values = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (updates.length === 0) return false;
  
  values.push(accountId);
  const stmt = db.prepare(`UPDATE game_accounts SET ${updates.join(', ')} WHERE id = ?`);
  return stmt.run(...values);
}

export function deleteGameAccount(accountId) {
  const stmt = db.prepare('DELETE FROM game_accounts WHERE id = ?');
  return stmt.run(accountId);
}

export function updateLastLogin(accountId) {
  const stmt = db.prepare('UPDATE game_accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
  return stmt.run(accountId);
}

// ============ USTAWIENIA AUTOMATYZACJI ============

export function updateAutomationSettings(accountId, settings) {
  const allowedFields = [
    // Ogólne
    'check_interval_minutes',
    // Farma
    'farm_enabled', 'farm_auto_harvest', 'farm_auto_plant', 'farm_auto_water', 'farm_preferred_plants',
    // Stragany
    'stalls_enabled', 'stalls_auto_restock',
    // Tartak
    'forestry_enabled', 'forestry_auto_harvest', 'forestry_auto_plant', 'forestry_auto_water',
    'forestry_preferred_tree', 'forestry_auto_production',
    // Piknik
    'picnic_enabled',
  ];
  const updates = [];
  const values = [];
  
  for (const [key, value] of Object.entries(settings)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      // Konwertuj boolean/object odpowiednio
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else if (typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }
  
  if (updates.length === 0) {
    console.log('Brak pól do aktualizacji, otrzymano:', Object.keys(settings));
    return false;
  }
  
  values.push(accountId);
  const sql = `UPDATE automation_settings SET ${updates.join(', ')} WHERE account_id = ?`;
  console.log('SQL:', sql, 'Values:', values);
  const stmt = db.prepare(sql);
  return stmt.run(...values);
}

// ============ POLA UPRAWNE ============

export function updateField(accountId, fieldIndex, fieldType, data) {
  const stmt = db.prepare(`
    INSERT INTO fields (account_id, field_index, field_type, current_plant, planted_at, harvest_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, field_index, field_type) DO UPDATE SET
      current_plant = excluded.current_plant,
      planted_at = excluded.planted_at,
      harvest_at = excluded.harvest_at,
      status = excluded.status
  `);
  return stmt.run(
    accountId, 
    fieldIndex, 
    fieldType,
    data.plant || null,
    data.plantedAt || null,
    data.harvestAt || null,
    data.status || 'empty'
  );
}

export function getFields(accountId, fieldType = null) {
  let query = 'SELECT * FROM fields WHERE account_id = ?';
  const params = [accountId];
  
  if (fieldType) {
    query += ' AND field_type = ?';
    params.push(fieldType);
  }
  
  query += ' ORDER BY field_index';
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

export function getFieldsReadyToHarvest(accountId) {
  const stmt = db.prepare(`
    SELECT * FROM fields 
    WHERE account_id = ? 
    AND status = 'growing' 
    AND harvest_at <= datetime('now')
  `);
  return stmt.all(accountId);
}

// ============ ZAPLANOWANE ZADANIA ============

export function scheduleTask(accountId, taskType, scheduledAt, targetId = null, data = null) {
  const stmt = db.prepare(`
    INSERT INTO scheduled_tasks (account_id, task_type, target_id, scheduled_at, data)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(accountId, taskType, targetId, scheduledAt, data ? JSON.stringify(data) : null);
}

export function getPendingTasks(beforeTime = null) {
  let query = `
    SELECT st.*, ga.email, ga.password, ga.server 
    FROM scheduled_tasks st
    JOIN game_accounts ga ON st.account_id = ga.id
    WHERE st.status = 'pending'
  `;
  const params = [];
  
  if (beforeTime) {
    query += ' AND st.scheduled_at <= ?';
    params.push(beforeTime);
  }
  
  query += ' ORDER BY st.scheduled_at ASC';
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

export function markTaskExecuted(taskId, success = true) {
  const stmt = db.prepare(`
    UPDATE scheduled_tasks 
    SET status = ?, executed_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  return stmt.run(success ? 'completed' : 'failed', taskId);
}

export function cancelTask(taskId) {
  const stmt = db.prepare('UPDATE scheduled_tasks SET status = ? WHERE id = ?');
  return stmt.run('cancelled', taskId);
}

// ============ LOGI AKCJI ============

export function logAction(accountId, actionType, details = null, success = true) {
  // Serializuj details do JSON jeśli to obiekt
  const detailsStr = details !== null && typeof details === 'object' 
    ? JSON.stringify(details) 
    : details;
    
  const stmt = db.prepare(`
    INSERT INTO action_logs (account_id, action_type, details, success)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(accountId, actionType, detailsStr, success ? 1 : 0);
}

export function getActionLogs(accountId, limit = 100) {
  const stmt = db.prepare(`
    SELECT * FROM action_logs 
    WHERE account_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(accountId, limit);
}

// ============ KONFIGURACJA SLOTÓW STRAGANÓW ============

export function getStallSlotConfig(accountId) {
  const stmt = db.prepare(`
    SELECT stalls_slot_config FROM automation_settings WHERE account_id = ?
  `);
  const result = stmt.get(accountId);
  return result?.stalls_slot_config || null;
}

export function updateStallSlotConfig(accountId, config) {
  const configStr = typeof config === 'string' ? config : JSON.stringify(config);
  const stmt = db.prepare(`
    UPDATE automation_settings SET stalls_slot_config = ? WHERE account_id = ?
  `);
  return stmt.run(configStr, accountId);
}

// ============ KONFIGURACJA TARTAKU ============

export function getForestryBuildingConfig(accountId) {
  const stmt = db.prepare(`
    SELECT forestry_building_config FROM automation_settings WHERE account_id = ?
  `);
  const result = stmt.get(accountId);
  return result?.forestry_building_config || null;
}

export function updateForestryBuildingConfig(accountId, config) {
  const configStr = typeof config === 'string' ? config : JSON.stringify(config);
  const stmt = db.prepare(`
    UPDATE automation_settings SET forestry_building_config = ? WHERE account_id = ?
  `);
  return stmt.run(configStr, accountId);
}

// ============ KONFIGURACJA FARMY ============

export function getFarmConfig(accountId) {
  const stmt = db.prepare(`
    SELECT farm_config FROM automation_settings WHERE account_id = ?
  `);
  const result = stmt.get(accountId);
  return result?.farm_config || null;
}

export function updateFarmConfig(accountId, config) {
  const configStr = typeof config === 'string' ? config : JSON.stringify(config);
  const sql = `UPDATE automation_settings SET farm_config = ? WHERE account_id = ?`;
  logger.info('SQL:', sql, 'Values:', [configStr, accountId]);
  const stmt = db.prepare(sql);
  return stmt.run(configStr, accountId);
}

// ============ CZASY ROŚLIN ============

export function updatePlantTime(plantName, growthTimeSeconds) {
  const stmt = db.prepare(`
    INSERT INTO plant_times (plant_name, growth_time_seconds, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(plant_name) DO UPDATE SET
      growth_time_seconds = excluded.growth_time_seconds,
      updated_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(plantName, growthTimeSeconds);
}

export function getPlantTimes() {
  const stmt = db.prepare('SELECT * FROM plant_times');
  return stmt.all();
}

export function getPlantTime(plantName) {
  const stmt = db.prepare('SELECT growth_time_seconds FROM plant_times WHERE plant_name = ?');
  const result = stmt.get(plantName);
  return result?.growth_time_seconds || null;
}

// ============ STATYSTYKI ============

export function getAccountStats(accountId) {
  const totalActions = db.prepare(`
    SELECT COUNT(*) as count FROM action_logs WHERE account_id = ?
  `).get(accountId);
  
  const successfulActions = db.prepare(`
    SELECT COUNT(*) as count FROM action_logs WHERE account_id = ? AND success = 1
  `).get(accountId);
  
  const actionsByType = db.prepare(`
    SELECT action_type, COUNT(*) as count 
    FROM action_logs 
    WHERE account_id = ? 
    GROUP BY action_type
  `).all(accountId);
  
  const pendingTasks = db.prepare(`
    SELECT COUNT(*) as count FROM scheduled_tasks WHERE account_id = ? AND status = 'pending'
  `).get(accountId);
  
  const fieldsStatus = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM fields 
    WHERE account_id = ? 
    GROUP BY status
  `).all(accountId);
  
  const upcomingHarvests = db.prepare(`
    SELECT * FROM fields 
    WHERE account_id = ? AND status = 'growing' 
    ORDER BY harvest_at ASC 
    LIMIT 10
  `).all(accountId);
  
  return {
    totalActions: totalActions.count,
    successfulActions: successfulActions.count,
    successRate: totalActions.count > 0 
      ? ((successfulActions.count / totalActions.count) * 100).toFixed(1) 
      : 0,
    actionsByType: actionsByType.reduce((acc, row) => {
      acc[row.action_type] = row.count;
      return acc;
    }, {}),
    pendingTasks: pendingTasks.count,
    fieldsStatus: fieldsStatus.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {}),
    upcomingHarvests
  };
}

export default db;
