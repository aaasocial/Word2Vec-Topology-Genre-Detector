// Reading Room — top-level app: state, router, tweaks panel, footnote host.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "paper":   "cream",
  "accent":  "oxblood",
  "density": "carrel",
  "register": "scholarly"
}/*EDITMODE-END*/;

const FOOTNOTES = {
  '1': {
    title: 'On the projection.',
    body: <>The plate uses UMAP with neighbourhood = 15, min-dist = 0.10. UMAP preserves local neighbourhoods well but distorts global distance — two regions that look adjacent on the plane may not be adjacent in the embedding.</>,
  },
  '2': {
    title: 'On the neighbourhood.',
    body: <>“Neighbourhood” here means the five works with the smallest cosine distance in the embedding, not the five visually closest on the plate. The plate is a projection; the distance is real.</>,
  },
  '3': {
    title: 'On shared vocabulary.',
    body: <>The shared list shows the highest-weighted overlap between two regions’ vocabularies, where weight is computed as TF-IDF against the rest of the corpus. A word appears only if both regions use it more than the corpus average.</>,
  },
  '4': {
    title: 'The centroid track.',
    body: <>Every word in the submitted text is looked up in the embedding. The text’s position is the inverse-frequency-weighted mean of those lookups. Genres are scored by the cosine distance of the text’s centroid to each genre’s centroid.</>,
  },
  '5': {
    title: 'The topology track.',
    body: <>Persistent homology turns the text’s vocabulary into a point cloud and reads the lifetimes of the holes that form as the scale grows. Texts with similar “shapes” — long-lived 0- and 1-dimensional features — score as similar regardless of their average position.</>,
  },
  '6': {
    title: 'On marginal verdicts.',
    body: <>A confidence below 0.80 is reported as <em>marginal</em>. ~22% of catalogued works receive a marginal reading on their own corpus, which is consistent with literary practice: most novels sit close to a border.</>,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'goto':         return { ...state, route: action.route };
    case 'setGenre':     return { ...state, genreFilter: action.genre };
    case 'hoverBook':    return { ...state, hoveredBookId: action.id };
    case 'pickBook':     return { ...state, selectedBookId: action.id };
    case 'setStudy':     return action.side === 'A'
                          ? { ...state, studyA: action.id }
                          : { ...state, studyB: action.id };
    case 'completeReading': return { ...state, hasUploadedText: true };
    case 'setProjection':   return { ...state, projection: action.value };
    case 'setDim':          return { ...state, dim: action.value };
    case 'setGuide':        return { ...state, guideOpen: action.value };
    case 'startTour':       return { ...state, guideOpen: false, tourActive: true, tourStep: 0 };
    case 'tourSetStep':     return { ...state, tourStep: action.step };
    case 'endTour':         return { ...state, tourActive: false };
    default: return state;
  }
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const palette = window.RR_PALETTES[t.paper] || window.RR_PALETTES.cream;
  const accent  = window.RR_ACCENTS[t.accent] || window.RR_ACCENTS.oxblood;

  const [state, dispatch] = React.useReducer(reducer, {
    route: 'landing',
    genreFilter: null,
    hoveredBookId: null,
    selectedBookId: 'wh',
    studyA: 'mystery',
    studyB: 'romance',
    hasUploadedText: false,
    projection: 'UMAP',
    dim: '2D',
    guideOpen: false,
    tourActive: false,
    tourStep: 0,
  });

  // First-run: open the Guide once for newcomers (persist via localStorage)
  React.useEffect(() => {
    try {
      const seen = localStorage.getItem(window.GUIDE_SEEN_KEY);
      if (!seen) {
        dispatch({ type: 'setGuide', value: true });
        localStorage.setItem(window.GUIDE_SEEN_KEY, '1');
      }
    } catch (e) {}
  }, []);

  const goTo = (route) => {
    dispatch({ type: 'goto', route });
  };
  const openGuide = () => dispatch({ type: 'setGuide', value: true });
  const closeGuide = () => dispatch({ type: 'setGuide', value: false });

  const screenProps = { palette, accent, goTo, state, dispatch, density: t.density, openGuide };
  const screen = (() => {
    switch (state.route) {
      case 'landing':     return <Landing     {...screenProps} />;
      case 'collection':  return <Collection  {...screenProps} />;
      case 'topology':    return <Topology    {...screenProps} />;
      case 'card':        return <Card        {...screenProps} />;
      case 'study':       return <Study       {...screenProps} />;
      case 'upload':      return state.hasUploadedText
        ? <Verdict {...screenProps} />
        : <Upload  {...screenProps} />;
      case 'verdict':     return <Verdict     {...screenProps} />;
      case 'about':       return <About       {...screenProps} />;
      default:            return <Landing     {...screenProps} />;
    }
  })();

  return (
    <Stage>
      <FootnoteHost notes={FOOTNOTES} palette={palette} accent={accent}>
        <div data-rr-stage style={{
          width: '100%', height: '100%',
          background: palette.paper, color: palette.ink,
          position: 'relative', overflow: 'hidden',
        }}>
          <style>{`::selection { background: ${accent}33; }`}</style>
          {screen}
          <Guide
            open={state.guideOpen}
            onClose={closeGuide}
            palette={palette} accent={accent}
            goTo={goTo} dispatch={dispatch}
          />
          {state.tourActive && (
            <RRTour state={state} dispatch={dispatch} palette={palette} accent={accent} />
          )}
        </div>
      </FootnoteHost>
      <TweaksPanel>
        <TweakSection label="Paper" />
        <TweakRadio
          label="Warmth"
          value={t.paper}
          options={['cream', 'bone', 'ivory', 'newsprint']}
          onChange={(v) => setTweak('paper', v)}
        />
        <TweakSection label="Accent" />
        <TweakColor
          label="Mark"
          value={accent}
          options={Object.values(window.RR_ACCENTS)}
          onChange={(v) => {
            const id = Object.entries(window.RR_ACCENTS).find(([k, val]) => val === v)?.[0] || 'oxblood';
            setTweak('accent', id);
          }}
        />
        <TweakSection label="Density" />
        <TweakRadio
          label="Layout"
          value={t.density}
          options={['carrel', 'study']}
          onChange={(v) => setTweak('density', v)}
        />
      </TweaksPanel>
    </Stage>
  );
}

// ────────────────────────────────────────────────────────────────
// Stage — pins everything to a 1240×780 canvas and scales it to fit.
// Letterboxes on a warm grey so the artboard always looks intentional.
// ────────────────────────────────────────────────────────────────
const STAGE_W = 1240;
const STAGE_H = 780;
function Stage({ children }) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const fit = () => {
      const sx = window.innerWidth  / STAGE_W;
      const sy = window.innerHeight / STAGE_H;
      setScale(Math.min(sx, sy, 1));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#D8D4C8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        width: STAGE_W, height: STAGE_H,
        transform: `scale(${scale})`, transformOrigin: 'center center',
        flexShrink: 0, position: 'relative',
        boxShadow: '0 24px 70px rgba(0,0,0,0.22)',
      }}>
        {children}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
