# Instrukcja deweloperska HydroCalc

Niniejszy dokument przeznaczony jest dla osób rozwijających projekt HydroCalc. Zawiera szczegółowe instrukcje uruchomienia środowiska deweloperskiego, opis architektury oraz wskazówki dotyczące testowania i debugowania.

---

## Wymagania wstępne

| Narzędzie | Wersja minimalna | Uwagi |
|-----------|-----------------|-------|
| Node.js   | 18.x            | Zalecana LTS (20.x) |
| npm       | 9.x             | Dostarczany razem z Node.js |
| Git       | 2.x             | Do klonowania repozytorium |

Sprawdź wersje w terminalu:

```bash
node -v   # np. v20.11.0
npm -v    # np. 10.2.4
git --version
```

---

## Pierwsze uruchomienie (krok po kroku)

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/pitula101/hydrocalc.git
cd hydrocalc
```

### 2. Instalacja zależności

```bash
npm install
```

Polecenie pobierze wszystkie pakiety zdefiniowane w `package.json` (React, Vite, Tailwind CSS itp.) do katalogu `node_modules/`.

### 3. Uruchomienie serwera deweloperskiego

```bash
npm run dev
```

Vite domyślnie uruchomi serwer na porcie **5173**. W terminalu zobaczysz komunikat w stylu:

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/hydrocalc/
  ➜  press h + enter to show help
```

**Ważne:** Aplikacja jest skonfigurowana z `base: '/hydrocalc/'` w pliku `vite.config.js`. Oznacza to, że główny adres podczas pracy lokalnej to:

```
http://localhost:5173/hydrocalc/
```

Wejście bezpośrednio na `http://localhost:5173/` skończy się błędem 404 lub brakiem assetów.

### 4. Podgląd produkcyjny (opcjonalnie)

Jeśli chcesz sprawdzić, jak aplikacja zachowa się po zbudowaniu:

```bash
npm run build
npm run preview
```

Vite uruchomi serwer podglądu na porcie **4173** (lub innym wolnym). Adres dostępu będzie ten sam co przy `dev`, zgodny z `base`.

---

## Skrypty dostępne w projekcie

| Skrypt | Polecenie | Opis |
|--------|-----------|------|
| dev | `npm run dev` | Serwer deweloperski z HMR (Hot Module Replacement) |
| build | `npm run build` | Budowanie wersji produkcyjnej do katalogu `dist/` |
| preview | `npm run preview` | Serwer podglądu zbudowanej aplikacji |

---

## Architektura i struktura kodu

### Routing

Aplikacja **nie używa** `react-router-dom`. Routing oparty jest na hash URL (`window.location.hash`):

| Hash | Strona |
|------|--------|
| `#` (brak) | Strona główna (`Home.jsx`) |
| `#section` | Kalkulator Przekroju |
| `#profile` | Kalkulator Profilu |
| `#matrix` | Zestawienia Kombinacji |

Logika routingu znajduje się w `src/App.jsx` (funkcja `renderPage`). Każda zmiana hasha jest nasłuchiwana przez zdarzenie `hashchange`.

### Zarządzanie stanem i danymi

Wszystkie dane użytkownika (parametry kalkulatorów, preferencje trybu ciemnego, ostatnia odwiedzona strona) przechowywane są w `localStorage`.

- **Plik:** `src/utils/storage.js`
- **Mechanizm:** wszystkie klucze mają prefiks `hydrocalc_`.
- **Wersjonowanie:** przy zmianie struktury danych zwiększana jest stała `CURRENT_VERSION`. Przy niezgodności wersji stare klucze localStorage są automatycznie czyszczone, aby uniknąć błędów parsowania.

**Jak ręcznie wyczyścić dane:**

W konsoli przeglądarki (F12 → zakładka Console):

```javascript
Object.keys(localStorage).forEach(k => { if(k.startsWith('hydrocalc_')) localStorage.removeItem(k); });
window.location.reload();
```

Alternatywnie — kliknij przycisk „Resetuj dane i przeładuj” w globalnym oknie błędu (pojawia się przy niespodziewanych wyjątkach).

### Moduły obliczeniowe

Silnik hydrauliczny jest całkowicie odseparowany od Reacta:

- **Plik:** `src/utils/hydraulics.js`
- **Zawiera:** funkcje geometryczne koryta trapezowego, równanie Manninga, liczbę Froude’a, energię właściwą, solver bisekcji, dobór umocnienia.

Zmiany w obliczeniach powinny być wprowadzane **wyłącznie** w tym pliku. Komponenty Reactowe wywołują te funkcje i prezentują wyniki.

### Rysowanie wykresów (Canvas)

Wykresy generowane są ręcznie za pomocą API `CanvasRenderingContext2D` (nie używamy zewnętrznych bibliotek typu Chart.js). Logika rysowania znajduje się w hookach `useEffect` wewnątrz poszczególnych kalkulatorów (`SectionCalculator`, `ProfileCalculator`).

Jeśli planujesz modyfikować wykresy, kluczowe jest zrozumienie:
- transformacji współrzędnych metrycznych → pikselowych,
- podziału Canvas na sekcje (np. przekrój + krzywa energii w jednym elemencie `<canvas>`),
- obsługi zdarzeń `onMouseMove` / `onMouseLeave` dla tooltipów.

---

## Testowanie

### Testy jednostkowe silnika obliczeniowego

Projekt zawiera proste testy dla modułu `hydraulics.js` bez dodatkowych frameworków testowych (czysty Node.js).

