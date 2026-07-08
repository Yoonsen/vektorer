import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { PCA } from 'ml-pca';
import { fetchCorpus, fetchCollocations } from '../services/nbApi';

export const WordEmbeddingComponent: React.FC = () => {
  const [focusWords, setFocusWords] = useState<string>('hund, katt, ulv, bil, tog, fly, glad, trist, sint');
  
  const [plotData, setPlotData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const handleBuildEmbeddings = async () => {
    setIsLoading(true);
    setLoadingStatus('Henter et tilfeldig korpus...');
    try {
      const foci = focusWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);

      // 1. Fetch a base corpus
      const corpus = await fetchCorpus({ limit: 500, from_year: 2000, to_year: 2020 });
      const urns = corpus.map(b => b.urn);

      // 2. Fetch all collocations and aggregate
      const allCounts: Record<string, Record<string, number>> = {};
      const globalWordFreq: Record<string, number> = {};

      for (let i = 0; i < foci.length; i++) {
        setLoadingStatus(`Henter kollokasjoner for: "${foci[i]}" (${i+1}/${foci.length})...`);
        const counts = await fetchCollocations(urns, foci[i]);
        allCounts[foci[i]] = counts;
        
        // Aggregate to find the most prominent context words globally
        for (const [word, count] of Object.entries(counts)) {
          // Veldig enkel stoppord-filtrering for å unngå at '.' og ',' dominerer 100%
          if (word.length < 2 || ['og', 'i', 'det', 'på', 'som', 'er', 'en', 'til', 'å', 'av', 'for', 'at', 'med', 'de', 'den'].includes(word)) continue;
          globalWordFreq[word] = (globalWordFreq[word] || 0) + count;
        }
      }

      // 3. Select Top 100 context words (Dimensions)
      const topContextWords = Object.entries(globalWordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(entry => entry[0]);

      // 4. Build the Matrix (Foci x Top100)
      const matrix: number[][] = [];
      for (const focus of foci) {
        const row = topContextWords.map(ctxWord => {
           // We could use PMI here if we had total corpus frequency, 
           // but raw collocated count (TF) centered by PCA is a good proxy for LSA.
           return allCounts[focus][ctxWord] || 0;
        });
        matrix.push(row);
      }

      setLoadingStatus('Beregner PCA (100D -> 3D)...');

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
          <label style={{ color: 'var(--text-secondary)' }}>
            Fokus-ord (Ordene du vil plotte i 3D). Modellen vil automatisk finne de 100 mest relevante assosiasjonene og bruke disse som skjulte dimensjoner!
          </label>
          <textarea 
            className="text-input" 
            style={{ height: '80px', resize: 'vertical' }}
            value={focusWords}
            onChange={e => setFocusWords(e.target.value)}
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
