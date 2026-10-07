import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background, Footer, GlassCard, Headline, TopBrand, palette, rise} from './Shared';

export const WebScene: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [25, 70], [90, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const formatOpacity = interpolate(frame, [78, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, Arial, sans-serif'}}>
      <Background />
      <TopBrand label="WEB / 02" />
      <Headline eyebrow="01 — ON THE WEB" title={<>START WITH<br /><span style={{color: palette.cyan}}>A LINK.</span></>}
        sub="Open ZenithW in your browser. Paste, choose, save." />
      <GlassCard style={{position: 'absolute', top: 860, left: 78, width: 924, height: 710, borderRadius: 34,
        overflow: 'hidden', ...rise(frame, 23, 120)}}>
        <div style={{height: 85, display: 'flex', alignItems: 'center', gap: 13, padding: '0 31px',
          borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0b0e16'}}>
          {['#ff6b7d', '#f5bf58', '#55d69e'].map((color) => <div key={color} style={{width: 14, height: 14, borderRadius: 14, background: color}} />)}
          <div style={{marginLeft: 28, height: 42, width: 562, borderRadius: 12, background: '#171c2a',
            color: palette.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist Mono, monospace', fontSize: 19}}>zenithw.space</div>
        </div>
        <div style={{padding: '64px 65px'}}>
          <div style={{color: palette.cyan, fontFamily: 'Geist Mono, monospace', fontSize: 20, letterSpacing: 3}}>ZENITHW / WEB</div>
          <div style={{color: palette.white, fontWeight: 850, fontSize: 61, letterSpacing: -3, marginTop: 24}}>Ready when you are.</div>
          <div style={{color: palette.muted, fontSize: 27, marginTop: 12}}>A simple way to save your media.</div>
          <div style={{marginTop: 62, height: 104, borderRadius: 24, border: '1px solid rgba(159,216,255,.35)',
            background: '#0c1220', display: 'flex', alignItems: 'center', padding: '0 31px', gap: 22}}>
            <div style={{color: palette.cyan, fontSize: 38}}>↗</div>
            <div style={{color: frame > 43 ? palette.white : '#7d8799', fontSize: 27, whiteSpace: 'nowrap',
              overflow: 'hidden', width: 600, transform: 'translateX(' + slide + 'px)'}}>
              {frame > 43 ? 'https://example.com/your-video' : 'Paste a video link…'}
            </div>
          </div>
          <div style={{display: 'flex', gap: 20, marginTop: 38, opacity: formatOpacity}}>
            <div style={{background: palette.cyan, color: '#071019', fontWeight: 800, fontSize: 25,
              borderRadius: 18, padding: '20px 43px'}}>VIDEO</div>
            <div style={{background: 'rgba(255,255,255,.07)', color: palette.white, fontWeight: 700,
              fontSize: 25, borderRadius: 18, padding: '20px 43px', border: '1px solid rgba(255,255,255,.12)'}}>AUDIO</div>
          </div>
        </div>
      </GlassCard>
      <div style={{position: 'absolute', left: 86, top: 1630, color: palette.cyan, fontSize: 28, letterSpacing: 2,
        fontFamily: 'Geist Mono, monospace', ...rise(frame, 95)}}>PASTE → CHOOSE → SAVE</div>
      <Footer left="ZENITHW.SPACE" index={2} />
    </AbsoluteFill>
  );
};
