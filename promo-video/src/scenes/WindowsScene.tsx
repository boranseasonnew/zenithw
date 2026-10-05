import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background, Footer, GlassCard, Headline, TopBrand, palette, rise} from './Shared';

export const WindowsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [65, 160], [8, 86], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, Arial, sans-serif'}}>
      <Background glow="violet" />
      <TopBrand label="WINDOWS / 04" />
      <Headline eyebrow="03 — AT YOUR DESK" title={<>OWN YOUR<br /><span style={{color: palette.violet}}>WORKFLOW.</span></>}
        sub="ZenithW Desktop for your Windows PC." accent={palette.violet} />
      <div style={{position: 'absolute', top: 875, left: 67, right: 67, ...rise(frame, 19, 90)}}>
        <GlassCard style={{height: 625, borderRadius: 28, overflow: 'hidden', border: '9px solid #34384b'}}>
          <div style={{height: 70, background: '#0d1019', borderBottom: '1px solid rgba(255,255,255,.1)',
            display: 'flex', alignItems: 'center', padding: '0 27px', color: palette.white,
            fontSize: 25, fontWeight: 800}}>
            <span style={{color: palette.violet, marginRight: 13}}>Z!</span> ZenithW Desktop
            <span style={{marginLeft: 'auto', color: palette.muted, fontSize: 21}}>– □ ×</span>
          </div>
          <div style={{display: 'flex', height: 555}}>
            <div style={{width: 230, background: '#0d111b', borderRight: '1px solid rgba(255,255,255,.08)',
              padding: '42px 22px', display: 'flex', flexDirection: 'column', gap: 29,
              color: palette.muted, fontSize: 19}}>
              <div style={{color: palette.violet, fontWeight: 800}}>◆ Home</div>
              <div>↓ Downloads</div>
              <div>⚙ Settings</div>
            </div>
            <div style={{flex: 1, padding: '45px 46px'}}>
              <div style={{fontFamily: 'Geist Mono, monospace', color: palette.violet,
                letterSpacing: 2, fontSize: 20}}>LOCAL DESKTOP EXPERIENCE</div>
              <div style={{color: palette.white, fontWeight: 850, fontSize: 48, marginTop: 17, letterSpacing: -2}}>The file stays with you.</div>
              <div style={{marginTop: 43, height: 74, display: 'flex', alignItems: 'center', padding: '0 24px',
                color: palette.muted, background: '#111725', border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 16, fontSize: 22}}>↗ Paste a link to begin</div>
              <div style={{background: '#141a29', border: '1px solid rgba(255,255,255,.08)', borderRadius: 17,
                marginTop: 33, padding: 25}}>
                <div style={{display: 'flex', justifyContent: 'space-between', color: palette.white, fontSize: 22,
                  fontWeight: 700}}><span>Media file</span><span style={{color: palette.violet}}>{Math.round(progress)}%</span></div>
                <div style={{height: 11, borderRadius: 10, background: '#303647', marginTop: 24, overflow: 'hidden'}}>
                  <div style={{height: '100%', width: progress + '%', background: 'linear-gradient(90deg,#8c73ff,#75e4e0)',
                    borderRadius: 10}} />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
        <div style={{width: 230, height: 45, background: 'linear-gradient(#474b5d,#222632)', margin: '0 auto',
          clipPath: 'polygon(30% 0,70% 0,80% 100%,20% 100%)'}} />
        <div style={{width: 420, height: 20, background: '#3c4051', borderRadius: '50%',
          margin: '0 auto', boxShadow: '0 22px 40px rgba(0,0,0,.5)'}} />
      </div>
      <Footer left="ZENITHW FOR WINDOWS" index={4} />
    </AbsoluteFill>
  );
};
