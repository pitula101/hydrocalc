import React from 'react';

const NavBar = ({ activePage, onNavigate, isDarkMode, onToggleDarkMode }) => {
  const navItems = [
    { id: '', label: 'Strona główna', icon: '🏠' },
    { id: 'section', label: 'Przekrój', icon: '📐' },
    { id: 'profile', label: 'Profil', icon: '📈' },
    { id: 'matrix', label: 'Kombinacje', icon: '📊' },
  ];

  const handleClick = (id) => {
    if (id) {
      window.location.hash = id;
    } else {
      window.location.hash = '';
    }
    onNavigate(id);
  };

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleClick('')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-lg">💧</span>
              <span className="hidden sm:inline">HydroCalc</span>
            </button>
            
            <div className="hidden md:flex items-center gap-1 ml-4">
              {navItems.slice(1).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activePage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="md:hidden flex items-center gap-1 ml-2">
              {navItems.slice(1).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`p-2 rounded-lg text-lg transition-colors ${
                    activePage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg text-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={isDarkMode ? 'Tryb jasny' : 'Tryb ciemny'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;