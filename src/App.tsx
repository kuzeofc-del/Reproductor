import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Github,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Maximize2,
  Volume2,
  VolumeX,
  FileVideo,
  Info,
  RefreshCw,
  Sparkles,
  Download
} from 'lucide-react';

const DEFAULT_GITHUB_URL =
  'https://github.com/kuzeofc-del/MIS-VI/releases/download/v1.0/Heart.Mark.Oome.01.mp4';

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

interface GitHubReleaseMeta {
  isGitHubRelease: boolean;
  owner?: string;
  repo?: string;
  tag?: string;
  fileName?: string;
}

export default function App() {
  const [videoUrl, setVideoUrl] = useState<string>(DEFAULT_GITHUB_URL);
  const [activeSrc, setActiveSrc] = useState<string>('');
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [useCors, setUseCors] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('00:00');
  const [duration, setDuration] = useState<string>('00:00');
  const [resolution, setResolution] = useState<string>('Esperando video...');
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Parse GitHub Release info if present
  const parseGitHubRelease = (url: string): GitHubReleaseMeta => {
    try {
      const match = url.match(
        /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/i
      );
      if (match) {
        return {
          isGitHubRelease: true,
          owner: match[1],
          repo: match[2],
          tag: match[3],
          fileName: decodeURIComponent(match[4].split('?')[0])
        };
      }
    } catch {
      // not a github url
    }
    return { isGitHubRelease: false };
  };

  const ghMeta = parseGitHubRelease(videoUrl);

  const formatSeconds = (sec: number): string => {
    if (isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Primary play/load trigger
  const handleLoadAndPlay = useCallback(
    (targetUrl: string, enableCors: boolean = useCors) => {
      const trimmed = targetUrl.trim();
      if (!trimmed) {
        setStatus('idle');
        setErrorMessage('Por favor ingresa una URL válida.');
        return;
      }

      setErrorMessage(null);
      setStatus('loading');
      setActiveSrc(trimmed);

      const video = videoRef.current;
      if (!video) return;

      // Handle crossorigin dynamically
      if (enableCors) {
        video.setAttribute('crossorigin', 'anonymous');
      } else {
        video.removeAttribute('crossorigin');
      }

      const isGh = trimmed.toLowerCase().includes('github.com') && trimmed.includes('/releases/download/');

      // As per instructions:
      // "tome la URL del input y la asigne directamente al reproductor como src.
      // Si detecta un enlace de GitHub Releases, debe forzar la carga correcta del elemento <video> invocando .load() y .play()."
      video.src = trimmed;
      video.load();

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setStatus('playing');
          })
          .catch((err) => {
            console.log('Autoplay deferred or error:', err);
            // Browser might require explicit user interaction or volume mute
            if (err.name === 'NotAllowedError') {
              setStatus('paused');
            } else {
              // Might be network/CORS on github redirect
              if (enableCors && isGh) {
                console.warn('Posible bloqueo CORS en redirección GitHub. Reintentando sin crossorigin...');
                setUseCors(false);
                setTimeout(() => {
                  handleLoadAndPlay(trimmed, false);
                }, 100);
              }
            }
          });
      }
    },
    [useCors]
  );

  // Setup video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoading = () => {
      setStatus('loading');
      setErrorMessage(null);
    };

    const onCanPlay = () => {
      if (video.paused) {
        setStatus('paused');
      } else {
        setStatus('playing');
      }
    };

    const onPlay = () => {
      setStatus('playing');
    };

    const onPause = () => {
      if (video.ended) {
        setStatus('ended');
      } else {
        setStatus('paused');
      }
    };

    const onWaiting = () => {
      setStatus('loading');
    };

    const onTimeUpdate = () => {
      setCurrentTime(formatSeconds(video.currentTime));
      if (isFinite(video.duration) && video.duration > 0) {
        setDuration(formatSeconds(video.duration));
      }
    };

    const onLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setResolution(`${video.videoWidth} × ${video.videoHeight} px`);
      }
      if (isFinite(video.duration)) {
        setDuration(formatSeconds(video.duration));
      }
    };

    const onError = () => {
      setStatus('error');
      const err = video.error;
      let msg = 'No se pudo reproducir el archivo de video.';
      if (err) {
        if (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          msg = 'Formato no compatible o recurso bloqueado por el servidor/CORS.';
        } else if (err.code === MediaError.MEDIA_ERR_NETWORK) {
          msg = 'Error de red o CORS al conectar con el servidor de GitHub.';
        } else if (err.code === MediaError.MEDIA_ERR_DECODE) {
          msg = 'Error de decodificación en el archivo MP4.';
        }
      }
      setErrorMessage(msg);
    };

    video.addEventListener('loadstart', onLoading);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadstart', onLoading);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setVideoUrl('');
    setActiveSrc('');
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    setStatus('idle');
    setErrorMessage(null);
    setCurrentTime('00:00');
    setDuration('00:00');
    setResolution('Esperando video...');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((e) => console.log(e));
    } else {
      document.exitFullscreen().catch((e) => console.log(e));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else if (videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F12] text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-[#141419]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base tracking-tight">
                  HTML5 Video Player
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  GitHub Releases Ready
                </span>
              </div>
            </div>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Input & Action Card */}
        <section className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="video-url-input" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileVideo className="w-4 h-4 text-indigo-400" />
              <span>URL del Archivo de Video MP4</span>
            </label>
            {ghMeta.isGitHubRelease && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded-full w-fit">
                <CheckCircle2 className="w-3 h-3" />
                <span>Enlace de GitHub Releases detectado</span>
              </span>
            )}
          </div>

          {/* Input field + Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="video-url-input"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Pega la URL del video MP4 (ej. https://github.com/.../video.mp4)"
                className="w-full px-4 py-3 bg-[#0F0F12] border border-zinc-700/80 rounded-xl text-xs sm:text-sm font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all pr-20"
                spellCheck="false"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Copiar URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    title="Limpiar campo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Play Button */}
            <button
              type="button"
              onClick={() => handleLoadAndPlay(videoUrl)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Reproducir</span>
            </button>
          </div>

          {/* Quick Release Details & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVideoUrl(DEFAULT_GITHUB_URL);
                  handleLoadAndPlay(DEFAULT_GITHUB_URL);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors flex items-center gap-1.5"
                title="Cargar la URL de prueba de GitHub Releases"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Restaurar URL de prueba (v1.0)</span>
              </button>

              {activeSrc && (
                <a
                  href={activeSrc}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors flex items-center gap-1.5"
                  title="Descargar archivo original o abrir directamente"
                >
                  <Download className="w-3 h-3 text-indigo-400" />
                  <span>Abrir / Descargar</span>
                </a>
              )}
            </div>

            {/* CORS mode toggle */}
            <div className="flex items-center gap-2 text-zinc-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200 select-none">
                <input
                  type="checkbox"
                  checked={useCors}
                  onChange={(e) => {
                    setUseCors(e.target.checked);
                    if (activeSrc) {
                      handleLoadAndPlay(activeSrc, e.target.checked);
                    }
                  }}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500/40"
                />
                <span className="text-[11px]">crossorigin="anonymous"</span>
              </label>
            </div>
          </div>

          {/* Detailed GitHub parsed metadata pill */}
          {ghMeta.isGitHubRelease && (
            <div className="p-3 bg-[#0F0F12] border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Github className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>
                  <strong className="text-white">{ghMeta.owner}/{ghMeta.repo}</strong> • Tag:{' '}
                  <span className="font-mono text-indigo-300">{ghMeta.tag}</span>
                </span>
              </div>
              <span className="font-mono text-zinc-400 truncate max-w-xs">{ghMeta.fileName}</span>
            </div>
          )}
        </section>

        {/* Status Indicator Banner */}
        <section
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-medium transition-all ${
            status === 'playing'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : status === 'loading'
              ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300'
              : status === 'paused'
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              : status === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : status === 'ended'
              ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {status === 'playing' && (
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
            {status === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />}
            {status === 'paused' && <Pause className="w-4 h-4 text-amber-400 shrink-0" />}
            {status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {status === 'ended' && <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />}
            {status === 'idle' && <Info className="w-4 h-4 text-zinc-500 shrink-0" />}

            <div>
              <span className="font-semibold uppercase tracking-wider text-xs">
                {status === 'idle' && 'Estado: En espera de reproducir'}
                {status === 'loading' && 'Estado: Conectando y cargando video (invocando .load() / .play())...'}
                {status === 'playing' && 'Estado: Video en reproducción activa'}
                {status === 'paused' && 'Estado: Reproducción pausada'}
                {status === 'ended' && 'Estado: Video finalizado'}
                {status === 'error' && 'Estado: Error al cargar el video'}
              </span>
              {errorMessage && <p className="text-xs text-rose-300/90 mt-0.5 font-normal">{errorMessage}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs font-mono self-end sm:self-auto">
            <span>{currentTime} / {duration}</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {resolution}
            </span>
          </div>
        </section>

        {/* Video Player Box (16:9 Responsive) */}
        <section
          ref={containerRef}
          className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/90 group"
        >
          {/* HTML5 Native Video element with required attributes */}
          <video
            ref={videoRef}
            controls
            preload="metadata"
            crossOrigin={useCors ? 'anonymous' : undefined}
            playsInline
            className="w-full h-full object-contain bg-black"
          />

          {/* Idle Placeholder */}
          {!activeSrc && status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#141419]/95 to-[#0F0F12]">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3 shadow-xl">
                <Play className="w-7 h-7 text-indigo-400 fill-indigo-400/20 translate-x-0.5" />
              </div>
              <h3 className="text-base font-semibold text-white">Listo para reproducir</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1 mb-4">
                Presiona el botón <strong>"Reproducir"</strong> para cargar y reproducir el archivo de GitHub Releases
                mediante el elemento HTML5 nativo.
              </p>
              <button
                type="button"
                onClick={() => handleLoadAndPlay(videoUrl)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Reproducir ahora</span>
              </button>
            </div>
          )}
        </section>

        {/* Quick Diagnostics & Info Panel */}
        <section className="bg-[#141419] border border-zinc-800 rounded-2xl p-4 sm:p-5 text-xs text-zinc-400 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Información Técnica de GitHub Releases</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">HTML5 Video Standard</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-[#0F0F12] rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Mecanismo de carga</span>
              <span className="text-zinc-200 font-medium font-mono">.load() + .play()</span>
            </div>
            <div className="p-3 bg-[#0F0F12] rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Redirección GitHub</span>
              <span className="text-zinc-200 font-medium font-mono">HTTP 302 a S3/CDN</span>
            </div>
            <div className="p-3 bg-[#0F0F12] rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Preload configurado</span>
              <span className="text-zinc-200 font-medium font-mono">metadata</span>
            </div>
            <div className="p-3 bg-[#0F0F12] rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">crossOrigin</span>
              <span className="text-zinc-200 font-medium font-mono">{useCors ? 'anonymous' : 'desactivado'}</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            * Nota: Los enlaces de GitHub Releases realizan una redirección HTTP 302 hacia almacenamiento de objetos pre-firmados. El reproductor HTML5 gestiona esta redirección automáticamente al asignar la URL directamente a la propiedad <code>src</code> del elemento <code>&lt;video&gt;</code>.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#0F0F12] py-4 px-4 text-center text-xs text-zinc-500">
        HTML5 Video Player • Dark Mode • GitHub Releases MP4 Streamer
      </footer>
    </div>
  );
}
