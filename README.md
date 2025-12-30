# Wolni Farmerzy Bot

Automatyczny bot do gry przeglądarkowej Wolni Farmerzy (wolnifarmerzy.pl).

##  Funkcje

-  Automatyczne logowanie
-  Zbieranie plonów z pól uprawnych
-  Sadzenie roślin
-  Podlewanie
-  Obsługa tartaku (drzewa)
-  Uzupełnianie straganów (mapa)
-  Obsługa wielu kont
-  Panel webowy do zarządzania
-  Harmonogram oparty na czasach wzrostu
-  Statystyki i logi akcji
-  Automatyczne zamykanie popupów (cookies, reklamy, promocje)

## Instalacja

### Wymagania
- Node.js 18+ 
- npm

### Kroki instalacji

1. **Zainstaluj zależności:**
```bash
cd wf
npm install
```

2. **Zainstaluj przeglądarkę Chromium dla Playwright:**
```bash
npx playwright install chromium
```

3. **Skonfiguruj aplikację:**
```bash
copy .env.example .env
```
Edytuj plik `.env` według potrzeb.

##  Użycie

### Uruchomienie panelu webowego
```bash
npm start
```
Otwórz przeglądarkę: http://localhost:3000

### Analiza struktury gry (opcjonalnie)
```bash
npm run analyze
```
To narzędzie pomoże zidentyfikować selektory CSS w grze.

##  Panel webowy

1. **Rejestracja/Logowanie** - Utwórz konto do panelu
2. **Dodaj konto gry** - Podaj dane logowania do Wolnych Farmerów
3. **Konfiguruj automatyzację** - Wybierz co ma być automatyzowane
4. **Uruchom** - Kliknij "Uruchom automatyzację"

### Ustawienia automatyzacji

| Opcja | Opis |
|-------|------|
| Auto zbieranie | Automatycznie zbiera gotowe plony |
| Auto sadzenie | Sadzi rośliny na pustych polach |
| Auto podlewanie | Podlewa pola wymagające podlania |
| Auto stragany | Uzupełnia stragany na mapie |
| Auto tartak | Obsługuje tartak (drzewa) |

### Preferowane rośliny
Wybierz które rośliny mają być automatycznie sadzone po zbiorze.

### Interwał sprawdzania
Co ile minut bot ma sprawdzać stan gry (domyślnie 5 min).

##  Wdrożenie na VPS

### 1. Przygotowanie serwera
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Zainstaluj zależności dla Playwright
npx playwright install-deps chromium
```

### 2. Konfiguracja produkcyjna
```bash
# W pliku .env ustaw:
HEADLESS=true
APP_SECRET=twoj-silny-tajny-klucz
```

### 3. Uruchomienie w tle
```bash
# Używając PM2
npm install -g pm2
pm2 start src/index.js --name "wf-bot"
pm2 save
pm2 startup
```

### 4. Reverse proxy (opcjonalnie)
```nginx
# /etc/nginx/sites-available/wf-bot
server {
    listen 80;
    server_name twoja-domena.pl;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

##  Struktura projektu

```
wf/
├── src/
│   ├── index.js           # Główny plik
│   ├── config.js          # Konfiguracja
│   ├── database.js        # Baza danych SQLite
│   ├── browser.js         # Zarządzanie przeglądarką
│   ├── scheduler.js       # Harmonogram zadań
│   ├── logger.js          # Logowanie
│   ├── modules/
│   │   ├── auth.js        # Logowanie do gry
│   │   ├── farm.js        # Obsługa pól uprawnych
│   │   ├── sawmill.js     # Obsługa tartaku
│   │   └── map.js         # Obsługa mapy/straganów
│   ├── web/
│   │   ├── server.js      # Serwer Express
│   │   └── public/        # Pliki statyczne
│   └── tools/
│       └── analyzer.js    # Narzędzie analizy gry
├── data/                  # Baza danych (auto)
├── logs/                  # Logi (auto)
├── screenshots/           # Zrzuty ekranu (debug)
├── package.json
├── .env.example
└── README.md
```

##  Konfiguracja czasów roślin

Czasy wzrostu roślin są zdefiniowane w `src/config.js`. 
Po uruchomieniu analizatora gry możesz zaktualizować te wartości.

```javascript
plantGrowthTimes: {
  'pszenica': 60,      // sekundy
  'kukurydza': 120,
  // ...
}
```


### Błędy selektorów
Gra może zmienić strukturę HTML. Użyj analizatora:
```bash
npm run analyze
```
I zaktualizuj selektory w `src/config.js`.


## TODO / Przyszłe funkcje

- Powiadomienia Discord/Email
- Automatyczna sprzedaż produktów
- Obsługa zwierząt
- Rozpoznawanie captcha
- API REST dla integracji zewnętrznych

## Licencja

MIT License -

# wolni-farmerzy-bot
