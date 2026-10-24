# 🎬 Advanced Presenter FX — AV Mixer

> A powerful Audio-Visual creator studio that lets you sync images, videos, and PDF slides to an audio/video track — with subtitle overlays, custom watermarks, animated presenter effects, AI-assisted publishing, and production-grade FFmpeg export. The editor works in a browser; the optional local macOS renderer keeps media private while producing high-quality MP4 or ProRes files.

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
| 📹 **Export** | Production FFmpeg MP4/MOV with progress and cancellation, plus Live WebM fallback |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- FFmpeg and ffprobe for production export

### Recommended macOS Setup

The local renderer is the fastest and most private way to use the full application. It binds only to `127.0.0.1`; source media is written to an isolated temporary job directory and never uploaded to a cloud service.

```bash
git clone https://github.com/OnkarPawar1/advanced-cursor-webpage.git
cd advanced-cursor-webpage
npm run setup:mac
npm start
```

Open **http://127.0.0.1:4178**. The same Node process serves the built React application and the FFmpeg API, avoiding cross-origin or mixed-content problems.

You can also double-click `scripts/start-macos.command` after cloning. On Apple Silicon, choose **Apple Silicon · Fast Hardware** to use `h264_videotoolbox`; choose **High Quality** for better compression quality or **ProRes 422 HQ Master** for editing.

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/OnkarPawar1/advanced-cursor-webpage.git
cd advanced-cursor-webpage

# 2. Install dependencies
npm install

# 3. Start Vite and the local FFmpeg service together
npm run dev:all
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To check the installed FFmpeg capabilities:

```bash
npm run check:ffmpeg
```

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
5. Style them in the **Caption Style** panel (live preview included)
6. Subtitles are **burned into the canvas** — they appear in both the live preview and the exported video

#### Caption Style
Captions are drawn as **outlined text with a fully transparent background** by default — no black box.

| Control | Options |
|---|---|
| **Presets** | MrBeast Yellow, Clean White, Neon Green, Cyan Pop, Hot Pink, Gold Lux, Red Alert, Outline Only, Classic Pill, Bar Behind |
| **Font** | Anton, Bebas Neue, Archivo Black, Luckiest Guy, Bangers, Montserrat Black, Poppins ExtraBold, Rubik Black, Impact, Noto Sans (Google fonts loaded automatically) |
| **Text / Outline colour** | Full colour pickers, hex fields and one-click swatches |
| **Outline thickness** | 0–24 px, scaled automatically with the font size |
| **Font size** | 24–120 px |
| **Vertical position** | 10–95 % of frame height |
| **Background** | Transparent (default) · Pill · Full-width bar |
| **Toggles** | UPPERCASE, drop shadow, pop-in animation (scale bounce on every cue) |

> ✅ Supports Marathi, Hindi, and other Unicode scripts — pick **Noto Sans** for the widest script coverage, since the display faces are Latin-only.

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
1. Click **▶ Play** to preview the creation. Cursor and drawing gestures made during preview are captured with media timestamps.
2. In **Production FFmpeg Export**, select 720p, 1080p, or 4K; 24–60 FPS; and a quality preset.
3. Optionally enable −14 LUFS audio normalization.
4. Click **Render High Quality**. Upload preparation, queued/running state, percentage progress, cancellation, and errors remain visible in the interface.
5. Download the completed `.mp4` or `.mov` file.

Use **Live WebM Capture** when manual clip switching or the interactive Zoom Lens must be recorded. Production export supports the automatic timeline, all 14 mapped transitions, Ken Burns motion, subtitles, watermarks, and captured pointer/ink overlays.

Detailed architecture, API, security defaults and preset behavior are documented in [`docs/FFMPEG_RENDERER.md`](docs/FFMPEG_RENDERER.md).

---

### Long videos and animated text overlays

For 1–4 hour narrations, use **Production FFmpeg Export**. The optional **Live WebM Capture** workflow collects all recorded chunks in browser memory and is disabled when source narration exceeds 20 minutes, to reduce the risk of browser crashes. Production rendering submits a lightweight timeline and local media files to the Mac companion server; FFmpeg writes the MP4 directly to local disk.

