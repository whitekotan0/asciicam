# AsciiCam

AsciiCam is a real-time web application that converts your webcam feed into ASCII art. It features a sleek UI with both Light (Neumorphic) and Dark modes.

## Features

- **Real-time Conversion**: Uses HTML5 Canvas for high-performance (60 FPS) ASCII rendering.
- **Dual Theme Support**:
  - **Light Mode**: High-contrast Neumorphic design with crisp edges.
  - **Dark Mode**: Deep gradient background with inverted ASCII logic.
- **Adjustable Settings**:
  - **Density**: Control the resolution of the ASCII output.
  - **Contrast & Brightness**: Fine-tune the image processing to suit lighting conditions.

## Technologies Used

- React 19
- TypeScript
- Tailwind CSS
- Lucide React (Icons)

## How It Works

1. **Video Capture**: The app accesses the webcam via `navigator.mediaDevices.getUserMedia`.
2. **Processing**: Frames are drawn to a hidden, low-resolution canvas.
3. **ASCII Mapping**: Pixel brightness (Luma) is calculated and mapped to a character density ramp (e.g., ` .:-=+*#%@`).
4. **Rendering**: The resulting characters are drawn to the visible high-resolution canvas using a monospace font.

## Running Locally

This project is a single-file React structure designed for environments like Google IDX or similar web-based editors, but can be split into standard Create React App / Vite structure easily.

1. Ensure `index.html` and `index.tsx` are served correctly.
2. The project uses ES Modules via CDN (`esm.sh`) for dependencies, so no `npm install` is strictly necessary for the browser runtime, though a local server is required.
