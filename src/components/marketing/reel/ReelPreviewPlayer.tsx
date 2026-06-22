import { useRef, useEffect, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { drawReelFrame } from '../../../utils/reel/reelDraw';
import type { ReelScene } from '../../../utils/reel/reelScene';

interface ReelPreviewPlayerProps {
  scene: ReelScene;
  images: Map<string, HTMLImageElement | ImageBitmap>;
  headshot: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  qr: HTMLImageElement | null;
  width?: number;
  height?: number;
}

export default function ReelPreviewPlayer({
  scene,
  images,
  headshot,
  logo,
  qr,
  width = 324,
  height = 576,
}: ReelPreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(0);
  const pausedAtRef = useRef(0);

  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(canvas.width / scene.width, canvas.height / scene.height);
    drawReelFrame(ctx, scene, t, images, headshot, logo, qr);
    ctx.restore();
  }, [scene, images, headshot, logo, qr]);

  const animate = useCallback(() => {
    const elapsed = (performance.now() - startRef.current) / 1000;
    const t = elapsed % scene.durationSec;
    setScrub(t);
    draw(t);
    rafRef.current = requestAnimationFrame(animate);
  }, [draw, scene.durationSec]);

  useEffect(() => {
    if (playing) {
      startRef.current = performance.now() - pausedAtRef.current * 1000;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [playing, animate]);

  // When scene changes while paused, redraw at current scrub
  useEffect(() => {
    if (!playing) draw(pausedAtRef.current);
  }, [scene, playing, draw]);

  const handlePlayPause = () => {
    if (playing) {
      cancelAnimationFrame(rafRef.current);
      pausedAtRef.current = scrub;
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  const handleScrub = (_: unknown, val: number | number[]) => {
    const t = val as number;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    pausedAtRef.current = t;
    setScrub(t);
    draw(t);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width,
          height,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          border: 2,
          borderColor: 'divider',
        }}
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width, px: 0.5 }}>
        <IconButton size="small" onClick={handlePlayPause} sx={{ color: 'text.primary' }}>
          {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
        <Slider
          size="small"
          min={0}
          max={scene.durationSec}
          step={0.03}
          value={scrub}
          onChange={handleScrub}
          sx={{ flex: 1, '& .MuiSlider-thumb': { width: 12, height: 12 } }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 40, textAlign: 'right' }}>
          {formatTime(scrub)}
        </Typography>
      </Box>
    </Box>
  );
}
