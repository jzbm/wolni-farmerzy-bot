/**
 * Moduł integracji z Discord
 * Wysyła powiadomienia przez webhook
 */

import logger from './logger.js';
import { getAppSetting, setAppSetting } from './database.js';

const log = logger;

// Kolory embed dla różnych typów powiadomień
const EMBED_COLORS = {
  success: 0x00ff00,  // zielony
  error: 0xff0000,    // czerwony
  warning: 0xffa500,  // pomarańczowy
  info: 0x0099ff,     // niebieski
  levelUp: 0xffd700,  // złoty
  harvest: 0x8b4513,  // brązowy
  plant: 0x228b22,    // ciemnozielony
  money: 0x32cd32,    // limonkowy
};

/**
 * Pobiera URL webhooka z ustawień
 */
export function getDiscordWebhookUrl() {
  return getAppSetting('discord_webhook_url') || '';
}

/**
 * Zapisuje URL webhooka
 */
export function setDiscordWebhookUrl(url) {
  setAppSetting('discord_webhook_url', url);
}

/**
 * Pobiera ustawienia powiadomień Discord
 */
export function getDiscordSettings() {
  const settingsStr = getAppSetting('discord_settings');
  if (settingsStr) {
    try {
      return JSON.parse(settingsStr);
    } catch (e) {
      return getDefaultDiscordSettings();
    }
  }
  return getDefaultDiscordSettings();
}

/**
 * Domyślne ustawienia powiadomień
 */
function getDefaultDiscordSettings() {
  return {
    enabled: false,
    notifyLevelUp: true,
    notifyModuleComplete: false,
    notifyModuleError: true,
    notifyHarvest: false,
    notifyPlant: false,
    notifyMoney: false,
    notifySchedulerStart: false,
    notifySchedulerStop: false,
  };
}

/**
 * Zapisuje ustawienia powiadomień Discord
 */
export function setDiscordSettings(settings) {
  setAppSetting('discord_settings', JSON.stringify(settings));
}

/**
 * Wysyła wiadomość na Discord przez webhook
 * @param {Object} options - Opcje wiadomości
 * @param {string} options.title - Tytuł embed
 * @param {string} options.description - Opis
 * @param {string} options.type - Typ powiadomienia (success, error, warning, info, levelUp, etc.)
 * @param {Array} options.fields - Dodatkowe pola [{name, value, inline}]
 * @param {string} options.footer - Tekst stopki
 * @param {string} options.thumbnail - URL miniatury
 */
export async function sendDiscordNotification(options) {
  const webhookUrl = getDiscordWebhookUrl();
  const settings = getDiscordSettings();
  
  if (!webhookUrl || !settings.enabled) {
    return false;
  }
  
  try {
    const embed = {
      title: options.title || 'Wolni Farmerzy Bot',
      description: options.description || '',
      color: EMBED_COLORS[options.type] || EMBED_COLORS.info,
      timestamp: new Date().toISOString(),
      footer: {
        text: options.footer || '🌾 Wolni Farmerzy Bot'
      }
    };
    
    if (options.fields && options.fields.length > 0) {
      embed.fields = options.fields;
    }
    
    if (options.thumbnail) {
      embed.thumbnail = { url: options.thumbnail };
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Wolni Farmerzy Bot',
        avatar_url: 'https://www.wolnifarmerzy.pl/img/icon.png',
        embeds: [embed]
      })
    });
    
    if (!response.ok) {
      log.error(`Discord webhook error: ${response.status} ${response.statusText}`);
      return false;
    }
    
    log.debug(`Wysłano powiadomienie Discord: ${options.title}`);
    return true;
    
  } catch (error) {
    log.error(`Błąd wysyłania na Discord: ${error.message}`);
    return false;
  }
}

/**
 * Powiadomienie o awansie na nowy poziom
 */
export async function notifyLevelUp(accountEmail, oldLevel, newLevel) {
  const settings = getDiscordSettings();
  if (!settings.notifyLevelUp) return;
  
  await sendDiscordNotification({
    title: '🎉 Awans na nowy poziom!',
    description: `Konto **${accountEmail}** awansowało!`,
    type: 'levelUp',
    fields: [
      { name: '📊 Poprzedni poziom', value: `${oldLevel}`, inline: true },
      { name: '⬆️ Nowy poziom', value: `${newLevel}`, inline: true },
      { name: '🎯 Gratulacje!', value: 'Odblokowano nowe rośliny i funkcje!', inline: false }
    ]
  });
}

/**
 * Powiadomienie o zakończeniu modułu
 */
