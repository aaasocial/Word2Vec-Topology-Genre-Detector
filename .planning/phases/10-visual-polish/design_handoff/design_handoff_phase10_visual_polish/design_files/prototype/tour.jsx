// Phase 10 prototype — tour.jsx
// Hand-rolled tour overlay. Reads TOUR_STEPS from window, looks up the
// data-tour-id anchor for the current step, glows around it, pins a card
// to the bottom-right. PITFALLS §14 — missing-anchor fallback is 'skip'.

const { useState: _u, useRef: _ur, useEffect: _ue, useCallback: _uc } = React;

function findAnchor(anchorId) {
  return document.querySelector(`[data-tour-id="${anchorId}"]`);
}

function TourOverlay({ step, onPrev, onNext, onSkip, onClose }) {
  const steps = window.TOUR_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const [rect, setRect] = _u(null);

  // Recompute the anchor rect on step change + window resize.
  // PITFALLS §14: missing anchor → silently skip to next step.
  _ue(() => {
    if (!current) return;
    let raf = null;
    function update() {
      const el = findAnchor(current.anchor);
      if (!el) {
        // skip silently after a short delay (anchor may mount on tab switch)
        const t = setTimeout(() => {
          if (!findAnchor(current.anchor)) {
            if (isLast) onClose();
            else onNext();
          }
        }, 600);
        return () => clearTimeout(t);
      }
      // Scroll into view if needed (sidebar items)
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const iv = setInterval(update, 250);   // catch transition-driven layout shifts
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (raf) cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, [step, current, isLast, onClose, onNext]);

  // Keyboard nav
  _ue(() => {
    function onKey(e) {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft' && !isFirst) onPrev();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onPrev, onNext, onSkip, isFirst]);

  if (!current) return null;

  // Glow ring padding around the anchor
  const PAD = 8;

  return (
    <>
      {/* Dim layer — covers entire viewport */}
      <div className="tour-dim" onClick={onSkip} aria-hidden="true" />

      {/* Anchor glow ring — positioned over the live anchor */}
      {rect && (
        <div
          className="tour-anchor-glow"
          style={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            background: 'transparent',
          }}
          aria-hidden="true"
        />
      )}

      {/* Tour card — pinned bottom-right of viewport */}
      <div
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={{
          bottom: 28,
          right: 28,
        }}
      >
        <div className="step-row">
          <span className="step-label">STEP {step + 1} / {steps.length}</span>
          <div className="dots">
            {steps.map((_, i) => (
              <span key={i} className={'dot ' + (i <= step ? 'done' : '')} />
            ))}
          </div>
        </div>
        <h3 id="tour-title">{current.title}</h3>
        <div className="body">{current.body}</div>
        <div className="nav">
          <button className="skip-btn" onClick={onSkip} type="button">Skip tour</button>
          <div className="nav-spacer" />
          <button className="back-btn" onClick={onPrev} disabled={isFirst} type="button">← Back</button>
          <button className="next-btn" onClick={isLast ? onClose : onNext} type="button">
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}

window.TourOverlay = TourOverlay;
