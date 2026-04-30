# HydroCalc

**HydroCalc** to nowoczesne, interaktywne narzędzie do obliczeń hydraulicznych koryt otwartych. Aplikacja działa w przeglądarce, nie wymaga backendu i oferuje pełne wsparcie dla trybu ciemnego oraz responsywnego układu.

🔗 **Wersja live:** [https://pitula101.github.io/hydrocalc/](https://pitula101.github.io/hydrocalc/)

---

## Stack technologiczny

- **React 18** – biblioteka UI
- **Vite** – narzędzie do budowania i dev-server
- **Tailwind CSS** – utility-first CSS
- **HTML5 Canvas API** – rysowanie wykresów hydraulicznych
- **GitHub Pages** – hosting (automatyczny deploy via GitHub Actions)

---

## Funkcjonalności

### 1. Kalkulator Przekroju
Obliczenia hydrauliczne dla pojedynczego przekroju poprzecznego koryta trapezowego:
- Głębokość normalna \(h_n\) (równanie Manninga)
- Głębokość krytyczna \(h_c\)
- Prędkość przepływu i liczba Froude'a
- Energia właściwa i krzywa energii (wykres Canvas)
- Dobór umocnienia koryta w zależności od prędkości
- Analiza wrażliwości: \(h = f(b)\) dla różnych nachyleń skarp
- Automatyczna walidacja parametrów wejściowych

### 2. Kalkulator Profilu
Obliczenia profilu podłużnego cieku dla serii przekrojów:
- Definiowanie odcinków z parametrami (PK, spadek, szerokość, skarpa, szorstkość)
- Globalny lub lokalny współczynnik szorstkości Manninga \(n\)
- Wizualizacja: dno koryta, zwierciadło wody, linia energii, głębokość krytyczna, maksymalna wysokość skarp
- Tabela zestawieniowa z wynikami dla każdego odcinka
- Interaktywne podpowiedzi (tooltip) na wykresie

### 3. Zestawienia Kombinacji (Matrix)
Masowe generowanie wyników dla wielu zestawów parametrów:
- Wprowadzanie list wartości oddzielonych przecinkami
- Automatyczne sortowanie wyników po dowolnej kolumnie
- Podświetlanie kombinacji z przelewem (\(h_n > h_{max}\))
- Eksport wyników do pliku **CSV**
- Limit 1000 kombinacji (ochrona przed zawieszeniem przeglądarki)

### Dodatkowe funkcje
- **Tryb ciemny / jasny** – zapis preferencji w `localStorage`
- **Auto-zapis** – parametry każdego kalkulatora są zapisywane lokalnie
- **Obsługa błędów** – globalny handler błędów z możliwością resetu danych
- **Responsywny układ** – działa na desktopie i tabletach

---

## Instalacja i uruchomienie lokalne

Wymagania: **Node.js** w wersji 18+ i **npm**.

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/pitula101/hydrocalc.git
cd hydrocalc

# 2. Instalacja zależności
npm install

# 3. Uruchomienie serwera deweloperskiego
npm run dev

# 4. Aplikacja będzie dostępna pod adresem
#    http://localhost:5173/hydrocalc/
```

### Budowanie wersji produkcyjnej

```bash
npm run build
```

Wynikowa aplikacja statyczna znajdzie się w katalogu `dist/`.

---

## Struktura projektu

```
hydrocalc/
├── .github/workflows/deploy.yml   # CI/CD dla GitHub Pages
├── public/
├── src/
│   ├── components/
│   │   └── NavBar.jsx             # Pasek nawigacji
│   ├── pages/
│   │   ├── Home.jsx               # Strona główna
│   │   ├── SectionCalculator.jsx  # Kalkulator przekroju
│   │   ├── ProfileCalculator.jsx  # Kalkulator profilu
│   │   └── MatrixCalculator.jsx   # Zestawienia kombinacji
│   ├── utils/
│   │   ├── hydraulics.js          # Funkcje hydrauliczne (Manning, Froude, energia)
│   │   └── storage.js             # Wrapper na localStorage z wersjonowaniem
│   ├── App.jsx                    # Główny komponent i routing (hash-based)
│   ├── main.jsx                   # Punkt wejściowy
│   └── index.css                  # Style Tailwind
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Testowanie

Projekt zawiera proste testy jednostkowe dla silnika obliczeniowego w pliku `test-hydraulics.mjs`.

```bash
node test-hydraulics.mjs
```

Testy obejmują:
- poprawność wzorów geometrycznych (pole, obwód, szerokość górna),
- działanie solvera bisekcji,
- równanie Manninga (back-calculation głębokości normalnej),
- obliczenia głębokości krytycznej,
- dobór umocnień.

---

## Deployment

Aplikacja jest automatycznie wdrażana na **GitHub Pages** po każdym pushu do gałęzi `main` (patrz `.github/workflows/deploy.yml`).

Jeśli chcesz wdrożyć ręcznie:
1. Wykonaj `npm run build`.
2. Zawartość katalogu `dist/` możesz przesłać na dowolny hosting statyczny.

---

## Roadmapa / Pomysły na rozbudowę

- [ ] **Kalkulator przepustu** – obliczenia dla rur i skrzynek przepustowych
- [ ] **Kalkulator rozmywania (hydraulic jump)** – głębokości konjugowane, długość skoku
- [ ] **Progi i spady przelewowe** – obliczenia progów piętrzących
- [ ] **Wykresy z biblioteki** – migracja z ręcznego Canvas na Recharts / Chart.js
- [ ] **Generowanie raportów PDF** – eksport wyników z wykresami
- [ ] **Walidacja HTML5** – `min`, `step` w inputach dla lepszej UX
- [ ] **Testy E2E** – Playwright lub Cypress
- [ ] **Wersja mobilna** – dedykowane UI pod małe ekrany
- [ ] **PWA** – service worker i manifest dla trybu offline
- [ ] **Wielojęzyczność (i18n)** – polski / angielski

---

## Znane ograniczenia

- Podatności w zależnościach `firebase` oraz `vite` (esbuild) – wymagana aktualizacja do nowszych wersji w przyszłości (zależności transitive).
- Canvas jest rysowany ręcznie – bardzo skomplikowane wykresy mogą wymagać biblioteki zewnętrznej.

---

## Licencja

Projekt objęty jest licencją MIT. Szczegóły w pliku [LICENSE](LICENSE).

---

*Stworzone z myślą o inżynierach wodnych, hydrologach i studentach budownictwa.*