**Uruchomienie testów:**

```bash
node test-hydraulics.mjs
```

**Co jest testowane:**
- Pole powierzchni, obwód i szerokość górna dla koryta prostokątnego i trapezowego.
- Poprawność solvera bisekcji.
- Równanie Manninga — obliczenie głębokości normalnej na podstawie znanego przepływu.
- Obliczenie głębokości krytycznej dla koryta prostokątnego.
- Algorytm doboru umocnienia dla różnych zakresów prędkości.
- Warunek brzegowy — brak zmiany znaku w funkcji bisekcji zwraca `null`.

**Dodawanie nowych testów:**

Otwórz plik `test-hydraulics.mjs` i dodaj kolejne wywołanie `assertEqual()` lub `assertTrue()`:

```javascript
assertEqual(getArea(2, 3, 1), 10, 'Area b=3,m=1,y=2');
assertTrue(solveBisection(x => x - 5, 0, 10) > 4.99, 'Simple bisection');
```

### Testy manualne (UI)

Ponieważ aplikacja nie posiada jeszcze testów E2E, każdą istotną zmianę należy zweryfikować ręcznie w przeglądarce:

1. **Ścieżka happy-path:**
   - Otwórz każdy z trzech kalkulatorów.
   - Wprowadź przykładowe wartości dodatnie.
   - Upewnij się, że wyniki się pojawiają i wykresy się rysują.

2. **Walidacja błędów:**
   - Wprowadź wartości ujemne lub zerowe w polach (`Q`, `b`, `n`, `i`, `h`).
   - Sprawdź, czy pojawia się komunikat błędu, a aplikacja nie wiesza się.

3. **Tryb ciemny:**
   - Przełącz tryb ciemny (przycisk w nawigacji) na każdej stronie.
   - Upewnij się, że wszystkie teksty i tła są czytelne.

4. **Responsywność:**
   - Zmniejsz okno przeglądarki do szerokości mobilnej (np. 375 px).
   - Sprawdź, czy formularze i tabele są przewijalne (overflow-x), a nie rozszerzają strony.

5. **Zapis stanu:**
   - Wypełnij parametry w kalkulatorze.
   - Odśwież stronę (F5) — wartości powinny zostać przywrócone.

### Testy produkcyjnego buildu

Przed każdym push do repozytorium wykonaj:

```bash
npm run build
```

W terminalu nie powinno być błędów (tzw. „build errors”). Ostrzeżenia (warnings) mogą się pojawić, ale nie powinny blokować procesu.

---

## Jak dodać nowy kalkulator

Jeśli chcesz rozbudować aplikację o kolejny moduł (np. kalkulator przepustu), postępuj według poniższego schematu:

1. **Komponent React:**
   - Utwórz plik `src/pages/NowyKalkulator.jsx`.
   - Użyj wzorca z istniejących kalkulatorów: stan `useState`, efekt `useEffect` do auto-zapisu w `localStorage`, funkcja obliczeniowa.

2. **Rejestracja w routerze:**
   - W `src/App.jsx` zaimportuj nowy komponent.
   - Dodaj nowy `case` w funkcji `renderPage` oraz w `NavBar.jsx` (jeśli ma być w nawigacji).

3. **Klucz localStorage:**
   - W `src/utils/storage.js` dodaj nowy klucz w obiekcie `STORAGE_KEYS`.

4. **Walidacja:**
   - Upewnij się, że wszystkie wartości numeryczne są walidowane (dodatnie, brak `NaN`).

5. **Strona główna:**
   - W `src/pages/Home.jsx` dodaj kartę opisującą nowy kalkulator w tablicy `calculators`.

---

## Debugowanie

### Narzędzia deweloperskie przeglądarki

- **React Developer Tools** (rozszerzenie do Chrome/Firefox) — niezbędne do podglądu stanu komponentów i propsów.
- **Zakładka Console** — globalny handler błędów (`window.onerror`) przechwytuje niespodziewane wyjątki i wyświetla je w czerwonym modalu na stronie.
- **Zakładka Network** — przydatna przy debugowaniu fetchy (w tym projekcie obecnie brak zewnętrznych zapytań HTTP).

### Częste problemy

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Biała strona / brak assetów | Wejście na `/` zamiast `/hydrocalc/` | Upewnij się, że otwierasz adres zgodny z `base` w Vite |
| Nieaktualne dane w formularzu | Stare `localStorage` z poprzedniej wersji | Wyczyść localStorage (patrz sekcja „Zarządzanie stanem”) |
| Canvas nie wyświetla się | Błąd w obliczeniach (`NaN` / `Infinity`) | Sprawdź konsolę przeglądarki, zweryfikuj walidację inputów |
| `npm install` zawiesza się | Problem z proxy / siecią | Sprawdź połączenie lub użyj `npm install --prefer-offline` |

---

## Wskazówki przy commicie

Zalecany minimalny checklist przed wysłaniem zmian:

- [ ] `npm run build` przechodzi bez błędów.
- [ ] `node test-hydraulics.mjs` zwraca same `PASS`.
- [ ] Przeprowadziłem szybki test manualny w przeglądarce (happy-path + walidacja błędu).
- [ ] Nie wprowadziłem tajnych danych (kluczy API, haseł) do repozytorium.

---

*Jeśli masz pytania lub napotkasz problemy z uruchomieniem, otwórz Issue w repozytorium lub skontaktuj się z opiekunem projektu.*
