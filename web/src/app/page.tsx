import Hero from '@/components/Hero';
import Reveal from '@/components/Reveal';
import Marquee from '@/components/Marquee';
import Stat from '@/components/Stat';
import ConsensusScroll from '@/components/ConsensusScroll';
import CaseConsole from '@/components/CaseConsole';

const QUESTIONS = [
  { k: '01', q: 'Who is more credible?', d: 'Each account is weighed against the evidence behind it, not the volume of words.' },
  { k: '02', q: 'What facts are agreed?', d: 'The panel separates common ground from genuine conflict before ruling.' },
  { k: '03', q: 'Who broke the agreement?', d: 'Violations are named against the terms both parties actually accepted.' },
  { k: '04', q: 'What is a fair resolution?', d: 'A concrete, proportional remedy — not a vague opinion.' },
];

export default function Page() {
  return (
    <main>
      <Hero />

      <Marquee />

      {/* The four questions every panel answers */}
      <section style={{ padding: '5rem 0' }}>
        <div className="shell">
          <Reveal>
            <span className="eyebrow">What the tribunal answers</span>
          </Reveal>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
              marginTop: '2.5rem',
            }}
          >
            {QUESTIONS.map((item, i) => (
              <Reveal key={item.k} delay={i * 0.08}>
                <div style={{ borderTop: '1px solid var(--line-strong)', paddingTop: '1.2rem', height: '100%' }}>
                  <span className="mono" style={{ color: 'var(--brass)' }}>
                    {item.k}
                  </span>
                  <h3 className="display" style={{ fontSize: '1.4rem', margin: '0.6rem 0' }}>
                    {item.q}
                  </h3>
                  <p style={{ color: 'var(--bone-dim)', fontSize: '0.92rem' }}>{item.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* By the numbers — real properties of the contract, counted up on view */}
      <section style={{ padding: '4rem 0', borderTop: '1px solid var(--line)' }}>
        <div className="shell">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2.5rem',
            }}
          >
            <Reveal>
              <Stat to={5} label="Validators re-run each case" />
            </Reveal>
            <Reveal delay={0.08}>
              <Stat to={4} label="Deterministic verdict fields" />
            </Reveal>
            <Reveal delay={0.16}>
              <Stat to={100} suffix="%" label="Independently reproduced" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pinned, scrubbed mechanic moment */}
      <section id="how">
        <ConsensusScroll />
      </section>

      {/* The interactive court */}
      <section id="console" style={{ padding: '6rem 0', borderTop: '1px solid var(--line)' }}>
        <div className="shell">
          <Reveal>
            <span className="eyebrow">The court</span>
            <h2 className="display" style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', margin: '0.8rem 0 3rem' }}>
              File a case, answer the charge, summon the verdict.
            </h2>
          </Reveal>
          <CaseConsole />
        </div>
      </section>

      <footer style={{ padding: '3rem 0', borderTop: '1px solid var(--line)' }}>
        <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <span className="display" style={{ fontSize: '1.4rem' }}>
            Judge<span style={{ color: 'var(--brass)' }}>AI</span>
          </span>
          <span className="mono">Verdicts settled by GenLayer Optimistic Democracy · Bradbury testnet</span>
        </div>
      </footer>
    </main>
  );
}
