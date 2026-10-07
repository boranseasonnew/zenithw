import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Background, Footer, TopBrand, palette, rise} from './Shared';

const Platform: React.FC<{name: string; detail: string; glyph: string; color: string; delay: number}> = ({name, detail, glyph, color, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 30, height: 186, borderRadius: 28,
      background: 'linear-gradient(110deg,rgba(25,30,46,.96),rgba(13,17,27,.9))',
      border: '1px solid rgba(255,255,255,.12)', padding: '0 34px', ...rise(frame, delay, 65)}}>
      <div style={{width: 100, height: 100, borderRadius: 25, background: color + '24',
        border: '1px solid ' + color + '70', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color, fontSize: 54, fontWeight: 800}}>{glyph}</div>
      <div><div style={{color: palette.white, fontSize: 44, fontWeight: 850}}>{name}</div>
        <div style={{color: palette.muted, fontSize: 25, marginTop: 6}}>{detail}</div></div>
      <div style={{marginLeft: 'auto', color, fontSize: 40}}>↗</div>
    </div>
  );
};

export const EverywhereScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, Arial, sans-serif'}}>
      <Background glow="cyan" />
      <TopBrand label="EVERYWHERE / 05" />
      <div style={{position: 'absolute', top: 363, left: 86, right: 86}}>
        <div style={{fontFamily: 'Geist Mono, monospace', color: palette.cyan, fontSize: 25,
          letterSpacing: 4, fontWeight: 700, ...rise(frame, 4)}}>ONE SIMPLE EXPERIENCE</div>
        <div style={{color: palette.white, fontWeight: 900, fontSize: 118, lineHeight: 0.96,
          letterSpacing: -7, marginTop: 34, ...rise(frame, 11)}}>ONE NAME.<br /><span style={{color: palette.cyan}}>THREE WAYS.</span></div>
      </div>
      <div style={{position: 'absolute', top: 842, left: 86, right: 86, display: 'flex',
        flexDirection: 'column', gap: 22}}>
        <Platform name="Web" detail="Start in your browser" glyph="⌘" color={palette.cyan} delay={24} />
        <Platform name="Android" detail="Take it with you" glyph="◉" color={palette.violet} delay={36} />
        <Platform name="Windows" detail="Make it desktop" glyph="▣" color="#78ebe1" delay={48} />
      </div>
      <Footer left="WEB / ANDROID / WINDOWS" index={5} />
    </AbsoluteFill>
  );
};
