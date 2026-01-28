import { useState } from 'react';
import Header from './components/Head';
import HomeHero from './components/HomeHero';
import ResultItems from './components/ResultItems';
import { ResultItem } from './types';
import './App.css';

function App() {
  const [result, setResult] = useState<ResultItem[] | null>(null);

  return (
    <div className="app-container">
      <Header />
      <HomeHero onResult={setResult} />
      {result && <ResultItems results={result} />}
    </div>
  );
}

export default App;