The new **Animated Text Overlays** editor sits directly under the preview canvas:
1. Play or seek to a timestamp in the narration and click **Add Text at Playhead**.
2. Replace the example text with a short sentence, adjust its font size (16–64 px), color and start time.
3. Choose 3, 3.5 or 4 seconds. Text reveals progressively and each letter dissolves automatically near the end.
4. Click **Place Anywhere on Preview**, then click the position you want, or use the horizontal/vertical sliders.
5. Add as many cues as you need, then use **Production FFmpeg Export**. Your text overlay timings, positions and animations are burned into the exported MP4 using FFmpeg's ASS renderer.

Text overlays are small editable metadata objects in browser memory, **not** browser-recorded video. Other media files can still consume browser memory during preview/PDF processing. A page refresh clears unsaved editing state; your source files stay on your Mac. Keep the editor open while working, and for critical long projects maintain your own backups of source files.

---

### YouTube Live streaming (local Mac companion)

You can send a **finished H.264/AAC MP4 render** directly to YouTube using FFmpeg without another video encoding pass. This works with the editor's slide timing, animations, transitions, captions, and other effects already included in the rendered file.

1. On macOS, start the trusted local renderer with `npm run start:production` (or `npm start` if already built).
2. Add narration and slides, customize transitions and animation, and open **Production FFmpeg Export**.
3. Select **YouTube Live · 1080p 30 FPS H.264**. This uses a two-second keyframe interval and AAC audio. Click **Render High Quality**.
4. After MP4 completion, open **YouTube Live Studio** below the export controls.
5. In YouTube Studio, create or select a broadcast and copy a **fresh stream key**. Paste it into the local panel; choose **Repeat slideshow continuously** if desired.
6. Click **Start YouTube Stream**. The local service sends the MP4 to YouTube over RTMPS at real-time playback speed, copying both audio and video streams.
7. Check the preview / connection health in YouTube Studio and click **Go Live** if required. Stop with the **Stop Stream** button.

**Security and availability:** The stream key is not stored in project files, browser storage, or GitHub. It is temporarily provided to the local FFmpeg process and may be visible to other local users inspecting process arguments. Keep your Mac and render service trusted and private. Never commit a key, share it in screenshots, or expose the renderer to the internet. GitHub Pages itself cannot run FFmpeg: the macOS renderer must remain running throughout the broadcast, and the Mac must stay awake. Do not close the lid unless macOS is configured to keep working. If a key is exposed, regenerate it in YouTube Studio.

**Limitations:** This feature streams **completed automatic renders**, not live interactive edits. Manual slide switching and a dynamically moving zoom lens still use the separate **Live WebM Capture** workflow. ProRes MOV is not an RTMP-compatible input for stream-copy mode; render a YouTube-compatible MP4 instead. YouTube Studio manages the broadcast event; transmitting video does not by itself guarantee the event is public.

---

### Live Manual Control (Optional)

Enable **Live Manual Control** in Settings to drive the slideshow yourself while the audio plays — the filmstrip dashboard lets you jump to any clip instantly, and the recording captures exactly what you clicked.

| Control | Description |
|---|---|
| **⏮ / ⏭** | Step to the previous / next clip |
| **Filmstrip** | Click any thumbnail to cut to it immediately (viewed clips are marked green) |
| **Auto-Advance** | Automatically cuts to the next clip the moment the current one ends — images use the *Image Duration* setting, videos use their own real length |
| **Loop** | With Auto-Advance on, wraps back to the first clip after the last one so the video never runs out of visuals |

You can still click any thumbnail while Auto-Advance is running — the timer restarts from the clip you picked.

---

### YouTube SEO Studio (ChatGPT API)

Below the preview, the **YouTube SEO Studio** turns the project into a ready-to-upload package using your own OpenAI API key.

