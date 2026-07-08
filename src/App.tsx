import { useState } from 'react';
import './App.css';
import LlmGeneratedComponent from './components/LlmGeneratedComponent';
import { WordEmbeddingComponent } from './components/WordEmbeddingComponent';

function App() {
  const [activeTab, setActiveTab] = useState<'fase1' | 'fase2'>('fase2');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        padding: '20px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', marginRight: 'auto' }}>
          Nasjonalbiblioteket Data Explorer
        </h1>
        <button 
          className={activeTab === 'fase1' ? 'primary-btn' : 'secondary-btn'}
          onClick={() => setActiveTab('fase1')}
        >
          Fase 1: 2D Bøker
        </button>
        <button 
          className={activeTab === 'fase2' ? 'primary-btn' : 'secondary-btn'}
          onClick={() => setActiveTab('fase2')}
        >
          Fase 2: 3D Ordvektorer
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'fase1' ? <LlmGeneratedComponent /> : <WordEmbeddingComponent />}
      </div>
    </div>
  );
}

export default App;