export async function notifyModuleComplete(accountEmail, moduleType, result) {
  const settings = getDiscordSettings();
  if (!settings.notifyModuleComplete) return;
  
  const moduleNames = {
    farm: '🌾 Farma',
    forestry: '🌲 Tartak',
    stalls: '🏪 Stragany'
  };
  
  const fields = [
    { name: '📧 Konto', value: accountEmail, inline: true },
    { name: '📦 Moduł', value: moduleNames[moduleType] || moduleType, inline: true }
  ];
  
  // Dodaj szczegóły wyniku jeśli dostępne
  if (result) {
    if (result.harvested !== undefined) {
      fields.push({ name: '🌾 Zebrano', value: `${result.harvested} pól`, inline: true });
    }
    if (result.planted !== undefined) {
      fields.push({ name: '🌱 Zasadzono', value: `${result.planted} pól`, inline: true });
    }
    if (result.watered !== undefined) {
      fields.push({ name: '💧 Podlano', value: `${result.watered} pól`, inline: true });
    }
  }
  
  await sendDiscordNotification({
    title: '✅ Moduł zakończony',
    description: `Pomyślnie wykonano cykl automatyzacji`,
    type: 'success',
    fields
  });
}

/**
 * Powiadomienie o błędzie modułu
 */
export async function notifyModuleError(accountEmail, moduleType, errorMessage) {
  const settings = getDiscordSettings();
  if (!settings.notifyModuleError) return;
  
  const moduleNames = {
    farm: '🌾 Farma',
    forestry: '🌲 Tartak',
    stalls: '🏪 Stragany'
  };
  
  await sendDiscordNotification({
    title: '❌ Błąd modułu',
    description: `Wystąpił błąd podczas wykonywania automatyzacji`,
    type: 'error',
    fields: [
      { name: '📧 Konto', value: accountEmail, inline: true },
      { name: '📦 Moduł', value: moduleNames[moduleType] || moduleType, inline: true },
      { name: '⚠️ Błąd', value: errorMessage || 'Nieznany błąd', inline: false }
    ]
  });
}

/**
 * Powiadomienie o zebranych plonach
 */
export async function notifyHarvest(accountEmail, harvestDetails) {
  const settings = getDiscordSettings();
  if (!settings.notifyHarvest) return;
  
  const fields = [
    { name: '📧 Konto', value: accountEmail, inline: true },
    { name: '🌾 Zebrano pól', value: `${harvestDetails.count || 0}`, inline: true }
  ];
  
  if (harvestDetails.crops && Object.keys(harvestDetails.crops).length > 0) {
    const cropsList = Object.entries(harvestDetails.crops)
      .map(([crop, count]) => `${crop}: ${count}`)
      .join('\n');
    fields.push({ name: '📋 Plony', value: cropsList, inline: false });
  }
  
  await sendDiscordNotification({
    title: '🌾 Zebrano plony!',
    description: 'Zakończono zbieranie plonów',
    type: 'harvest',
    fields
  });
}

/**
 * Powiadomienie o znalezionych pieniądzach
 */
export async function notifyMoneyFound(accountEmail, amount) {
  const settings = getDiscordSettings();
  if (!settings.notifyMoney) return;
  
  await sendDiscordNotification({
    title: '💰 Znaleziono pieniądze!',
    description: `Podczas pracy na farmie znaleziono gotówkę`,
    type: 'money',
    fields: [
      { name: '📧 Konto', value: accountEmail, inline: true },
      { name: '💵 Kwota', value: `${amount} ft`, inline: true }
    ]
  });
}

/**
 * Powiadomienie o uruchomieniu schedulera
 */
export async function notifySchedulerStart(accountEmail) {
  const settings = getDiscordSettings();
  if (!settings.notifySchedulerStart) return;
  
  await sendDiscordNotification({
    title: '▶️ Scheduler uruchomiony',
    description: `Automatyzacja została włączona`,
    type: 'info',
    fields: [
      { name: '📧 Konto', value: accountEmail, inline: true }
    ]
  });
}

/**
 * Powiadomienie o zatrzymaniu schedulera
 */
export async function notifySchedulerStop(accountEmail) {
  const settings = getDiscordSettings();
  if (!settings.notifySchedulerStop) return;
  
  await sendDiscordNotification({
    title: '⏹️ Scheduler zatrzymany',
    description: `Automatyzacja została wyłączona`,
    type: 'warning',
    fields: [
      { name: '📧 Konto', value: accountEmail, inline: true }
    ]
  });
}

/**
 * Testowe powiadomienie
 */
export async function sendTestNotification() {
  return await sendDiscordNotification({
    title: '🧪 Test powiadomienia',
    description: 'To jest testowe powiadomienie z bota Wolni Farmerzy',
    type: 'info',
    fields: [
      { name: '✅ Status', value: 'Webhook działa poprawnie!', inline: false }
    ]
  });
}

export default {
  getDiscordWebhookUrl,
  setDiscordWebhookUrl,
  getDiscordSettings,
  setDiscordSettings,
  sendDiscordNotification,
  notifyLevelUp,
  notifyModuleComplete,
  notifyModuleError,
  notifyHarvest,
  notifyMoneyFound,
  notifySchedulerStart,
  notifySchedulerStop,
  sendTestNotification
};
