import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

export const palette = {
  bg: '#06070b',
  surface: '#10131d',
  cyan: '#9fd8ff',
  violet: '#9d8cff',
  white: '#f6f7fb',
  muted: '#a3aabd',
};

export const rise = (frame: number, delay = 0, distance = 44): CSSProperties => ({
  opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }),
  transform: 'translateY(' + interpolate(frame, [delay, delay + 24], [distance, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }) + 'px)',
});

export const Background: React.FC<{glow?: 'cyan' | 'violet'}> = ({glow = 'cyan'}) => {
  const frame = useCurrentFrame();
  const color = glow === 'cyan' ? '159,216,255' : '157,140,255';
  return (
    <AbsoluteFill style={{background: palette.bg, overflow: 'hidden'}}>
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
        backgroundSize: '88px 88px',
        opacity: 0.52,
        transform: 'translateY(' + ((frame % 88) * 0.18) + 'px)',
      }} />
      <div style={{position: 'absolute', width: 860, height: 860, borderRadius: 860, top: -280, right: -360,
        background: 'rgba(' + color + ',.21)', filter: 'blur(160px)'}} />
      <div style={{position: 'absolute', width: 780, height: 780, borderRadius: 780, bottom: -350, left: -400,
        background: 'rgba(135,109,255,.18)', filter: 'blur(170px)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg,transparent 25%,rgba(0,0,0,.12) 65%,rgba(0,0,0,.54))'}} />
    </AbsoluteFill>
  );
};

export const Brand: React.FC<{large?: boolean}> = ({large = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: large ? 28 : 18}}>
    <Img src={staticFile('logo.png')} style={{width: large ? 154 : 72, height: large ? 154 : 72, borderRadius: large ? 36 : 18,
      border: '1px solid rgba(255,255,255,.18)', boxShadow: '0 18px 60px rgba(0,0,0,.6)'}} />
    <div style={{fontSize: large ? 78 : 38, fontWeight: 850, color: palette.white, letterSpacing: -3}}>ZenithW</div>
  </div>
);

export const TopBrand: React.FC<{label: string}> = ({label}) => (
  <>
    <div style={{position: 'absolute', top: 104, left: 86}}><Brand /></div>
    <div style={{position: 'absolute', top: 128, right: 86, fontFamily: 'Geist Mono, monospace',
      fontSize: 22, letterSpacing: 2, color: palette.muted}}>{label}</div>
  </>
);

export const Headline: React.FC<{eyebrow: string; title: ReactNode; sub: string; accent?: string}> = ({eyebrow, title, sub, accent = palette.cyan}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', top: 320, left: 86, right: 86}}>
      <div style={{...rise(frame, 4), fontFamily: 'Geist Mono, monospace', fontSize: 25, color: accent, letterSpacing: 4,
        fontWeight: 700, marginBottom: 34}}>{eyebrow}</div>
      <div style={{...rise(frame, 10), fontSize: 112, lineHeight: 0.96, letterSpacing: -7, fontWeight: 850,
        color: palette.white, maxWidth: 920}}>{title}</div>
      <div style={{...rise(frame, 20), fontSize: 39, lineHeight: 1.32, color: palette.muted, maxWidth: 820,
        marginTop: 34, letterSpacing: -1}}>{sub}</div>
    </div>
  );
};

export const Footer: React.FC<{left: string; index: number}> = ({left, index}) => (
  <>
    <div style={{position: 'absolute', bottom: 145, left: 86, right: 86,
      height: 1, background: 'rgba(255,255,255,.13)'}} />
    <div style={{position: 'absolute', bottom: 97, left: 86, fontFamily: 'Geist Mono, monospace',
      fontSize: 21, color: palette.muted, letterSpacing: 1.8}}>{left}</div>
    <div style={{position: 'absolute', bottom: 97, right: 86, fontFamily: 'Geist Mono, monospace',
      fontSize: 21, color: palette.muted, letterSpacing: 1.8}}>0{index} / 06</div>
  </>
);

export const GlassCard: React.FC<{children: ReactNode; style?: CSSProperties}> = ({children, style}) => (
  <div style={{background: 'linear-gradient(145deg,rgba(26,31,45,.96),rgba(12,15,24,.96))',
    border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 48px 100px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.06)',
    ...style}}>{children}</div>
);
