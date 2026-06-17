'use client';

import SplitText from './SplitText';
import Balance from './Balance';
import Magnetic from './Magnetic';

export default function Hero() {
  const scrollToDocket = () => {
    document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section style={{ paddingTop: 'clamp(5rem, 12vh, 9rem)', paddingBottom: '4rem' }}>
      <div
        className="shell"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
          gap: 'clamp(2rem, 6vw, 5rem)',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <span className="mono">Case No. — GL/000</span>
            <span className="mono">Network · Bradbury</span>
            <span className="mono" style={{ color: 'var(--verdigris)' }}>● Optimistic Democracy</span>
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(2.8rem, 8.5vw, 6.4rem)' }}>
            <SplitText text="Let the" />
            <br />
            <SplitText text="evidence" stagger={0.06} />{' '}
            <span style={{ color: 'var(--brass)', fontStyle: 'italic' }}>
              <SplitText text="decide." stagger={0.07} />
            </span>
          </h1>

          <p style={{ maxWidth: 460, marginTop: '1.8rem', color: 'var(--bone-dim)', fontSize: '1.05rem' }}>
            Two people disagree. Each submits their account and their proof. A panel of GenLayer
            validators reads the same record, weighs credibility, and independently arrives at the
            same fair verdict — no judge, no middleman, no trust required.
          </p>

          <div style={{ marginTop: '2.4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Magnetic>
              <button className="btn btn-solid" data-magnetic onClick={scrollToDocket}>
                Open a case →
              </button>
            </Magnetic>
            <a className="btn" data-magnetic href="#how">
              How it settles
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* Hero IS the mechanic: a balance resting at a real split verdict (30% fault A). */}
          <Balance faultA={30} resolved size={440} />
        </div>
      </div>
    </section>
  );
}
