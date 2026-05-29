// Reading Room — the guided tour.
// A spotlight that walks the reader through the actual room: each step
// navigates to its screen, dims everything but one live element, and pins
// a margin card beside it. Coordinates are computed in stage space so the
// overlay tracks elements through the 1240×780 letterboxed artboard.

const RR_STAGE_W = 1240;
const RR_STAGE_H = 780;

// route + anchor (a data-tour-id on a real element) + copy, in order.
window.RR_TOUR_STEPS = [
  {
    route: 'collection', anchor: 'plate',
    title: 'This is the plate.',
    body: 'Every catalogued novel is a point. Books that share vocabulary sit near one another — hover any point to read its margin note, click to open its card.',
  },
  {
    route: 'collection', anchor: 'catalog-rail',
    title: 'Browse by region.',
    body: 'The card catalog runs down the left. Click a genre to light up its region and dim the rest of the corpus; click it again to clear.',
  },
  {
    route: 'card', anchor: 'catalog-card',
    title: 'Each book has a card.',
    body: 'A Library-of-Congress-style entry: shelfmark, driving vocabulary, and the five works nearest it in the embedding. Follow a neighbour to keep wandering.',
  },
  {
    route: 'topology', anchor: 'topology-plate',
    title: 'See a region’s shape.',
    body: 'The Topology plate reads one region three ways — a growing web of word-distances, the loops that persist as the radius widens, and the fingerprint the classifier consumes. Drag the radius and watch loops form, then fill in.',
  },
  {
    route: 'study', anchor: 'study-pickers',
    title: 'Set two regions against each other.',
    body: 'Pick any pair from these two dials. The folio shows what their vocabularies share and where they part company, with an Editor’s note on the overlap.',
  },
  {
    route: 'upload', anchor: 'reading-desk',
    title: 'Submit a text of your own.',
    body: 'Paste a passage onto the desk and ask for a reading — a short essay placing your manuscript among its likely neighbours, with footnotes you can open.',
  },
];

