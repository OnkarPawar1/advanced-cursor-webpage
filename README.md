# 🎬 Advanced Presenter FX — AV Mixer

> A powerful, browser-based Audio-Visual mixer that lets you sync images, videos, and PDF slides to an audio/video track — with subtitle overlays, custom watermarks, animated presenter effects, and one-click video export. No installations, no cloud uploads — everything runs entirely in your browser.

**🔗 Live Demo:** [https://onkarpawar1.github.io/advanced-cursor-webpage/](https://onkarpawar1.github.io/advanced-cursor-webpage/)

---

## ✨ Features at a Glance

| Category | Features |
|---|---|
| 📁 **Media Input** | Audio, Video (as audio source), Images, Video clips, PDF (multi-page) |
| 🖼️ **Visual Assets** | Drag-and-sort, A→Z / 1→9 / Shuffle sort, per-item ▲▼ reorder |
| 🎞️ **Timeline** | Auto-generated from asset durations, shuffle mode, fit-to-audio, random subset |
| 🎬 **Transitions** | 14 built-in effects: crossfade, fade-black, slide, zoom, iris, clock-wipe, curtains, blinds, and more |
| 🖼️ **Ken Burns** | Animated zoom-in/out and pan animations on images |
| 📝 **Subtitles** | WEBVTT paste or `.vtt` upload, burned into canvas, adjustable font size |
| 💧 **Watermark** | Text name or logo image overlay (bottom-right corner) |
| 🎨 **Presenter FX** | Animated cursor (whisk, comet, neon, spotlight, focus-wide), pen, highlighter, laser pointer |
| 🔍 **Zoom Lens** | Circle or rectangle magnifier that follows your cursor |
| 🗺️ **Scene Overview** | Corner mini-map panel showing full canvas contents |
| 📹 **Export** | One-click video recording (WebM) with all FX burned in |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/OnkarPawar1/advanced-cursor-webpage.git
cd advanced-cursor-webpage

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
# Output goes to ./dist/
```

---

## 🖥️ How to Use

### Step 1 — Upload Audio / Video Source
Click the **Audio Source** upload area and select:
- An audio file (`.mp3`, `.wav`, `.aac`, `.ogg`, etc.)
- A video file (`.mp4`, `.mov`, `.webm`) — the audio track will be extracted

The duration is automatically detected and the timeline is built around it.

---

### Step 2 — Upload Visual Assets
Click **Visual Assets** and select any combination of:
- **Images** (`.jpg`, `.png`, `.webp`, `.gif`, etc.)
- **Video clips** (`.mp4`, `.mov`, `.webm`) — clips will loop if shorter than their timeline slot
- **PDF files** — every page is automatically converted to a high-quality image

#### Reordering Assets
Once uploaded, use the controls above the asset list:

| Control | Action |
|---|---|
| **▲ / ▼** per row | Move a single asset one slot up or down |
| **A→Z** button | Sort all assets alphabetically by filename |
| **1→9** button | Sort numerically (e.g., `01_intro.jpg` before `02_main.jpg`) |
| **🔀** button | Randomize / shuffle the order |

---

### Step 3 — Add Subtitles (Optional)
Under the **Subtitles** section:

1. Toggle **Show** to enable subtitle overlay
2. Choose **Paste Text** or **Upload .vtt**
3. Paste your WEBVTT content, e.g.:

```
WEBVTT

00:00:00.080 --> 00:00:07.200
Your first subtitle line here

00:00:07.200 --> 00:00:14.160
Second subtitle cue
```

4. Cues are parsed instantly — a count is shown when active
5. Use the **Font Size** slider to adjust readability (24–72 px)
6. Subtitles are **burned into the canvas** — they appear in both the live preview and the exported video

> ✅ Supports Marathi, Hindi, and other Unicode scripts via system fonts.

---

### Step 4 — Configure Settings

#### Playback & Timeline
| Setting | Description |
|---|---|
| **Image Duration** | How many seconds each image is shown (default 5s) |
| **Fit Slides to Audio** | Evenly space all assets across the audio duration |
| **Shuffle** | Randomize playback order during timeline generation |
| **Random Subset** | Use only N random assets from your library |
| **Mute Visuals** | Mute audio from video clips (keep only the main audio track) |

#### Transitions
Choose from **14 transition effects** between slides:
- `None`, `Crossfade`, `Fade to Black`
- `Slide` (left/right/up/down)
- `Zoom In`, `Zoom Out`, `Spin`
- `Iris Open`, `Iris Close`, `Clock Wipe`
- `Curtains`, `Blinds`

Enable **Random Transitions** to pick a different effect for each slide automatically.

#### Ken Burns Animations
When enabled, images subtly zoom, pan left/right/up/down — giving the video a dynamic, cinematic feel.

---

### Step 5 — Presenter FX (Optional)
Move your mouse over the canvas to activate live presenter effects:

#### Interaction Modes
| Mode | Icon | Description |
|---|---|---|
| **Cursor** | 🖱️ | Animated cursor with trail effects |
| **Pen** | ✏️ | Draw glowing strokes on the canvas |
| **Highlight** | 🖍️ | Semi-transparent highlight marks |
| **Laser** | 🔴 | Laser pointer dot |

#### Cursor Styles
| Style | Description |
|---|---|
| **Whisk** | Soft glowing orb |
| **Comet** | Bright particle trail |
| **Neon** | High-intensity neon ring |
| **Spotlight** | Dims surrounding area |
| **Focus Wide** | Full-screen magnifying glass (follows cursor) |

#### Zoom Lens
Enable a magnifier (circle or rectangle) that zooms into the region under your cursor — great for highlighting details.

#### Scene Overview
A corner mini-map panel shows the full canvas contents at a glance.

---

### Step 6 — Export Video
1. Click **▶ Play** to preview your creation
2. When satisfied, click **⬇ Export Video**
3. The recording starts automatically — all FX, subtitles, watermarks, and transitions are burned in
4. When the audio ends, a `.webm` video file downloads automatically

> 💡 Tip: Make sure the canvas is fully visible during recording for best results.

---

### Watermark (Optional)
Under **Project Details → Watermark**:
- **Text**: Enter a channel/brand name — displayed as a pill in the bottom-right
- **Logo Image**: Upload a `.png`/`.jpg` logo — displayed semi-transparently in the bottom-right

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| PDF Rendering | PDF.js (CDN, loaded on demand) |
| Video Export | `MediaRecorder` API + `HTMLCanvasElement.captureStream()` |
| Subtitles | Custom WEBVTT parser (no dependencies) |
| Deployment | GitHub Pages via GitHub Actions |

---

## 📁 Project Structure

```
advanced-cursor-webpage/
├── public/                  # Static assets
├── src/
│   ├── App.tsx              # Main component (entire app logic + canvas rendering)
│   ├── index.css            # Global styles + custom scrollbar
│   └── main.tsx             # React entry point
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions — auto-deploy to GitHub Pages on push to main
├── index.html
├── vite.config.ts
├── package.json
└── README.md
```

---

## 🔄 CI/CD — GitHub Pages Deployment

Every push to `main` automatically:
1. Installs dependencies (`npm ci`)
2. Builds the project (`npm run build`)
3. Deploys `./dist` to GitHub Pages

The live URL is always up to date at:
**https://onkarpawar1.github.io/advanced-cursor-webpage/**

---

## 🛠️ Known Limitations & Tips

- **Browser Support**: Uses `MediaRecorder` — works best in **Chrome/Edge**. Firefox supports WebM export but may differ in codec availability.
- **Video Clips Looping**: Short video clips (e.g., 8s) automatically loop within their timeline slot.
- **PDF Quality**: Enable **High-Quality PDF** in settings for sharper slide rendering (uses 4× scale).
- **Performance**: For best export quality, avoid moving other windows over the canvas during recording.
- **Subtitle Encoding**: `.vtt` files should be saved as **UTF-8** for Marathi / Devanagari script to display correctly.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">Made with ❤️ by <a href="https://github.com/OnkarPawar1">Onkar Pawar</a></p>
