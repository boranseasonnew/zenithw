import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background, Footer, Headline, TopBrand, palette, rise} from './Shared';

export const AndroidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [75, 155], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, Arial, sans-serif'}}>
      <Background glow="violet" />
      <TopBrand label="ANDROID / 03" />
      <Headline eyebrow="02 — ON THE MOVE" title={<>KEEP<br /><span style={{color: palette.violet}}>MOVING.</span></>}
        sub="Your downloads, right there on Android." accent={palette.violet} />
      <div style={{position: 'absolute', top: 820, left: 276, width: 528, height: 850, borderRadius: 72,
        background: '#05070b', border: '12px solid #353849', boxShadow: '0 55px 140px rgba(0,0,0,.65),0 0 90px rgba(157,140,255,.16)',
        overflow: 'hidden', ...rise(frame, 18, 115)}}>
        <div style={{position: 'absolute', top: 12, left: 179, width: 146, height: 27, borderRadius: 30,
          background: '#020305', zIndex: 5}} />
        <div style={{padding: '82px 38px 40px'}}>
          <div style={{fontFamily: 'Geist Mono, monospace', color: palette.violet, letterSpacing: 3, fontSize: 20}}>ZENITHW / ANDROID</div>
          <div style={{fontSize: 50, color: palette.white, fontWeight: 850, letterSpacing: -2, marginTop: 33,
            lineHeight: 1.04}}>Ready to save<br />on the go.</div>
          <div style={{background: '#141825', border: '1px solid rgba(255,255,255,.13)', borderRadius: 20,
            marginTop: 48, height: 89, display: 'flex', alignItems: 'center', padding: '0 23px', gap: 17,
            color: palette.muted, fontSize: 24}}>
            <span style={{color: palette.violet, fontSize: 30}}>↗</span> Paste your link
          </div>
          <div style={{display: 'flex', gap: 13, marginTop: 24}}>
            {['VIDEO', 'AUDIO'].map((label, index) => (
              <div key={label} style={{flex: 1, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 16, background: index === 0 ? 'rgba(157,140,255,.24)' : '#141825',
                border: '1px solid ' + (index === 0 ? 'rgba(157,140,255,.6)' : 'rgba(255,255,255,.1)'),
                color: index === 0 ? '#c9bfff' : palette.muted, fontSize: 21, fontWeight: 800}}>{label}</div>
            ))}
          </div>
          <div style={{marginTop: 58, background: 'linear-gradient(145deg,#1a2030,#101521)', borderRadius: 26,
            padding: 27, border: '1px solid rgba(255,255,255,.09)'}}>
            <div style={{color: palette.white, fontSize: 26, fontWeight: 700}}>Your download</div>
            <div style={{color: palette.muted, fontSize: 19, marginTop: 10}}>Ready when you are</div>
            <div style={{height: 10, borderRadius: 10, background: '#303547', marginTop: 30, overflow: 'hidden'}}>
              <div style={{height: '100%', width: progress + '%', borderRadius: 10,
                background: 'linear-gradient(90deg,#8f77ff,#9fd8ff)'}} />
            </div>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', top: 1500, left: 80, transform: 'rotate(-7deg)', background: palette.violet,
        color: '#0a0910', padding: '23px 31px', borderRadius: 16, fontSize: 28, fontWeight: 900,
        boxShadow: '0 20px 60px rgba(157,140,255,.32)', ...rise(frame, 45)}}>ON THE GO ↗</div>
      <Footer left="ZENITHW FOR ANDROID" index={3} />
    </AbsoluteFill>
  );
};
