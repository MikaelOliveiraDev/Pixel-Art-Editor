# Pixel Art Editor

A functional browser based pixel art editor.


## ✨ Features

- **Local Storage:** Your projects are saved in your local browser storage, no internet connection needed.
- **Intelligent Trash:** Deleted projects are moved to a trash space and get deleted after 30 days.
- **Infinite Artboard:** You don't need to specify your project's canvas size or adjust it everytime your drawing gets bigger.
- **Drawing Tools:** Unconventional tools.
    - **Pen:** Smooth free-hand drawing using Bresenham's algorithm.
    - **Flood Fill:** Efficiently fill closed areas with a safety leak detection.
    - **Line by Typing (Polyline):** A unique way to draw pixel-perfect lines using keyboard. Perfect for technical artists and precision work.
    - **Smart Pipette:** Pick colors directly from the canvas with a floating preview.
- **Changes History:** You can undo/redo up to 50 changes.
- **Color History:** Automatically saves recently used colors, allowing quick switching and maintaining a consistent palette throughout your session.
- **Keyboard Shortcuts:** Full keyboard support for professional workflow. Quickly switch tools and manage your canvas without leaving the keys.


## 🛠️ Used Technologies

- **HTML5** and **CSS3** 
- **JavaScript (Vanilla)**
- **LocalStorage**
- **Lucide Icons**

## Technical
To support an Infinite Artboard, this engine departs from the traditional fixed-array approach. By using a JavaScript Map, we map x,y coordinates as keys and store only the data for painted pixels. This enables users to draw in any direction without performance degradation from large, empty memory allocations, and simplifies the logic for dynamic canvas resizing.

## How to run
## 🔗 Vercel (Deploy Online)

Access the editor instantly in your browser:  
👉 https://mikaels-pixel-art-editor.vercel.app/index.html


## 💻 Run Locally (Clone)

Clone the project and run it locally — no build step required:

```bash
git clone <repo-url>
cd <project-folder>
```