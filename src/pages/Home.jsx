import React, { useState } from 'react';

const Home = () => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const calculators = [
    {
      id: 'section',
      title: 'Kalkulator Przekroju',
      description: 'Obliczenia hydrauliczne dla pojedynczego przekroju poprzecznego koryta otwartego. Wyznacz głębokość normalną i krytyczną, prędkość, liczbę Froude\'a, energię właściwą oraz dobierz umocnienie.',
      icon: '📐',
      color: 'blue'
    },
    {
      id: 'profile',
      title: 'Kalkulator Profilu',
      description: 'Obliczenia profilu podłużnego cieku dla serii przekrojów. Śledź zmiany głębokości, prędkości i energii wzdłuż cieku z uwzględnieniem geometrii i spadków.',
      icon: '📈',
      color: 'purple'
    },
    {
      id: 'matrix',
      title: 'Zestawienia Kombinacji',
      description: 'Generuj i analizuj wiele kombinacji parametrów jednocześnie. Porównaj wyniki dla różnych przepływów, szerokości, nachyleń i spadków w tabeli.',
      icon: '📊',
      color: 'green'
    }
  ];

  const getCardStyles = (id, baseColor) => {
    const isHovered = hoveredCard === id;
    const baseStyles = `p-6 rounded-3xl border transition-all duration-300 cursor-pointer`;
    
    if (isHovered) {
      return `${baseStyles} scale-105 shadow-xl`;
    }
    return baseStyles;
  };

  const getColorStyles = (baseColor, isHovered) => {
    const colors = {
      blue: isHovered 
        ? 'bg-blue-600 border-blue-400 shadow-blue-500/30' 
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      purple: isHovered 
        ? 'bg-purple-600 border-purple-400 shadow-purple-500/30' 
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      green: isHovered 
        ? 'bg-green-600 border-green-400 shadow-green-500/30' 
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    };
    return colors[baseColor];
  };

  const navigateTo = (id) => {
    window.location.hash = id;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2">
              HydroCalc
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Narzędzie do obliczeń hydraulicznych koryt otwartych
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {calculators.map((calc) => (
            <div
              key={calc.id}
              onClick={() => navigateTo(calc.id)}
              onMouseEnter={() => setHoveredCard(calc.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`${getCardStyles(calc.id, calc.color)} ${getColorStyles(calc.color, hoveredCard === calc.id)}`}
            >
              <div className="text-4xl mb-4">{calc.icon}</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
                {calc.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {calc.description}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
            Szybkie linki
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="#section"
              className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <span className="text-2xl">📐</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Przekrój</span>
            </a>
            <a
              href="#profile"
              className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
            >
              <span className="text-2xl">📈</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Profil</span>
            </a>
            <a
              href="#matrix"
              className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
            >
              <span className="text-2xl">📊</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Kombinacje</span>
            </a>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>HydroCalc v1.0 • Obliczenia hydrauliczne koryt otwartych</p>
        </div>
      </div>
    </div>
  );
};

export default Home;