1. Paste your **ChatGPT (OpenAI) API key** (optionally remembered in this browser's `localStorage` only — it is never sent anywhere except `api.openai.com`)
2. Pick a **text model** (`gpt-5`, `gpt-5-mini`, `gpt-4.1`, `gpt-4o`, `o4-mini`, …) or type any newer model id in the free-text box
3. Pick an **image model** (`gpt-image-1`, `gpt-image-1-mini`, `dall-e-3`, `dall-e-2`) or type a newer one, plus size and quality
4. Optionally describe the topic/angle — the **video title, subtitle cues and clip filenames already loaded into the app are sent automatically as reference**
5. Click **Generate Title, Description & Keywords**

| Output | Guarantee |
|---|---|
| **Title** | Exactly **100 characters** (a repair pass plus a local trim/pad enforces the count) |
| **Description** | **3000+ characters** — hook, learning bullets, chapters, deep dive, CTA, hashtags |
| **Keywords** | 30–45 comma-separated SEO tags, kept under YouTube's 500-character tag limit |

Every field is editable, shows a live character counter, and has its own **Copy** button.

**Thumbnail styles:** pick the art direction before generating —

| Style | Look |
|---|---|
| **Annotated Explainer** (default) | White background, huge black condensed headline with a red hand-drawn underline, a detailed 3D render of the subject in the middle, handwritten callout labels with curved arrows, money/chart/coin accents — the "So You Want To Own A ___" business-explainer look |
| **MrBeast High-Contrast** | Expressive subject, thick yellow outlined headline, saturated electric palette |
| **Bold Text + Object** | Single hero object, two-tone flat background, poster-style stacked headline |
| **Cinematic Photo** | Golden-hour photographic shot with a lower-third headline |

**Thumbnail:** the model also returns a detailed 16:9 thumbnail prompt and headline in the chosen style. Click **Generate Thumbnail** to render it, then **Download Thumbnail PNG**. If image generation fails (billing, model access, content filter), the error is shown and **the full prompt stays on screen with a Copy button** so you can paste it into any other image tool as a workaround — you can also click **Build locally** to compose a prompt without calling the API at all.

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
| Live Export Fallback | `MediaRecorder` API + `HTMLCanvasElement.captureStream()` |
| Production Render API | Node.js 20 + Express 5 + Multer + Zod |
| Production Video Engine | FFmpeg + ffprobe (`libx264`, VideoToolbox, ProRes, libass) |
| Subtitles | Custom WEBVTT parser (no dependencies) |
| Deployment | GitHub Pages demo + local Node production service |

---

## 📁 Project Structure

```
advanced-cursor-webpage/
├── src/
│   ├── App.tsx              # Main component (entire app logic + canvas rendering)
│   ├── index.css            # Global styles + custom scrollbar
│   └── main.tsx             # React entry point
├── server/
│   ├── index.mjs            # Local API, upload handling and secure file delivery
│   ├── ffmpeg.mjs           # Filter graph, encoders, probing and progress
│   ├── ass.mjs              # Subtitle, watermark and Presenter FX overlays
│   ├── jobs.mjs             # Queue, cancellation and cleanup lifecycle
│   └── schema.mjs           # Versioned render-manifest validation
├── scripts/                 # macOS setup/start and development helpers
├── test/                    # Unit and real FFmpeg/API integration tests
├── docs/FFMPEG_RENDERER.md  # Architecture and API reference
├── .github/
│   └── workflows/
│       └── deploy.yml       # Verify PRs and deploy the browser demo
├── index.html
├── vite.config.ts
├── package.json
└── README.md
```

---

## 🔄 CI/CD — GitHub Pages Deployment

Every pull request and push to `main` automatically:
1. Installs dependencies (`npm ci`)
2. Checks FFmpeg capabilities
3. Runs unit and end-to-end render tests
4. Builds the project

Successful pushes to `main` then deploy `./dist` to GitHub Pages. The static deployment remains a browser demo; production FFmpeg jobs run on the local companion service.

The live URL is always up to date at:
**https://onkarpawar1.github.io/advanced-cursor-webpage/**

---

## 🛠️ Known Limitations & Tips

- **Browser Support**: Uses `MediaRecorder` — works best in **Chrome/Edge**. Firefox supports WebM export but may differ in codec availability.
- **Production Export**: Requires the local Node/FFmpeg companion. The public GitHub Pages demo cannot execute FFmpeg by itself.
- **Manual Presenter Actions**: Preview playback captures cursor and ink for deterministic FFmpeg export. Manual clip switching and Zoom Lens use Live WebM Capture.
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
