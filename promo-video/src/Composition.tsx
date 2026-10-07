import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {AbsoluteFill, Composition, Sequence, staticFile} from 'remotion';
import {HookScene} from './scenes/HookScene';
import {WebScene} from './scenes/WebScene';
import {AndroidScene} from './scenes/AndroidScene';
import {WindowsScene} from './scenes/WindowsScene';
import {EverywhereScene} from './scenes/EverywhereScene';
import {EndScene} from './scenes/EndScene';

const Voice: React.FC<{file: string; from: number}> = ({file, from}) => (
  <Sequence from={from}>
    <Audio src={staticFile(file)} volume={0.96} />
  </Sequence>
);

const ZenithWAd: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={180}><HookScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
      <TransitionSeries.Sequence durationInFrames={270}><WebScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
      <TransitionSeries.Sequence durationInFrames={240}><AndroidScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
      <TransitionSeries.Sequence durationInFrames={240}><WindowsScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
      <TransitionSeries.Sequence durationInFrames={150}><EverywhereScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 18})} />
      <TransitionSeries.Sequence durationInFrames={90}><EndScene /></TransitionSeries.Sequence>
    </TransitionSeries>
    <Audio
      src={staticFile('music.wav')}
      volume={(f) => (f < 45 ? (f / 45) * 0.2 : f > 990 ? ((1080 - f) / 90) * 0.2 : 0.2)}
    />
    <Voice file="vo-hook.mp3" from={17} />
    <Voice file="vo-web.mp3" from={178} />
    <Voice file="vo-android.mp3" from={432} />
    <Voice file="vo-windows.mp3" from={652} />
    <Voice file="vo-unify.mp3" from={878} />
    <Voice file="vo-cta.mp3" from={1001} />
  </AbsoluteFill>
);

export const MyComposition: React.FC = () => (
  <Composition
    id="ZenithW-English-Ad"
    component={ZenithWAd}
    durationInFrames={1080}
    fps={30}
    width={1080}
    height={1920}
  />
);
