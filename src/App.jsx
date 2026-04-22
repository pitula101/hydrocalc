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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    storage.set(STORAGE_KEYS.DARK_MODE, isDarkMode);
  }, [isDarkMode]);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
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