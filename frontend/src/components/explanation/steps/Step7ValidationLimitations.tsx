// Phase 9 D-51 — walkthrough disclaimer for author-leakage caveat (slow-read surface).
// Canonical copy locked in 09-RESEARCH.md Q10. Do NOT paraphrase.
// D-53 governance: copy frames the v2 caveat as an "upper bound" only — never any
// retraction term (see 09-CONTEXT.md `<research_inherited>` E. for the forbidden-terms
// list). This is the inheritance commitment from Phase 8 D-31 (ship-with-disclaimer,
// no retraction of v2 claims). Any future edit MUST preserve the "upper bound" framing.
// v2.1 closes the author-leakage gap, not v2.
export function Step7ValidationLimitations() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
        Validation &amp; Limitations
      </h3>
      <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 16px' }}>
          The v2 classifier was evaluated on a 20-book hold-out drawn from authors
          already represented in the training corpus. The reported macro-F1 of 0.74
          is an <strong style={{ color: 'hsl(var(--foreground))' }}>upper bound</strong> — for books
          by authors not in the training set (which is most real uploads), expect a
          wider confidence band.
        </p>
        <p style={{ margin: '0 0 16px' }}>
          The &ldquo;Why this genre?&rdquo; panel surfaces the per-prediction signal
          that lets you judge confidence for yourself: nearest training books,
          per-track contribution, and an uncertainty badge that fires when the top
          predictions are close.
        </p>
        <p style={{ margin: 0 }}>
          <a
            href="https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/results/v2_validation_report.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'hsl(var(--primary))' }}
          >
            Read the full validation report &rarr;
          </a>
        </p>
      </div>
    </div>
  )
}
