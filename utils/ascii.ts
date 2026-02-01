export const CHAR_RAMPS = {
  MINIMAL: " .:-=+*#%@",
  ENHANCED: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@█",
  CUSTOM: " .:-=+*#%@"
};

export type AsciiMode = 'MINIMAL' | 'ENHANCED' | 'CUSTOM';

export interface AsciiConfig {
  contrast: number;
  brightness: number;
  inverted: boolean;
  mode: AsciiMode;
  customRamp?: string;
}

const getChar = (value: number, contrast: number, brightness: number, ramp: string): string => {
  if (!ramp || ramp.length === 0) return ' ';
  
  let norm = value / 255;
  norm += brightness;
  
  if (contrast !== 1) {
    norm = (norm - 0.5) * contrast + 0.5;
  }
  
  norm = Math.pow(Math.max(0, Math.min(1, norm)), 0.9);
  
  const index = Math.floor(norm * (ramp.length - 1));
  return ramp[index] || ' ';
};

export const convertToAscii = (frameData: ImageData, config: AsciiConfig): string[] => {
  const { contrast, brightness, inverted, mode, customRamp } = config;
  const { data, width, height } = frameData;
  const lines: string[] = [];

  const charRamp = (mode === 'CUSTOM' ? customRamp : CHAR_RAMPS[mode]) || CHAR_RAMPS.MINIMAL;

  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      
      const targetValue = inverted ? 255 - gray : gray;
      
      line += getChar(targetValue, contrast, brightness, charRamp);
    }
    lines.push(line);
  }

  return lines;
};