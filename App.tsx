import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Camera, Settings2, Moon, Sun, Download, X, Palette, Type, Sparkles } from 'lucide-react';
import { Card, Button, Slider } from './components/NeumorphicUI';
import { convertToAscii, CHAR_RAMPS, AsciiMode } from './utils/ascii';

// Коэффициент для моноширинных шрифтов (высота больше ширины)
const FONT_ASPECT_RATIO = 0.55; 

const App: React.FC = () => {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [asciiMode, setAsciiMode] = useState<AsciiMode>('ENHANCED');
  
  const [density, setDensity] = useState(80);
  const [contrast, setContrast] = useState(1.6);
  const [brightness, setBrightness] = useState(0.1);
  
  const [customRamp, setCustomRamp] = useState(CHAR_RAMPS.CUSTOM);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  
  const [textColor, setTextColor] = useState('#00ff88');
  const [bgColor, setBgColor] = useState('#0a0e1a');

  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const renderCanvas = renderCanvasRef.current;
    const container = renderCanvas?.parentElement;

    if (!video || !renderCanvas || !container || video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const renderCtx = renderCanvas.getContext('2d', { alpha: false });
    const hiddenCtx = hiddenCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!renderCtx || !hiddenCtx) return;

    // 1. Считаем физические размеры контейнера
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 2. Рассчитываем количество колонок исходя из Density
    const numCols = Math.floor(40 + (density / 100) * 160);
    const charWidth = rect.width / numCols;
    const charHeight = charWidth / FONT_ASPECT_RATIO;
    const numRows = Math.floor(rect.height / charHeight);

    // 3. Масштабируем канвас под DPR (Retina/High-Res)
    if (renderCanvas.width !== rect.width * dpr) {
      renderCanvas.width = rect.width * dpr;
      renderCanvas.height = rect.height * dpr;
      renderCtx.scale(dpr, dpr);
    }

    // 4. Подготавливаем скрытый канвас для обработки пикселей
    hiddenCanvasRef.current!.width = numCols;
    hiddenCanvasRef.current!.height = numRows;
    hiddenCtx.imageSmoothingEnabled = false; 
    hiddenCtx.drawImage(video, 0, 0, numCols, numRows);

    const frameData = hiddenCtx.getImageData(0, 0, numCols, numRows);

    const asciiLines = convertToAscii(frameData, {
      contrast,
      brightness,
      inverted: darkMode,
      mode: asciiMode,
      customRamp: asciiMode === 'CUSTOM' ? customRamp : undefined
    });

    // 5. Отрисовка
    renderCtx.fillStyle = darkMode ? bgColor : '#f5f5f5';
    renderCtx.fillRect(0, 0, rect.width, rect.height);
    
    renderCtx.fillStyle = darkMode ? textColor : '#1a1a1a';
    renderCtx.font = `${charHeight}px 'Fira Code', monospace`;
    renderCtx.textBaseline = 'top';

    asciiLines.forEach((line, index) => {
      renderCtx.fillText(line, 0, index * charHeight);
    });

    requestRef.current = requestAnimationFrame(processFrame);
  }, [contrast, brightness, density, darkMode, textColor, bgColor, asciiMode, customRamp]);

  useEffect(() => {
    if (streaming) {
      requestRef.current = requestAnimationFrame(processFrame);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [streaming, processFrame]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
        setError(null);
      }
    } catch (err) { setError("Camera access denied."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  };

  const takeSnapshot = useCallback(() => {
    if (renderCanvasRef.current && streaming) {
      setSnapshot(renderCanvasRef.current.toDataURL('image/png'));
    }
  }, [streaming]);

  const mainBgClass = darkMode 
    ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-gray-200" 
    : "bg-[#e0e5ec] text-gray-700";

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8 ${mainBgClass}`}>
      <header className="w-full max-w-4xl flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Settings2 className={`w-8 h-8 ${darkMode ? 'text-emerald-400' : 'text-indigo-600'}`} />
          <h1 className="text-3xl font-bold tracking-tight">AsciiCam</h1>
        </div>
        <Button onClick={() => setDarkMode(!darkMode)} darkMode={darkMode}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </header>

      <div className="w-full max-w-4xl">
        <Card darkMode={darkMode} className="p-4 flex flex-col sm:flex-row gap-4">
          <Button darkMode={darkMode} isActive={asciiMode === 'MINIMAL'} onClick={() => setAsciiMode('MINIMAL')} className="flex-1"><Type size={18}/> Minimal</Button>
          <Button darkMode={darkMode} isActive={asciiMode === 'ENHANCED'} onClick={() => setAsciiMode('ENHANCED')} className="flex-1"><Sparkles size={18}/> Enhanced</Button>
          <Button darkMode={darkMode} isActive={asciiMode === 'CUSTOM'} onClick={() => setAsciiMode('CUSTOM')} className="flex-1"><Palette size={18}/> Custom</Button>
        </Card>
      </div>

      <Card darkMode={darkMode} className="w-full max-w-4xl aspect-video relative overflow-hidden p-4">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={hiddenCanvasRef} className="hidden" />
        <div className="w-full h-full rounded-2xl overflow-hidden relative bg-black">
          <canvas ref={renderCanvasRef} className="w-full h-full block" />
          {!streaming && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
              <Camera size={48} />
              <p>Camera feed inactive</p>
            </div>
          )}
        </div>
      </Card>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card darkMode={darkMode} className="md:col-span-3 p-4 flex flex-col gap-4 justify-center">
          <Button darkMode={darkMode} onClick={streaming ? stopCamera : startCamera} isActive={streaming} className={streaming ? 'text-red-500' : ''}>
            {streaming ? <Square size={18} /> : <Play size={18} />} {streaming ? "Stop" : "Start"}
          </Button>
          <Button darkMode={darkMode} onClick={takeSnapshot} disabled={!streaming}><Camera size={18} /> Snapshot</Button>
        </Card>

        <Card darkMode={darkMode} className="md:col-span-9 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Slider label="Density" min="0" max="100" value={density} onChange={(e) => setDensity(+e.target.value)} darkMode={darkMode} valueDisplay={`${density}%`} />
          <Slider label="Contrast" min="0.5" max="3" step="0.1" value={contrast} onChange={(e) => setContrast(+e.target.value)} darkMode={darkMode} valueDisplay={contrast.toFixed(1)} />
          {asciiMode === 'CUSTOM' && (
            <div className="col-span-full flex gap-4">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 h-10 rounded-lg cursor-pointer" />
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 h-10 rounded-lg cursor-pointer" />
            </div>
          )}
        </Card>
      </div>

      {snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card darkMode={darkMode} className="max-w-4xl w-full p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Snapshot Preview</h2>
              <X className="cursor-pointer" onClick={() => setSnapshot(null)} />
            </div>
            <img src={snapshot} alt="Snapshot" className="w-full rounded-lg" />
            <div className="flex justify-end gap-4">
              <Button darkMode={darkMode} onClick={() => setSnapshot(null)}>Discard</Button>
              <a href={snapshot} download="ascii-cam.png"><Button darkMode={darkMode} isActive><Download size={18} /> Download</Button></a>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;