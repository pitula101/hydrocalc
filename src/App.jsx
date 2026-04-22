import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import SectionCalculator from './pages/SectionCalculator';
import ProfileCalculator from './pages/ProfileCalculator';
import MatrixCalculator from './pages/MatrixCalculator';

const App = () => {
  const [activeHash, setActiveHash] = useState('section');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'section';
      setActiveHash(hash);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {renderPage()}
    </div>
  );
};

export default App;