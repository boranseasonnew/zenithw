import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background, Footer, TopBrand, palette, rise} from './Shared';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const halo = interpolate(frame, [0, 150], [0.78, 1.22], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, Arial, sans-serif'}}>
      <Background glow="violet" />
      <TopBrand label="INTRO / 01" />
      <div style={{position: 'absolute', top: 470, left: 155, width: 770, height: 770, borderRadius: 770,
        border: '1px solid rgba(159,216,255,.22)', transform: 'scale(' + halo + ')',
        boxShadow: '0 0 110px rgba(159,216,255,.08), inset 0 0 90px rgba(157,140,255,.05)'}} />
      <div style={{position: 'absolute', top: 588, left: 86, right: 86, textAlign: 'center', ...rise(frame, 5)}}>
        <div style={{fontFamily: 'Geist Mono, monospace', color: palette.cyan, letterSpacing: 5, fontSize: 25,
          fontWeight: 700, marginBottom: 45}}>MEET ZENITHW</div>
        <div style={{fontSize: 130, lineHeight: 0.92, fontWeight: 900, letterSpacing: -9, color: palette.white}}>
          YOUR MEDIA.<br /><span style={{color: palette.cyan}}>YOUR WAY.</span>
        </div>
        <div style={{fontSize: 40, lineHeight: 1.35, color: palette.muted, marginTop: 55}}>
          Make room for the moments<br />you want to keep.
        </div>
      </div>
      <div style={{position: 'absolute', top: 1390, left: 86, right: 86, display: 'flex', gap: 16,
        justifyContent: 'center', ...rise(frame, 30)}}>
        {['WEB', 'ANDROID', 'WINDOWS'].map((item, index) => (
          <div key={item} style={{padding: '22px 27px', borderRadius: 999,
            background: index === 0 ? 'rgba(159,216,255,.18)' : 'rgba(255,255,255,.055)',
            border: '1px solid ' + (index === 0 ? 'rgba(159,216,255,.5)' : 'rgba(255,255,255,.12)'),
            color: index === 0 ? palette.cyan : palette.white, fontFamily: 'Geist Mono, monospace',
            letterSpacing: 2, fontSize: 24, fontWeight: 700}}>{item}</div>
        ))}
      </div>
      <Footer left="MEDIA, UNDER YOUR CONTROL" index={1} />
    </AbsoluteFill>
  );
};
