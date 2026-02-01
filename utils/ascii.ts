/**
 * Standard ASCII character ramp.
 * Index 0 = ' ' (Visual Empty/Low density)
 * Index Max = '@' (Visual Full/High density)
 */
const CHAR_RAMP = " .:-=+*#%@";

export interface AsciiConfig {
  width: number;
  height: number;
  contrast: number; // 0 to 2
  brightness: number; // -1 to 1
  inverted: boolean; // true = Dark Mode (Light pixels are characters), false = Light Mode (Dark pixels are characters)
}

/**
 * Calculates the ASCII character for a given value.
 */
const getChar = (value: number, contrast: number, brightness: number): string => {
  // 1. Normalize to 0-1
  let norm = value / 255;

  // 2. Apply Brightness
  norm += brightness;

  // 3. Apply Contrast
  // Center around 0.5
  if (contrast !== 1) {
    norm = (norm - 0.5) * contrast + 0.5;
  }

  // 4. Clamp
  norm = Math.max(0, Math.min(1, norm));

  // 5. Map to Character Ramp
  const index = Math.floor(norm * (CHAR_RAMP.length - 1));
  return CHAR_RAMP[index];
};

/**
 * Processes a video frame and returns the ASCII representation.
 */
export const convertToAscii = (
  frameData: ImageData, 
  config: AsciiConfig
): string[] => {
  const { width, height, contrast, brightness, inverted } = config;
  const data = frameData.data;
  const lines: string[] = [];

  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      // Calculate Luma
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Mode Logic:
      // Dark Mode (inverted=true): Black BG. We want White pixels to be '@' (High index). 
      //   Input 255 (White) -> target high index. 
      //   Input 0 (Black) -> target low index.
      //   So we use 'gray' directly.
      // Light Mode (inverted=false): White BG. We want Dark pixels to be '@' (ink).
      //   Input 255 (White) -> target low index (Space).
      //   Input 0 (Black) -> target high index.
      //   So we use '255 - gray'.
      
      const targetValue = inverted ? gray : 255 - gray;

      line += getChar(targetValue, contrast, brightness);
    }
    lines.push(line);
  }

  return lines;
};