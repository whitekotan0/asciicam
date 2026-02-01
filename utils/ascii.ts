/**
 * ASCII Character Ramps for different modes
 */
export const CHAR_RAMPS = {
  // Minimalistic - 10 characters
  MINIMAL: " .:-=+*#%@",
  
  // Enhanced - 65 characters for smooth gradients
  ENHANCED: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@█",
  
  // Custom - user can edit this
  CUSTOM: " .:-=+*#%@"
};

export type AsciiMode = 'MINIMAL' | 'ENHANCED' | 'CUSTOM';

export interface AsciiConfig {
  width: number;
  height: number;
  contrast: number;
  brightness: number;
  inverted: boolean;
  mode: AsciiMode;
  customRamp?: string;
}

/**
 * Calculates the ASCII character for a given value.
 */
const getChar = (value: number, contrast: number, brightness: number, ramp: string): string => {
  // Safety check
  if (!ramp || ramp.length === 0) return ' ';
  
  let norm = value / 255;
  norm += brightness;
  
  if (contrast !== 1) {
    norm = (norm - 0.5) * contrast + 0.5;
  }
  
  // Apply gamma correction for enhanced mode
  norm = Math.pow(norm, 0.9);
  norm = Math.max(0, Math.min(1, norm));

  const index = Math.floor(norm * (ramp.length - 1));
  const char = ramp[index];
  
  // Fallback to space if character is undefined
  return char !== undefined ? char : ' ';
};

/**
 * Processes a video frame and returns the ASCII representation.
 */
export const convertToAscii = (
  frameData: ImageData, 
  config: AsciiConfig
): string[] => {
  const { contrast, brightness, inverted, mode, customRamp } = config;
  const data = frameData.data;
  const lines: string[] = [];

  // Select character ramp based on mode
  let charRamp: string;
  if (mode === 'CUSTOM' && customRamp && customRamp.length > 0) {
    charRamp = customRamp;
  } else {
    charRamp = CHAR_RAMPS[mode] || CHAR_RAMPS.MINIMAL;
  }
  
  // Ensure we have a valid ramp
  if (!charRamp || charRamp.length === 0) {
    charRamp = CHAR_RAMPS.MINIMAL;
  }

  const width = frameData.width;
  const height = frameData.height;

  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      // Calculate Luma
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const targetValue = inverted ? gray : 255 - gray;

      line += getChar(targetValue, contrast, brightness, charRamp);
    }
    lines.push(line);
  }

  return lines;
};