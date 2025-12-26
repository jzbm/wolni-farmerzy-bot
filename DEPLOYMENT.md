# 🚀 Deployment Guide - Wolni Farmerzy Bot na VPS

## Wymagania VPS

- **System**: Ubuntu 20.04+ / Debian 11+
- **RAM**: Minimum 2GB (zalecane 4GB)
- **CPU**: 1-2 vCPU
- **Dysk**: 10GB+
- **Port**: 3000 (lub inny wybrany)

---

## 📦 Krok 1: Przygotowanie VPS

```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Instalacja Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Sprawdź wersję
node -v  # powinno być v20.x.x
npm -v

# Instalacja niezbędnych narzędzi
sudo apt install -y git build-essential
```

---

## 🎭 Krok 2: Instalacja Playwright dependencies

Playwright wymaga pewnych bibliotek systemowych:

```bash
# Instalacja zależności dla Chromium (headless)
sudo apt install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libatspi2.0-0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2

# LUB użyj oficjalnego skryptu Playwright
npx playwright install-deps chromium
```

---

## 📁 Krok 3: Deployment aplikacji

```bash
# Utwórz folder dla aplikacji
sudo mkdir -p /opt/wf-bot
cd /opt/wf-bot

# Opcja A: Skopiuj pliki z lokalnego komputera (np. przez SCP)
# scp -r /path/to/wf/* user@vps:/opt/wf-bot/

# Opcja B: Sklonuj z Git (jeśli masz repo)
# git clone https://github.com/twoje-repo/wf-bot.git .

# Ustaw uprawnienia
sudo chown -R $USER:$USER /opt/wf-bot

# Zainstaluj zależności
npm install

# Zainstaluj przeglądarkę Playwright
npx playwright install chromium
```

---

## ⚙️ Krok 4: Konfiguracja

```bash
# Skopiuj przykładowy plik .env
cp .env.example .env

# Edytuj konfigurację
nano .env
```

**Ważne ustawienia w `.env`:**
```env
APP_PORT=3000
APP_SECRET=wygeneruj-losowy-ciag-znakow-32-znaki
HEADLESS=true
```

**Wygeneruj bezpieczny secret:**
```bash
openssl rand -hex 32
```

---

## 🔄 Krok 5: PM2 - Process Manager

PM2 zapewnia automatyczny restart i monitoring:

```bash
# Instalacja PM2 globalnie
sudo npm install -g pm2

# Uruchom aplikację
cd /opt/wf-bot
pm2 start ecosystem.config.cjs

# Sprawdź status
pm2 status

# Sprawdź logi
pm2 logs wf-bot

# WAŻNE: Ustaw autostart po restarcie serwera
pm2 startup
pm2 save
```

**Komendy PM2:**
```bash
pm2 stop wf-bot      # Zatrzymaj
pm2 restart wf-bot   # Restart
pm2 reload wf-bot    # Reload bez downtime
pm2 delete wf-bot    # Usuń z PM2
pm2 monit            # Real-time monitoring
```

---

## 🌐 Krok 6: Nginx (opcjonalnie - reverse proxy)

Jeśli chcesz używać domeny i HTTPS:

```bash
# Instalacja Nginx
sudo apt install -y nginx

# Konfiguracja
sudo nano /etc/nginx/sites-available/wf-bot
```

**Konfiguracja Nginx:**
```nginx
server {
    listen 80;
    server_name twoja-domena.pl;  # lub IP serwera

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/wf-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# HTTPS z Let's Encrypt (opcjonalnie)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl
```

---

## 🔥 Krok 7: Firewall

```bash
# Instalacja UFW
sudo apt install -y ufw

# Podstawowa konfiguracja
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Jeśli bez Nginx:
# sudo ufw allow 3000/tcp

# Włącz firewall
sudo ufw enable
sudo ufw status
```

---

## ✅ Krok 8: Weryfikacja

```bash
# Sprawdź czy aplikacja działa
pm2 status
curl http://localhost:3000

# Sprawdź logi
pm2 logs wf-bot --lines 50
cat /opt/wf-bot/logs/app.log
```

---

## 📊 Monitoring i utrzymanie

### Automatyczne aktualizacje (opcjonalnie)
```bash
# Skrypt aktualizacji
nano /opt/wf-bot/update.sh
```
```bash
#!/bin/bash
cd /opt/wf-bot
git pull
npm install
pm2 reload wf-bot
```

### Backup bazy danych
```bash
# Ręczny backup
cp /opt/wf-bot/data/bot.db /backup/bot-$(date +%Y%m%d).db

# Automatyczny backup (cron)
crontab -e
# Dodaj: 0 3 * * * cp /opt/wf-bot/data/bot.db /backup/bot-$(date +\%Y\%m\%d).db
```

### Sprawdzanie statusu
```bash
# Status PM2
pm2 status

# Użycie zasobów
pm2 monit

# Logi w czasie rzeczywistym
pm2 logs wf-bot
```

---

## 🛡️ Bezpieczeństwo

1. **Zmień domyślne hasło** użytkownika w panelu
2. **Użyj silnego APP_SECRET** w `.env`
3. **Włącz firewall** i ogranicz dostęp do portu
4. **Używaj HTTPS** jeśli dostęp z internetu
5. **Regularnie aktualizuj** system i zależności

---

## 🔧 Rozwiązywanie problemów

### Przeglądarka nie startuje
```bash
# Sprawdź czy zależności są zainstalowane
npx playwright install-deps chromium

# Sprawdź logi
pm2 logs wf-bot --err --lines 100
```

### Port zajęty
```bash
# Sprawdź co używa portu
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Brak pamięci
```bash
# Sprawdź pamięć
free -h

# Dodaj swap jeśli brak
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Reset bazy danych
```bash
pm2 stop wf-bot
rm /opt/wf-bot/data/bot.db
pm2 start wf-bot
# Utwórz nowego użytkownika przez UI
```

---

## 📝 Harmonogram nie resetuje się

Dzięki PM2 i SQLite:
- **PM2** automatycznie restartuje aplikację po crashu lub restarcie VPS
- **SQLite** przechowuje konfigurację harmonogramu w pliku `data/bot.db`
- Po restarcie, aplikacja wczytuje zapisane ustawienia z bazy danych
- Scheduler sam się reaktywuje po uruchomieniu

**Ważne**: Scheduler wymaga ręcznego uruchomienia po restarcie serwera jeśli był aktywny. Rozważ dodanie auto-aktywacji kont w kodzie lub użyj funkcji "Tryb inteligentny" który sprawdza gotowe zbiory.

---

Powodzenia! 🎮
