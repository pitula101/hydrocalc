import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import SectionCalculator from './pages/SectionCalculator';
import ProfileCalculator from './pages/ProfileCalculator';
import MatrixCalculator from './pages/MatrixCalculator';
import NavBar from './components/NavBar';
import { storage, STORAGE_KEYS } from './utils/storage';

const App = () => {
  const [activeHash, setActiveHash] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return storage.get(STORAGE_KEYS.DARK_MODE, true);
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    storage.set(STORAGE_KEYS.DARK_MODE, isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    window.onerror = (msg, url, line, col, error) => {
      setError(`Error: ${msg}`);
      console.error('Global error:', msg, line, col, error);
    };
    window.onunhandledrejection = (event) => {
      setError(`Unhandled rejection: ${event.reason}`);
      console.error('Unhandled rejection:', event.reason);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setActiveHash(hash);
      if (hash) {
        storage.set(STORAGE_KEYS.LAST_PAGE, hash);
      }
    };

    const savedPage = storage.get(STORAGE_KEYS.LAST_PAGE, '');
    if (!window.location.hash && savedPage) {
      window.location.hash = savedPage;
    }

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleNavigate = (page) => {
    setActiveHash(page);
  };

  const renderPage = () => {
    switch (activeHash) {
      case 'section':
        return <SectionCalculator />;
      case 'profile':
        return <ProfileCalculator />;
      case 'matrix':
        return <MatrixCalculator />;
      default:
        return <Home />;
    }
  };

  const showNavBar = activeHash !== '';

  const handleReset = () => {
    Object.values(STORAGE_KEYS).forEach(key => storage.remove(key));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {error && (
        <div className="fixed inset-0 bg-red-500/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Wystąpił błąd</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
            <button onClick={handleReset} className="px-4 py-2 bg-red-600 text-white rounded-lg">
              Resetuj dane i przeładuj
            </button>
          </div>
        </div>
      )}
      {showNavBar && (
        <NavBar 
          activePage={activeHash} 
          onNavigate={handleNavigate}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}
      <div className={showNavBar ? 'pt-0' : ''}>
        {renderPage()}
      </div>
    </div>
  );
};

export default App;