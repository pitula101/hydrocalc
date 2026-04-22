/**
 * Stałe i funkcje hydrauliczne bazowe.
 * Równanie Manninga, geometria koryta trapezowego, energia właściwa.
 */

export const g = 9.81;

export const getArea = (y, b, m) => (b + m * y) * y;

export const getPerimeter = (y, b, m) => b + 2 * y * Math.sqrt(1 + m * m);

export const getTopWidth = (y, b, m) => b + 2 * m * y;

export const getSpecificEnergy = (y, b, m, Q) => {
  if (y <= 0) return Infinity;
  const A = getArea(y, b, m);
  if (A <= 0) return Infinity;
  const v = Q / A;
  return y + (v * v) / (2 * g);
};

export const solveBisection = (func, min, max, tolerance = 1e-6, maxIter = 100) => {
  let lower = min, upper = max, iter = 0;
  if (func(lower) * func(upper) > 0) return null;
  while (iter < maxIter) {
    const mid = (lower + upper) / 2;
    const val = func(mid);
    if (Math.abs(val) < tolerance) return mid;
    if (func(lower) * val < 0) upper = mid;
    else lower = mid;
    iter++;
  }
  return (lower + upper) / 2;
};

export const solveDepthsForEnergy = (E, b, m, Q, yc) => {
  const func = (y) => getSpecificEnergy(y, b, m, Q) - E;
  const h1 = solveBisection(func, 0.01, yc);
  const h2 = solveBisection(func, yc, E);
  return { h1, h2 };
};

export const getReinforcementSuggestion = (v, isDarkMode = false) => {
  if (v < 0.3) return { 
    type: 'Brak (Ryzyko zamulania)', 
    desc: 'Prędkość poniżej minimum samooczyszczania. Wymagane regularne odmulanie.', 
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' 
  };
  if (v <= 0.6) return { 
    type: 'Grunt rodzimy (Naturalne)', 
    desc: 'Dla gruntów spoistych umocnienie nie jest wymagane.', 
    color: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30' 
  };
  if (v <= 0.9) return { 
    type: 'Darniowanie / Obsiew', 
    desc: 'Umocnienie biologiczne (trawa dobrze ukorzeniona).', 
    color: 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/20' 
  };
  if (v <= 1.5) return { 
    type: 'Narzut kamienny / Faszyna', 
    desc: 'Wymagane zabezpieczenie dna i stopy skarp (np. kiszka faszynowa, narzut).', 
    color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' 
  };
  if (v <= 3.0) return { 
    type: 'Materace Gabionowe / Bruk', 
    desc: 'Umocnienie ciężkie: Kosze gabionowe, bruk kamienny na zaprawie lub siatce.', 
    color: 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20' 
  };
  if (v <= 5.0) return { 
    type: 'Beton / Żelbet', 
    desc: 'Płyty betonowe, kanały żelbetowe prefabrykowane.', 
    color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20' 
  };
  return { 
    type: 'Konstrukcja Specjalna', 
    desc: 'Prędkość ekstremalna. Wymagane indywidualne projektowanie.', 
    color: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20' 
  };
};