import React, { useEffect, useRef, useState } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import './AudioPlayer.css';
import PlayIcon from '@renderer/assets/play.svg?react';
import VolumeOffIcon from '@renderer/assets/volume_off.svg?react';
import VolumeOnIcon from '@renderer/assets/volume_on.svg?react';
import PauseIcon from '@renderer/assets/pause.svg?react';
import { formatSize, formatDuration } from '@renderer/utils/format';

// Canvas не понимает CSS-переменные — цвета дублируются вручную.
// Должны совпадать с --bg-elevated и --accent-primary в :root.
const WAVE_COLOR = '#404249';
const PROGRESS_COLOR = '#5865f2';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  size: number | null;
  duration: number | null;
}

/* ---------- Компонент ---------- */

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  fileName,
  size,
  duration: initialDuration
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(initialDuration ?? 0);

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url: src,
    height: 32,
    waveColor: WAVE_COLOR,
    progressColor: PROGRESS_COLOR,
    cursorColor: 'transparent',
    cursorWidth: 0,
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    normalize: true,
    backend: 'WebAudio',
    fillParent: true
  });

  useEffect(() => {
    if (!wavesurfer) return;
    const onReady = (): void => setDuration(wavesurfer.getDuration());
    wavesurfer.on('ready', onReady);
    if (wavesurfer.getDuration() > 0) onReady();
    return (): void => {
      wavesurfer.un('ready', onReady);
    };
  }, [wavesurfer]);

  const togglePlay = (): void => {
    wavesurfer?.playPause();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Number(e.target.value) / 100;
    setVolume(v);
    setMuted(v === 0);
    wavesurfer?.setVolume(v);
  };

  const toggleMute = (): void => {
    if (muted) {
      const restore = volume > 0 ? volume : 0.5;
      setMuted(false);
      setVolume(restore);
      wavesurfer?.setVolume(restore);
    } else {
      setMuted(true);
      wavesurfer?.setVolume(0);
    }
  };

  const volumePct = muted ? 0 : Math.round(volume * 100);
  const sizeLabel = formatSize(size);

  return (
    <div className="audio-player">
      <div className="audio-player__caption">
        <span className="audio-player__name" title={fileName}>
          {fileName}
        </span>
        {sizeLabel && <span className="audio-player__size">{sizeLabel}</span>}
      </div>

      <div className="audio-player__main">
        <button
          type="button"
          className="audio-player__play"
          onClick={togglePlay}
          title={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
        </button>

        <div className="audio-player__body">
          <div ref={containerRef} className="audio-player__waveform" />

          <div className="audio-player__meta">
            <span className="audio-player__time">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            <div className="audio-player__volume">
              <button
                type="button"
                className="audio-player__mute"
                onClick={toggleMute}
                title={muted ? 'Включить звук' : 'Выключить звук'}
              >
                {muted ? (
                  <VolumeOffIcon width={20} height={20} />
                ) : (
                  <VolumeOnIcon width={20} height={20} />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={volumePct}
                onChange={handleVolumeChange}
                className="audio-player__volume-slider"
                style={{ '--progress': `${volumePct}%` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
