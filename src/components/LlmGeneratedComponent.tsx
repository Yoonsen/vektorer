import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchCorpus, fetchFrequencies } from '../services/nbApi';
import type { CorpusConfig, BookMeta } from '../services/nbApi';
import './LlmGeneratedComponent.css';

type Point = {
  id: number;
  dhlabid: number;
  title?: string;
  authors?: string;
  year?: number;
  x0: number; // original X
  y0: number; // original Y
  xp: number; // projected X
  yp: number; // projected Y
};

type DataSet = {
  points: Point[];
  lineStart: { x: number; y: number };
  lineEnd: { x: number; y: number };
  maxLoss: number;
  maxX: number; // local max
  maxY: number; // local max
  numDocs: number;
  meanX: number;
  meanY: number;
  correlation: number;
};

export interface CorpusLayer {
  id: string;
  config: CorpusConfig;
  color: string;
  dataset: DataSet | null;
  books?: BookMeta[];
  visible: boolean;
  isLoading: boolean;
  errorMsg: string;
  isCollapsed: boolean;
  title: string;
}

const LAYER_COLORS = [
  '#0ea5e9', // Blue
  '#e11d48', // Pink
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
];

interface Props {
  height?: string;
}

export default function LlmGeneratedComponent({ height = '800px' }: Props) {
  const [wordA, setWordA] = useState<string>('han');
  const [wordB, setWordB] = useState<string>('ham');
  const [globalLimit, setGlobalLimit] = useState<number>(100);
  const [compression, setCompression] = useState<number>(0);
  
  const [layers, setLayers] = useState<CorpusLayer[]>([
    {
      id: 'default-1',
      config: { from_year: 1990, to_year: 2020, author: '', subject: '', ddk: '', limit: 100 },
      color: LAYER_COLORS[0],
      dataset: null,
      visible: true,
      isLoading: false,
      errorMsg: '',
      isCollapsed: false,
      title: 'Korpus 1'
    }
  ]);

  // Global maximums for axis scaling
  const [globalMaxX, setGlobalMaxX] = useState<number>(100);
  const [globalMaxY, setGlobalMaxY] = useState<number>(100);

  // Recalculate scaling and PCA whenever layers or words change
  useEffect(() => {
    let mX = 0;
    let mY = 0;
    
    // Find absolute maximums across all visible datasets
    layers.forEach(layer => {
      if (layer.visible && layer.dataset) {
        if (layer.dataset.maxX > mX) mX = layer.dataset.maxX;
        if (layer.dataset.maxY > mY) mY = layer.dataset.maxY;
      }
    });

    setGlobalMaxX(mX > 0 ? mX : 100);
    setGlobalMaxY(mY > 0 ? mY : 100);
  }, [layers]);


  const generateTitle = (config: CorpusConfig) => {
    const parts = [];
    if (config.author) parts.push(config.author);
    if (config.subject) parts.push(config.subject);
    if (config.ddk) parts.push(`DDK:${config.ddk}`);
    if (config.from_year || config.to_year) {
      parts.push(`${config.from_year || '?'}-${config.to_year || '?'}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Standard Korpus';
  };

  const fetchLayerData = async (layerId: string, forceResample: boolean = false) => {
    if (!wordA.trim() || !wordB.trim()) return;

    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isLoading: true, errorMsg: '', dataset: null } : l));

    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      let books = layer.books || [];
      if (forceResample || books.length === 0) {
        books = await fetchCorpus(layer.config, globalLimit);
        if (books.length === 0) {
          throw new Error('Fant ingen bøker som matchet.');
        }
        // Cache books so we can reuse them if words change
        setLayers(prev => prev.map(l => l.id === layerId ? { ...l, books } : l));
      }

      const wA = wordA.trim().toLowerCase();
      const wB = wordB.trim().toLowerCase();
      
      const freqs = await fetchFrequencies(books.map(b => b.urn), [wA, wB]);

      const docMap = new Map<number, { id: number; freqA: number; freqB: number }>();
      freqs.forEach(([dhlabid, word, freq, total]) => {
        if (!docMap.has(dhlabid)) {
          docMap.set(dhlabid, { id: dhlabid, freqA: 0, freqB: 0 });
        }
        const doc = docMap.get(dhlabid)!;
        const relFreq = (freq / total) * 1000000; // PPM (Parts Per Million)
        if (word === wA) doc.freqA = relFreq;
        if (word === wB) doc.freqB = relFreq;
      });

      const rawPoints = Array.from(docMap.values());
      if (rawPoints.length === 0) {
        throw new Error('Fikk ingen frekvensdata.');
      }
      
      const points = rawPoints.map((p, i) => {
        const meta = books.find(b => b.dhlabid === p.id);
        return { 
          id: i, 
          dhlabid: p.id,
          title: meta?.title,
          authors: meta?.authors,
          year: meta?.year,
          x0: p.freqA, 
          y0: p.freqB, 
          xp: 0, 
          yp: 0 
        };
      });
      const mX = Math.max(...points.map(p => p.x0));
      const mY = Math.max(...points.map(p => p.y0));
      const numDocs = points.length;
      const meanX = numDocs > 0 ? points.reduce((sum, p) => sum + p.x0, 0) / numDocs : 0;
      const meanY = numDocs > 0 ? points.reduce((sum, p) => sum + p.y0, 0) / numDocs : 0;
      
      let correlation = 0;
      if (numDocs > 1) {
        let sXX = 0, sYY = 0, sXY = 0;
        points.forEach(p => {
          sXX += Math.pow(p.x0 - meanX, 2);
          sYY += Math.pow(p.y0 - meanY, 2);
          sXY += (p.x0 - meanX) * (p.y0 - meanY);
        });
        if (sXX > 0 && sYY > 0) {
          correlation = sXY / Math.sqrt(sXX * sYY);
        }
      }

      setLayers(prev => prev.map(l => l.id === layerId ? { 
        ...l, 
        isLoading: false, 
        dataset: {
          points,
          lineStart: { x: 0, y: 0 },
          lineEnd: { x: 0, y: 0 },
          maxLoss: 0,
          maxX: mX,
          maxY: mY,
          numDocs,
          meanX,
          meanY,
          correlation
        },
        title: generateTitle(l.config),
        isCollapsed: true // auto collapse on success
      } : l));

    } catch (err: any) {
      setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isLoading: false, errorMsg: err.message || 'Feil' } : l));
    }
  };

  const handleFetchAll = () => {
    layers.forEach(layer => fetchLayerData(layer.id, false));
  };

  const processLayerDisplay = (layer: CorpusLayer) => {
    if (!layer.dataset || !layer.visible) return null;
    
    // Calculate Pearson Correlation r on RAW frequencies
    let r = 0;
    const rawPoints = layer.dataset.points;
    const numRaw = rawPoints.length;
    if (numRaw > 1) {
      const meanRawX = rawPoints.reduce((s, p) => s + p.x0, 0) / numRaw;
      const meanRawY = rawPoints.reduce((s, p) => s + p.y0, 0) / numRaw;
      
      let sXX_raw = 0, sYY_raw = 0, sXY_raw = 0;
      rawPoints.forEach(p => {
        sXX_raw += Math.pow(p.x0 - meanRawX, 2);
        sYY_raw += Math.pow(p.y0 - meanRawY, 2);
        sXY_raw += (p.x0 - meanRawX) * (p.y0 - meanRawY);
      });
      
      if (sXX_raw > 0 && sYY_raw > 0) {
        r = sXY_raw / Math.sqrt(sXX_raw * sYY_raw);
      }
    }
    
    // 1. Map to SVG space [10, 90] using GLOBAL max
      const svgPoints = layer.dataset.points.map(p => ({
        ...p,
        x0: 10 + (p.x0 / globalMaxX) * 80,
        y0: 90 - (p.y0 / globalMaxY) * 80,
        xp: 0, yp: 0
      }));

    // 2. PCA Calculation in SVG Space
    const numPoints = svgPoints.length;
    const meanX = svgPoints.reduce((s, p) => s + p.x0, 0) / numPoints;
    const meanY = svgPoints.reduce((s, p) => s + p.y0, 0) / numPoints;

    let sXX = 0, sYY = 0, sXY = 0;
    svgPoints.forEach((p) => {
      sXX += Math.pow(p.x0 - meanX, 2);
      sYY += Math.pow(p.y0 - meanY, 2);
      sXY += (p.x0 - meanX) * (p.y0 - meanY);
    });

    const lambda1 = ((sXX + sYY) + Math.sqrt(Math.pow(sXX - sYY, 2) + 4 * Math.pow(sXY, 2))) / 2;
    let vx = sXY;
    let vy = lambda1 - sXX;
    
    if (Math.abs(vx) < 1e-6 && Math.abs(vy) < 1e-6) {
      vx = 1; vy = 0;
    }
    
    const len = Math.sqrt(vx * vx + vy * vy);
    vx /= len;
    vy /= len;

    let maxLoss = 0;
    let minT = Infinity;
    let maxT = -Infinity;

    svgPoints.forEach((p) => {
      const dx = p.x0 - meanX;
      const dy = p.y0 - meanY;
      const t = dx * vx + dy * vy;
      
      p.xp = meanX + t * vx;
      p.yp = meanY + t * vy;

      maxLoss += Math.pow(p.xp - p.x0, 2) + Math.pow(p.yp - p.y0, 2);

      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    });

    minT -= 10;
    maxT += 10;

    return {
      points: svgPoints,
      lineStart: { x: meanX + minT * vx, y: meanY + minT * vy },
      lineEnd: { x: meanX + maxT * vx, y: meanY + maxT * vy },
      maxLoss,
      color: layer.color,
      correlation: r
    };
  };

  const displayLayers = layers.map(l => ({ layer: l, display: processLayerDisplay(l) })).filter(x => x.display !== null);

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    const nextColor = LAYER_COLORS[layers.length % LAYER_COLORS.length];
    setLayers(prev => [...prev, {
      id: newId,
      config: { from_year: 1990, to_year: 2020, limit: 100 },
      color: nextColor,
      dataset: null,
      visible: true,
      isLoading: false,
      errorMsg: '',
      isCollapsed: false,
      title: 'Nytt Korpus'
    }]);
  };

  const updateLayerConfig = (id: string, updates: Partial<CorpusConfig>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, config: { ...l.config, ...updates } } : l));
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const toggleLayerCollapse = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, isCollapsed: !l.isCollapsed } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(layers.filter((l) => l.id !== id));
  };

  const isAnyLoading = layers.some(l => l.isLoading);

  return (
    <div className="visualization-container" style={{ minHeight: height }}>
      
      {/* Global Config Panel */}
      <div className="config-panel">
        <div className="words-section">
          <h3>Global Config</h3>
          <p className="help-text">Dette utvalget gjelder for alle aktive korpus.</p>
          <div className="input-row">
            <select className="text-input small" value={globalLimit} onChange={e => setGlobalLimit(parseInt(e.target.value))}>
              <option value="50">50 bøker</option>
              <option value="100">100 bøker</option>
              <option value="500">500 bøker</option>
              <option value="2000">2000 bøker</option>
            </select>
            <input 
              type="text" 
              className="text-input" 
              value={wordA} 
              onChange={e => setWordA(e.target.value)} 
              placeholder="Ord for X-akse" 
            />
            <span className="vs-text">vs</span>
            <input 
              type="text" 
              className="text-input" 
              value={wordB} 
              onChange={e => setWordB(e.target.value)} 
              placeholder="Ord for Y-akse" 
            />
            <button 
              className="fetch-button" 
              onClick={handleFetchAll} 
              disabled={isAnyLoading}
            >
              Kjør analyse
            </button>
          </div>
        </div>

        {/* Layers Section */}
        <div className="layers-section">
          <h3>Korpus-Lag</h3>
          <div className="layers-list">
            {layers.map(layer => (
              <div key={layer.id} className={`layer-card ${layer.isCollapsed ? 'collapsed' : ''}`} style={{ borderLeftColor: layer.color }}>
                
                {/* Header (always visible) */}
                <div className="layer-header">
                  <div className="layer-header-left" onClick={() => toggleLayerCollapse(layer.id)}>
                    <div className="color-dot" style={{ backgroundColor: layer.color }}></div>
                    <strong>{layer.title}</strong>
                    {layer.isLoading && <span className="layer-status">Laster...</span>}
                    {layer.dataset && (
                      <span className="layer-status">
                        ({layer.dataset.numDocs} bøker) | r: {layer.dataset.correlation.toFixed(2)} | X/Y: {layer.dataset.meanY !== 0 ? (layer.dataset.meanX / layer.dataset.meanY).toFixed(2) : '∞'}
                      </span>
                    )}
                  </div>
                  <div className="layer-header-right">
                    <input 
                      type="checkbox" 
                      checked={layer.visible} 
                      onChange={() => toggleLayerVisibility(layer.id)}
                      title="Vis/skjul i graf"
                    />
                    <button className="icon-button" onClick={() => fetchLayerData(layer.id, true)} title="Resample (Hent nye bøker)">
                      ↻
                    </button>
                    <button className="icon-button delete" onClick={() => deleteLayer(layer.id)} title="Slett lag">
                      ×
                    </button>
                  </div>
                </div>

                {/* Body (collapsible) */}
                {!layer.isCollapsed && (
                  <div className="layer-body">
                    <div className="corpus-grid">
                      <div className="corpus-field">
                        <label>Fra år</label>
                        <input type="number" className="text-input small" value={layer.config.from_year || ''} onChange={e => updateLayerConfig(layer.id, { from_year: parseInt(e.target.value) || undefined })}/>
                      </div>
                      <div className="corpus-field">
                        <label>Til år</label>
                        <input type="number" className="text-input small" value={layer.config.to_year || ''} onChange={e => updateLayerConfig(layer.id, { to_year: parseInt(e.target.value) || undefined })}/>
                      </div>
                      <div className="corpus-field">
                        <label>Forfatter</label>
                        <input type="text" className="text-input small" placeholder="f.eks. Ibsen" value={layer.config.author || ''} onChange={e => updateLayerConfig(layer.id, { author: e.target.value })}/>
                      </div>
                      <div className="corpus-field">
                        <label>Språk</label>
                        <select className="text-input small" value={layer.config.lang || 'nob'} onChange={e => updateLayerConfig(layer.id, { lang: e.target.value })}>
                          <option value="nob">Bokmål</option>
                          <option value="nno">Nynorsk</option>
                          <option value="eng">Engelsk</option>
                          <option value="">Alle språk</option>
                        </select>
                      </div>
                      <div className="corpus-field">
                        <label>Emne (Subject)</label>
                        <input type="text" className="text-input small" value={layer.config.subject || ''} onChange={e => updateLayerConfig(layer.id, { subject: e.target.value })}/>
                      </div>
                      <div className="corpus-field">
                        <label>Dewey (DDK)</label>
                        <input type="text" className="text-input small" placeholder="f.eks. 839" value={layer.config.ddk || ''} onChange={e => updateLayerConfig(layer.id, { ddk: e.target.value })}/>
                      </div>
                    </div>
                    {layer.errorMsg && <div className="error-message">{layer.errorMsg}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="add-layer-button" onClick={addLayer}>+ Leggg til nytt korpus</button>
        </div>
      </div>

      {/* Compression Slider */}
      <div className="controls-panel slider-panel">
        <div className="control-group" style={{ flex: 2 }}>
          <label className="control-label">Komprimer til 1D (Dimensjonsreduksjon)</label>
          <div className="slider-container">
            <input 
              type="range" min="0" max="100" 
              value={compression} 
              onChange={(e) => setCompression(Number(e.target.value))}
              className="compression-slider"
            />
            <div className="slider-value">{compression}%</div>
          </div>
        </div>
      </div>

      {/* Interactive Graph SVG */}
      <div className="graph-container">
        {isAnyLoading && (
          <div className="global-spinner">
            <div className="spinner"></div>
            Henter tekster og frekvenser...
          </div>
        )}
        <svg viewBox="0 0 100 100" className="graph-svg" preserveAspectRatio="xMidYMid meet">
          {(() => {
            const usePctX = globalMaxX >= 1000;
            const usePctY = globalMaxY >= 1000;
            const formatX = (val: number) => usePctX ? (val / 10000).toFixed(2) + '%' : val.toFixed(0);
            const formatY = (val: number) => usePctY ? (val / 10000).toFixed(2) + '%' : val.toFixed(0);
            const labelX = usePctX ? `% "${wordA}"` : `PPM "${wordA}"`;
            const labelY = usePctY ? `% "${wordB}"` : `PPM "${wordB}"`;

            return (
              <>
                {/* Grid and Axes */}
                {[10, 30, 50, 70, 90].map((tick) => {
                  const valX = ((tick - 10) / 80) * globalMaxX;
                  const valY = ((90 - tick) / 80) * globalMaxY;
                  return (
                    <g key={`grid-${tick}`}>
                      <line x1={tick} y1="0" x2={tick} y2="100" className="grid-line" />
                      <line x1="0" y1={tick} x2="100" y2={tick} className="grid-line" />
                      
                      <text x={tick} y="93" fontSize="2" fill="var(--text-secondary)" textAnchor="middle" fontFamily="sans-serif">
                        {formatX(valX)}
                      </text>
                      <text x="8" y={tick + 0.7} fontSize="2" fill="var(--text-secondary)" textAnchor="end" fontFamily="sans-serif">
                        {formatY(valY)}
                      </text>
                    </g>
                  );
                })}
                
                <line x1="10" y1="90" x2="95" y2="90" className="axis-line" />
                <line x1="10" y1="90" x2="10" y2="5" className="axis-line" />
                
                <text x="50" y="98" textAnchor="middle" className="axis-label">
                  {labelX} (Max: {formatX(globalMaxX)})
                </text>
                <text x="2" y="50" transform="rotate(-90 2 50)" textAnchor="middle" className="axis-label">
                  {labelY} (Max: {formatY(globalMaxY)})
                </text>
              </>
            );
          })()}

          {/* Render each visible layer */}
          {displayLayers.map(({ layer, display }) => {
            if (!display) return null;
            return (
              <g key={`layer-${layer.id}`}>
                {/* PCA / Target Line */}
                <line 
                  x1={display.lineStart.x} y1={display.lineStart.y} 
                  x2={display.lineEnd.x} y2={display.lineEnd.y} 
                  className={`pca-line ${compression > 50 ? 'active' : ''}`}
                  strokeDasharray={compression > 50 ? 'none' : '2 2'}
                  style={{ 
                    stroke: display.color,
                    opacity: 0.8 
                  }}
                />

                {/* Data Points */}
                {display.points.map((p) => {
                  const t = compression / 100;
                  const cx = p.x0 + (p.xp - p.x0) * t;
                  const cy = p.y0 + (p.yp - p.y0) * t;

                  return (
                    <motion.circle
                      key={`pt-${p.id}`}
                      cx={cx}
                      cy={cy}
                      r="1.2"
                      className="data-point"
                      initial={{ cx: p.x0, cy: p.y0 }}
                      animate={{ cx, cy }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      style={{
                        fill: display.color,
                        opacity: 0.7,
                        filter: `drop-shadow(0 0 ${compression / 20}px ${display.color})`
                      }}
                    >
                      <title>{p.title} ({p.year}) - {p.authors}&#10;X: {p.x0.toFixed(0)}, Y: {p.y0.toFixed(0)}</title>
                    </motion.circle>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Live Loss Display (Multi-layer) */}
        {displayLayers.length > 0 && (
          <div className="loss-display">
            <span className="loss-label">Informasjonstap (Loss)</span>
            {displayLayers.map(({ layer, display }) => {
              if (!display) return null;
              const currentLoss = display.maxLoss * Math.pow(compression / 100, 2);
              return (
                <div key={layer.id} className="loss-row">
                  <div className="color-dot small" style={{ backgroundColor: display.color }}></div>
                  <span className="loss-value-small">
                    {currentLoss.toFixed(1)} 
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                      (r={display.correlation.toFixed(2)})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
