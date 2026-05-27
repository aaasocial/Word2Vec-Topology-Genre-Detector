// Phase 10 prototype — app.jsx
// Main App component, ReactDOM root.

const { useState: useS, useEffect: useE, useCallback: useCb, useRef: useR } = React;

const STORAGE_KEY = 'p10-proto-prefs-v1';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function applyTheme(theme) {
  let effective = theme;
  if (theme === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.classList.toggle('light', effective === 'light');
}

function App() {
  const initial = loadPrefs();

  // ---- preferences (persisted) ----
  const [theme, setTheme] = useS(initial.theme || 'system');
  const [tourCompleted, setTourCompleted] = useS(!!initial.tourCompleted);

  // ---- session state ----
  const [activeTab, setActiveTab] = useS('scatter');
  const [selectedGenre, setSelectedGenre] = useS(null);
  const [helpOpen, setHelpOpen] = useS(false);
  const [view, setView] = useS('3d');
  const [sliders, setSliders] = useS({ pointSize: 0.5, opacity: 1, tfidfThreshold: 0, brightness: 1 });

  const [uploadState, setUploadState] = useS('idle');   // idle | uploading | done | failure
  const [classification, setClassification] = useS(null);
  const [whyOpen, setWhyOpen] = useS(false);
  const [isDraggingFile, setIsDraggingFile] = useS(false);

  const [tourActive, setTourActive] = useS(false);
  const [tourStep, setTourStep] = useS(0);

  // ---- apply + persist theme ----
  useE(() => { applyTheme(theme); }, [theme]);
  useE(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
  useE(() => { savePrefs({ ...loadPrefs(), theme, tourCompleted }); }, [theme, tourCompleted]);

  // ---- first-load tour ----
  useE(() => {
    if (!tourCompleted) {
      // small delay so the layout settles before the anchor is measured
      const t = setTimeout(() => { setTourActive(true); setTourStep(0); }, 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- whole-window drag to highlight upload zone ----
  useE(() => {
    const onDragEnter = (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
        setIsDraggingFile(true);
      }
    };
    const onDragLeave = (e) => {
      if (e.clientX === 0 && e.clientY === 0) setIsDraggingFile(false);
    };
    const onDrop = () => setIsDraggingFile(false);
    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  // ---- handlers ----
  const onClassify = useCb((file) => {
    if (!file) return;
    // simulate a failure ~12% of the time so the failure card is reachable
    const willFail = Math.random() < 0.12;
    setUploadState('uploading');
    setWhyOpen(false);
    const total = window.PIPELINE_STEPS.reduce((s, p) => s + p.ms, 0);
    setTimeout(() => {
      if (willFail) {
        setUploadState('failure');
        setClassification(null);
      } else {
        setUploadState('done');
        setClassification(window.SAMPLE_CLASSIFICATION);
      }
    }, total + 220);
  }, []);

  const onRetry = useCb(() => {
    setUploadState('idle');
    setClassification(null);
  }, []);

  const onSliderChange = useCb((key, v) => {
    setSliders(prev => ({ ...prev, [key]: v }));
  }, []);

  const onReplayTour = useCb(() => {
    setTourCompleted(false);
    setTourStep(0);
    setTourActive(true);
  }, []);

  const tourNext = useCb(() => {
    const next = tourStep + 1;
    if (next >= window.TOUR_STEPS.length) {
      setTourActive(false);
      setTourCompleted(true);
    } else {
      // some anchors live on other tabs; switch tab proactively
      const targetAnchor = window.TOUR_STEPS[next].anchor;
      if (targetAnchor === window.TOUR_ANCHORS.topologyTab) {
        // keep on scatter — the tab itself is the anchor
      }
      setTourStep(next);
    }
  }, [tourStep]);

  const tourPrev = useCb(() => { setTourStep(s => Math.max(0, s - 1)); }, []);

  const tourSkip = useCb(() => {
    setTourActive(false);
    setTourCompleted(true);
  }, []);

  const tourClose = useCb(() => {
    setTourActive(false);
    setTourCompleted(true);
  }, []);

  // ---- render ----
  return (
    <div className="app-root">
      <window.TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        helpOpen={helpOpen}
        onHelpToggle={() => setHelpOpen(o => !o)}
        onSettingsClick={() => { /* no-op in proto */ }}
        onHowItWorksClick={() => { /* no-op in proto */ }}
      />
      <window.DisclaimerRibbon />

      <div className="main">
        {activeTab === 'scatter' && (
          <window.Scatter
            selectedGenre={selectedGenre}
            uploadedLanded={uploadState === 'done'}
            isDragging={isDraggingFile && uploadState !== 'uploading'}
          />
        )}
        {activeTab === 'topology' && <window.TopologyEmpty />}
        {activeTab === 'compare'  && <window.CompareEmpty  />}

        <window.Sidebar
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
          pointSize={sliders.pointSize}
          opacity={sliders.opacity}
          tfidfThreshold={sliders.tfidfThreshold}
          brightness={sliders.brightness}
          onSlider={onSliderChange}
          view={view}
          onViewChange={setView}
          onResetCamera={() => {}}
          uploadState={uploadState}
          onClassify={onClassify}
          onRetry={onRetry}
          showResult={uploadState === 'done'}
          classification={classification}
          whyOpen={whyOpen}
          onToggleWhy={() => setWhyOpen(o => !o)}
        />
      </div>

      {helpOpen && (
        <window.HelpDropdown
          theme={theme}
          onThemeChange={setTheme}
          onReplayTour={onReplayTour}
          onHowItWorks={() => {/* no-op */}}
          onClose={() => setHelpOpen(false)}
        />
      )}

      {tourActive && (
        <window.TourOverlay
          step={tourStep}
          onPrev={tourPrev}
          onNext={tourNext}
          onSkip={tourSkip}
          onClose={tourClose}
        />
      )}
    </div>
  );
}

// ---- mount ----
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
