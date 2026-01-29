import { useState } from 'react';
import Header from './components/Head';
import HomeHero from './components/HomeHero';
import ResultItems from './components/ResultItems';
import { ResultItem } from './types';
import './App.css';

function App() {
  const [result, setResult] = useState<ResultItem[] | null>(null);

  return (
<<<<<<< HEAD
<<<<<<< HEAD
    <div className={`app-container ${highContrast ? 'high-contrast' : ''}`}>
      <LandingPage onToggleHighContrast={toggleHighContrast} highContrast={highContrast} />

      <nav className="main-nav" aria-label="Main navigation">
        <button
          className={activeTab === 'voice' ? 'active' : ''}
          onClick={() => setActiveTab('voice')}
          aria-label="Voice Interface"
        >
          Voice
        </button>
        <button
          className={activeTab === 'extractor' ? 'active' : ''}
          onClick={() => setActiveTab('extractor')}
          aria-label="Product Extractor"
        >
          Extractor
        </button>
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
          aria-label="Usage Dashboard"
        >
          Stats
        </button>
      </nav>

      <main className="content-area">
        {activeTab === 'voice' && <VoiceInterface />}
        {activeTab === 'extractor' && <ProductExtractor />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
=======
=======
>>>>>>> 38252cac848e758317897f4723758b234d5be1ad
    <div className="app-container">
      <Header />
      <HomeHero onResult={setResult} />
      {result && <ResultItems results={result} />}
<<<<<<< HEAD
>>>>>>> 38252cac848e758317897f4723758b234d5be1ad
=======
>>>>>>> 38252cac848e758317897f4723758b234d5be1ad
    </div>
  );
}

export default App;
