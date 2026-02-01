import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Camera, Settings2, Moon, Sun, Download, X, Palette, Type, Sparkles } from 'lucide-react';
import { Card, Button, Slider } from './components/NeumorphicUI';
import { convertToAscii, CHAR_RAMPS, AsciiMode } from './utils/ascii';

const FONT_ASPECT_RATIO = 0.55; 
const MAX_WIDTH_CHARS = 200; 
const MIN_WIDTH_CHARS = 40;

const App: React.FC = () => {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  
  // Mode selection
  const [asciiMode, setAsciiMode] = useState<AsciiMode>('ENHANCED');
  
  // Controls
  const [density, setDensity] = useState(80);
  const [contrast, setContrast] = useState(1.6);
  const [brightness, setBrightness] = useState(0.1);
  
  // Custom character ramp
  const [customRamp, setCustomRamp] = useState(CHAR_RAMPS.CUSTOM);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  
  // Color controls (for custom color mode)
  const [textColor, setTextColor] = useState('#00ff88');
  const [bgColor, setBgColor] = useState('#0a0e1a');

  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const getProcessingDimensions = useCallback((videoWidth: number, videoHeight: number) => {
    const charWidthCount = Math.floor(MIN_WIDTH_CHARS + (density / 100) * (MAX_WIDTH_CHARS - MIN_WIDTH_CHARS));
    const aspectRatio = videoHeight / videoWidth;
    const charHeightCount = Math.floor(charWidthCount * aspectRatio * (1 / FONT_ASPECT_RATIO));
    return { width: charWidthCount, height: charHeightCount };
  }, [density]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const hiddenCtx = hiddenCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    const renderCanvas = renderCanvasRef.current;
    const renderCtx = renderCanvas?.getContext('2d', { alpha: false });

    if (!video || !hiddenCtx || !renderCanvas || !renderCtx || video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const { width, height } = getProcessingDimensions(video.videoWidth, video.videoHeight);
    
    hiddenCanvasRef.current!.width = width;
    hiddenCanvasRef.current!.height = height;
    hiddenCtx.drawImage(video, 0, 0, width, height);

    const frameData = hiddenCtx.getImageData(0, 0, width, height);

    const asciiLines = convertToAscii(frameData, {
      width,
      height,
      contrast,
      brightness,
      inverted: darkMode,
      mode: asciiMode,
      customRamp: asciiMode === 'CUSTOM' ? customRamp : undefined
    });

    // Get actual container dimensions
    const container = renderCanvas.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const canvasWidth = containerRect.width;
    const canvasHeight = containerRect.height;
    
    // Set canvas size to match container exactly
    const dpr = window.devicePixelRatio || 1;
    if (renderCanvas.width !== canvasWidth * dpr || renderCanvas.height !== canvasHeight * dpr) {
      renderCanvas.width = canvasWidth * dpr;
      renderCanvas.height = canvasHeight * dpr;
      renderCanvas.style.width = `${canvasWidth}px`;
      renderCanvas.style.height = `${canvasHeight}px`;
      renderCtx.scale(dpr, dpr);
    }
    
    // Use custom colors or default theme colors
    const currentBg = darkMode ? bgColor : '#f5f5f5';
    const currentText = darkMode ? textColor : '#1a1a1a';
    
    renderCtx.fillStyle = currentBg;
    renderCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    renderCtx.fillStyle = currentText;
    
    // Calculate font size to fit the text perfectly
    const charWidthPx = canvasWidth / width;
    const charHeightPx = canvasHeight / height;
    const fontSize = Math.min(charWidthPx / 0.6, charHeightPx);
    
    renderCtx.font = `${fontSize}px 'Fira Code', monospace`;
    renderCtx.textBaseline = 'top';

    // Center vertically if needed
    const totalHeight = height * fontSize;
    const offsetY = Math.max(0, (canvasHeight - totalHeight) / 2);

    asciiLines.forEach((line, index) => {
      renderCtx.fillText(line, 0, offsetY + index * fontSize);
    });

    requestRef.current = requestAnimationFrame(processFrame);
  }, [contrast, brightness, getProcessingDimensions, darkMode, textColor, bgColor, asciiMode, customRamp]);

  useEffect(() => {
    const handleResize = () => {
      if (renderCanvasRef.current && renderCanvasRef.current.parentElement) {
        const rect = renderCanvasRef.current.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        renderCanvasRef.current.width = rect.width * dpr;
        renderCanvasRef.current.height = rect.height * dpr;
        renderCanvasRef.current.style.width = `${rect.width}px`;
        renderCanvasRef.current.style.height = `${rect.height}px`;
        
        const ctx = renderCanvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (streaming) {
      requestRef.current = requestAnimationFrame(processFrame);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [streaming, processFrame]);

  useEffect(() => {
    if (!streaming && renderCanvasRef.current && renderCanvasRef.current.parentElement) {
        const renderCtx = renderCanvasRef.current.getContext('2d');
        const rect = renderCanvasRef.current.parentElement.getBoundingClientRect();
        if (renderCtx) {
            renderCtx.fillStyle = darkMode ? bgColor : '#f5f5f5';
            renderCtx.fillRect(0, 0, rect.width, rect.height);
        }
    }
  }, [darkMode, streaming, bgColor]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to access camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  };

  const takeSnapshot = useCallback(() => {
    if (renderCanvasRef.current && streaming) {
      const data = renderCanvasRef.current.toDataURL('image/png');
      setSnapshot(data);
    }
  }, [streaming]);

  const downloadSnapshot = useCallback(() => {
    if (snapshot) {
      const link = document.createElement('a');
      link.href = snapshot;
      link.download = `asciicam-${asciiMode.toLowerCase()}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.png`;
      link.click();
    }
  }, [snapshot, asciiMode]);

  const resetCustomRamp = () => {
    setCustomRamp(CHAR_RAMPS.CUSTOM);
  };

  const mainBgClass = darkMode 
    ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-gray-200" 
    : "bg-[#e0e5ec] text-gray-700";

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8 transition-colors duration-500 ${mainBgClass}`}>
      
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Settings2 className={`w-8 h-8 ${darkMode ? 'text-emerald-400' : 'text-indigo-600'}`} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AsciiCam</h1>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {asciiMode === 'MINIMAL' && 'Minimalist Mode'}
              {asciiMode === 'ENHANCED' && 'Enhanced Mode'}
              {asciiMode === 'CUSTOM' && 'Custom Mode'}
            </p>
          </div>
        </div>
        <Button 
            onClick={() => setDarkMode(!darkMode)} 
            darkMode={darkMode}
            className="!px-4 !py-2 !rounded-lg"
            aria-label="Toggle Theme"
        >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </Button>
      </header>

      {/* Mode Selector */}
      <div className="w-full max-w-4xl">
        <Card darkMode={darkMode} className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              darkMode={darkMode}
              isActive={asciiMode === 'MINIMAL'}
              onClick={() => setAsciiMode('MINIMAL')}
              className="flex-1"
            >
              <Type className="w-5 h-5" />
              Minimal (10 chars)
            </Button>
            <Button
              darkMode={darkMode}
              isActive={asciiMode === 'ENHANCED'}
              onClick={() => setAsciiMode('ENHANCED')}
              className="flex-1"
            >
              <Sparkles className="w-5 h-5" />
              Enhanced (65 chars)
            </Button>
            <Button
              darkMode={darkMode}
              isActive={asciiMode === 'CUSTOM'}
              onClick={() => setAsciiMode('CUSTOM')}
              className="flex-1"
            >
              <Palette className="w-5 h-5" />
              Custom + Colors
            </Button>
          </div>
        </Card>
      </div>

      {/* Main Viewport */}
      <Card 
        darkMode={darkMode}
        className="w-full max-w-4xl aspect-video relative overflow-hidden flex items-center justify-center p-4 transition-all duration-300"
      >
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={hiddenCanvasRef} className="hidden" />
        
        <div className={`w-full h-full relative rounded-2xl overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-900 shadow-[inset_4px_4px_8px_#0a0a0a,inset_-4px_-4px_8px_#1e293b]' : 'bg-[#e0e5ec] shadow-[inset_5px_5px_10px_#bec3c9,inset_-5px_-5px_10px_#ffffff]'}`}>
           {!streaming && !error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
               <Camera className="w-16 h-16" />
               <p>Camera feed inactive</p>
             </div>
           )}
           {error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-4 p-4 text-center">
               <p>{error}</p>
             </div>
           )}
           <canvas 
            ref={renderCanvasRef} 
            className="w-full h-full object-contain block"
            style={{ opacity: streaming ? 1 : 0, transition: 'opacity 0.5s ease' }}
           />
        </div>
      </Card>

      {/* Controls */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Playback Controls */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <Card darkMode={darkMode} className="p-4 h-full flex flex-col justify-center gap-4">
            <Button 
              darkMode={darkMode}
              onClick={streaming ? stopCamera : startCamera}
              isActive={streaming}
              className={`w-full ${streaming ? 'text-red-500' : (darkMode ? 'text-emerald-400' : 'text-indigo-600')}`}
            >
              {streaming ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {streaming ? "Stop Feed" : "Start Camera"}
            </Button>
            <Button 
              darkMode={darkMode}
              onClick={takeSnapshot}
              disabled={!streaming}
              className={`w-full ${!streaming ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
            >
              <Camera className="w-5 h-5" />
              Snapshot
            </Button>
          </Card>
        </div>

        {/* Sliders & Controls */}
        <div className="md:col-span-9">
          <Card darkMode={darkMode} className="p-6 h-full flex flex-col justify-center gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Slider 
                darkMode={darkMode}
                label="Density" 
                min="0" max="100" 
                value={density} 
                onChange={(e) => setDensity(Number(e.target.value))}
                valueDisplay={`${density}%`}
              />
              <Slider 
                darkMode={darkMode}
                label="Contrast" 
                min="0.5" max="3" step="0.1"
                value={contrast} 
                onChange={(e) => setContrast(Number(e.target.value))}
                valueDisplay={contrast.toFixed(1)}
              />
              <Slider 
                darkMode={darkMode}
                label="Brightness" 
                min="-0.5" max="0.5" step="0.05"
                value={brightness} 
                onChange={(e) => setBrightness(Number(e.target.value))}
                valueDisplay={brightness.toFixed(2)}
              />
              
              {/* Show info for Minimal and Enhanced modes */}
              {asciiMode !== 'CUSTOM' && (
                <div className={`flex items-center justify-center text-sm font-mono p-4 rounded-lg ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                  <span>
                    {asciiMode === 'MINIMAL' && `Characters: ${CHAR_RAMPS.MINIMAL}`}
                    {asciiMode === 'ENHANCED' && `${CHAR_RAMPS.ENHANCED.length} unique chars`}
                  </span>
                </div>
              )}
              
              {/* Custom Mode Controls */}
              {asciiMode === 'CUSTOM' && darkMode && (
                <>
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold tracking-wide text-gray-400">Text Color</label>
                    <input 
                      type="color" 
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-700"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold tracking-wide text-gray-400">BG Color</label>
                    <input 
                      type="color" 
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-700"
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Custom Character Ramp Editor */}
            {asciiMode === 'CUSTOM' && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className={`text-sm font-bold tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Custom Characters ({customRamp.length} chars)
                  </label>
                  <div className="flex gap-2">
                    <Button
                      darkMode={darkMode}
                      onClick={() => setShowCustomEditor(!showCustomEditor)}
                      className="!px-3 !py-1 !text-xs"
                    >
                      {showCustomEditor ? 'Hide' : 'Edit'}
                    </Button>
                    <Button
                      darkMode={darkMode}
                      onClick={resetCustomRamp}
                      className="!px-3 !py-1 !text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                
                {showCustomEditor && (
                  <textarea
                    value={customRamp}
                    onChange={(e) => setCustomRamp(e.target.value)}
                    className={`w-full p-3 rounded-lg font-mono text-sm resize-none ${
                      darkMode 
                        ? 'bg-gray-900 text-gray-200 border-2 border-gray-700' 
                        : 'bg-white text-gray-800 border-2 border-gray-300'
                    }`}
                    rows={3}
                    placeholder="Enter characters from lightest to darkest..."
                  />
                )}
                
                {!showCustomEditor && (
                  <div className={`p-3 rounded-lg font-mono text-xs break-all ${
                    darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {customRamp}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Snapshot Modal */}
      {snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="absolute inset-0" onClick={() => setSnapshot(null)} />
           <Card darkMode={darkMode} className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col p-4 md:p-6 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Snapshot Preview</h2>
                 <button onClick={() => setSnapshot(null)} className={`p-2 rounded-full hover:bg-black/10 transition ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="flex-1 min-h-0 relative bg-black/5 rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
                 <img src={snapshot} alt="Snapshot" className="max-w-full max-h-full object-contain" />
              </div>

              <div className="mt-6 flex gap-4 justify-end">
                 <Button darkMode={darkMode} onClick={() => setSnapshot(null)}>
                    Discard
                 </Button>
                 <Button darkMode={darkMode} onClick={downloadSnapshot} className={`${darkMode ? '!text-emerald-400' : '!text-indigo-500'}`}>
                    <Download className="w-5 h-5" />
                    Download
                 </Button>
              </div>
           </Card>
        </div>
      )}

    </div>
  );
};

export default App;