function RRTour({ state, dispatch, palette, accent }) {
  const steps = window.RR_TOUR_STEPS;
  const step = state.tourStep || 0;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const [rect, setRect] = React.useState(null);

  const next = React.useCallback(() => {
    if (isLast) dispatch({ type: 'endTour' });
    else dispatch({ type: 'tourSetStep', step: step + 1 });
  }, [isLast, step, dispatch]);
  const prev = React.useCallback(() => {
    if (!isFirst) dispatch({ type: 'tourSetStep', step: step - 1 });
  }, [isFirst, step, dispatch]);
  const end = React.useCallback(() => dispatch({ type: 'endTour' }), [dispatch]);

  // Navigate to this step's screen.
  React.useEffect(() => {
    if (current && state.route !== current.route) {
      dispatch({ type: 'goto', route: current.route });
    }
    // reset the highlight while the new screen mounts
    setRect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Track the live anchor in stage space; advance silently if it never mounts.
  React.useEffect(() => {
    if (!current) return;
    let skipTimer = null;
    function update() {
      const stage = document.querySelector('[data-rr-stage]');
      const el = document.querySelector(`[data-tour-id="${current.anchor}"]`);
      if (!stage || !el) {
        if (skipTimer == null) {
          skipTimer = setTimeout(() => {
            skipTimer = null;
            if (!document.querySelector(`[data-tour-id="${current.anchor}"]`) && !isLast) {
              dispatch({ type: 'tourSetStep', step: step + 1 });
            }
          }, 700);
        }
        return;
      }
      if (skipTimer != null) { clearTimeout(skipTimer); skipTimer = null; }
      const sR = stage.getBoundingClientRect();
      const scale = sR.width / RR_STAGE_W || 1;
      const aR = el.getBoundingClientRect();
      setRect({
        top: (aR.top - sR.top) / scale,
        left: (aR.left - sR.left) / scale,
        width: aR.width / scale,
        height: aR.height / scale,
      });
    }
    update();
    const iv = setInterval(update, 200);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(iv);
      window.removeEventListener('resize', update);
      if (skipTimer != null) clearTimeout(skipTimer);
    };
  }, [step, current, isLast, dispatch, state.route]);

  // Keyboard: Esc skips, arrows navigate.
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); end(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, prev, end]);

  if (!current) return null;

  const PAD = 10;
  // Card sits in the quadrant opposite the highlighted element.
  const cx = rect ? rect.left + rect.width / 2 : RR_STAGE_W / 2;
  const cy = rect ? rect.top + rect.height / 2 : RR_STAGE_H * 0.7;
  const M = 26;
  const cardW = 340;
  const cardPos = { position: 'absolute', width: cardW, zIndex: 1003 };
  if (cx > RR_STAGE_W / 2) cardPos.left = M; else cardPos.right = M;
  if (cy > RR_STAGE_H / 2) cardPos.top = M; else cardPos.bottom = M;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, fontFamily: 'Spectral, serif' }}>
      {/* click-catcher: blocks interaction with the room beneath, no accidental dismiss */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1000, cursor: 'default' }} aria-hidden="true" />

      {/* spotlight: four dim panels frame the live anchor, leaving it lit */}
      {rect && (() => {
        const h = { t: rect.top - PAD, l: rect.left - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 };
        const dim = 'rgba(38,33,27,0.46)';
        const band = (style) => (
          <div aria-hidden="true" style={{ position: 'absolute', background: dim, zIndex: 1001, pointerEvents: 'none', ...style }} />
        );
        return (
          <React.Fragment>
            {band({ top: 0, left: 0, width: RR_STAGE_W, height: Math.max(0, h.t) })}
            {band({ top: h.t + h.h, left: 0, width: RR_STAGE_W, height: Math.max(0, RR_STAGE_H - (h.t + h.h)) })}
            {band({ top: h.t, left: 0, width: Math.max(0, h.l), height: h.h })}
            {band({ top: h.t, left: h.l + h.w, width: Math.max(0, RR_STAGE_W - (h.l + h.w)), height: h.h })}
            {/* the lit frame */}
            <div aria-hidden="true" style={{
              position: 'absolute',
              top: h.t, left: h.l, width: h.w, height: h.h,
              border: `1.5px solid ${accent}`,
              zIndex: 1002, pointerEvents: 'none',
              transition: 'top 300ms cubic-bezier(0.4,0,0.2,1), left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1), height 300ms cubic-bezier(0.4,0,0.2,1)',
            }}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{
                  position: 'absolute',
                  top: i < 2 ? -1 : 'auto', bottom: i >= 2 ? -1 : 'auto',
                  left: i % 2 === 0 ? -1 : 'auto', right: i % 2 === 1 ? -1 : 'auto',
                  width: 9, height: 9,
                  borderTop: i < 2 ? `2px solid ${accent}` : 'none',
                  borderBottom: i >= 2 ? `2px solid ${accent}` : 'none',
                  borderLeft: i % 2 === 0 ? `2px solid ${accent}` : 'none',
                  borderRight: i % 2 === 1 ? `2px solid ${accent}` : 'none',
                }} />
              ))}
            </div>
          </React.Fragment>
        );
      })()}

      {/* margin card */}
      <div role="dialog" aria-modal="true" style={{
        ...cardPos,
        background: palette.card,
        border: `1px solid ${palette.ink}`,
        boxShadow: `6px 6px 0 ${palette.ink}33`,
        padding: '18px 20px 16px',
        color: palette.ink,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
            letterSpacing: '0.16em', color: palette.muted, whiteSpace: 'nowrap',
          }}>STOP {step + 1} / {steps.length}</span>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {steps.map((_, i) => (
              <span key={i} style={{
                height: 3, flex: 1,
                background: i <= step ? accent : `${palette.ink}22`,
                transition: 'background 220ms ease',
              }} />
            ))}
          </div>
        </div>

        <h3 style={{
          margin: '0 0 8px',
          fontFamily: 'Spectral, serif', fontStyle: 'italic', fontWeight: 500,
          fontSize: 21, lineHeight: 1.15,
        }}>{current.title}</h3>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: palette.ink }}>{current.body}</p>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={end} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: palette.muted,
          }}>End tour</button>
          <div style={{ flex: 1 }} />
          <button onClick={prev} disabled={isFirst} style={{
            all: 'unset', cursor: isFirst ? 'not-allowed' : 'pointer',
            padding: '6px 14px', border: `1px solid ${palette.ink}55`,
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13,
            color: palette.ink, opacity: isFirst ? 0.35 : 1,
          }}>← Back</button>
          <button onClick={next} style={{
            all: 'unset', cursor: 'pointer',
            padding: '6px 16px', background: palette.ink, color: palette.paper,
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13,
          }}>{isLast ? 'Done' : 'Next →'}</button>
        </div>
      </div>

      <style>{`@keyframes rr-tour-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

Object.assign(window, { RRTour });
