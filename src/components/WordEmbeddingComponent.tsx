import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { PCA } from 'ml-pca';

export const WordEmbeddingComponent: React.FC = () => {
  const [focusWords, setFocusWords] = useState<string>('hund, katt, bil, tog, eple, pære, kjærlighet, hat, glad, trist');
  const [anchorWords, setAnchorWords] = useState<string>('mann, kvinne, barn, konge, dronning, rød, blå, grønn, rask, sakte, stor, liten');
  
  const [plotData, setPlotData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleBuildEmbeddings = async () => {
    setIsLoading(true);
    try {
      const foci = focusWords.split(',').map(w => w.trim()).filter(w => w);
      const anchors = anchorWords.split(',').map(w => w.trim()).filter(w => w);

      // MOCK DATA GENERATION: To be replaced with actual collocation code
      // Matrix: Rows = Focus Words, Cols = Anchor Words (Dimensions)
      const matrix = foci.map((_, i) => 
        anchors.map((_, j) => {
          // Fake some semantic similarity by using index math
          return Math.random() * 10 + (Math.sin(i * 1.5 + j) * 5) + (i % 2 === j % 2 ? 10 : 0);
        })
      );

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

    } catch (e) {
      console.error(e);
      alert('Feil under bygning av vektorer');
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
        {isLoading ? 'Regner ut PCA...' : 'Bygg 3D Ordvektorer (Mock Data)'}
      </button>

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
