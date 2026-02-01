import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Camera, Settings2, Moon, Sun, Download, X, Palette, Type, Sparkles, RefreshCw } from 'lucide-react';
import { Card, Button, Slider } from './components/NeumorphicUI';
import { convertToAscii, CHAR_RAMPS, AsciiMode } from './utils/ascii';

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

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const numCols = Math.floor(40 + (density / 100) * 160);
    const charWidth = rect.width / numCols;
    const charHeight = charWidth / FONT_ASPECT_RATIO;
    const numRows = Math.floor(rect.height / charHeight);

    if (renderCanvas.width !== rect.width * dpr) {
      renderCanvas.width = rect.width * dpr;
      renderCanvas.height = rect.height * dpr;
      renderCtx.scale(dpr, dpr);
    }

    hiddenCanvasRef.current!.width = numCols;
    hiddenCanvasRef.current!.height = numRows;
    hiddenCtx.imageSmoothingEnabled = false;
    hiddenCtx.drawImage(video, 0, 0, numCols, numRows);

    const frameData = hiddenCtx.getImageData(0, 0, numCols, numRows);
    const asciiLines = convertToAscii(frameData, {
      contrast, brightness, inverted: darkMode, mode: asciiMode, customRamp
    });

    renderCtx.fillStyle = darkMode ? bgColor : '#f5f5f5';
    renderCtx.fillRect(0, 0, rect.width, rect.height);
    renderCtx.fillStyle = darkMode ? textColor : '#1a1a1a';
    renderCtx.font = `${charHeight}px 'Fira Code', monospace`;
    renderCtx.textBaseline = 'top';

    asciiLines.forEach((line, i) => {
      renderCtx.fillText(line, 0, i * charHeight);
    });

    requestRef.current = requestAnimationFrame(processFrame);
  }, [contrast, brightness, density, darkMode, textColor, bgColor, asciiMode, customRamp]);

  useEffect(() => {
    if (streaming) requestRef.current = requestAnimationFrame(processFrame);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
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
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setStreaming(false);
    }
  };

  const downloadSnapshot = () => {
    if (snapshot) {
      const link = document.createElement('a');
      link.href = snapshot;
      link.download = `asciicam-${new Date().getTime()}.png`;
      link.click();
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col items-center gap-6 transition-colors duration-500 ${
      darkMode ? "bg-slate-900 text-white" : "bg-[#e0e5ec] text-gray-800"
    }`}>
      
      <header className="w-full max-w-5xl flex justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-emerald-400" />
          <h1 className="text-3xl font-black italic tracking-tighter">ASCIICAM</h1>
        </div>
        <Button onClick={() => setDarkMode(!darkMode)} darkMode={darkMode}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </header>

      <div className="w-full max-w-5xl aspect-video md:aspect-[16/9] relative">
        <Card darkMode={darkMode} className="w-full h-full p-2 md:p-4 overflow-hidden">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={hiddenCanvasRef} className="hidden" />
          <div className="w-full h-full rounded-2xl overflow-hidden bg-black relative shadow-inner">
            <canvas ref={renderCanvasRef} className="w-full h-full block" />
            {!streaming && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md gap-4">
                 <Button onClick={startCamera} darkMode={darkMode} className="!p-10 !rounded-full">
                   <Play size={40} fill="currentColor" />
                 </Button>
                 <p className="text-white/50 font-bold uppercase text-xs">Waiting for camera...</p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 backdrop-blur-md p-4 text-center">
                <p className="text-red-400 font-bold">{error}</p>
                <Button onClick={startCamera} darkMode={darkMode} className="mt-4">Retry</Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card darkMode={darkMode} className="md:col-span-3 p-6 flex flex-col gap-4">
           <Button darkMode={darkMode} onClick={streaming ? stopCamera : startCamera} isActive={streaming} className={streaming ? "text-red-500" : ""}>
             {streaming ? <Square size={20} /> : <Play size={20} />} {streaming ? "STOP" : "START"}
           </Button>
           <Button darkMode={darkMode} onClick={() => {
             const data = renderCanvasRef.current?.toDataURL();
             if (data) setSnapshot(data);
           }} disabled={!streaming}>
             <Camera size={20} /> SNAPSHOT
           </Button>
           <div className="grid grid-cols-3 gap-2 mt-2">
              <Button darkMode={darkMode} onClick={() => setAsciiMode('MINIMAL')} isActive={asciiMode === 'MINIMAL'} className="!p-2"><Type size={16}/></Button>
              <Button darkMode={darkMode} onClick={() => setAsciiMode('ENHANCED')} isActive={asciiMode === 'ENHANCED'} className="!p-2"><Sparkles size={16}/></Button>
              <Button darkMode={darkMode} onClick={() => setAsciiMode('CUSTOM')} isActive={asciiMode === 'CUSTOM'} className="!p-2"><Palette size={16}/></Button>
           </div>
        </Card>

        <Card darkMode={darkMode} className="md:col-span-9 p-8 flex flex-col gap-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
              <Slider label="Density" min="10" max="200" value={density} onChange={e => setDensity(+e.target.value)} darkMode={darkMode} />
              <Slider label="Contrast" min="0.5" max="3" step="0.1" value={contrast} onChange={e => setContrast(+e.target.value)} darkMode={darkMode} />
              <Slider label="Brightness" min="-0.5" max="0.5" step="0.05" value={brightness} onChange={e => setBrightness(+e.target.value)} darkMode={darkMode} />
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase opacity-40">Palette</span>
                <div className="flex gap-4">
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="flex-1 h-10 rounded-lg cursor-pointer bg-transparent border-none" />
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 h-10 rounded-lg cursor-pointer bg-transparent border-none" />
                </div>
              </div>
           </div>

           {asciiMode === 'CUSTOM' && (
             <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                   <label className="text-xs font-bold opacity-50 uppercase">Character Map Editor</label>
                   <div className="flex gap-2">
                     <button onClick={() => setShowCustomEditor(!showCustomEditor)} className="text-[10px] hover:text-emerald-400 uppercase">
                       {showCustomEditor ? 'Hide' : 'Edit'}
                     </button>
                     <button onClick={() => setCustomRamp(CHAR_RAMPS.CUSTOM)} className="text-[10px] hover:text-emerald-400 flex items-center gap-1 uppercase">
                       <RefreshCw size={10}/> RESET
                     </button>
                   </div>
                </div>
                {showCustomEditor && (
                  <textarea 
                    value={customRamp} onChange={e => setCustomRamp(e.target.value)}
                    className={`w-full p-4 rounded-xl font-mono text-sm resize-none h-20 ${darkMode ? "bg-black/50 text-emerald-400 border border-white/5" : "bg-white text-indigo-600 shadow-inner"}`}
                  />
                )}
             </div>
           )}
        </Card>
      </div>

      {snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <Card darkMode={darkMode} className="max-w-4xl w-full p-6 flex flex-col gap-6 shadow-2xl">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-black italic">PREVIEW_SNAPSHOT</h2>
                <X className="cursor-pointer hover:text-red-500" onClick={() => setSnapshot(null)} />
             </div>
             <img src={snapshot} alt="Preview" className="w-full rounded-xl border border-white/10" />
             <div className="flex justify-end gap-4">
                <Button darkMode={darkMode} onClick={() => setSnapshot(null)}>DISCARD</Button>
                <Button darkMode={darkMode} onClick={downloadSnapshot} isActive><Download size={20} /> DOWNLOAD</Button>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;