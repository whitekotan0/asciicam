/**
 * Standard ASCII character ramp from dark to light.
 * We will reverse this based on background color (dark text on light bg needs dark chars for low brightness).
 */
const CHAR_RAMP = " .:-=+*#%@"; // Space (light) to @ (dark)

export interface AsciiConfig {
  width: number;
  height: number;
  contrast: number; // 0 to 2
  brightness: number; // -1 to 1
  inverted: boolean;
}

/**
 * Calculates the ASCII character for a given brightness value.
 * @param gray - Grayscale value from 0 to 255
 * @param contrast - Contrast factor
 * @param brightness - Brightness offset
 */
const getChar = (gray: number, contrast: number, brightness: number): string => {
  // 1. Normalize to 0-1
  let value = gray / 255;

  // 2. Apply Brightness
  value += brightness;

  // 3. Apply Contrast
  // Formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  // But here we use a simplified linear contrast stretch around 0.5 center
  if (contrast !== 1) {
    value = (value - 0.5) * contrast + 0.5;
  }

  // 4. Clamp
  value = Math.max(0, Math.min(1, value));

  // 5. Map to Character Ramp
  const index = Math.floor(value * (CHAR_RAMP.length - 1));
  return CHAR_RAMP[index];
};

/**
 * Processes a video frame and returns the ASCII representation.
 * 
 * UNDER THE HOOD:
 * 1. We receive raw pixel data from a downscaled canvas (ImageData).
 *    The browser's canvas `drawImage` has already handled the heavy lifting of 
 *    averaging pixels (bilinear filtering) when we drew the large video frame 
 *    onto the tiny processing canvas.
 * 2. We iterate through the RGBA buffer.
 * 3. We calculate the perceived brightness (Luma) of each pixel using standard weights.
 * 4. We map that brightness to a character from our ramp.
 */
export const convertToAscii = (
  frameData: ImageData, 
  config: AsciiConfig
): string[] => {
  const { width, height, contrast, brightness } = config;
  const data = frameData.data;
  const lines: string[] = [];

  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      // const a = data[offset + 3]; // Alpha ignored

      // Calculate Luma (Standard Rec. 601)
      // Human eyes are more sensitive to Green, then Red, then Blue.
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Invert logic: If we are drawing DARK text on LIGHT background (Neumorphism),
      // A high 'gray' value (white pixel) should be a SPACE (empty).
      // A low 'gray' value (black pixel) should be an '@' (full).
      // So we invert the gray input for the getChar function.
      const finalGray = 255 - gray;

      line += getChar(finalGray, contrast, brightness);
    }
    lines.push(line);
  }

  return lines;
};