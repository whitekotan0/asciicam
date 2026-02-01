import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Camera, Settings2 } from 'lucide-react';
import { Card, Button, Slider } from './components/NeumorphicUI';
import { convertToAscii } from './utils/ascii';

// Config constants
const FONT_ASPECT_RATIO = 0.55; // Monospace fonts are usually taller than wide
const MAX_WIDTH_CHARS = 200; // Max horizontal resolution
const MIN_WIDTH_CHARS = 40;

const App: React.FC = () => {
  // --- State ---
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controls
  const [density, setDensity] = useState(100); // Range 0-100 mapped to width
  const [contrast, setContrast] = useState(1.2);
  const [brightness, setBrightness] = useState(0);

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // --- Helpers ---
  
  // Calculate the processing resolution based on density slider
  const getProcessingDimensions = useCallback((videoWidth: number, videoHeight: number) => {
    // Map slider (0-100) to char count (MIN to MAX)
    const charWidthCount = Math.floor(MIN_WIDTH_CHARS + (density / 100) * (MAX_WIDTH_CHARS - MIN_WIDTH_CHARS));
    
    // Calculate height to maintain aspect ratio
    // Video aspect = W / H
    // Char aspect = FontW / FontH
    // GridH = GridW * (H/W) * (FontW/FontH)
    const aspectRatio = videoHeight / videoWidth;
    const charHeightCount = Math.floor(charWidthCount * aspectRatio * (1 / FONT_ASPECT_RATIO));
    
    return { width: charWidthCount, height: charHeightCount };
  }, [density]);

  // --- Core Loop ---
  
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const hiddenCtx = hiddenCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    const renderCanvas = renderCanvasRef.current;
    const renderCtx = renderCanvas?.getContext('2d', { alpha: false }); // Alpha false for perf

    if (!video || !hiddenCtx || !renderCanvas || !renderCtx || video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // 1. Determine Dimensions
    const { width, height } = getProcessingDimensions(video.videoWidth, video.videoHeight);
    
    // 2. Downscale Video to Hidden Canvas
    // This uses the browser's native GPU-accelerated resizing
    hiddenCanvasRef.current!.width = width;
    hiddenCanvasRef.current!.height = height;
    hiddenCtx.drawImage(video, 0, 0, width, height);

    // 3. Extract Pixel Data
    const frameData = hiddenCtx.getImageData(0, 0, width, height);

    // 4. Convert to ASCII
    const asciiLines = convertToAscii(frameData, {
      width,
      height,
      contrast,
      brightness,
      inverted: false
    });

    // 5. Render to Visible Canvas
    // We render text instead of DOM nodes for 60FPS performance
    
    // Auto-fit font size
    // We want the text to fill the canvas width
    // Canvas Width / Char Count = Font Width px
    const canvasWidth = renderCanvas.width;
    const canvasHeight = renderCanvas.height;
    
    // Clear background
    renderCtx.fillStyle = '#e0e5ec'; // Match neumorphic bg
    renderCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    renderCtx.fillStyle = '#4a5568'; // Text color
    
    // Calculate font size
    // We know font width is approx 0.6 * fontSize (for Fira Code usually)
    // But better to measure or estimate. Fira Code is roughly 0.6 ratio.
    const charWidthPx = canvasWidth / width;
    const fontSize = charWidthPx / 0.6; 
    
    renderCtx.font = `${fontSize}px 'Fira Code', monospace`;
    renderCtx.textBaseline = 'top';

    // Draw lines
    asciiLines.forEach((line, index) => {
      // Small vertical overlap correction if needed, but standard line height usually works
      renderCtx.fillText(line, 0, index * fontSize);
    });

    requestRef.current = requestAnimationFrame(processFrame);
  }, [contrast, brightness, getProcessingDimensions]);

  // --- Effects ---

  // Handle Resize of visible canvas
  useEffect(() => {
    const handleResize = () => {
      if (renderCanvasRef.current && renderCanvasRef.current.parentElement) {
        // Make internal resolution match display resolution for crisp text
        const rect = renderCanvasRef.current.parentElement.getBoundingClientRect();
        renderCanvasRef.current.width = rect.width * window.devicePixelRatio;
        renderCanvasRef.current.height = rect.height * window.devicePixelRatio;
        
        // Scale context to match device pixel ratio
        const ctx = renderCanvasRef.current.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start/Stop Loop
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

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8">
      
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-700 tracking-tight flex items-center justify-center gap-3">
          <Settings2 className="w-8 h-8 text-indigo-500" />
          NeuAscii Cam
        </h1>
        <p className="text-gray-500 font-medium">Real-time Neumorphic ASCII Renderer</p>
      </header>

      {/* Main Viewport */}
      <Card className="w-full max-w-4xl aspect-video relative overflow-hidden flex items-center justify-center p-4">
        {/* Hidden Processing Elements */}
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={hiddenCanvasRef} className="hidden" />
        
        {/* Visible Canvas */}
        <div className="w-full h-full relative rounded-2xl overflow-hidden bg-[#e0e5ec] shadow-[inset_5px_5px_10px_#bec3c9,inset_-5px_-5px_10px_#ffffff]">
           {!streaming && !error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
               <Camera className="w-16 h-16 opacity-50" />
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
          <Card className="p-4 h-full flex flex-col justify-center gap-4">
            <Button 
              onClick={streaming ? stopCamera : startCamera}
              isActive={streaming}
              className={`w-full flex items-center justify-center gap-2 ${streaming ? 'text-red-500' : 'text-indigo-500'}`}
            >
              {streaming ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {streaming ? "Stop Feed" : "Start Camera"}
            </Button>
          </Card>
        </div>

        {/* Sliders */}
        <div className="md:col-span-9">
          <Card className="p-6 h-full flex flex-col justify-center gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Slider 
                label="Character Density" 
                min="0" max="100" 
                value={density} 
                onChange={(e) => setDensity(Number(e.target.value))}
                valueDisplay={`${density}%`}
              />
              <Slider 
                label="Contrast" 
                min="0.5" max="3" step="0.1"
                value={contrast} 
                onChange={(e) => setContrast(Number(e.target.value))}
                valueDisplay={contrast.toFixed(1)}
              />
              <Slider 
                label="Brightness" 
                min="-0.5" max="0.5" step="0.05"
                value={brightness} 
                onChange={(e) => setBrightness(Number(e.target.value))}
                valueDisplay={brightness.toFixed(2)}
              />
              <div className="flex items-center justify-between text-sm text-gray-500 px-1 pt-6">
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