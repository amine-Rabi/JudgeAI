// An infinite editorial ticker — the signature motion-site strip. The set is
// rendered twice so the -50% keyframe loops seamlessly. Pure CSS: no JS, and
// the global reduced-motion rule freezes it for those who opt out.
const WORDS = ['Credibility', 'Evidence', 'Consensus', 'Fault', 'Resolution', 'Reproduced'];

function Set({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <>
      {WORDS.map((w, i) => (
        <span key={`${w}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2.2rem' }} aria-hidden={ariaHidden || undefined}>
          <span className="marquee-word">{w}</span>
          <span className="marquee-mark">◆</span>
        </span>
      ))}
    </>
  );
}

export default function Marquee() {
  return (
    <div className="marquee" role="presentation">
      <div className="marquee-track">
        <Set />
        <Set ariaHidden />
      </div>
    </div>
  );
}
