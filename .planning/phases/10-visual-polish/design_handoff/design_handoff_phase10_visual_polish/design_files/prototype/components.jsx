// Phase 10 prototype — components.jsx
// All UI bits other than the tour overlay and the App shell.

const { useState, useRef, useEffect, useCallback } = React;

// ============================================================
// TOP NAV
// ============================================================
function TopNav({ activeTab, onTabChange, helpOpen, onHelpToggle, onSettingsClick, onHowItWorksClick }) {
  return (
    <header className="topnav">
      <span className="wordmark">Literary Genre Topology</span>
      <nav className="tabs" role="tablist">
        {['scatter', 'topology', 'compare'].map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={'tab ' + (activeTab === tab ? 'active' : '')}
            onClick={() => onTabChange(tab)}
            data-tour-id={tab === 'topology' ? window.TOUR_ANCHORS.topologyTab
                        : tab === 'compare'  ? window.TOUR_ANCHORS.compareTab
                        : undefined}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      <div className="spacer" />
      <button className="icon-btn" onClick={onHowItWorksClick} title="How It Works">
        <span aria-hidden="true">🎓</span><span>How It Works</span>
      </button>
      <button
        className={'icon-btn help-btn ' + (helpOpen ? 'open' : '')}
        onClick={onHelpToggle}
        aria-label="Help menu"
        aria-expanded={helpOpen}
        data-tour-id={window.TOUR_ANCHORS.helpMenu}
      >
        ?
      </button>
      <button className="icon-btn" onClick={onSettingsClick} aria-label="Settings" title="Settings">
        <span aria-hidden="true" style={{ fontSize: 18 }}>⚙</span>
      </button>
    </header>
  );
}

// ============================================================
// HELP DROPDOWN  (replay tour, How It Works, shortcuts, theme, GitHub)
// ============================================================
function HelpDropdown({ theme, onThemeChange, onReplayTour, onHowItWorks, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="help-dropdown" ref={ref} role="menu">
      <button className="help-item" onClick={() => { onReplayTour(); onClose(); }} role="menuitem">
        <span className="ico">↻</span>
        <div className="label-block">
          <div className="main">Replay tour</div>
          <div className="sub">4 steps · ~90 seconds</div>
        </div>
      </button>
      <button className="help-item" onClick={() => { onHowItWorks(); onClose(); }} role="menuitem">
        <span className="ico">📖</span>
        <div className="label-block">
          <div className="main">How It Works</div>
          <div className="sub">7-step math walkthrough</div>
        </div>
      </button>
      <button className="help-item" role="menuitem">
        <span className="ico">⌨</span>
        <div className="label-block">
          <div className="main">Keyboard shortcuts</div>
          <div className="sub">R · Esc · 1–4</div>
        </div>
      </button>
      <div className="help-divider" />
      <div className="theme-segment-wrap" data-tour-id={window.TOUR_ANCHORS.themeToggle}>
        <div className="seg-label">Theme</div>
        <div className="theme-segment" role="radiogroup" aria-label="Theme">
          {[
            { key: 'light',  icon: '☀', label: 'Light' },
            { key: 'system', icon: '⟳', label: 'System' },
            { key: 'dark',   icon: '☾', label: 'Dark' },
          ].map(opt => (
            <button
              key={opt.key}
              role="radio"
              aria-checked={theme === opt.key}
              className={theme === opt.key ? 'active' : ''}
              onClick={() => onThemeChange(opt.key)}
            >
              <span aria-hidden="true">{opt.icon}</span>{opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="help-divider" />
      <button className="help-item" role="menuitem" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <span className="ico">⊞</span>
        <span style={{ flex: 1, fontSize: 12 }}>View on GitHub</span>
        <span style={{ opacity: 0.5 }}>↗</span>
      </button>
    </div>
  );
}

// ============================================================
// DISCLAIMER RIBBON
// ============================================================
function DisclaimerRibbon() {
  return (
    <div className="ribbon" role="note">
      <span aria-hidden="true">ⓘ</span>
      <span>Topology is computed in the original N-dimensional space. The 3D view is a lossy projection.</span>
    </div>
  );
}

// ============================================================
// SCATTER (SVG)
// ============================================================
function Scatter({ selectedGenre, uploadedLanded, isDragging }) {
  const W = 1200, H = 760;
  const points = window.SCATTER_POINTS;
  const hasFocus = selectedGenre !== null;

  return (
    <div className="canvas-area" data-tour-id={window.TOUR_ANCHORS.scatterCanvas} style={{
      background: 'hsl(var(--scene-bg))',
      transition: 'background-color 240ms ease',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
        <g>
          {points.map((p, i) => {
            const [sx, sy] = window.projectPoint(p, W, H);
            const isFocus = hasFocus && p.genre === selectedGenre;
            // brightness: TF-IDF when focused, default otherwise
            const opacity = hasFocus
              ? (isFocus ? Math.max(0.35, 0.4 + p.tfidf * 0.6) : 0.10)
              : 0.55;
            const r = hasFocus
              ? (isFocus ? 1.6 + p.tfidf * 2.6 : 1.0)
              : 1.4 + (p.tfidf * 0.6);
            return (
              <circle
                key={i}
                cx={sx} cy={sy} r={r}
                fill={`var(--gn-${p.genre})`}
                opacity={opacity}
                style={{ transition: 'opacity 240ms ease, r 240ms ease' }}
              />
            );
          })}
        </g>
        {/* uploaded book marker — only after upload classification settles */}
        {uploadedLanded && (() => {
          const [ux, uy] = window.projectPoint(window.UPLOAD_LANDING, W, H);
          return (
            <g>
              <circle cx={ux} cy={uy} r="12" fill="none" stroke="hsl(var(--uploaded-book))" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx={ux} cy={uy} r="5" fill="hsl(var(--uploaded-book))" />
            </g>
          );
        })()}
      </svg>
      <Legend selectedGenre={selectedGenre} />
      <KbdHint />
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'hsl(var(--primary) / 0.08)',
          border: '3px dashed hsl(var(--primary))',
          borderRadius: 12,
          margin: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 500, color: 'hsl(var(--primary))',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          Drop the file anywhere
        </div>
      )}
    </div>
  );
}

function Legend({ selectedGenre }) {
  return (
    <div className="legend">
      {window.GENRE_KEYS.map(g => (
        <div key={g} className={'item ' + (selectedGenre && selectedGenre !== g ? 'dim' : '')}>
          <span className="dot" style={{ background: `var(--gn-${g})` }} />
          {window.GENRE_LABELS[g]}
        </div>
      ))}
    </div>
  );
}

function KbdHint() {
  return (
    <div className="kbd-hint">
      <kbd>R</kbd> reset · <kbd>Esc</kbd> deselect · <kbd>1-4</kbd> projection
    </div>
  );
}

// ============================================================
// SIDEBAR — composed of many smaller pieces
// ============================================================
function Sidebar({
  selectedGenre, onSelectGenre,
  pointSize, opacity, tfidfThreshold, brightness,
  onSlider,
  view, onViewChange, onResetCamera,
  uploadState, onClassify, onRetry,
  showResult, classification, whyOpen, onToggleWhy,
}) {
  return (
    <aside className="sidebar" aria-label="Visualization controls">
      <div className="sb-title">Literary Genre Topology</div>

      <div>
        <div className="sb-label">Projection</div>
        <div className="proj-tabs" role="tablist">
          {['PCA', 'KPCA', 'UMAP', 't-SNE'].map((p, i) => (
            <button key={p} className={'pt ' + (i === 0 ? 'active' : '')} role="tab" aria-selected={i === 0}>{p}</button>
          ))}
        </div>
      </div>

      <GenreSelect selectedGenre={selectedGenre} onSelectGenre={onSelectGenre} />

      <button className="compare-btn"><span aria-hidden="true">⇆</span> Compare Genres</button>

      <div>
        <div className="sb-label">Display</div>
        <Slider label="Point Size"   value={pointSize}      min={0.1} max={2}    step={0.05} fmt={v => v.toFixed(2)} onChange={v => onSlider('pointSize', v)} />
      </div>
      <Slider label="Opacity"          value={opacity}        min={0}   max={1}    step={0.01} fmt={v => v.toFixed(2)} onChange={v => onSlider('opacity', v)} />
      <Slider label="TF-IDF Threshold" value={tfidfThreshold} min={0}   max={10}   step={0.1}  fmt={v => v.toFixed(2)} onChange={v => onSlider('tfidfThreshold', v)} variant="teal" />
      <Slider label="Brightness"       value={brightness}     min={0}   max={2}    step={0.05} fmt={v => v.toFixed(2)} onChange={v => onSlider('brightness', v)} variant="amber" />

      <div className="small-row">
        <button className={'pill-toggle ' + (view === '3d' ? 'active' : '')} onClick={() => onViewChange('3d')}>3D</button>
        <button className={'pill-toggle ' + (view === '2d' ? 'active' : '')} onClick={() => onViewChange('2d')}>2D</button>
        <button className="pill-toggle" onClick={onResetCamera}>↻ Reset</button>
      </div>

      <div className="search">
        <span aria-hidden="true">🔍</span>
        <input placeholder="Search words…" />
      </div>

      <UploadSection
        uploadState={uploadState}
        onClassify={onClassify}
        onRetry={onRetry}
        showResult={showResult}
        classification={classification}
        whyOpen={whyOpen}
        onToggleWhy={onToggleWhy}
      />
    </aside>
  );
}

function GenreSelect({ selectedGenre, onSelectGenre }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  const selectedColor = selectedGenre ? `var(--gn-${selectedGenre})` : undefined;
  return (
    <div ref={ref} style={{ position: 'relative' }} data-tour-id={window.TOUR_ANCHORS.genreSelect}>
      <div className="sb-label">Genre</div>
      <button
        className="select-button"
        onClick={() => setOpen(o => !o)}
        style={selectedGenre ? { borderColor: selectedColor, color: selectedColor, fontWeight: 500 } : undefined}
      >
        <span>{selectedGenre ? window.GENRE_LABELS[selectedGenre] : 'All Genres'}</span>
        <span className="caret">▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 6,
          boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
          padding: 4,
          zIndex: 20,
        }}>
          <button className="help-item" onClick={() => { onSelectGenre(null); setOpen(false); }}>
            <span className="ico" style={{ width: 8 }} />
            <span style={{ flex: 1 }}>All Genres</span>
          </button>
          {window.GENRE_KEYS.map(g => (
            <button
              key={g}
              className="help-item"
              onClick={() => { onSelectGenre(g); setOpen(false); }}
            >
              <span className="ico" style={{ width: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: `var(--gn-${g})` }} />
              </span>
              <span style={{ flex: 1 }}>{window.GENRE_LABELS[g]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange, variant }) {
  const pct = ((value - min) / (max - min)) * 100;
  const trackRef = useRef(null);
  const onPointer = useCallback((e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const v = min + Math.max(0, Math.min(1, x)) * (max - min);
    onChange(Math.round(v / step) * step);
  }, [min, max, step, onChange]);
  const onDown = (e) => {
    onPointer(e);
    const move = (ev) => onPointer(ev);
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };
  return (
    <div className={'slider-group ' + (variant || '')}>
      <div className="slider-row"><span>{label}</span><span className="val">{fmt ? fmt(value) : value}</span></div>
      <div className="slider-track" ref={trackRef} onMouseDown={onDown} role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} tabIndex={0}>
        <div className="slider-thumb" style={{ left: pct + '%' }} />
      </div>
    </div>
  );
}

// ============================================================
// UPLOAD SECTION  (manages drag/drop, progress, result, failure)
// ============================================================
function UploadSection({ uploadState, onClassify, onRetry, showResult, classification, whyOpen, onToggleWhy }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onClassify(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onChange = (e) => { onClassify(e.target.files[0]); e.target.value = ''; };

  const showZone = uploadState === 'idle' || uploadState === 'failure' || uploadState === 'done';

  return (
    <div className="upload-section">
      <div className="sb-label" style={{ marginBottom: 12 }}>Upload &amp; Classify</div>

      {showZone && (
        <>
          <div
            data-tour-id={window.TOUR_ANCHORS.uploadZone}
            className={'upload-zone ' + (dragOver ? 'dragging' : '')}
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            role="button"
            tabIndex={0}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
              <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
            </svg>
            <span className="head">Drop a book to classify</span>
            <span className="sub">.txt · ≤5MB · ≥500 words</span>
            <input ref={inputRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={onChange} />
          </div>

          {uploadState === 'idle' && (
            <div className="ghost-helper">
              <svg viewBox="0 0 80 50" width="60" height="38">
                <g opacity="0.4">
                  <circle cx="36" cy="24" r="1.4" fill="var(--gn-gothic_horror)"/>
                  <circle cx="42" cy="20" r="1"   fill="var(--gn-mystery)"/>
                  <circle cx="30" cy="28" r="1.2" fill="var(--gn-romance)"/>
                  <circle cx="46" cy="26" r="0.8" fill="var(--gn-literary)"/>
                  <circle cx="32" cy="20" r="0.8" fill="var(--gn-historical)"/>
                  <circle cx="40" cy="30" r="1"   fill="var(--gn-adventure)"/>
                  <circle cx="48" cy="22" r="0.8" fill="var(--gn-speculative)"/>
                </g>
                <circle cx="40" cy="25" r="4" fill="none" stroke="hsl(var(--uploaded-book))" strokeWidth="1.2" strokeDasharray="2 1.5"/>
                <circle cx="40" cy="25" r="1.6" fill="hsl(var(--uploaded-book))" opacity="0.7"/>
              </svg>
              <span>Your book will appear in the cloud — the marker shows where it'll land.</span>
            </div>
          )}
        </>
      )}

      {uploadState === 'uploading' && <UploadProgress />}

      {uploadState === 'failure' && (
        <FailureCard kind="encoding" onRetry={onRetry} />
      )}

      {uploadState === 'done' && classification && (
        <ClassificationResult
          classification={classification}
          whyOpen={whyOpen}
          onToggleWhy={onToggleWhy}
        />
      )}
    </div>
  );
}

function UploadProgress() {
  const steps = window.PIPELINE_STEPS;
  const [doneIds, setDoneIds] = useState([]);
  useEffect(() => {
    let cancelled = false;
    let t = 0;
    steps.forEach((s) => {
      t += s.ms;
      setTimeout(() => {
        if (!cancelled) setDoneIds(prev => [...prev, s.id]);
      }, t);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="progress-list">
      {steps.map((s, i) => {
        const isDone = doneIds.includes(s.id);
        const isActive = !isDone && doneIds.length === i;
        return (
          <div key={s.id} className={'progress-step ' + (isDone ? 'done' : isActive ? 'active' : '')}>
            <span className="ind">{isDone ? '✓' : ''}</span>
            <span style={{ flex: 1 }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function FailureCard({ kind, onRetry }) {
  const messages = {
    encoding: {
      title: "We couldn't read this file",
      desc: "Looks like the encoding wasn't UTF-8. Try saving the file as plain UTF-8 text and dropping it again.",
    },
  };
  const m = messages[kind] || messages.encoding;
  return (
    <div className="failure-card" data-tour-id={window.TOUR_ANCHORS.classificationResult}>
      <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
      </svg>
      <div className="body">
        <div className="title">{m.title}</div>
        <div className="desc">{m.desc}</div>
        <button className="retry" onClick={onRetry}>Try another file</button>
      </div>
    </div>
  );
}

function ClassificationResult({ classification, whyOpen, onToggleWhy }) {
  const [showMore, setShowMore] = useState(false);
  const top3 = classification.topN.slice(0, 3);
  const more = classification.topN.slice(3);
  return (
    <div className="result-card" data-tour-id={window.TOUR_ANCHORS.classificationResult}>
      <div className="head">
        Classification Result
        {classification.uncertain && <span className="uncertainty-badge">Uncertain</span>}
      </div>

      {top3.map(row => (
        <div key={row.genre} className="topn-bar">
          <div className="name">{window.GENRE_LABELS[row.genre]}</div>
          <div className="track"><div className="fill" style={{ width: (row.probability * 100).toFixed(1) + '%', background: `var(--gn-${row.genre})` }} /></div>
          <div className="prob">{row.probability.toFixed(2)}</div>
        </div>
      ))}

      {showMore && more.map(row => (
        <div key={row.genre} className="topn-bar" style={{ opacity: 0.75 }}>
          <div className="name">{window.GENRE_LABELS[row.genre]}</div>
          <div className="track"><div className="fill" style={{ width: (row.probability * 100).toFixed(1) + '%', background: `var(--gn-${row.genre})` }} /></div>
          <div className="prob">{row.probability.toFixed(2)}</div>
        </div>
      ))}

      <button className="expander" onClick={() => setShowMore(s => !s)}>
        {showMore ? '− Show top 3 only' : `+${more.length} more`}
      </button>

      <div className="oov">OOV words: {classification.oovCount.toLocaleString()} / {classification.totalWords.toLocaleString()}</div>

      <button
        className={'why-btn ' + (whyOpen ? 'active' : '')}
        onClick={onToggleWhy}
        data-tour-id={window.TOUR_ANCHORS.whyButton}
      >
        {whyOpen ? 'Hide explanation' : 'Why this genre?'}
      </button>

      <button className="view-scatter-btn">View in Scatter</button>

      {whyOpen && <ClassificationExplain classification={classification} />}
    </div>
  );
}

function ClassificationExplain({ classification }) {
  return (
    <div className="why-panel" data-tour-id={window.TOUR_ANCHORS.explainPanel}>
      <div className="why-section">
        <div className="why-label">5 Nearest Training Books</div>
        {classification.nearestBooks.map((b, i) => (
          <div key={i} className="nearest-book">
            <span className="gn" style={{ background: `var(--gn-${b.genre})` }} />
            <span className="title">{b.title} — <span style={{ opacity: 0.7 }}>{b.author}</span></span>
            <span className="dist">{b.distance.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="why-section">
        <div className="why-label">Track Contribution</div>
        {[['topology', classification.trackContrib.topology], ['vocabulary', classification.trackContrib.vocabulary]].map(([lab, v]) => (
          <div key={lab} className="contrib-row">
            <span className="lab">{lab}</span>
            <div className="track-mini"><div className="fill-mini" style={{ width: (v * 100).toFixed(0) + '%' }} /></div>
            <span className="pct">{(v * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      <div className="why-section">
        <div className="why-label">Driving Words</div>
        <div className="word-pills">
          {classification.drivingWords.map(w => <span key={w}>{w}</span>)}
        </div>
      </div>
      <div className="footnote-d51">
        <strong>Heads up.</strong> Macro-F1 is an upper bound on author-out-of-sample. Driving words are proxies, not literal classifier inputs.
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATES  (Compare + Topology tabs)
// ============================================================
function CompareEmpty() {
  return (
    <div className="empty-tab" data-tour-id={window.TOUR_ANCHORS.compareTab}>
      <div className="head-block">
        <h2>Pick two genres to compare</h2>
        <p>Shared color scale · same projection · synchronised camera. Compare reveals where two genres' vocabularies overlap and where they diverge.</p>
      </div>
      <div className="ghost-grid">
        <div className="ghost-panel" style={{ '--accent-color': 'var(--gn-mystery)', color: 'var(--gn-mystery)' }}>
          <div className="panel-head">
            <span className="label">GENRE A</span>
            <button className="pick-btn"><span>+</span> Pick genre</button>
          </div>
          <div className="ghost-scatter">
            <svg viewBox="0 0 120 80" style={{ width: '50%', opacity: 0.35 }}>
              {[[40,40,2.2],[56,32,1.6],[68,44,1.8],[50,52,1.4],[64,28,1.2],[78,56,1.4],[44,28,1.2],[80,38,1.4],[32,46,1.2]].map(([x,y,r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill="var(--gn-mystery)" />
              ))}
            </svg>
          </div>
          <div className="helper-text">brightness map will appear here</div>
        </div>

        <div className="ghost-panel" style={{ '--accent-color': 'var(--gn-romance)', color: 'var(--gn-romance)' }}>
          <div className="panel-head">
            <span className="label">GENRE B</span>
            <button className="pick-btn"><span>+</span> Pick genre</button>
          </div>
          <div className="ghost-scatter">
            <svg viewBox="0 0 120 80" style={{ width: '50%', opacity: 0.35 }}>
              {[[46,38,2],[58,32,1.6],[68,42,1.4],[52,50,1.2],[64,26,1.4],[76,50,1.2],[40,28,1],[78,34,1.4],[34,44,1.2]].map(([x,y,r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill="var(--gn-romance)" />
              ))}
            </svg>
          </div>
          <div className="helper-text">brightness map will appear here</div>
        </div>
      </div>
    </div>
  );
}

function TopologyEmpty() {
  return (
    <div className="topology-empty" data-tour-id={window.TOUR_ANCHORS.topologyTab}>
      <div className="ghost-heatmap" />
      <h2>Pick a genre to see its topology.</h2>
      <p>Topology shows the H₁ persistence image — the holes that survive as you zoom out. Pick a genre or book from the sidebar to compute it.</p>
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================
Object.assign(window, {
  TopNav, HelpDropdown, DisclaimerRibbon, Scatter, Legend, KbdHint,
  Sidebar, GenreSelect, Slider,
  UploadSection, UploadProgress, FailureCard, ClassificationResult, ClassificationExplain,
  CompareEmpty, TopologyEmpty,
});
