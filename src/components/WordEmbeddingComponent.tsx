import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { PCA } from 'ml-pca';
import { fetchCorpus, fetchCollocations } from '../services/nbApi';

export const WordEmbeddingComponent: React.FC = () => {
  const [focusWords, setFocusWords] = useState<string>('hund, katt, ulv, bil, tog, fly, glad, trist, sint');
  const [anchorWords, setAnchorWords] = useState<string>('mann, kvinne, natur, maskin, følelse, hastighet, farge, mat, søvn, by');
  
  const [plotData, setPlotData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const handleBuildEmbeddings = async () => {
    setIsLoading(true);
    setLoadingStatus('Henter et tilfeldig korpus...');
    try {
      const foci = focusWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
      const anchors = anchorWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);

      // 1. Fetch a base corpus (e.g. 500 books from last 20 years to get modern semantics)
      const corpus = await fetchCorpus({ limit: 500, from_year: 2000, to_year: 2020 });
      const urns = corpus.map(b => b.urn);

      // 2. Build the Matrix
      const matrix: number[][] = [];
      
      for (let i = 0; i < foci.length; i++) {
        setLoadingStatus(`Henter kollokasjoner for: "${foci[i]}" (${i+1}/${foci.length})...`);
        const counts = await fetchCollocations(urns, foci[i]);
        
        // For this focus word, extract the count for each anchor word
        const row = anchors.map(anchor => {
          return counts[anchor] || 0; // 0 if they never co-occurred
        });
        
        matrix.push(row);
      }

      setLoadingStatus('Beregner PCA (10D -> 3D)...');
      
      // We need to standardise/normalize the matrix before PCA, 
      // but ml-pca handles centering by default. 
      // Since raw counts vary wildly, we could log-transform them, but let's try raw first.

      // Run PCA
      const pca = new PCA(matrix);
      // Predict to 3 components
      const reduced = pca.predict(matrix, { nComponents: 3 }).to2DArray();

      setPlotData(foci.map((word, i) => ({
        word,
        x: reduced[i][0],
        y: reduced[i][1],
        z: reduced[i][2],
      })));

      setLoadingStatus('');
    } catch (e) {
      console.error(e);
      alert('Feil under bygning av vektorer');
      setLoadingStatus('');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Mini Word2Vec (10D &rarr; 3D)</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: 'var(--text-secondary)' }}>Fokus-ord (Punktene i rommet)</label>
          <textarea 
            className="text-input" 
            style={{ height: '80px', resize: 'vertical' }}
            value={focusWords}
            onChange={e => setFocusWords(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: 'var(--text-secondary)' }}>Anker-ord (Kontekst-dimensjonene)</label>
          <textarea 
            className="text-input" 
            style={{ height: '80px', resize: 'vertical' }}
            value={anchorWords}
            onChange={e => setAnchorWords(e.target.value)}
          />
        </div>
      </div>

      <button className="primary-btn" onClick={handleBuildEmbeddings} disabled={isLoading}>
        {isLoading ? 'Bygger vektorer...' : 'Bygg 3D Ordvektorer'}
      </button>

      {isLoading && (
        <div style={{ marginTop: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {loadingStatus}
        </div>
      )}

      {plotData.length > 0 && (
        <div style={{ marginTop: '40px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '10px' }}>
          <Plot
            data={[{
              x: plotData.map(d => d.x),
              y: plotData.map(d => d.y),
              z: plotData.map(d => d.z),
              text: plotData.map(d => d.word),
              mode: 'markers+text',
              type: 'scatter3d',
              marker: {
                size: 8,
                color: plotData.map((_, i) => i),
                colorscale: 'Viridis',
                opacity: 0.8
              },
              textposition: 'top center',
              textfont: {
                family: 'Inter, sans-serif',
                size: 14,
                color: '#ffffff'
              }
            }]}
            layout={{
              width: 1000,
              height: 700,
              margin: { l: 0, r: 0, b: 0, t: 0 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              scene: {
                xaxis: { title: 'Dimensjon 1', backgroundcolor: 'transparent', gridcolor: '#444' },
                yaxis: { title: 'Dimensjon 2', backgroundcolor: 'transparent', gridcolor: '#444' },
                zaxis: { title: 'Dimensjon 3', backgroundcolor: 'transparent', gridcolor: '#444' }
              }
            }}
            config={{ responsive: true }}
          />
        </div>
      )}
    </div>
  );
};
