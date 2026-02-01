import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Camera, Settings2, Moon, Sun } from 'lucide-react';
import { Card, Button, Slider } from './components/NeumorphicUI';
import { convertToAscii } from './utils/ascii';

// Config constants
const FONT_ASPECT_RATIO = 0.55; 
const MAX_WIDTH_CHARS = 200; 
const MIN_WIDTH_CHARS = 40;

const App: React.FC = () => {
  // --- State ---
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Controls
  const [density, setDensity] = useState(100); 
  const [contrast, setContrast] = useState(1.2);
  const [brightness, setBrightness] = useState(0);

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // --- Helpers ---
  
  const getProcessingDimensions = useCallback((videoWidth: number, videoHeight: number) => {
    const charWidthCount = Math.floor(MIN_WIDTH_CHARS + (density / 100) * (MAX_WIDTH_CHARS - MIN_WIDTH_CHARS));
    const aspectRatio = videoHeight / videoWidth;
    const charHeightCount = Math.floor(charWidthCount * aspectRatio * (1 / FONT_ASPECT_RATIO));
    return { width: charWidthCount, height: charHeightCount };
  }, [density]);

  // --- Core Loop ---
  
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
      inverted: darkMode // Dark mode = inverted logic (light pixels are chars)
    });

    // Render Config
    const canvasWidth = renderCanvas.width;
    const canvasHeight = renderCanvas.height;
    
    // Theme Colors for Canvas
    const bgColor = darkMode ? '#1f2937' : '#e0e5ec'; // gray-800 : gray-200-ish
    const textColor = darkMode ? '#a5b4fc' : '#4a5568'; // indigo-300 : gray-700
    
    renderCtx.fillStyle = bgColor;
    renderCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    renderCtx.fillStyle = textColor;
    
    const charWidthPx = canvasWidth / width;
    const fontSize = charWidthPx / 0.6; 
    
    renderCtx.font = `${fontSize}px 'Fira Code', monospace`;
    renderCtx.textBaseline = 'top';

    asciiLines.forEach((line, index) => {
      renderCtx.fillText(line, 0, index * fontSize);
    });

    requestRef.current = requestAnimationFrame(processFrame);
  }, [contrast, brightness, getProcessingDimensions, darkMode]);

  // --- Effects ---

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (renderCanvasRef.current && renderCanvasRef.current.parentElement) {
        const rect = renderCanvasRef.current.parentElement.getBoundingClientRect();
        renderCanvasRef.current.width = rect.width * window.devicePixelRatio;
        renderCanvasRef.current.height = rect.height * window.devicePixelRatio;
        
        const ctx = renderCanvasRef.current.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
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

  // Force re-render of canvas background when theme changes if not streaming
  useEffect(() => {
    if (!streaming && renderCanvasRef.current) {
        const renderCtx = renderCanvasRef.current.getContext('2d');
        if (renderCtx) {
            renderCtx.fillStyle = darkMode ? '#1f2937' : '#e0e5ec';
            renderCtx.fillRect(0, 0, renderCanvasRef.current.width, renderCanvasRef.current.height);
        }
    }
  }, [darkMode, streaming]);

  // --- Handlers ---

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

  // Background Gradient Classes
  const mainBgClass = darkMode 
    ? "bg-gradient-to-br from-gray-900 to-gray-800 text-gray-200" 
    : "bg-[#e0e5ec] text-gray-700";

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8 transition-colors duration-500 ${mainBgClass}`}>
      
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Settings2 className={`w-8 h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AsciiCam</h1>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Real-time ASCII Renderer</p>
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

      {/* Main Viewport */}
      <Card 
        darkMode={darkMode}
        className="w-full max-w-4xl aspect-video relative overflow-hidden flex items-center justify-center p-4 transition-all duration-300"
      >
        {/* Hidden Processing Elements */}
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={hiddenCanvasRef} className="hidden" />
        
        {/* Visible Canvas Container */}
        <div className={`w-full h-full relative rounded-2xl overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-800 shadow-[inset_4px_4px_8px_#111827,inset_-4px_-4px_8px_#374151]' : 'bg-[#e0e5ec] shadow-[inset_5px_5px_10px_#bec3c9,inset_-5px_-5px_10px_#ffffff]'}`}>
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
              className={`w-full ${streaming ? 'text-red-500' : (darkMode ? 'text-indigo-400' : 'text-indigo-600')}`}
            >
              {streaming ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {streaming ? "Stop Feed" : "Start Camera"}
            </Button>
          </Card>
        </div>

        {/* Sliders */}
        <div className="md:col-span-9">
          <Card darkMode={darkMode} className="p-6 h-full flex flex-col justify-center gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Slider 
                darkMode={darkMode}
                label="Character Density" 
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
              <div className={`flex items-center justify-between text-sm px-1 pt-6 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                <span>FPS target: 60</span>
                <span>Mode: Monospace Canvas</span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default App;