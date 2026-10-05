import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background, Brand, palette, rise} from './Shared';

export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 50, 89], [0.55, 1, 0.8], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, Arial, sans-serif'}}>
      <Background glow="cyan" />
      <div style={{position: 'absolute', top: 376, left: 60, right: 60, height: 850,
        borderRadius: 500, background: 'radial-gradient(circle,rgba(159,216,255,.11),transparent 62%)',
        opacity: glow}} />
      <div style={{position: 'absolute', top: 490, left: 86, right: 86, display: 'flex',
        alignItems: 'center', flexDirection: 'column', ...rise(frame, 4, 80)}}>
        <Brand large />
        <div style={{fontSize: 117, lineHeight: 0.98, letterSpacing: -8, fontWeight: 900,
          color: palette.white, textAlign: 'center', marginTop: 100}}>KEEP IT<br /><span style={{color: palette.cyan}}>YOURS.</span></div>
        <div style={{fontFamily: 'Geist Mono, monospace', color: palette.muted, fontSize: 28,
          letterSpacing: 3, marginTop: 65}}>WEB · ANDROID · WINDOWS</div>
        <div style={{background: 'linear-gradient(110deg,#d9efff,#e5dcff)', color: '#090c13',
          fontSize: 43, fontWeight: 850, borderRadius: 24, padding: '31px 63px',
          boxShadow: '0 30px 100px rgba(159,216,255,.27)', marginTop: 100}}>zenithw.space ↗</div>
      </div>
      <div style={{position: 'absolute', bottom: 118, left: 86, right: 86, textAlign: 'center',
        color: palette.muted, fontSize: 23}}>For content you have permission to save.</div>
    </AbsoluteFill>
  );
};
