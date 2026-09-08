import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Play, Pause, Download, Trash2, Film, Music, Image as ImageIcon, RefreshCcw, Shuffle, AlertCircle, VolumeX, Volume2, FileText, Loader2, Video, Clock, Layers, Dices, Sparkles, Type, Tv, ImagePlus, Move, MousePointerClick, SkipBack, SkipForward, LayoutGrid, CheckCircle2, Pencil, Highlighter, MousePointer2, Eraser, Zap, CircleDot, ZoomIn, ScanSearch, Copy, KeyRound, Wand2, Youtube, Repeat } from 'lucide-react';

const AudioVisualMixer = () => {
  // State
  const [audioFile, setAudioFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [visualAssets, setVisualAssets] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Settings
  const [useShuffle, setUseShuffle] = useState(false);
  const [imageDuration, setImageDuration] = useState(5);
  const [muteVisuals, setMuteVisuals] = useState(true);
  const [fitSlidesToAudio, setFitSlidesToAudio] = useState(false);
  const [transitionEffect, setTransitionEffect] = useState('none');
  const [randomTransitions, setRandomTransitions] = useState(false); 
  const [highQualityPdf, setHighQualityPdf] = useState(false); 
  const [useRandomSubset, setUseRandomSubset] = useState(false);
  const [maxImagesToUse, setMaxImagesToUse] = useState(20);
  const [enableImageAnimations, setEnableImageAnimations] = useState(true);

  // Manual Mode State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualAssetIndex, setManualAssetIndex] = useState(0);
  const [lastManualChangeTime, setLastManualChangeTime] = useState(0);
  const [manualAnimType, setManualAnimType] = useState('zoom-in');
  const [viewedAssets, setViewedAssets] = useState(new Set([0])); // Track used slides
  const [manualAutoAdvance, setManualAutoAdvance] = useState(false); // auto jump to next clip when current ends
  const [manualAutoLoop, setManualAutoLoop] = useState(true); // wrap back to the first clip after the last one

  // Live-updated mirrors of the manual cursor so the render loop can advance clips
  // without waiting for a React re-render (prevents double-advancing in one frame).
  const manualIndexRef = useRef(0);
  const manualChangeTimeRef = useRef(0);
  
  // New Features
  const [videoTitle, setVideoTitle] = useState('');
  const [showWatermark, setShowWatermark] = useState(false);
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image'
  const [channelName, setChannelName] = useState('');
  const [watermarkImage, setWatermarkImage] = useState(null);


  // Presenter FX — rendered directly into the recording canvas
  const [showAnimatedCursor, setShowAnimatedCursor] = useState(true);
  const [interactionMode, setInteractionMode] = useState('cursor'); // cursor | pen | highlight | laser
  const [cursorStyle, setCursorStyle] = useState('whisk'); // whisk | comet | neon | spotlight
  const [cursorSize, setCursorSize] = useState(34);
  const [cursorTrail, setCursorTrail] = useState(true);
  const [interactionIntensity, setInteractionIntensity] = useState(1);
  const [penColor, setPenColor] = useState('#ffe45e');
  const [penWidth, setPenWidth] = useState(8);
  const [highlightWidth, setHighlightWidth] = useState(46);
  const [autoHideDrawings, setAutoHideDrawings] = useState(true);
  const [drawingLifetime, setDrawingLifetime] = useState(4);

  // Zoom Lens FX
  const [zoomLensShape, setZoomLensShape] = useState('circle'); // 'circle' | 'rect'
  const [zoomLensScale, setZoomLensScale] = useState(2.5);
  const [zoomLensSize, setZoomLensSize] = useState(180);
  const [showZoomedScene, setShowZoomedScene] = useState(false);

  // Subtitles / Transcript
  const [parsedCues, setParsedCues] = useState([]); // [{start, end, text}]
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState(42);
  const [subtitleRawText, setSubtitleRawText] = useState('');
  const [subtitleInputTab, setSubtitleInputTab] = useState('paste'); // 'paste' | 'upload'

  // Subtitle typography — MrBeast-style outlined captions, no solid black box by default
  const SUBTITLE_FONTS = [
    { id: 'Anton',        label: 'Anton (MrBeast)',   stack: "'Anton', Impact, sans-serif",              weight: 400, google: 'Anton' },
    { id: 'Bebas Neue',   label: 'Bebas Neue',        stack: "'Bebas Neue', Impact, sans-serif",         weight: 400, google: 'Bebas+Neue' },
    { id: 'Archivo Black',label: 'Archivo Black',     stack: "'Archivo Black', Arial Black, sans-serif", weight: 400, google: 'Archivo+Black' },
    { id: 'Luckiest Guy', label: 'Luckiest Guy',      stack: "'Luckiest Guy', Impact, cursive",          weight: 400, google: 'Luckiest+Guy' },
    { id: 'Bangers',      label: 'Bangers (Comic)',   stack: "'Bangers', Impact, cursive",               weight: 400, google: 'Bangers' },
    { id: 'Montserrat',   label: 'Montserrat Black',  stack: "'Montserrat', Arial, sans-serif",          weight: 900, google: 'Montserrat:wght@900' },
    { id: 'Poppins',      label: 'Poppins ExtraBold', stack: "'Poppins', Arial, sans-serif",             weight: 800, google: 'Poppins:wght@800' },
    { id: 'Rubik',        label: 'Rubik Black',       stack: "'Rubik', Arial, sans-serif",               weight: 900, google: 'Rubik:wght@900' },
    { id: 'Impact',       label: 'Impact (system)',   stack: "Impact, 'Arial Black', sans-serif",        weight: 400, google: null },
    { id: 'Noto Sans',    label: 'Noto Sans (clean)', stack: "'Noto Sans', 'Segoe UI', Arial, sans-serif", weight: 700, google: null },
  ];

  const SUBTITLE_PRESETS = {
    mrbeast:   { label: 'MrBeast Yellow', font: 'Anton',         color: '#FFE81F', stroke: '#000000', strokeWidth: 12, bg: 'none',  shadow: true,  uppercase: true },
    white:     { label: 'Clean White',    font: 'Montserrat',    color: '#FFFFFF', stroke: '#000000', strokeWidth: 10, bg: 'none',  shadow: true,  uppercase: false },
    neon:      { label: 'Neon Green',     font: 'Anton',         color: '#39FF14', stroke: '#06210A', strokeWidth: 11, bg: 'none',  shadow: true,  uppercase: true },
    cyan:      { label: 'Cyan Pop',       font: 'Bangers',       color: '#00E5FF', stroke: '#001B2E', strokeWidth: 11, bg: 'none',  shadow: true,  uppercase: true },
    pink:      { label: 'Hot Pink',       font: 'Luckiest Guy',  color: '#FF2E88', stroke: '#2A0014', strokeWidth: 11, bg: 'none',  shadow: true,  uppercase: true },
    gold:      { label: 'Gold Lux',       font: 'Poppins',       color: '#FFD54A', stroke: '#3A2A00', strokeWidth: 10, bg: 'none',  shadow: true,  uppercase: false },
    red:       { label: 'Red Alert',      font: 'Archivo Black', color: '#FF3B30', stroke: '#FFFFFF', strokeWidth: 9,  bg: 'none',  shadow: true,  uppercase: true },
    outlineOnly:{label: 'Outline Only',   font: 'Anton',         color: '#FFFFFF', stroke: '#000000', strokeWidth: 14, bg: 'none',  shadow: false, uppercase: true },
    pill:      { label: 'Classic Pill',   font: 'Noto Sans',     color: '#FFFFFF', stroke: '#000000', strokeWidth: 0,  bg: 'pill',  shadow: true,  uppercase: false },
    band:      { label: 'Bar Behind',     font: 'Montserrat',    color: '#FFFFFF', stroke: '#000000', strokeWidth: 4,  bg: 'band',  shadow: false, uppercase: true },
  };

  const [subtitlePreset, setSubtitlePreset] = useState('mrbeast');
  const [subtitleFont, setSubtitleFont] = useState('Anton');
  const [subtitleColor, setSubtitleColor] = useState('#FFE81F');
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState('#000000');
  const [subtitleStrokeWidth, setSubtitleStrokeWidth] = useState(12);
  const [subtitleBgStyle, setSubtitleBgStyle] = useState('none'); // none | pill | band
  const [subtitleShadow, setSubtitleShadow] = useState(true);
  const [subtitleUppercase, setSubtitleUppercase] = useState(true);
  const [subtitlePopIn, setSubtitlePopIn] = useState(true);
  const [subtitlePositionY, setSubtitlePositionY] = useState(84); // % of canvas height

  // --- YouTube SEO Studio (OpenAI / ChatGPT API) ---
  const OPENAI_TEXT_MODELS = [
    'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini',
    'gpt-4o', 'gpt-4o-mini', 'o4-mini', 'o3'
  ];
  const OPENAI_IMAGE_MODELS = ['gpt-image-1', 'gpt-image-1-mini', 'dall-e-3', 'dall-e-2'];
  const IMAGE_SIZES = {
    'gpt-image-1': ['1536x1024', '1024x1024', '1024x1536', 'auto'],
    'gpt-image-1-mini': ['1536x1024', '1024x1024', '1024x1536', 'auto'],
    'dall-e-3': ['1792x1024', '1024x1024', '1024x1792'],
    'dall-e-2': ['1024x1024', '512x512', '256x256'],
  };

  const [openAiKey, setOpenAiKey] = useState(() => {
    try { return localStorage.getItem('pfx_openai_key') || ''; } catch (e) { return ''; }
  });
  const [rememberKey, setRememberKey] = useState(true);
  const [textModel, setTextModel] = useState('gpt-5');
  const [customTextModel, setCustomTextModel] = useState('');
  const [imageModel, setImageModel] = useState('gpt-image-1');
  const [customImageModel, setCustomImageModel] = useState('');
  const [thumbSize, setThumbSize] = useState('1536x1024');
  const [thumbStyle, setThumbStyle] = useState('infographic');
  const [thumbQuality, setThumbQuality] = useState('high');

  const [seoTopic, setSeoTopic] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [thumbPrompt, setThumbPrompt] = useState('');
  const [thumbHeadline, setThumbHeadline] = useState('');
  const [thumbImage, setThumbImage] = useState('');
  const [seoLoading, setSeoLoading] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [seoError, setSeoError] = useState('');
  const [thumbError, setThumbError] = useState('');
  const [seoStatus, setSeoStatus] = useState('');
  const [copiedField, setCopiedField] = useState('');

  // Thumbnail art-direction presets. "infographic" mirrors the annotated
  // "SO YOU WANT TO OWN A ___" explainer look (white background, black headline,
  // red underline, rendered building, handwritten callouts).
  const THUMB_STYLES = {
    infographic: {
      label: 'Annotated Explainer (reference)',
      brief: `Clean flat-white background YouTube thumbnail in a business-explainer infographic style.
LAYOUT: a huge ALL-CAPS headline across the top in a heavy black condensed sans-serif (Anton / Archivo Black look), broken over two lines — a smaller first line and a much larger second line naming the subject — with a hand-drawn red marker underline swooshed beneath the key words. The centre of the frame holds a highly detailed, crisp 3D-rendered miniature of the main subject (building / facility / vehicle) shot straight-on, softly grounded with a light shadow.
ANNOTATIONS: six to eight short handwritten-style labels in dark grey ink placed in the white space around the render (top-left, top-right, bottom-left, bottom-right), each connected to the render with a thin hand-drawn curved arrow. Labels name business drivers (revenue streams, operating costs, staffing, location & foot traffic, maintenance, profitability & ROI).
SUPPORTING ELEMENTS: a small rising green bar chart with stacks of cash on the left, gold coin stacks and a dollar coin on the right, and a compact dark icon list/menu card with coloured icons on one side.
STYLE: bright, clean, high key, lots of white space, sharp vector-meets-3D-render mix, no photographic people, no clutter, no watermark, no logo. Every label must stay short and legible when the image is scaled to a small mobile thumbnail.`,
    },
    mrbeast: {
      label: 'MrBeast High-Contrast',
      brief: `Explosive high-CTR YouTube thumbnail: one expressive human subject on the right third with dramatic rim lighting and a shocked/excited expression, a thick ALL-CAPS outlined headline on the left third in bright yellow with a heavy black outline, saturated electric blue/orange palette, glowing accents, subtle motion streaks, blurred topic-relevant background with strong depth of field, extreme contrast, nothing small or fiddly. No watermark, no logo, no extra text besides the headline.`,
    },
    boldtext: {
      label: 'Bold Text + Object',
      brief: `Minimal, punchy YouTube thumbnail: a single hero object centred on a bold flat two-tone background (deep navy and vivid amber), a very large ALL-CAPS headline stacked in two lines beside it in white with a thick dark outline, a bright accent underline, soft studio lighting on the object, generous negative space, poster-like composition. No people, no watermark, no extra text.`,
    },
    cinematic: {
      label: 'Cinematic Photo',
      brief: `Cinematic photographic YouTube thumbnail: dramatic wide shot of the subject at golden hour, shallow depth of field, film-grade colour grade with teal shadows and warm highlights, volumetric light, and a bold ALL-CAPS headline in the lower third in white with a heavy dark outline and a subtle gradient scrim behind it for legibility. No watermark, no logo, no extra text besides the headline.`,
    },
  };


  // Refs (Including UI Performance Refs)
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const videoElementsRef = useRef({}); 
  const imageElementsRef = useRef({});
  const watermarkImgRef = useRef(null); 
  const hiddenContainerRef = useRef(null);
  const playheadRef = useRef(null);
  const timeTextRef = useRef(null);
  const renderProgressRef = useRef(null);

  const pointerRef = useRef({ x: 960, y: 540, visible: false, down: false, lastMove: 0 });
  const pointerTrailRef = useRef([]);
  const drawingStrokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const clickBurstsRef = useRef([]);
  const lastTrailSampleRef = useRef(0);
  const overviewCanvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null); // snapshot canvas for focus-wide zoom

  const TRANSITION_DURATION = 1.5; 

  const TRANSITION_TYPES = [
    'crossfade', 'fade-black', 'slide', 'slide-right', 'slide-up', 
    'slide-down', 'zoom', 'zoom-out', 'spin', 'iris-open', 
    'iris-close', 'clock-wipe', 'curtains', 'blinds'
  ];

  // --- PDF Helper Functions ---

  const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const convertPdfToImages = async (file) => {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const assets = [];
    const scale = highQualityPdf ? 4.0 : 2.0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scale }); 
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      const imgUrl = canvas.toDataURL('image/jpeg', highQualityPdf ? 0.95 : 0.8);
      
      assets.push({
        id: Math.random().toString(36).substr(2, 9),
        file: null, 
        url: imgUrl,
        type: 'image',
        name: `${file.name} - Page ${i}`,
        duration: 0
      });
    }
    return assets;
  };

  // --- File Handling ---

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
        setAudioFile({ file, url, name: file.name, duration: audio.duration, isVideo });
      };
      audio.onerror = () => {
          alert("Could not load media. Please ensure the file is a valid audio or video format.");
      };
    }
  };

  const handleVisualUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    const newAssets = [];

    try {
      if (files.some(f => f.type === 'application/pdf') && !window.pdfjsLib) {
        await loadPdfJs();
      }

      for (const file of files) {
        if (file.type === 'application/pdf') {
          const pdfPages = await convertPdfToImages(file);
          newAssets.push(...pdfPages);
        } else {
          const url = URL.createObjectURL(file);
          const type = file.type.startsWith('video') ? 'video' : 'image';
          let duration = 0;

          if (type === 'video') {
            duration = await getVideoDuration(url);
          }

          newAssets.push({
            id: Math.random().toString(36).substr(2, 9),
            file, url, type, name: file.name, duration 
          });
        }
      }
      setVisualAssets(prev => [...prev, ...newAssets]);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. If uploading a PDF, ensure it is not password protected.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setWatermarkImage({ file, url, name: file.name });
          
          const img = new Image();
          img.src = url;
          watermarkImgRef.current = img;
      }
  };

  const getVideoDuration = (url) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => resolve(0);
      video.src = url;
    });
  };

  const removeVisual = (id) => {
    setVisualAssets(prev => prev.filter(a => a.id !== id));
    if (videoElementsRef.current[id]) {
      videoElementsRef.current[id].remove();
      delete videoElementsRef.current[id];
    }
    if (imageElementsRef.current[id]) {
      delete imageElementsRef.current[id];
    }
  };

  // --- Timeline Logic ---

  useEffect(() => {
    if (visualAssets.length > 2) setUseShuffle(true);
    else setUseShuffle(false);
  }, [visualAssets.length]);

  const activeAssets = useMemo(() => {
    if (isManualMode) return visualAssets; // Always show full library in manual mode
    if (useRandomSubset && maxImagesToUse > 0 && visualAssets.length > maxImagesToUse) {
        return [...visualAssets].sort(() => 0.5 - Math.random()).slice(0, maxImagesToUse);
    }
    return visualAssets;
  }, [visualAssets, useRandomSubset, maxImagesToUse, isManualMode]);

  // Out of bounds safety checker
  useEffect(() => {
      if (manualAssetIndex >= activeAssets.length && activeAssets.length > 0) {
          manualIndexRef.current = activeAssets.length - 1;
          setManualAssetIndex(activeAssets.length - 1);
      }
  }, [activeAssets.length, manualAssetIndex]);

  const timeline = useMemo(() => {
    if (!audioDuration || activeAssets.length === 0) return [];

    let segments = [];
    const IMG_ANIMATIONS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];
    
    const getTransition = () => {
        if (randomTransitions) {
            return TRANSITION_TYPES[Math.floor(Math.random() * TRANSITION_TYPES.length)];
        }
        return transitionEffect;
    };

    if (fitSlidesToAudio) {
        const durationPerSlide = audioDuration / activeAssets.length;
        activeAssets.forEach((asset, index) => {
            const startTime = index * durationPerSlide;
            const endTime = index === activeAssets.length - 1 ? audioDuration : (index + 1) * durationPerSlide;
            segments.push({
                asset, startTime, endTime, offset: 0, transitionEffect: getTransition(), imgAnim: IMG_ANIMATIONS[Math.floor(Math.random() * IMG_ANIMATIONS.length)]
            });
        });
        return segments;
    }

    let currentTotalTime = 0;
    let index = 0;
    let shufflePool = [];

    const getNextAsset = () => {
        if (activeAssets.length === 1) return activeAssets[0];
        if (useShuffle) {
            if (shufflePool.length === 0) {
                shufflePool = activeAssets.map((_, i) => i).sort(() => Math.random() - 0.5);
            }
            const nextIndex = shufflePool.pop();
            return activeAssets[nextIndex];
        } else {
            const asset = activeAssets[index % activeAssets.length];
            index++;
            return asset;
        }
    };

    while (currentTotalTime < audioDuration) {
      const asset = getNextAsset();
      const segDur = asset.type === 'image' ? imageDuration : (asset.duration || 5);
      segments.push({
        asset, startTime: currentTotalTime, endTime: currentTotalTime + segDur, offset: 0, transitionEffect: getTransition(), imgAnim: IMG_ANIMATIONS[Math.floor(Math.random() * IMG_ANIMATIONS.length)]
      });
      currentTotalTime += segDur;
    }

    const lastSeg = segments[segments.length - 1];
    if (lastSeg && lastSeg.endTime > audioDuration) {
      lastSeg.endTime = audioDuration;
    }

    return segments;
  }, [audioDuration, activeAssets, useShuffle, imageDuration, fitSlidesToAudio, randomTransitions, transitionEffect]);

  // --- Centralized State Ref for Render Loop (Zero Closure Staleness) ---
  const stateRefs = useRef({});
  stateRefs.current = {
      isManualMode, manualAssetIndex, lastManualChangeTime, manualAnimType,
      manualAutoAdvance, manualAutoLoop, 
      activeAssets, timeline, enableImageAnimations, showWatermark, channelName, 
      watermarkType, isPlaying, isRendering, audioDuration, imageDuration, muteVisuals,
      showAnimatedCursor, interactionMode, cursorStyle, cursorSize, cursorTrail,
      interactionIntensity, penColor, penWidth, highlightWidth,
      autoHideDrawings, drawingLifetime,
      zoomLensShape, zoomLensScale, zoomLensSize, showZoomedScene,
      parsedCues, showSubtitles, subtitleFontSize,
      subtitleFont, subtitleColor, subtitleStrokeColor, subtitleStrokeWidth,
      subtitleBgStyle, subtitleShadow, subtitleUppercase, subtitlePopIn, subtitlePositionY
  };

  // --- Media Element Loading Engine ---

  useEffect(() => {
    visualAssets.forEach(asset => {
      if (asset.type === 'video' && !videoElementsRef.current[asset.id]) {
        const vid = document.createElement('video');
        vid.src = asset.url;
        vid.muted = muteVisuals; 
        vid.playsInline = true;
        vid.loop = true;
        vid.crossOrigin = "anonymous";
        vid.preload = "auto";
        vid.style.display = "none"; 
        if (hiddenContainerRef.current) hiddenContainerRef.current.appendChild(vid);
        videoElementsRef.current[asset.id] = vid;
      }
      if (asset.type === 'image' && !imageElementsRef.current[asset.id]) {
        const img = new Image();
        img.src = asset.url;
        imageElementsRef.current[asset.id] = img;
      }
    });
    
    Object.values(videoElementsRef.current).forEach(vid => { vid.muted = muteVisuals; });

    const currentIds = visualAssets.map(a => a.id);
    Object.keys(videoElementsRef.current).forEach(id => {
      if (!currentIds.includes(id)) {
         const vid = videoElementsRef.current[id];
         if (vid) vid.remove();
         delete videoElementsRef.current[id];
      }
    });
    Object.keys(imageElementsRef.current).forEach(id => {
      if (!currentIds.includes(id)) delete imageElementsRef.current[id];
    });
  }, [visualAssets, muteVisuals]);

  // --- Render Helpers ---

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- WEBVTT Parser ---
  const parseWebVTT = (text) => {
    const cues = [];
    // Normalize line endings and split into blocks
    const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n{2,}/);
    const timeRe = /^([\d]{2}:)?([\d]{2}):([\d]{2})[.,]([\d]{3})\s-->\s([\d]{2}:)?([\d]{2}):([\d]{2})[.,]([\d]{3})/;
    const toSecs = (h, m, s, ms) => (parseInt(h || 0) * 3600) + (parseInt(m) * 60) + parseInt(s) + parseInt(ms) / 1000;
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const tsLine = lines.find(l => timeRe.test(l));
      if (!tsLine) continue;
      const m = tsLine.match(timeRe);
      if (!m) continue;
      const start = toSecs(m[1]?.replace(':',''), m[2], m[3], m[4]);
      const end   = toSecs(m[5]?.replace(':',''), m[6], m[7], m[8]);
      const textLines = lines.slice(lines.indexOf(tsLine) + 1).filter(l => l.trim() && !l.match(/^\d+$/));
      if (textLines.length > 0) {
        cues.push({ start, end, text: textLines.join('\n') });
      }
    }
    return cues;
  };

  const applySubtitleText = (raw) => {
    setSubtitleRawText(raw);
    const cues = parseWebVTT(raw);
    setParsedCues(cues);
  };

  // --- Google font loading so the canvas can actually render the display faces ---
  useEffect(() => {
    const families = SUBTITLE_FONTS.map(f => f.google).filter(Boolean);
    const href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${f}`).join('&')}&display=swap`;
    if (!document.getElementById('pfx-subtitle-fonts')) {
      const link = document.createElement('link');
      link.id = 'pfx-subtitle-fonts';
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  // Canvas only paints a font once it is actually loaded — warm the active one up.
  useEffect(() => {
    const def = SUBTITLE_FONTS.find(f => f.id === subtitleFont);
    if (!def || !document.fonts) return;
    document.fonts.load(`${def.weight} 64px ${def.stack.split(',')[0]}`).catch(() => {});
  }, [subtitleFont]);

  const getSubtitleFontDef = (id) => SUBTITLE_FONTS.find(f => f.id === id) || SUBTITLE_FONTS[0];

  // --- Subtitle Canvas Draw ---
  const drawSubtitle = (ctx, w, h, time) => {
    const s = stateRefs.current;
    if (!s.showSubtitles || !s.parsedCues || s.parsedCues.length === 0) return;
    const cue = s.parsedCues.find(c => time >= c.start && time < c.end);
    if (!cue) return;

    const fontDef = getSubtitleFontDef(s.subtitleFont);
    const fontSize = s.subtitleFontSize || 42;
    const font = `${fontDef.weight} ${fontSize}px ${fontDef.stack}`;
    ctx.save();
    ctx.font = font;

    const rawText = s.subtitleUppercase ? cue.text.toUpperCase() : cue.text;
    const lines = rawText.split('\n');
    const lineH = fontSize * 1.22;
    const paddingX = 32;
    const paddingY = 18;
    const maxW = w * 0.86;

    // Word-wrap each line to fit maxW
    const wrappedLines = [];
    for (const line of lines) {
      const words = line.split(' ');
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxW) {
          if (current) wrappedLines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) wrappedLines.push(current);
    }
    if (wrappedLines.length === 0) { ctx.restore(); return; }

    const widest = Math.max(...wrappedLines.map(l => ctx.measureText(l).width));
    const blockH = wrappedLines.length * lineH;
    const centerX = w / 2;
    const centerY = h * ((s.subtitlePositionY ?? 84) / 100);
    const firstLineCenter = centerY - blockH / 2 + lineH / 2;

    // Pop-in: a short scale bounce as each cue appears (MrBeast style)
    if (s.subtitlePopIn) {
      const age = time - cue.start;
      const dur = 0.22;
      if (age >= 0 && age < dur) {
        const p = age / dur;
        const eased = 1 - Math.pow(1 - p, 3);
        const scale = 0.72 + 0.28 * eased + Math.sin(p * Math.PI) * 0.06;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
      }
    }

    // Optional background — 'none' keeps the text fully transparent behind the glyphs
    if (s.subtitleBgStyle === 'pill') {
      const boxW = Math.min(maxW + paddingX * 2, widest + paddingX * 2);
      const boxH = blockH + paddingY * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.beginPath();
      ctx.roundRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH, 12);
      ctx.fill();
    } else if (s.subtitleBgStyle === 'band') {
      const boxH = blockH + paddingY * 1.4;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, centerY - boxH / 2, w, boxH);
    }

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    const strokeW = s.subtitleStrokeWidth || 0;
    // Stroke scales with the font size so the outline stays proportional at any size.
    const scaledStroke = strokeW * (fontSize / 42);

    wrappedLines.forEach((line, i) => {
      const y = firstLineCenter + lineH * i;

      // Soft drop shadow for separation from busy footage.
      // Painted on a carrier pass so the glyph interior stays transparent.
      if (s.subtitleShadow) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = fontSize * 0.35;
        ctx.shadowOffsetY = fontSize * 0.08;
        if (scaledStroke > 0) {
          ctx.lineWidth = scaledStroke;
          ctx.strokeStyle = s.subtitleStrokeColor || '#000000';
          ctx.strokeText(line, centerX, y);
        } else {
          ctx.fillStyle = s.subtitleColor || '#ffffff';
          ctx.fillText(line, centerX, y);
        }
        ctx.restore();
      }

      if (scaledStroke > 0) {
        ctx.lineWidth = scaledStroke;
        ctx.strokeStyle = s.subtitleStrokeColor || '#000000';
        ctx.strokeText(line, centerX, y);
      }

      ctx.fillStyle = s.subtitleColor || '#ffffff';
      ctx.fillText(line, centerX, y);
    });

    ctx.restore();
  };

  const applySubtitlePreset = (key) => {
    const preset = SUBTITLE_PRESETS[key];
    if (!preset) return;
    setSubtitlePreset(key);
    setSubtitleFont(preset.font);
    setSubtitleColor(preset.color);
    setSubtitleStrokeColor(preset.stroke);
    setSubtitleStrokeWidth(preset.strokeWidth);
    setSubtitleBgStyle(preset.bg);
    setSubtitleShadow(preset.shadow);
    setSubtitleUppercase(preset.uppercase);
  };

  // --- Asset Reorder Helpers ---
  const moveAssetUp = (id) => {
    setVisualAssets(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveAssetDown = (id) => {
    setVisualAssets(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const sortAssetsAlpha = () => {
    setVisualAssets(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const sortAssetsNumeric = () => {
    setVisualAssets(prev => [...prev].sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] ?? '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] ?? '0', 10);
      return numA !== numB ? numA - numB : a.name.localeCompare(b.name);
    }));
  };

  const shuffleAssets = () => {
    setVisualAssets(prev => [...prev].sort(() => Math.random() - 0.5));
  };
  
  const drawWatermark = (ctx, width, height) => {
      const { showWatermark, watermarkType, channelName } = stateRefs.current;
      if (!showWatermark) return;

      const marginX = 10;
      const marginY = 10;

      if (watermarkType === 'text' && channelName) {
          const paddingX = 20;
          const paddingY = 12;
          const fontSize = 24;
          
          ctx.save();
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textMetrics = ctx.measureText(channelName);
          
          const boxWidth = textMetrics.width + (paddingX * 2);
          const boxHeight = fontSize + (paddingY * 2);
          
          const x = width - marginX - boxWidth;
          const y = height - marginY - boxHeight;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.roundRect(x, y, boxWidth, boxHeight, 8); 
          ctx.fill();

          ctx.fillStyle = 'white';
          ctx.textBaseline = 'middle';
          ctx.fillText(channelName, x + paddingX, y + (boxHeight / 2) + 2); 
          ctx.restore();
      } else if (watermarkType === 'image' && watermarkImgRef.current) {
          const img = watermarkImgRef.current;
          if (img.complete && img.naturalWidth !== 0) {
              const targetHeight = 60; 
              const aspectRatio = img.width / img.height;
              const targetWidth = targetHeight * aspectRatio;

              const x = width - marginX - targetWidth;
              const y = height - marginY - targetHeight;

              ctx.save();
              ctx.globalAlpha = 0.8; 
              ctx.drawImage(img, x, y, targetWidth, targetHeight);
              ctx.restore();
          }
      }
  };

  const drawAsset = (ctx, asset, timeOffset, alpha = 1, transform = null, segment = null) => {
    if (!asset) return;
    
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    if (transform) {
        const cx = w / 2;
        const cy = h / 2;
        if (transform.rotate) {
            ctx.translate(cx, cy);
            ctx.rotate(transform.rotate);
            ctx.translate(-cx, -cy);
        }
        ctx.translate(transform.tx || 0, transform.ty || 0);
        if (transform.s !== undefined) {
            ctx.translate(cx, cy);
            ctx.scale(transform.s, transform.s);
            ctx.translate(-cx, -cy);
        }
    }

    const { enableImageAnimations, isPlaying, isRendering } = stateRefs.current;
    
    // Apply Ken Burns style animation for images
    if (enableImageAnimations && segment && asset.type === 'image') {
        const duration = segment.endTime - segment.startTime;
        const progress = duration > 0 ? timeOffset / duration : 0;
        const p = Math.max(0, Math.min(1, progress));
        const type = segment.imgAnim;

        let s = 1, tx = 0, ty = 0;
        const scaleAmt = 0.15; 
        const panAmt = 0.08; 

        switch (type) {
            case 'zoom-in': s = 1 + (p * scaleAmt); break;
            case 'zoom-out': s = 1 + scaleAmt - (p * scaleAmt); break;
            case 'pan-left': s = 1 + panAmt; tx = (p * w * panAmt) - (w * panAmt / 2); break;
            case 'pan-right': s = 1 + panAmt; tx = -(p * w * panAmt) + (w * panAmt / 2); break;
            case 'pan-up': s = 1 + panAmt; ty = (p * h * panAmt) - (h * panAmt / 2); break;
            case 'pan-down': s = 1 + panAmt; ty = -(p * h * panAmt) + (h * panAmt / 2); break;
            default: break;
        }

        const cx = w / 2;
        const cy = h / 2;
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.translate(-cx, -cy);
        ctx.translate(tx, ty);
    }

    if (asset.type === 'image') {
        const img = imageElementsRef.current[asset.id];
        if (img && img.complete && img.naturalWidth !== 0) {
            drawImageCover(ctx, img, w, h);
        }
    } else if (asset.type === 'video') {
        const vid = videoElementsRef.current[asset.id];
        if (vid && vid.readyState >= 2) {
             let vTime = timeOffset;
             if (vTime < 0) vTime = 0;
             // Loop the video by wrapping timeOffset within its natural duration
             const vidDur = vid.duration;
             if (vidDur && vidDur > 0 && isFinite(vidDur)) {
                 vTime = vTime % vidDur;
             }
             if (Math.abs(vid.currentTime - vTime) > 0.3) vid.currentTime = vTime;
             if (vid.paused && (isPlaying || isRendering)) vid.play().catch(() => {});
             drawImageCover(ctx, vid, w, h);
        }
    }
    
    ctx.restore();
  };

  const drawImageCover = (ctx, img, cw, ch) => {
    const w = img.videoWidth || img.width;
    const h = img.videoHeight || img.height;
    if (!w || !h) return;
    const iRatio = w / h;
    const cRatio = cw / ch;
    let nw, nh, ox, oy;
    if (iRatio > cRatio) {
        nw = ch * iRatio;
        nh = ch;
        ox = (cw - nw) / 2;
        oy = 0;
    } else {
        nw = cw;
        nh = cw / iRatio;
        ox = 0;
        oy = (ch - nh) / 2;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    try {
        ctx.drawImage(img, ox, oy, nw, nh);
    } catch (e) {}
  };


  // --- Presenter FX / animated cursor / drawing overlay ---

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const pushTrailPoint = (x, y, now) => {
    if (now - lastTrailSampleRef.current < 12) return;
    lastTrailSampleRef.current = now;
    pointerTrailRef.current.push({ x, y, born: now });
    if (pointerTrailRef.current.length > 42) pointerTrailRef.current.splice(0, pointerTrailRef.current.length - 42);
  };

  const addStrokePoint = (point, now) => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    const points = stroke.points;
    const last = points[points.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 2.2) {
      points.push({ x: point.x, y: point.y, t: now });
    }
  };

  const handleCanvasPointerMove = (event) => {
    const point = getCanvasPoint(event);
    if (!point) return;
    const now = performance.now();
    pointerRef.current.x = point.x;
    pointerRef.current.y = point.y;
    pointerRef.current.visible = true;
    pointerRef.current.lastMove = now;
    pushTrailPoint(point.x, point.y, now);

    if (pointerRef.current.down && (stateRefs.current.interactionMode === 'pen' || stateRefs.current.interactionMode === 'highlight')) {
      addStrokePoint(point, now);
    }
  };

  const handleCanvasPointerDown = (event) => {
    const point = getCanvasPoint(event);
    if (!point) return;
    const now = performance.now();
    pointerRef.current = { ...pointerRef.current, x: point.x, y: point.y, visible: true, down: true, lastMove: now };
    pushTrailPoint(point.x, point.y, now);

    clickBurstsRef.current.push({ x: point.x, y: point.y, born: now });
    if (clickBurstsRef.current.length > 12) clickBurstsRef.current.shift();

    const mode = stateRefs.current.interactionMode;
    if (mode === 'pen' || mode === 'highlight') {
      const stroke = {
        id: `${now}-${Math.random()}`,
        type: mode,
        points: [{ x: point.x, y: point.y, t: now }],
        createdAt: now,
        finishedAt: null,
        color: stateRefs.current.penColor,
        width: mode === 'highlight' ? stateRefs.current.highlightWidth : stateRefs.current.penWidth,
      };
      drawingStrokesRef.current.push(stroke);
      activeStrokeRef.current = stroke;
      if (drawingStrokesRef.current.length > 80) drawingStrokesRef.current.splice(0, drawingStrokesRef.current.length - 80);
    }

    if (event.currentTarget?.setPointerCapture) {
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
    }
  };

  const finishCanvasStroke = (event) => {
    pointerRef.current.down = false;
    if (activeStrokeRef.current) {
      activeStrokeRef.current.finishedAt = performance.now();
      activeStrokeRef.current = null;
    }
    if (event?.currentTarget?.releasePointerCapture) {
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) {}
    }
  };

  const clearPresenterDrawings = () => {
    drawingStrokesRef.current = [];
    activeStrokeRef.current = null;
    clickBurstsRef.current = [];
  };

  const drawSmoothPath = (ctx, points) => {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 1) {
      ctx.lineTo(points[0].x + 0.01, points[0].y + 0.01);
      return;
    }
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  };

  const drawStrokeFX = (ctx, stroke, now, alpha) => {
    const points = stroke.points;
    if (!points?.length) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.type === 'highlight') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = alpha * 0.22;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = 8;
      drawSmoothPath(ctx, points);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.12;
      ctx.lineWidth = Math.max(8, stroke.width * 1.28);
      drawSmoothPath(ctx, points);
      ctx.stroke();
    } else {
      // Soft outer neon glow
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * 2.1;
      ctx.globalAlpha = alpha * 0.16;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = 28;
      drawSmoothPath(ctx, points);
      ctx.stroke();

      // Main hand-drawn ink
      ctx.globalAlpha = alpha * 0.96;
      ctx.lineWidth = stroke.width;
      ctx.shadowBlur = 10;
      drawSmoothPath(ctx, points);
      ctx.stroke();

      // Animated hot core gives the writing a "drawing itself" energy
      ctx.globalAlpha = alpha * 0.78;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, stroke.width * 0.22);
      ctx.shadowBlur = 5;
      drawSmoothPath(ctx, points.slice(Math.max(0, points.length - 10)));
      ctx.stroke();
    }

    // Moving spark on the live endpoint
    const endpoint = points[points.length - 1];
    if (!stroke.finishedAt && endpoint) {
      const pulse = 0.7 + Math.sin(now * 0.02) * 0.3;
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(endpoint.x, endpoint.y, Math.max(3, stroke.width * 0.55 * pulse), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawCursorFX = (ctx, w, h, now) => {
    const s = stateRefs.current;
    const pointer = pointerRef.current;
    // For focus-wide: keep rendering even if cursor left the canvas
    const isFocusWide = s.cursorStyle === 'focus-wide';
    if (!s.showAnimatedCursor || (!pointer.visible && !isFocusWide)) return;

    const idleMs = now - pointer.lastMove;
    // focus-wide: never fade — zoom stays frozen at last position when cursor idles or leaves
    const idleAlpha = isFocusWide ? 1 : (idleMs > 2600 ? Math.max(0, 1 - ((idleMs - 2600) / 700)) : 1);
    if (idleAlpha <= 0) return;

    const x = pointer.x;
    const y = pointer.y;
    const size = s.cursorSize;
    const intensity = s.interactionIntensity;
    const mode = s.interactionMode;
    const accent = mode === 'highlight' ? s.penColor : mode === 'pen' ? s.penColor : mode === 'laser' ? '#ff466d' : '#67e8f9';

    // Spotlight mode subtly dims the world outside the cursor focus.
    if (s.cursorStyle === 'spotlight') {
      const radius = size * 4.5;
      ctx.save();
      const g = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.62, 'rgba(0,0,0,0.04)');
      g.addColorStop(1, `rgba(0,0,0,${0.62 * idleAlpha})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 16:9 Wide Spotlight — TRUE MAGNIFYING GLASS: zooms the region under cursor to fill the full canvas.
    if (s.cursorStyle === 'focus-wide') {
      const aspect = 16 / 9;
      // srcH controls how much of the canvas is captured (smaller = more zoom)
      // cursorSize slider: small size = high zoom, large size = wide view
      const srcH = Math.max(90, Math.min(h, size * 8.2));
      const srcW = Math.min(w, srcH * aspect);
      // Centre source region on cursor, clamped so we never read outside canvas
      const srcX = Math.max(0, Math.min(w - srcW, x - srcW / 2));
      const srcY = Math.max(0, Math.min(h - srcH, y - srcH / 2));

      const oc = offscreenCanvasRef.current;
      if (oc) {
        // Draw the zoomed region from the pre-FX snapshot to fill the ENTIRE canvas
        ctx.save();
        ctx.globalAlpha = idleAlpha;
        ctx.drawImage(oc, srcX, srcY, srcW, srcH, 0, 0, w, h);
        ctx.restore();
      }

      const t = now * 0.001; // seconds
      const bInset = 5; // inset so border strokes are visible

      // ── 1. Breathing glow border around the full canvas ──
      const borderPulse = 0.55 + Math.sin(t * 2.6) * 0.45;
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 32 * borderPulse * intensity;
      ctx.globalAlpha = idleAlpha * (0.72 + borderPulse * 0.28);
      ctx.strokeRect(bInset, bInset, w - bInset * 2, h - bInset * 2);
      // Thin white inner edge
      ctx.globalAlpha = idleAlpha * 0.10;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.strokeRect(bInset + 4, bInset + 4, w - (bInset + 4) * 2, h - (bInset + 4) * 2);
      ctx.restore();

      // ── 2. Animated L-corner brackets ──
      const bPulse = 0.8 + Math.sin(t * 3.2) * 0.2;
      const blen = Math.min(w, h) * 0.07 * bPulse;
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      ctx.lineCap = 'square';
      ctx.shadowColor = accent;
      ctx.shadowBlur = 22 * bPulse * intensity;
      ctx.globalAlpha = idleAlpha;
      [
        [bInset,     bInset,     1,  1],
        [w-bInset,   bInset,    -1,  1],
        [bInset,     h-bInset,   1, -1],
        [w-bInset,   h-bInset,  -1, -1],
      ].forEach(([cx2, cy2, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx2 + dx * blen, cy2);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx2, cy2 + dy * blen);
        ctx.stroke();
      });
      ctx.restore();

      // ── 3. Horizontal scan line sweeping the full height ──
      const scanY = (t * 80) % h;
      ctx.save();
      ctx.globalAlpha = idleAlpha * 0.42;
      const sg = ctx.createLinearGradient(0, scanY - 14, 0, scanY + 14);
      sg.addColorStop(0, 'rgba(103,232,249,0)');
      sg.addColorStop(0.45, 'rgba(103,232,249,0.4)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      sg.addColorStop(0.55, 'rgba(103,232,249,0.4)');
      sg.addColorStop(1, 'rgba(103,232,249,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 14, w, 28);
      ctx.restore();

      // ── 4. Diagonal shimmer wipe ──
      const shimX = -w + ((t * 50) % (w * 2));
      ctx.save();
      ctx.globalAlpha = idleAlpha * 0.07;
      const shG = ctx.createLinearGradient(shimX, 0, shimX + w * 0.4, h);
      shG.addColorStop(0, 'rgba(255,255,255,0)');
      shG.addColorStop(0.4, 'rgba(255,255,255,0.8)');
      shG.addColorStop(0.6, 'rgba(255,255,255,0.8)');
      shG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shG;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // ── 5. REC dot (top-left) ──
      const recA = 0.65 + Math.sin(t * 4.5) * 0.35;
      ctx.save();
      ctx.globalAlpha = idleAlpha * recA;
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(bInset + 22, bInset + 22, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 6. Zoom-factor badge (bottom-right) ──
      const zoomFactor = (w / srcW).toFixed(1);
      ctx.save();
      ctx.globalAlpha = idleAlpha * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.beginPath();
      ctx.roundRect(w - 118, h - 44, 108, 34, 7);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.fillText(`🔍 ${zoomFactor}× ZOOM`, w - 64, h - 27);
      ctx.restore();
    }

    // Fluid trail / laser ribbon
    if (s.cursorTrail || mode === 'laser') {
      const maxAge = mode === 'laser' ? 720 : 520;
      const liveTrail = pointerTrailRef.current.filter(p => now - p.born <= maxAge);
      pointerTrailRef.current = liveTrail;
      if (liveTrail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < liveTrail.length; i++) {
          const age = now - liveTrail[i].born;
          const a = Math.max(0, 1 - age / maxAge) * idleAlpha;
          ctx.strokeStyle = accent;
          ctx.globalAlpha = a * (mode === 'laser' ? 0.9 : 0.46);
          ctx.shadowColor = accent;
          ctx.shadowBlur = (mode === 'laser' ? 28 : 18) * intensity;
          ctx.lineWidth = Math.max(1.5, (size * 0.20) * a * (mode === 'laser' ? 1.4 : 1));
          ctx.beginPath();
          ctx.moveTo(liveTrail[i - 1].x, liveTrail[i - 1].y);
          ctx.lineTo(liveTrail[i].x, liveTrail[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Main cursor styles
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = idleAlpha;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24 * intensity;

    if (s.cursorStyle === 'focus-wide') {
      // Small crosshair at the cursor hotspot (inside the 16:9 window)
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.globalAlpha = idleAlpha * 0.65;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10 * intensity;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
      ctx.moveTo(0, -16); ctx.lineTo(0, 16);
      ctx.stroke();
      // Tiny centre dot
      ctx.globalAlpha = idleAlpha;
      ctx.fillStyle = accent;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.cursorStyle === 'whisk') {
      const spin = now * 0.0032;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(spin + i * (Math.PI * 2 / 3));
        ctx.strokeStyle = i === 1 ? '#ffffff' : accent;
        ctx.globalAlpha = idleAlpha * (0.62 - i * 0.09);
        ctx.lineWidth = Math.max(2, size * 0.07);
        ctx.beginPath();
        ctx.arc(0, 0, size * (0.52 + i * 0.18), -0.42, 0.72);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = idleAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(4, size * 0.16), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, size * 0.075);
      ctx.beginPath();
      ctx.arc(0, 0, size * (0.44 + Math.sin(now * 0.01) * 0.05), 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.cursorStyle === 'comet') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(3, size * 0.10);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(3, size * 0.09);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(3, size * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny mode badge makes pen/highlighter intent readable in a screen recording.
    if (mode === 'pen' || mode === 'highlight') {
      ctx.shadowBlur = 12;
      ctx.fillStyle = accent;
      ctx.globalAlpha = idleAlpha * 0.92;
      ctx.beginPath();
      ctx.arc(size * 0.62, size * 0.62, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawClickBursts = (ctx, now) => {
    const bursts = clickBurstsRef.current.filter(b => now - b.born < 650);
    clickBurstsRef.current = bursts;
    bursts.forEach((burst) => {
      const p = (now - burst.born) / 650;
      const ease = 1 - Math.pow(1 - p, 3);
      const radius = 18 + ease * 68;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = stateRefs.current.penColor;
      ctx.lineWidth = Math.max(2, 6 * (1 - p));
      ctx.shadowColor = stateRefs.current.penColor;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Spark particles on click
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i / 8) + burst.born * 0.001;
        const d = ease * 72;
        ctx.fillStyle = i % 2 ? '#ffffff' : stateRefs.current.penColor;
        ctx.globalAlpha = (1 - p) * 0.82;
        ctx.beginPath();
        ctx.arc(burst.x + Math.cos(a) * d, burst.y + Math.sin(a) * d, Math.max(1.5, 4 * (1 - p)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  // --- Zoom Lens FX ---

  const drawZoomLens = (ctx, w, h) => {
    const s = stateRefs.current;
    const pointer = pointerRef.current;
    if (s.interactionMode !== 'zoom' || !pointer.visible) return;

    const cx = pointer.x;
    const cy = pointer.y;
    const lensRadius = s.zoomLensSize;
    const lensW = lensRadius * 2;
    const lensH = lensRadius * 2;
    const scale = s.zoomLensScale;
    const shape = s.zoomLensShape;

    // Source region in canvas coords (the area being magnified)
    const srcW = lensW / scale;
    const srcH = lensH / scale;
    // Clamp source so it never goes out of canvas bounds
    const srcX = Math.max(0, Math.min(w - srcW, cx - srcW / 2));
    const srcY = Math.max(0, Math.min(h - srcH, cy - srcH / 2));

    // Lens display position — offset toward top-right, clamped to canvas
    let lensX = cx + 48;
    let lensY = cy - lensH - 48;
    lensX = Math.max(12, Math.min(w - lensW - 12, lensX));
    lensY = Math.max(12, Math.min(h - lensH - 12, lensY));
    const lCx = lensX + lensRadius;
    const lCy = lensY + lensRadius;
    const borderR = 16;

    // --- Draw magnified content inside clipped lens shape ---
    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(lCx, lCy, lensRadius, 0, Math.PI * 2);
    } else {
      ctx.roundRect(lensX, lensY, lensW, lensH, borderR);
    }
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(lensX, lensY, lensW, lensH);
    try {
      // Read already-drawn pixels from same canvas (content + strokes are already rendered)
      ctx.drawImage(canvasRef.current, srcX, srcY, srcW, srcH, lensX, lensY, lensW, lensH);
    } catch (_) {}
    ctx.restore();

    // --- Glowing border ---
    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(lCx, lCy, lensRadius, 0, Math.PI * 2);
    } else {
      ctx.roundRect(lensX, lensY, lensW, lensH, borderR);
    }
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 24;
    ctx.stroke();

    // Subtle inner highlight
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(lCx, lCy, lensRadius - 4, 0, Math.PI * 2);
    } else {
      ctx.roundRect(lensX + 3, lensY + 3, lensW - 6, lensH - 6, borderR - 3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // --- Scale badge (top of lens) ---
    const badgeCX = shape === 'circle' ? lCx : lensX + lensW - 40;
    const badgeCY = lensY + 28;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.roundRect(badgeCX - 28, badgeCY - 14, 56, 28, 7);
    ctx.fill();
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 8;
    ctx.fillText(`${scale.toFixed(1)}×`, badgeCX, badgeCY);

    // --- Dashed source-area indicator (on the main scene) ---
    ctx.save();
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(cx, cy, srcW / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(srcX, srcY, srcW, srcH);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Thin connecting line from source region to lens
    ctx.beginPath();
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.3;
    ctx.shadowBlur = 4;
    ctx.moveTo(cx, cy);
    ctx.lineTo(lCx, shape === 'circle' ? lensY : lensY + lensH / 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // --- Overview Panel (secondary canvas, presenter-only, NOT recorded) ---

  const drawOverviewPanel = () => {
    const s = stateRefs.current;
    if (!s.showZoomedScene || s.interactionMode !== 'zoom') return;
    const overviewCanvas = overviewCanvasRef.current;
    const mainCanvas = canvasRef.current;
    if (!overviewCanvas || !mainCanvas) return;
    const octx = overviewCanvas.getContext('2d');
    if (!octx) return;

    const ow = overviewCanvas.width;
    const oh = overviewCanvas.height;
    octx.clearRect(0, 0, ow, oh);
    try {
      octx.drawImage(mainCanvas, 0, 0, ow, oh);
    } catch (_) {}

    // Draw zoom region indicator overlay
    const pointer = pointerRef.current;
    const scale = s.zoomLensScale;
    const lensRadius = s.zoomLensSize;
    const srcW = (lensRadius * 2) / scale;
    const srcH = (lensRadius * 2) / scale;
    const srcX = Math.max(0, Math.min(mainCanvas.width - srcW, pointer.x - srcW / 2));
    const srcY = Math.max(0, Math.min(mainCanvas.height - srcH, pointer.y - srcH / 2));
    const scaleX = ow / mainCanvas.width;
    const scaleY = oh / mainCanvas.height;

    octx.save();
    octx.strokeStyle = '#f97316';
    octx.lineWidth = 2.5;
    octx.shadowColor = '#f97316';
    octx.shadowBlur = 10;
    octx.setLineDash([7, 4]);
    octx.beginPath();
    if (s.zoomLensShape === 'circle') {
      octx.arc(pointer.x * scaleX, pointer.y * scaleY, (srcW / 2) * scaleX, 0, Math.PI * 2);
    } else {
      octx.rect(srcX * scaleX, srcY * scaleY, srcW * scaleX, srcH * scaleY);
    }
    octx.stroke();
    octx.setLineDash([]);

    // Subtle fill inside zoom region
    octx.globalAlpha = 0.15;
    octx.fillStyle = '#f97316';
    octx.beginPath();
    if (s.zoomLensShape === 'circle') {
      octx.arc(pointer.x * scaleX, pointer.y * scaleY, (srcW / 2) * scaleX, 0, Math.PI * 2);
    } else {
      octx.rect(srcX * scaleX, srcY * scaleY, srcW * scaleX, srcH * scaleY);
    }
    octx.fill();

    // Label
    octx.globalAlpha = 1;
    octx.font = `bold 11px sans-serif`;
    octx.fillStyle = '#fb923c';
    octx.textAlign = 'center';
    octx.shadowBlur = 6;
    const labelY = Math.max(16, srcY * scaleY - 6);
    octx.fillText('Zoom Region', pointer.x * scaleX, labelY);
    octx.restore();
  };

  // -------------------------------------------------------

  const drawPresenterFX = (ctx, w, h) => {
    const now = performance.now();
    const s = stateRefs.current;

    // Auto-fade completed drawings after the configured lifetime.
    drawingStrokesRef.current = drawingStrokesRef.current.filter((stroke) => {
      if (!stroke.finishedAt || !s.autoHideDrawings) return true;
      return now - stroke.finishedAt < (s.drawingLifetime + 1.25) * 1000;
    });

    drawingStrokesRef.current.forEach((stroke) => {
      let alpha = 1;
      if (stroke.finishedAt && s.autoHideDrawings) {
        const age = (now - stroke.finishedAt) / 1000;
        if (age > s.drawingLifetime) {
          alpha = Math.max(0, 1 - (age - s.drawingLifetime) / 1.25);
        }
      }
      drawStrokeFX(ctx, stroke, now, alpha);
    });

    drawClickBursts(ctx, now);
    drawZoomLens(ctx, w, h); // Zoom lens drawn before cursor so cursor sits on top
    drawCursorFX(ctx, w, h, now);
  };

  // How long a clip should stay on screen in Live Manual mode before auto-advance.
  // Videos play out their real length; images use the configured slide duration.
  const getManualClipDuration = (asset, fallback) => {
    const base = fallback || 5;
    if (!asset) return base;
    if (asset.type === 'video') {
      const vid = videoElementsRef.current[asset.id];
      const dur = (vid && isFinite(vid.duration) && vid.duration > 0) ? vid.duration : asset.duration;
      if (dur && isFinite(dur) && dur > 0) return dur;
    }
    return base;
  };

  // --- Completely decoupled drawing function to prevent React freezes ---
  const drawFrame = () => {
    if (!audioRef.current || !canvasRef.current) return;

    // Destructure from refs entirely to avoid any closure stale states!
    const s = stateRefs.current;
    const time = audioRef.current.currentTime;
    
    // Direct DOM manipulation to avoid 60fps React renders (Fixes freezing with 800+ nodes)
    if (playheadRef.current && s.audioDuration) {
        playheadRef.current.style.width = `${(time / s.audioDuration) * 100}%`;
    }
    if (timeTextRef.current) {
        timeTextRef.current.innerText = formatTime(time);
    }
    if (s.isRendering && renderProgressRef.current && s.audioDuration) {
        renderProgressRef.current.innerText = `${Math.round((time / s.audioDuration) * 100)}% Complete`;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    if (s.isManualMode) {
        // Auto-advance: when the current clip has played out its natural length,
        // roll straight into the next one (videos use their own duration).
        if (s.manualAutoAdvance && (s.isPlaying || s.isRendering) && s.activeAssets.length > 1) {
            const current = s.activeAssets[manualIndexRef.current];
            if (current) {
                const clipDuration = getManualClipDuration(current, s.imageDuration);
                if (time - manualChangeTimeRef.current >= clipDuration) {
                    const nextIdx = manualIndexRef.current + 1;
                    if (nextIdx < s.activeAssets.length) {
                        handleSelectManual(nextIdx);
                    } else if (s.manualAutoLoop) {
                        handleSelectManual(0);
                    } else {
                        // Park on the last clip so it does not keep re-triggering.
                        manualChangeTimeRef.current = time;
                    }
                }
            }
        }

        const asset = s.activeAssets[manualIndexRef.current] || s.activeAssets[s.manualAssetIndex];
        if (asset) {
            const t = time - manualChangeTimeRef.current;
            // Provide a realistic duration for the mock segment so Ken Burns keeps panning!
            const mockSegment = {
                asset,
                startTime: manualChangeTimeRef.current,
                endTime: manualChangeTimeRef.current + getManualClipDuration(asset, s.imageDuration),
                imgAnim: s.manualAnimType
            };
            drawAsset(ctx, asset, t, 1, null, mockSegment);
        }
    } else {
      const segmentIndex = s.timeline.findIndex(seg => time >= seg.startTime && time < seg.endTime);
      const segment = s.timeline[segmentIndex];

      if (segment) {
        const timeLeft = segment.endTime - time;
        const nextSegment = s.timeline[segmentIndex + 1];
        const activeTransition = segment.transitionEffect;

        if (activeTransition !== 'none' && nextSegment && timeLeft <= TRANSITION_DURATION) {
           const p = 1 - (timeLeft / TRANSITION_DURATION); 
           const t1 = time - segment.startTime;
           const t2 = time - nextSegment.startTime;

           switch (activeTransition) {
               case 'crossfade':
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
                   drawAsset(ctx, nextSegment.asset, t2, p, null, nextSegment);
                   break;
               case 'fade-black':
                   if (p < 0.5) drawAsset(ctx, segment.asset, t1, 1 - (p * 2), null, segment); 
                   else drawAsset(ctx, nextSegment.asset, t2, (p - 0.5) * 2, null, nextSegment);
                   break;
               case 'slide': 
                   drawAsset(ctx, segment.asset, t1, 1, { tx: -p * w }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, 1, { tx: (1 - p) * w }, nextSegment);
                   break;
               case 'slide-right':
                   drawAsset(ctx, segment.asset, t1, 1, { tx: p * w }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, 1, { tx: -(1 - p) * w }, nextSegment);
                   break;
               case 'slide-up':
                   drawAsset(ctx, segment.asset, t1, 1, { ty: -p * h }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, 1, { ty: (1 - p) * h }, nextSegment);
                   break;
               case 'slide-down':
                   drawAsset(ctx, segment.asset, t1, 1, { ty: p * h }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, 1, { ty: -(1 - p) * h }, nextSegment);
                   break;
               case 'zoom':
                   drawAsset(ctx, segment.asset, t1, 1 - p, { s: 1 + (p * 0.5) }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, p, null, nextSegment);
                   break;
               case 'zoom-out':
                   drawAsset(ctx, segment.asset, t1, 1, { s: 1 - (p * 0.2) }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, p, { s: 1.2 - (p * 0.2) }, nextSegment); 
                   break;
               case 'spin':
                   drawAsset(ctx, segment.asset, t1, 1 - p, { rotate: -p * Math.PI, s: 1 - p }, segment);
                   drawAsset(ctx, nextSegment.asset, t2, p, { rotate: (1 - p) * Math.PI, s: p }, nextSegment);
                   break;
               case 'iris-open':
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
                   ctx.save();
                   ctx.beginPath();
                   const maxRad = Math.sqrt(w * w + h * h) / 2;
                   ctx.arc(w / 2, h / 2, p * maxRad, 0, Math.PI * 2);
                   ctx.clip();
                   drawAsset(ctx, nextSegment.asset, t2, 1, null, nextSegment);
                   ctx.restore();
                   break;
               case 'iris-close':
                   drawAsset(ctx, nextSegment.asset, t2, 1, null, nextSegment); 
                   ctx.save();
                   ctx.beginPath();
                   const startRad = Math.sqrt(w * w + h * h) / 2;
                   ctx.arc(w / 2, h / 2, (1 - p) * startRad, 0, Math.PI * 2);
                   ctx.clip();
                   drawAsset(ctx, segment.asset, t1, 1, null, segment); 
                   ctx.restore();
                   break; 
               case 'clock-wipe':
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
                   ctx.save();
                   ctx.beginPath();
                   ctx.moveTo(w/2, h/2);
                   ctx.arc(w/2, h/2, Math.sqrt(w*w+h*h), -Math.PI/2, -Math.PI/2 + (p * Math.PI * 2));
                   ctx.lineTo(w/2, h/2);
                   ctx.clip();
                   drawAsset(ctx, nextSegment.asset, t2, 1, null, nextSegment);
                   ctx.restore();
                   break;
               case 'curtains':
                   drawAsset(ctx, nextSegment.asset, t2, 1, null, nextSegment); 
                   ctx.save();
                   ctx.beginPath();
                   ctx.rect(0, 0, (w / 2) * (1 - p), h);
                   ctx.clip();
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
                   ctx.restore();
                   ctx.save();
                   ctx.beginPath();
                   ctx.rect(w - ((w / 2) * (1 - p)), 0, (w / 2) * (1 - p), h);
                   ctx.clip();
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
                   ctx.restore();
                   break;
               case 'blinds':
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
                   ctx.save();
                   ctx.beginPath();
                   const slats = 10;
                   const slatH = h / slats;
                   for (let i = 0; i < slats; i++) {
                       ctx.rect(0, i * slatH, w, p * slatH);
                   }
                   ctx.clip();
                   drawAsset(ctx, nextSegment.asset, t2, 1, null, nextSegment);
                   ctx.restore();
                   break;
               default:
                   drawAsset(ctx, segment.asset, t1, 1, null, segment);
           }
        } else {
           const t = time - segment.startTime;
           drawAsset(ctx, segment.asset, t, 1, null, segment);
        }
      }
    }
    
    // Presenter FX are part of the same canvas, so they are visible in the exported recording.
    // For focus-wide: snapshot clean content BEFORE FX overlay so we can read it back zoomed
    if (s.showAnimatedCursor && s.cursorStyle === 'focus-wide') {
      let oc = offscreenCanvasRef.current;
      if (!oc || oc.width !== w || oc.height !== h) {
        oc = document.createElement('canvas');
        oc.width = w;
        oc.height = h;
        offscreenCanvasRef.current = oc;
      }
      const octx = oc.getContext('2d');
      if (octx) octx.drawImage(canvas, 0, 0);
    }
    drawPresenterFX(ctx, w, h);
    drawWatermark(ctx, w, h);
    drawSubtitle(ctx, w, h, time);
    // Presenter-only overview panel — reads from main canvas after full render, NOT recorded
    drawOverviewPanel();

    if (time >= s.audioDuration && s.isPlaying) {
        // Handle auto-stop at the end of audio when NOT rendering
        if (!s.isRendering) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0; // reset
        }
    }
  };

  // Rendering Loop Trigger (Fully isolated from React dependency array bugs!)
  useEffect(() => {
    let reqId;
    const loop = () => {
        drawFrame(); // Draw continuously ensures instant manual clicks display!
        reqId = requestAnimationFrame(loop);
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, []); // Run ONCE. 

  // --- Interaction Handlers ---

  const togglePlay = () => {
    if (!audioFile) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime >= audioDuration) {
          audioRef.current.currentTime = 0;
          manualChangeTimeRef.current = 0;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSelectManual = (idx) => {
      const now = audioRef.current?.currentTime || 0;
      manualIndexRef.current = idx;
      manualChangeTimeRef.current = now;
      setManualAssetIndex(idx);
      setLastManualChangeTime(now);
      
      const anims = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];
      setManualAnimType(anims[Math.floor(Math.random() * anims.length)]);
      
      setViewedAssets(prev => {
          const newSet = new Set(prev);
          newSet.add(idx);
          return newSet;
      });
  };

  const handlePrevManual = () => {
      if (manualAssetIndex > 0) handleSelectManual(manualAssetIndex - 1);
  };

  const handleNextManual = () => {
      if (manualAssetIndex < activeAssets.length - 1) handleSelectManual(manualAssetIndex + 1);
  };

  const startRendering = () => {
    if (!audioFile || activeAssets.length === 0) return;

    Object.values(videoElementsRef.current).forEach(v => { v.muted = muteVisuals; });

    setIsRendering(true);
    setIsPlaying(false);
    audioRef.current.currentTime = 0;
    manualChangeTimeRef.current = 0;

    const canvasStream = canvasRef.current.captureStream(30); 
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audioRef.current);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination); 

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let fileName = 'mixed-video';
      if (videoTitle && videoTitle.trim()) {
          fileName = videoTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
      }
      if (!fileName) fileName = `mixed-video-${Date.now()}`;
      
      a.download = `${fileName}.webm`;
      a.click();
      
      chunksRef.current = [];
      setIsRendering(false);
      setIsPlaying(false);
      audioRef.current.pause();
      source.disconnect();
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    audioRef.current.play();
  };

  useEffect(() => {
      const handleEnded = () => {
          if (isRendering && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
          if (!isRendering) {
              setIsPlaying(false);
          }
      };
      const audioEl = audioRef.current;
      if (audioEl) audioEl.addEventListener('ended', handleEnded);
      return () => {
          if (audioEl) audioEl.removeEventListener('ended', handleEnded);
      }
  }, [isRendering]);


  // ==========================================================
  // YouTube SEO Studio — ChatGPT metadata + thumbnail generation
  // ==========================================================

  const effectiveTextModel = (customTextModel.trim() || textModel).trim();
  const effectiveImageModel = (customImageModel.trim() || imageModel).trim();

  useEffect(() => {
    try {
      if (rememberKey && openAiKey) localStorage.setItem('pfx_openai_key', openAiKey);
      if (!rememberKey) localStorage.removeItem('pfx_openai_key');
    } catch (e) { /* storage blocked — key just stays in memory */ }
  }, [openAiKey, rememberKey]);

  // Keep the size selector valid whenever the image model changes.
  useEffect(() => {
    const allowed = IMAGE_SIZES[effectiveImageModel];
    if (allowed && !allowed.includes(thumbSize)) setThumbSize(allowed[0]);
  }, [effectiveImageModel]);

  const copyToClipboard = async (text, field) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(prev => (prev === field ? '' : prev)), 1600);
  };

  // Everything we already know about this video, handed to the model as reference.
  const buildVideoReference = () => {
    const parts = [];
    if (videoTitle.trim()) parts.push(`Working video title: ${videoTitle.trim()}`);
    if (channelName.trim()) parts.push(`Channel name: ${channelName.trim()}`);
    if (seoTopic.trim()) parts.push(`Creator notes about the topic: ${seoTopic.trim()}`);
    const transcript = (parsedCues.length
      ? parsedCues.map(c => c.text).join(' ')
      : subtitleRawText
    ).replace(/\s+/g, ' ').trim();
    if (transcript) {
      parts.push(`Subtitle / transcript of the actual video (main source of truth):\n${transcript.slice(0, 8000)}`);
    }
    const names = visualAssets.slice(0, 40).map(a => a.name).join(', ');
    if (names) parts.push(`Slide and clip filenames used in the video: ${names}`);
    if (audioDuration) parts.push(`Video length: ${formatTime(audioDuration)}`);
    return parts.join('\n\n') || 'No extra reference supplied — rely on the topic given by the creator.';
  };

  const callChatCompletion = async (messages, maxTokens = 8000) => {
    const send = async (tokenField) => {
      const body = {
        model: effectiveTextModel,
        messages,
        response_format: { type: 'json_object' },
      };
      body[tokenField] = maxTokens;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey.trim()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || `OpenAI returned HTTP ${res.status}`;
        const err = new Error(msg);
        err.raw = data;
        throw err;
      }
      return data;
    };

    let data;
    try {
      data = await send('max_completion_tokens');
    } catch (e) {
      // Older models still expect max_tokens.
      if (/max_tokens|max_completion_tokens|Unsupported parameter/i.test(e.message || '')) {
        data = await send('max_tokens');
      } else {
        throw e;
      }
    }

    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('The model returned an empty response. Try a different text model.');
    try {
      return JSON.parse(content);
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Could not parse the model response as JSON.');
    }
  };

  // YouTube titles cap at 100 chars and the ask is *exactly* 100 — trim or pad locally
  // as a last resort so the field is always usable even if the model misses the count.
  const forceTitleTo100 = (raw, keywordsCsv) => {
    let t = (raw || '').replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '');
    if (t.length > 100) {
      t = t.slice(0, 100);
      const cut = t.lastIndexOf(' ');
      if (cut > 70) t = t.slice(0, cut);
    }
    if (t.length < 100) {
      const fillers = (keywordsCsv || '')
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
        .map(k => k.replace(/\b\w/g, c => c.toUpperCase()))
        .concat(['Full Guide', 'Step By Step', 'Explained Simply', 'Beginner Friendly', 'Complete Tutorial', 'Must Watch']);
      for (const filler of fillers) {
        if (t.length >= 100) break;
        const candidate = `${t} | ${filler}`;
        if (candidate.length <= 100) t = candidate;
      }
      while (t.length < 100) t += (t.length === 99 ? '!' : ' .').slice(0, 100 - t.length) || '.';
    }
    return t.slice(0, 100);
  };

  const generateSeoMetadata = async () => {
    if (!openAiKey.trim()) { setSeoError('Add your ChatGPT (OpenAI) API key first.'); return; }
    setSeoLoading(true);
    setSeoError('');
    setSeoStatus('Asking ' + effectiveTextModel + ' for metadata…');

    const reference = buildVideoReference();
    const system = 'You are a senior YouTube growth strategist and SEO copywriter. You always answer with a single valid JSON object and nothing else.';
    const user = `Write complete, SEO-optimised YouTube upload metadata for this video.

REFERENCE MATERIAL ABOUT THE VIDEO:
${reference}

Return JSON with EXACTLY these keys:
{
  "title": string,               // EXACTLY 100 characters including spaces. Click-worthy, front-loads the main keyword, no clickbait lies, no surrounding quotes.
  "description": string,         // AT LEAST 3000 characters. Structure: a strong 2-3 line hook, "In this video you will learn:" bullet list, a timestamped chapter list starting at 00:00, a detailed 3-5 paragraph deep dive on the topic, who the video is for, tools/resources mentioned, a call to action to like/subscribe, and a final block of relevant hashtags. Naturally repeat the primary and secondary keywords. Plain text only, no markdown headings.
  "keywords": string,            // 30-45 comma-separated YouTube tags, lowercase, mixing head terms, long-tail phrases and question queries. Total under 480 characters.
  "thumbnail_headline": string,  // 3-5 punchy words for the thumbnail text overlay, ALL CAPS.
  "thumbnail_prompt": string     // A detailed image-generation prompt for a 16:9 YouTube thumbnail, written in the exact art direction below and adapted to THIS video's subject. Name the concrete subject to render and write out the real annotation labels / headline words to draw.
}

THUMBNAIL ART DIRECTION TO FOLLOW (${THUMB_STYLES[thumbStyle].label}):
${THUMB_STYLES[thumbStyle].brief}
The headline drawn in the image must be the thumbnail_headline value.

The character counts are hard requirements: count them before answering.`;

    try {
      let result = await callChatCompletion([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]);

      let title = String(result.title || '');
      let description = String(result.description || '');
      let keywords = String(result.keywords || '');

      // One repair pass if the model missed the hard length requirements.
      if (title.length !== 100 || description.length < 3000) {
        setSeoStatus('Fixing lengths (title ' + title.length + ' chars, description ' + description.length + ' chars)…');
        const repair = await callChatCompletion([
          { role: 'system', content: system },
          { role: 'user', content: user },
          { role: 'assistant', content: JSON.stringify(result) },
          { role: 'user', content: `The title is ${title.length} characters (must be EXACTLY 100) and the description is ${description.length} characters (must be AT LEAST 3000, aim for 3500). Rewrite and return the same JSON object with every key present, fixing the lengths. Keep the same meaning and keywords.` },
        ]);
        if (repair.title) title = String(repair.title);
        if (repair.description && String(repair.description).length > description.length) description = String(repair.description);
        if (repair.keywords) keywords = String(repair.keywords);
        if (repair.thumbnail_prompt) result.thumbnail_prompt = repair.thumbnail_prompt;
        if (repair.thumbnail_headline) result.thumbnail_headline = repair.thumbnail_headline;
      }

      setSeoTitle(forceTitleTo100(title, keywords));
      setSeoDescription(description.trim());
      setSeoKeywords(keywords.replace(/\s*,\s*/g, ', ').trim());
      setThumbHeadline(String(result.thumbnail_headline || '').trim());
      setThumbPrompt(String(result.thumbnail_prompt || '').trim());
      setSeoStatus('Metadata ready.');
    } catch (e) {
      setSeoError(e.message || 'Metadata generation failed.');
      setSeoStatus('');
    } finally {
      setSeoLoading(false);
    }
  };

  const fallbackThumbPrompt = () => {
    const headline = (thumbHeadline || videoTitle || seoTopic || 'WATCH THIS')
      .toUpperCase().replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ');
    const subject = seoTopic.trim() || videoTitle.trim() || 'the video topic';
    const style = THUMB_STYLES[thumbStyle] || THUMB_STYLES.infographic;
    return `16:9 YouTube thumbnail about ${subject}.

${style.brief}

The headline text drawn in the image must read exactly: "${headline}".`;
  };

  const generateThumbnail = async () => {
    if (!openAiKey.trim()) { setThumbError('Add your ChatGPT (OpenAI) API key first.'); return; }
    const prompt = (thumbPrompt.trim() || fallbackThumbPrompt());
    if (!thumbPrompt.trim()) setThumbPrompt(prompt);

    setThumbLoading(true);
    setThumbError('');
    setThumbImage('');

    try {
      const isDalle = effectiveImageModel.startsWith('dall-e');
      const body = { model: effectiveImageModel, prompt, n: 1 };
      if (thumbSize && thumbSize !== 'auto') body.size = thumbSize;
      if (isDalle) {
        body.response_format = 'b64_json';
        if (effectiveImageModel === 'dall-e-3') body.quality = thumbQuality === 'low' ? 'standard' : 'hd';
      } else {
        body.quality = thumbQuality;
      }

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey.trim()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI returned HTTP ${res.status}`);

      const item = data?.data?.[0];
      if (item?.b64_json) setThumbImage(`data:image/png;base64,${item.b64_json}`);
      else if (item?.url) setThumbImage(item.url);
      else throw new Error('No image came back from the API.');
    } catch (e) {
      // Workaround path: the prompt stays on screen so it can be pasted into any image tool.
      setThumbError(`${e.message || 'Image generation failed.'} — copy the prompt below and generate the thumbnail manually.`);
      if (!thumbPrompt.trim()) setThumbPrompt(prompt);
    } finally {
      setThumbLoading(false);
    }
  };

  const downloadThumbnail = () => {
    if (!thumbImage) return;
    const a = document.createElement('a');
    a.href = thumbImage;
    const base = (videoTitle || seoTopic || 'youtube-thumbnail').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_') || 'youtube-thumbnail';
    a.download = `${base}_thumbnail.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-6 overflow-x-hidden">
      {/* Maximum Width Increased for Huge Preview */}
      <div className="w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel - Control Column */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2 text-indigo-400">
              <Film className="w-6 h-6" />
              AV Mixer
            </h1>
            
            {/* Audio Source */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">1. Select Audio Track (or Video)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="audio/*,video/*" 
                  onChange={handleAudioUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-lg p-4 transition-colors flex items-center justify-center gap-3
                  ${audioFile ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-indigo-400 bg-gray-700/50'}`}>
                  
                  {audioFile && audioFile.isVideo ? (
                      <Video className="w-5 h-5 text-green-400" />
                  ) : (
                      <Music className={`w-5 h-5 ${audioFile ? 'text-green-400' : 'text-gray-400'}`} />
                  )}
                  
                  <span className="text-sm truncate max-w-[200px]">
                    {audioFile ? audioFile.name : 'Upload Audio or Video'}
                  </span>
                </div>
              </div>
              {audioFile && audioFile.isVideo && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <Volume2 size={12} /> Using audio from video file
                  </p>
              )}
              {audioDuration > 0 && <p className="text-xs text-right text-gray-500 mt-1">Duration: {formatTime(audioDuration)}</p>}
            </div>

            {/* Visual Upload */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                 <label className="block text-sm font-medium text-gray-400">2. Add Visuals</label>
                 <label className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    <input 
                        type="checkbox" 
                        checked={highQualityPdf} 
                        onChange={e => setHighQualityPdf(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 accent-indigo-500"
                    />
                    <Sparkles size={12} className={highQualityPdf ? "text-yellow-400" : "text-gray-500"} />
                    Enhance PDF Quality
                 </label>
              </div>

              <div className="relative mb-3">
                <input 
                  type="file" 
                  accept="image/*,video/*,application/pdf" 
                  multiple 
                  onChange={handleVisualUpload}
                  disabled={isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={`border-2 border-dashed border-gray-600 hover:border-indigo-400 bg-gray-700/50 rounded-lg p-8 text-center transition-colors ${isProcessing ? 'opacity-50' : ''}`}>
                  {isProcessing ? (
                     <div className="flex flex-col items-center justify-center">
                         <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                         <span className="text-sm text-gray-300">Processing PDF...</span>
                     </div>
                  ) : (
                    <>
                        <div className="flex justify-center mb-2 gap-2">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                            <Film className="w-6 h-6 text-gray-400" />
                            <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <span className="text-sm text-gray-300">Drop files or click to add</span>
                    </>
                  )}
                </div>
              </div>

              {/* Sort Toolbar */}
              {visualAssets.length > 1 && (
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  <span className="text-xs text-gray-500 mr-1">Sort:</span>
                  <button
                    onClick={sortAssetsAlpha}
                    title="Sort A → Z"
                    className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white rounded transition-colors"
                  >A→Z</button>
                  <button
                    onClick={sortAssetsNumeric}
                    title="Sort by number"
                    className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white rounded transition-colors"
                  >1→9</button>
                  <button
                    onClick={shuffleAssets}
                    title="Shuffle randomly"
                    className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white rounded transition-colors"
                  >🔀</button>
                </div>
              )}
              <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {visualAssets.map((asset, idx) => (
                  <div key={asset.id} className="flex items-center gap-1 bg-gray-700/50 p-1.5 rounded text-sm">
                    {/* Up / Down */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveAssetUp(asset.id)}
                        disabled={idx === 0}
                        className="text-gray-500 hover:text-indigo-300 disabled:opacity-20 leading-none"
                        title="Move up"
                      >▲</button>
                      <button
                        onClick={() => moveAssetDown(asset.id)}
                        disabled={idx === visualAssets.length - 1}
                        className="text-gray-500 hover:text-indigo-300 disabled:opacity-20 leading-none"
                        title="Move down"
                      >▼</button>
                    </div>
                    {/* Icon + name */}
                    <div className="flex items-center gap-1.5 truncate flex-1">
                      <span className="text-gray-600 text-xs w-4 text-right shrink-0">{idx + 1}</span>
                      {asset.type === 'video' ? <Film size={13} className="text-blue-400 shrink-0" /> : <ImageIcon size={13} className="text-purple-400 shrink-0" />}
                      <span className="truncate max-w-[110px] text-xs">{asset.name}</span>
                    </div>
                    <button onClick={() => removeVisual(asset.id)} className="text-gray-500 hover:text-red-400 ml-auto shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Details */}
            <div className="mb-6 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <Type size={16} /> Project Details
                </h3>
                
                <div className="mb-4">
                    <label className="block text-xs text-gray-400 mb-1">Video Title (Filename)</label>
                    <input 
                        type="text" 
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="My Awesome Video"
                        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Watermark</label>
                        <input 
                            type="checkbox"
                            checked={showWatermark}
                            onChange={(e) => setShowWatermark(e.target.checked)}
                            className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                    </div>
                    
                    {showWatermark && (
                        <div className="space-y-3 p-3 bg-gray-700/30 rounded-lg">
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="watermarkType"
                                        checked={watermarkType === 'text'}
                                        onChange={() => setWatermarkType('text')}
                                        className="accent-indigo-500"
                                    />
                                    Text Name
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="watermarkType"
                                        checked={watermarkType === 'image'}
                                        onChange={() => setWatermarkType('image')}
                                        className="accent-indigo-500"
                                    />
                                    Logo Image
                                </label>
                            </div>

                            {watermarkType === 'text' ? (
                                <div className="flex items-center gap-2">
                                    <Tv size={16} className="text-gray-400 shrink-0" />
                                    <input 
                                        type="text" 
                                        value={channelName}
                                        onChange={(e) => setChannelName(e.target.value)}
                                        placeholder="Channel Name"
                                        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="flex items-center gap-2 w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg p-2.5">
                                            <ImagePlus size={16} className="shrink-0" />
                                            <span className="truncate">
                                                {watermarkImage ? watermarkImage.name : "Click to Upload Logo"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Subtitles / Transcript */}
            <div className="mb-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileText size={16} /> Subtitles
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-400">Show</span>
                  <div
                    onClick={() => setShowSubtitles(v => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      showSubtitles ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      showSubtitles ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </div>
                </label>
              </div>

              {/* Input tabs */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setSubtitleInputTab('paste')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    subtitleInputTab === 'paste' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >Paste Text</button>
                <button
                  onClick={() => setSubtitleInputTab('upload')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    subtitleInputTab === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >Upload .vtt</button>
              </div>

              {subtitleInputTab === 'paste' ? (
                <div>
                  <textarea
                    rows={5}
                    value={subtitleRawText}
                    onChange={(e) => applySubtitleText(e.target.value)}
                    placeholder={`WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nYour subtitle text here`}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded-lg p-2 font-mono resize-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept=".vtt,text/vtt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => applySubtitleText(ev.target.result as string);
                      reader.readAsText(file, 'UTF-8');
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-2 w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg p-2.5">
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate text-xs">
                      {parsedCues.length > 0 ? `✅ ${parsedCues.length} cues loaded` : 'Click to upload .vtt file'}
                    </span>
                  </div>
                </div>
              )}

              {parsedCues.length > 0 && (
                <p className="text-xs text-indigo-400 mt-1">✅ {parsedCues.length} subtitle cues active</p>
              )}

              {/* Caption Styling */}
              {showSubtitles && (
                <div className="mt-4 space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                    <Type size={13} className="text-yellow-400" /> Caption Style
                  </div>

                  {/* Live preview */}
                  <div className="rounded-lg overflow-hidden border border-gray-700 bg-[linear-gradient(135deg,#4b5563_25%,#374151_25%,#374151_50%,#4b5563_50%,#4b5563_75%,#374151_75%)] bg-[length:16px_16px] py-4 px-2 flex items-center justify-center min-h-[64px]">
                    <span
                      style={{
                        fontFamily: getSubtitleFontDef(subtitleFont).stack,
                        fontWeight: getSubtitleFontDef(subtitleFont).weight,
                        fontSize: `${Math.max(16, Math.round(subtitleFontSize * 0.5))}px`,
                        color: subtitleColor,
                        WebkitTextStrokeWidth: `${(subtitleStrokeWidth * 0.5) / 2}px`,
                        WebkitTextStrokeColor: subtitleStrokeColor,
                        paintOrder: 'stroke fill',
                        textShadow: subtitleShadow ? '0 2px 6px rgba(0,0,0,0.85)' : 'none',
                        background: subtitleBgStyle === 'pill' ? 'rgba(0,0,0,0.72)' : subtitleBgStyle === 'band' ? 'rgba(0,0,0,0.55)' : 'transparent',
                        padding: subtitleBgStyle === 'none' ? 0 : '4px 10px',
                        borderRadius: subtitleBgStyle === 'pill' ? 8 : 0,
                        lineHeight: 1.2,
                        textAlign: 'center',
                      }}
                    >
                      {subtitleUppercase ? 'SAMPLE CAPTION TEXT' : 'Sample caption text'}
                    </span>
                  </div>

                  {/* Presets */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Preset</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(SUBTITLE_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applySubtitlePreset(key)}
                          className={`px-2 py-1.5 text-[11px] rounded border transition-all truncate ${
                            subtitlePreset === key
                              ? 'border-yellow-400 bg-gray-800 shadow-sm'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                          }`}
                          style={{ color: preset.color, WebkitTextStrokeWidth: '0.4px', WebkitTextStrokeColor: preset.stroke }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font family */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Font</label>
                    <select
                      value={subtitleFont}
                      onChange={(e) => setSubtitleFont(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded-lg p-2"
                    >
                      {SUBTITLE_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Text color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} className="w-8 h-8 bg-transparent rounded cursor-pointer border border-gray-600" />
                        <input type="text" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white text-[11px] rounded p-1.5 font-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Outline color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={subtitleStrokeColor} onChange={(e) => setSubtitleStrokeColor(e.target.value)} className="w-8 h-8 bg-transparent rounded cursor-pointer border border-gray-600" />
                        <input type="text" value={subtitleStrokeColor} onChange={(e) => setSubtitleStrokeColor(e.target.value)} className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white text-[11px] rounded p-1.5 font-mono" />
                      </div>
                    </div>
                  </div>

                  {/* Quick color swatches */}
                  <div className="flex flex-wrap gap-1.5">
                    {['#FFE81F', '#FFFFFF', '#39FF14', '#00E5FF', '#FF2E88', '#FF3B30', '#FFD54A', '#A855F7', '#FF7A00'].map(c => (
                      <button
                        key={c}
                        onClick={() => setSubtitleColor(c)}
                        title={c}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${subtitleColor.toUpperCase() === c ? 'border-white' : 'border-gray-600'}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>

                  {/* Outline width */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-gray-400">Outline thickness</label>
                      <span className="text-[11px] text-indigo-300">{subtitleStrokeWidth}px</span>
                    </div>
                    <input
                      type="range" min={0} max={24} step={1}
                      value={subtitleStrokeWidth}
                      onChange={(e) => setSubtitleStrokeWidth(Number(e.target.value))}
                      className="w-full h-1.5 accent-yellow-500"
                    />
                  </div>

                  {/* Font size */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-gray-400">Font size</label>
                      <span className="text-[11px] text-indigo-300">{subtitleFontSize}px</span>
                    </div>
                    <input
                      type="range" min={24} max={120} step={2}
                      value={subtitleFontSize}
                      onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
                      className="w-full h-1.5 accent-indigo-500"
                    />
                  </div>

                  {/* Vertical position */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-gray-400">Vertical position</label>
                      <span className="text-[11px] text-indigo-300">{subtitlePositionY}%</span>
                    </div>
                    <input
                      type="range" min={10} max={95} step={1}
                      value={subtitlePositionY}
                      onChange={(e) => setSubtitlePositionY(Number(e.target.value))}
                      className="w-full h-1.5 accent-indigo-500"
                    />
                  </div>

                  {/* Background style */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Background</label>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'none', label: 'Transparent' },
                        { id: 'pill', label: 'Pill' },
                        { id: 'band', label: 'Bar' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setSubtitleBgStyle(opt.id)}
                          className={`flex-1 px-2 py-1.5 text-[11px] rounded border transition-colors ${
                            subtitleBgStyle === opt.id ? 'border-indigo-400 bg-indigo-600/30 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:text-white'
                          }`}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <label className="flex items-center justify-between text-[11px] text-gray-300 cursor-pointer">
                      <span>UPPERCASE text</span>
                      <input type="checkbox" checked={subtitleUppercase} onChange={(e) => setSubtitleUppercase(e.target.checked)} className="w-4 h-4 accent-yellow-500 rounded" />
                    </label>
                    <label className="flex items-center justify-between text-[11px] text-gray-300 cursor-pointer">
                      <span>Drop shadow</span>
                      <input type="checkbox" checked={subtitleShadow} onChange={(e) => setSubtitleShadow(e.target.checked)} className="w-4 h-4 accent-yellow-500 rounded" />
                    </label>
                    <label className="flex items-center justify-between text-[11px] text-gray-300 cursor-pointer">
                      <span>Pop-in animation</span>
                      <input type="checkbox" checked={subtitlePopIn} onChange={(e) => setSubtitlePopIn(e.target.checked)} className="w-4 h-4 accent-yellow-500 rounded" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                    {muteVisuals ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-green-400" />}
                    Mute Visuals
                </label>
                <input 
                  type="checkbox"
                  checked={muteVisuals}
                  onChange={(e) => setMuteVisuals(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              {/* Transition Dropdown */}
              <div className="pt-4 mt-2 border-t border-gray-700">
                  <label className="text-sm text-gray-300 flex items-center gap-2 mb-2">
                      <Layers size={14} className="text-pink-400" />
                      Transition Effect
                  </label>
                  <select 
                    value={transitionEffect} 
                    onChange={(e) => setTransitionEffect(e.target.value)}
                    disabled={randomTransitions}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <option value="none">Hard Cut (Default)</option>
                      <option value="crossfade">Crossfade</option>
                      <option value="fade-black">Fade to Black</option>
                      <option value="slide">Slide Left</option>
                      <option value="slide-right">Slide Right</option>
                      <option value="slide-up">Slide Up</option>
                      <option value="slide-down">Slide Down</option>
                      <option value="zoom">Zoom In</option>
                      <option value="zoom-out">Zoom Out</option>
                      <option value="spin">Spin & Fade</option>
                      <option value="iris-open">Iris Open (Circle)</option>
                      <option value="iris-close">Iris Close (Circle)</option>
                      <option value="clock-wipe">Clock Wipe</option>
                      <option value="curtains">Curtains (Center Split)</option>
                      <option value="blinds">Blinds</option>
                  </select>

                  <div className="flex items-center justify-between mt-3">
                    <label className="text-sm text-gray-400 flex items-center gap-2">
                        <Dices size={14} className={randomTransitions ? "text-indigo-400" : "text-gray-500"} />
                        Randomize Transitions
                    </label>
                    <input 
                        type="checkbox"
                        checked={randomTransitions}
                        onChange={(e) => setRandomTransitions(e.target.checked)}
                        disabled={isManualMode}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
              </div>

              {/* Live Manual Mode Toggle */}
              <div className="flex items-center justify-between mt-4">
                <label className="text-sm text-gray-300 flex items-center gap-2 font-bold text-orange-400">
                    <MousePointerClick size={16} />
                    Live Manual Control
                </label>
                <input 
                    type="checkbox"
                    checked={isManualMode}
                    onChange={(e) => setIsManualMode(e.target.checked)}
                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                    <Move size={14} className="text-cyan-400" />
                    Animate Images (Ken Burns)
                </label>
                <input 
                    type="checkbox"
                    checked={enableImageAnimations}
                    onChange={(e) => setEnableImageAnimations(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>


              {/* Presenter FX */}
              <div className="mt-5 rounded-xl border border-cyan-500/25 bg-cyan-950/10 p-4 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                      <Sparkles size={16} /> Presenter FX
                    </label>
                    <p className="text-[11px] text-gray-500 mt-1">Recorded directly into the video canvas</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showAnimatedCursor}
                    onChange={(e) => setShowAnimatedCursor(e.target.checked)}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'cursor', label: 'Cursor', icon: MousePointer2 },
                    { id: 'pen', label: 'Pen', icon: Pencil },
                    { id: 'highlight', label: 'Mark', icon: Highlighter },
                    { id: 'laser', label: 'Laser', icon: Zap },
                    { id: 'zoom', label: 'Zoom', icon: ZoomIn },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setInteractionMode(id)}
                      className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition-all border ${
                        interactionMode === id
                          ? id === 'zoom'
                            ? 'bg-orange-500/20 border-orange-400 text-orange-200 shadow-lg shadow-orange-500/10'
                            : 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/10'
                          : 'bg-gray-800/70 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Cursor Animation</label>
                    <select
                      value={cursorStyle}
                      onChange={(e) => setCursorStyle(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg p-2"
                    >
                      <option value="whisk">Whisk Orbit</option>
                      <option value="comet">Comet Glow</option>
                      <option value="neon">Neon Ring</option>
                      <option value="spotlight">Spotlight Focus</option>
                      <option value="focus-wide">16:9 Wide Spotlight ✦</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Ink / Accent</label>
                    <input
                      type="color"
                      value={penColor}
                      onChange={(e) => setPenColor(e.target.value)}
                      className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Cursor Size</span><span>{cursorSize}px</span>
                  </div>
                  <input type="range" min="18" max="72" value={cursorSize} onChange={(e) => setCursorSize(Number(e.target.value))} className="w-full accent-cyan-500" />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>{interactionMode === 'highlight' ? 'Highlighter Width' : 'Pen Width'}</span>
                    <span>{interactionMode === 'highlight' ? highlightWidth : penWidth}px</span>
                  </div>
                  {interactionMode === 'highlight' ? (
                    <input type="range" min="18" max="110" value={highlightWidth} onChange={(e) => setHighlightWidth(Number(e.target.value))} className="w-full accent-yellow-400" />
                  ) : (
                    <input type="range" min="3" max="24" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} className="w-full accent-cyan-500" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 flex items-center gap-2"><CircleDot size={14} /> Animated Trail</label>
                  <input type="checkbox" checked={cursorTrail} onChange={(e) => setCursorTrail(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 flex items-center gap-2"><Clock size={14} /> Auto-hide drawings</label>
                  <input type="checkbox" checked={autoHideDrawings} onChange={(e) => setAutoHideDrawings(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
                </div>

                {autoHideDrawings && (
                  <div>
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Visible For</span><span>{drawingLifetime}s + fade</span>
                    </div>
                    <input type="range" min="1" max="12" step="0.5" value={drawingLifetime} onChange={(e) => setDrawingLifetime(Number(e.target.value))} className="w-full accent-cyan-500" />
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>FX Intensity</span><span>{interactionIntensity.toFixed(1)}×</span>
                  </div>
                  <input type="range" min="0.5" max="2" step="0.1" value={interactionIntensity} onChange={(e) => setInteractionIntensity(Number(e.target.value))} className="w-full accent-cyan-500" />
                </div>

                <button
                  type="button"
                  onClick={clearPresenterDrawings}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-red-400/60 hover:text-red-300 text-gray-300 py-2 text-xs transition-colors"
                >
                  <Eraser size={14} /> Clear Drawings
                </button>

                {/* Zoom Lens Controls — shown only when Zoom mode is active */}
                {interactionMode === 'zoom' && (
                  <div className="space-y-3 p-3 bg-orange-950/20 rounded-lg border border-orange-500/25 shadow-inner mt-1">
                    <p className="text-[11px] font-semibold text-orange-300 flex items-center gap-1.5">
                      <ZoomIn size={13} /> Zoom Lens Settings
                    </p>

                    {/* Shape toggle */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Lens Shape</label>
                      <div className="flex gap-2">
                        {[{ v: 'circle', label: '⬤ Circle' }, { v: 'rect', label: '▬ Rect' }].map(({ v, label }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setZoomLensShape(v)}
                            className={`flex-1 py-1.5 rounded text-[11px] font-semibold transition-all border ${
                              zoomLensShape === v
                                ? 'bg-orange-500/25 border-orange-400 text-orange-200'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Magnification */}
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Magnification</span><span>{zoomLensScale.toFixed(1)}×</span>
                      </div>
                      <input
                        type="range" min="1.5" max="5" step="0.1"
                        value={zoomLensScale}
                        onChange={e => setZoomLensScale(Number(e.target.value))}
                        className="w-full accent-orange-400"
                      />
                    </div>

                    {/* Lens Size */}
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Lens Size</span><span>{zoomLensSize}px</span>
                      </div>
                      <input
                        type="range" min="80" max="300" step="10"
                        value={zoomLensSize}
                        onChange={e => setZoomLensSize(Number(e.target.value))}
                        className="w-full accent-orange-400"
                      />
                    </div>

                    {/* Show overview panel toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-orange-500/20">
                      <label className="text-[11px] text-gray-300 flex items-center gap-1.5">
                        <ScanSearch size={13} className="text-orange-400" />
                        Scene Overview Panel
                      </label>
                      <input
                        type="checkbox"
                        checked={showZoomedScene}
                        onChange={e => setShowZoomedScene(e.target.checked)}
                        className="w-4 h-4 accent-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                    <Clock size={14} className="text-yellow-400" />
                    Fit Slides to Audio
                </label>
                <input 
                    type="checkbox"
                    checked={fitSlidesToAudio}
                    onChange={(e) => setFitSlidesToAudio(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                    <Dices size={14} className="text-purple-400" />
                    Use Random Subset
                </label>
                <input 
                    type="checkbox"
                    checked={useRandomSubset}
                    onChange={(e) => setUseRandomSubset(e.target.checked)}
                    disabled={isManualMode}
                    className="w-4 h-4 accent-purple-500 rounded cursor-pointer disabled:opacity-50"
                />
              </div>
              
              {useRandomSubset && !isManualMode && (
                <div className="mt-2 pl-6 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                    <label className="text-xs text-gray-400 block mb-1">Max Images to Display</label>
                    <input 
                        type="number" 
                        min="1" 
                        max={Math.max(visualAssets.length, 1)}
                        value={maxImagesToUse}
                        onChange={(e) => setMaxImagesToUse(parseInt(e.target.value) || 1)}
                        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2"
                    />
                </div>
              )}

              {/* Conflicting Controls */}
              <div className={`transition-opacity duration-200 ${(fitSlidesToAudio || isManualMode) ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                  <div className="flex items-center justify-between mt-4">
                    <label className="text-sm text-gray-300 flex items-center gap-2">
                        {useShuffle ? <Shuffle size={14} /> : <RefreshCcw size={14} />}
                        Sequence Mode
                    </label>
                    <button 
                      onClick={() => setUseShuffle(!useShuffle)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${useShuffle ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                    >
                      {useShuffle ? 'Shuffle' : 'Loop'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm text-gray-300 block mb-1">Image Duration (sec)</label>
                    <input 
                      type="range" min="1" max="20" step="0.5"
                      value={imageDuration}
                      onChange={(e) => setImageDuration(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Preview (Maximum Width Used) */}
        <div className="lg:col-span-9 xl:col-span-9 flex flex-col gap-4 w-full">
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800 group">
             <canvas 
                ref={canvasRef}
                width={1920}
                height={1080}
                onPointerMove={handleCanvasPointerMove}
                onPointerDown={handleCanvasPointerDown}
                onPointerUp={finishCanvasStroke}
                onPointerCancel={finishCanvasStroke}
                onPointerEnter={(e) => { handleCanvasPointerMove(e); pointerRef.current.visible = true; }}
                onPointerLeave={() => { if (!pointerRef.current.down && cursorStyle !== 'focus-wide') pointerRef.current.visible = false; }}
                className="w-full h-full object-contain select-none"
                style={{ cursor: showAnimatedCursor ? 'none' : (interactionMode === 'pen' || interactionMode === 'highlight' || interactionMode === 'zoom' ? 'crosshair' : 'default'), touchAction: 'none' }}
             />
             
             {!audioFile && visualAssets.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center text-gray-600 pointer-events-none">
                     <div className="text-center">
                         <Film size={80} className="mx-auto mb-4 opacity-50" />
                         <p className="text-xl">Preview Canvas (16:9)</p>
                     </div>
                 </div>
             )}

             {isRendering && (
                 <div className="absolute top-4 right-4 bg-black/80 px-4 py-2 rounded-lg z-50 border border-green-500/30 flex flex-col items-end shadow-lg">
                     <div className="flex items-center gap-2 text-green-400 font-bold animate-pulse">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {isManualMode ? 'Recording Live...' : 'Rendering...'}
                     </div>
                     <p ref={renderProgressRef} className="text-xs text-gray-400">0% Complete</p>
                 </div>
             )}

             {/* Zoom mode indicator badge */}
             {interactionMode === 'zoom' && (
               <div className="absolute top-4 left-4 bg-black/70 px-3 py-1.5 rounded-lg z-40 border border-orange-500/40 flex items-center gap-2 text-orange-300 text-xs font-semibold shadow pointer-events-none">
                 <ZoomIn size={13} />
                 Zoom Lens Active — hover canvas to zoom
               </div>
             )}
          </div>

          {/* Zoomed Scene Overview Panel — presenter only, not recorded */}
          {showZoomedScene && interactionMode === 'zoom' && (
            <div className="bg-gray-800 p-4 rounded-xl border border-orange-500/30 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                  <ScanSearch size={16} /> Scene Overview — Zoom Region
                </h3>
                <span className="text-[10px] text-gray-500 bg-gray-700/60 px-2 py-0.5 rounded">Presenter only · not recorded</span>
              </div>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 shadow-inner">
                <canvas
                  ref={overviewCanvasRef}
                  width={640}
                  height={360}
                  className="w-full h-full object-contain"
                />
                {/* Overlay label */}
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-black/60 px-2 py-0.5 rounded pointer-events-none">
                  Orange outline = zoomed area
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                Move cursor over the main canvas · dashed orange outline shows the area being magnified by the zoom lens
              </p>
            </div>
          )}

          <div className="bg-gray-800 p-4 rounded-xl flex items-center gap-4 border border-gray-700 shadow-md">
             {isManualMode && (
                 <div className="flex gap-2 border-r border-gray-600 pr-4">
                     <button onClick={handlePrevManual} disabled={manualAssetIndex === 0} className="p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors shadow-sm">
                         <SkipBack size={18} />
                     </button>
                     <button onClick={handleNextManual} disabled={manualAssetIndex === activeAssets.length - 1} className="p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors shadow-sm">
                         <SkipForward size={18} />
                     </button>
                 </div>
             )}
             
             <button 
               onClick={togglePlay}
               disabled={!audioFile || isRendering}
               className={`p-4 rounded-full transition-all flex-shrink-0 ${
                 !audioFile || isRendering 
                 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                 : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
               }`}
             >
               {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
             </button>

             <div className="flex-1">
               <div className="flex justify-between text-sm text-gray-400 mb-2 font-mono">
                 <span ref={timeTextRef}>0:00</span>
                 <span>{formatTime(audioDuration)}</span>
               </div>
               <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                 <div 
                   ref={playheadRef}
                   className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-75 ease-linear"
                   style={{ width: `0%` }}
                 />
               </div>
             </div>
          </div>

          <div className="flex justify-end">
            <button 
               onClick={startRendering}
               disabled={!audioFile || activeAssets.length === 0 || isRendering}
               className={`flex items-center gap-3 px-8 py-4 text-lg rounded-xl font-bold transition-all
                 ${!audioFile || activeAssets.length === 0 || isRendering
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'
                 }`}
            >
               {isRendering ? (
                   <>{isManualMode ? 'Recording Live...' : 'Processing...'}</>
               ) : (
                   <>
                       <Download size={22} />
                       {isManualMode ? 'Record Live & Download' : 'Render & Download Video'}
                   </>
               )}
            </button>
          </div>

          {/* Manual Mode Filmstrip */}
          {isManualMode && activeAssets.length > 0 && (
              <div className="bg-gray-800 p-5 rounded-2xl border-2 border-orange-500/50 mt-2 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                          <LayoutGrid size={22} />
                          Live Control Dashboard (Instant Switching!)
                      </h3>
                      <div className="flex items-center gap-4">
                          <label className={`flex items-center gap-2 text-sm px-3 py-1 rounded font-semibold border cursor-pointer transition-colors
                              ${manualAutoAdvance ? 'text-orange-300 bg-orange-900/30 border-orange-500/50' : 'text-gray-400 bg-gray-900/40 border-gray-600'}`}
                              title="Automatically switch to the next clip as soon as the current one finishes">
                              <input
                                  type="checkbox"
                                  checked={manualAutoAdvance}
                                  onChange={(e) => {
                                      setManualAutoAdvance(e.target.checked);
                                      manualChangeTimeRef.current = audioRef.current?.currentTime || 0;
                                  }}
                                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                              />
                              <SkipForward size={15} /> Auto-Advance
                          </label>
                          {manualAutoAdvance && (
                              <label className={`flex items-center gap-2 text-sm px-3 py-1 rounded font-semibold border cursor-pointer transition-colors
                                  ${manualAutoLoop ? 'text-orange-300 bg-orange-900/20 border-orange-500/40' : 'text-gray-400 bg-gray-900/40 border-gray-600'}`}
                                  title="When the last clip finishes, start again from the first one">
                                  <input
                                      type="checkbox"
                                      checked={manualAutoLoop}
                                      onChange={(e) => setManualAutoLoop(e.target.checked)}
                                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                                  />
                                  <Repeat size={15} /> Loop
                              </label>
                          )}
                          <span className="flex items-center gap-1 text-sm text-green-400 bg-green-900/30 px-3 py-1 rounded font-semibold border border-green-500/30">
                              <CheckCircle2 size={16}/> Already Viewed
                          </span>
                          <span className="text-sm text-gray-400 font-mono font-bold bg-black/40 px-3 py-1 rounded">
                              {manualAssetIndex + 1} / {activeAssets.length}
                          </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 max-h-96 overflow-y-auto custom-scrollbar p-2">
                      {activeAssets.map((asset, idx) => {
                          const isSelected = manualAssetIndex === idx;
                          const isUsed = viewedAssets.has(idx);

                          return (
                              <div
                                  key={asset.id}
                                  onClick={() => handleSelectManual(idx)}
                                  className={`relative aspect-video bg-black rounded-lg cursor-pointer overflow-hidden border-2 transition-all shadow-md
                                      ${isSelected ? 'border-orange-500 shadow-orange-500/80 scale-110 z-20' : 
                                        isUsed ? 'border-green-500/80 opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : 
                                        'border-transparent hover:border-gray-500 hover:scale-105'}`}
                              >
                                  {asset.type === 'video' ? (
                                      <video src={asset.url} className="w-full h-full object-cover" />
                                  ) : (
                                      <img src={asset.url} loading="lazy" className="w-full h-full object-cover" />
                                  )}
                                  
                                  {isUsed && !isSelected && (
                                      <div className="absolute inset-0 bg-green-800/40 pointer-events-none mix-blend-overlay"></div>
                                  )}

                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1 pt-4 flex justify-between items-end">
                                      <p className="text-[11px] text-white font-bold px-1">{idx + 1}</p>
                                      {isUsed && <CheckCircle2 size={14} className="text-green-400 mb-0.5 mr-0.5 drop-shadow-md" />}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* ============ YouTube SEO Studio (ChatGPT API) ============ */}
          <div className="bg-gray-800 p-5 rounded-2xl border-2 border-red-500/40 mt-2 shadow-inner">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <Youtube size={22} /> YouTube SEO Studio
                <span className="text-xs font-normal text-gray-400">· thumbnail, 100-char title, 3000+ char description, tags</span>
              </h3>
              {(seoTitle || seoDescription || seoKeywords) && (
                <button
                  onClick={() => { setSeoTitle(''); setSeoDescription(''); setSeoKeywords(''); setThumbImage(''); setThumbError(''); setSeoError(''); setSeoStatus(''); }}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCcw size={13} /> Clear results
                </button>
              )}
            </div>

            {/* API key + models */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-1">
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><KeyRound size={12} /> ChatGPT (OpenAI) API Key</label>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5"
                />
                <label className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} className="w-3.5 h-3.5 accent-red-500 rounded" />
                  Remember key in this browser (localStorage)
                </label>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Text model</label>
                <select
                  value={textModel}
                  onChange={(e) => setTextModel(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"
                >
                  {OPENAI_TEXT_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="text"
                  value={customTextModel}
                  onChange={(e) => setCustomTextModel(e.target.value)}
                  placeholder="or type any newer model id…"
                  className="w-full mt-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Image model</label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"
                >
                  {OPENAI_IMAGE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="text"
                  value={customImageModel}
                  onChange={(e) => setCustomImageModel(e.target.value)}
                  placeholder="or type any newer image model id…"
                  className="w-full mt-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg p-2"
                />
              </div>
            </div>

            {/* Topic */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">
                Video topic / angle <span className="text-gray-600">— the title, subtitles and clip names above are sent automatically as reference</span>
              </label>
              <textarea
                value={seoTopic}
                onChange={(e) => setSeoTopic(e.target.value)}
                rows={2}
                placeholder={videoTitle ? `e.g. deeper angle for "${videoTitle}"` : 'What is this video about? Audience, angle, key points…'}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5 resize-y"
              />
              <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-500">
                <span className={videoTitle ? 'text-green-400' : ''}>{videoTitle ? '✓' : '○'} title</span>
                <span className={parsedCues.length || subtitleRawText ? 'text-green-400' : ''}>{parsedCues.length || subtitleRawText ? '✓' : '○'} subtitles ({parsedCues.length} cues)</span>
                <span className={visualAssets.length ? 'text-green-400' : ''}>{visualAssets.length ? '✓' : '○'} {visualAssets.length} clip names</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                onClick={generateSeoMetadata}
                disabled={seoLoading || !openAiKey.trim()}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
                  seoLoading || !openAiKey.trim()
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                }`}
              >
                {seoLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {seoLoading ? 'Generating…' : 'Generate Title, Description & Keywords'}
              </button>
              {seoStatus && <span className="text-xs text-gray-400">{seoStatus}</span>}
            </div>

            {seoError && (
              <div className="flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg p-3 mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{seoError}</span>
              </div>
            )}

            {/* Results */}
            {(seoTitle || seoDescription || seoKeywords) && (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400 font-semibold">Title
                      <span className={`ml-2 font-mono ${seoTitle.length === 100 ? 'text-green-400' : 'text-yellow-400'}`}>{seoTitle.length}/100 chars</span>
                    </label>
                    <button onClick={() => copyToClipboard(seoTitle, 'title')} className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-red-600 rounded transition-colors">
                      <Copy size={12} /> {copiedField === 'title' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 font-medium resize-y"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400 font-semibold">Description
                      <span className={`ml-2 font-mono ${seoDescription.length >= 3000 ? 'text-green-400' : 'text-yellow-400'}`}>{seoDescription.length} chars (min 3000)</span>
                    </label>
                    <button onClick={() => copyToClipboard(seoDescription, 'desc')} className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-red-600 rounded transition-colors">
                      <Copy size={12} /> {copiedField === 'desc' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={12}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg p-2.5 font-mono resize-y custom-scrollbar"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400 font-semibold">Keywords / Tags
                      <span className={`ml-2 font-mono ${seoKeywords.length <= 500 ? 'text-green-400' : 'text-red-400'}`}>{seoKeywords.length}/500 chars · {seoKeywords.split(',').filter(k => k.trim()).length} tags</span>
                    </label>
                    <button onClick={() => copyToClipboard(seoKeywords, 'keys')} className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-red-600 rounded transition-colors">
                      <Copy size={12} /> {copiedField === 'keys' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg p-2.5 resize-y"
                  />
                </div>
              </div>
            )}

            {/* Thumbnail */}
            <div className="mt-6 pt-5 border-t border-gray-700">
              <h4 className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
                <ImagePlus size={16} className="text-red-400" /> Thumbnail Generator
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-400 mb-1">Thumbnail style</label>
                    <select
                      value={thumbStyle}
                      onChange={(e) => setThumbStyle(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2"
                    >
                      {Object.entries(THUMB_STYLES).map(([key, st]) => (
                        <option key={key} value={key}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Size</label>
                      <select value={thumbSize} onChange={(e) => setThumbSize(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2">
                        {(IMAGE_SIZES[effectiveImageModel] || ['1024x1024']).map(sz => (
                          <option key={sz} value={sz}>{sz}{sz === '1536x1024' || sz === '1792x1024' ? ' (widescreen)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Quality</label>
                      <select value={thumbQuality} onChange={(e) => setThumbQuality(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2">
                        <option value="high">high</option>
                        <option value="medium">medium</option>
                        <option value="low">low</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400 font-semibold">Image prompt (editable)</label>
                    <div className="flex gap-2">
                      <button onClick={() => setThumbPrompt(fallbackThumbPrompt())} className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                        <Wand2 size={12} /> Build locally
                      </button>
                      <button onClick={() => copyToClipboard(thumbPrompt || fallbackThumbPrompt(), 'prompt')} className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-red-600 rounded transition-colors">
                        <Copy size={12} /> {copiedField === 'prompt' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={thumbPrompt}
                    onChange={(e) => setThumbPrompt(e.target.value)}
                    rows={7}
                    placeholder="Generate the metadata first, or click “Build locally” to compose a prompt from the title and topic."
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg p-2.5 resize-y"
                  />

                  <button
                    onClick={generateThumbnail}
                    disabled={thumbLoading || !openAiKey.trim()}
                    className={`mt-3 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
                      thumbLoading || !openAiKey.trim()
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                    }`}
                  >
                    {thumbLoading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                    {thumbLoading ? 'Painting thumbnail…' : `Generate Thumbnail (${effectiveImageModel})`}
                  </button>

                  {thumbError && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-yellow-200 bg-yellow-950/40 border border-yellow-500/40 rounded-lg p-3">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{thumbError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="aspect-video w-full bg-black rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center">
                    {thumbImage ? (
                      <img src={thumbImage} alt="Generated YouTube thumbnail" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-600 text-xs px-6">
                        {thumbLoading ? <Loader2 size={26} className="animate-spin mx-auto text-purple-400" /> : <ImageIcon size={26} className="mx-auto mb-2" />}
                        <p className="mt-2">Your generated 16:9 thumbnail appears here.</p>
                      </div>
                    )}
                  </div>
                  {thumbHeadline && (
                    <p className="text-[11px] text-gray-400 mt-2">Thumbnail headline: <span className="text-white font-bold">{thumbHeadline}</span></p>
                  )}
                  {thumbImage && (
                    <button onClick={downloadThumbnail} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors">
                      <Download size={16} /> Download Thumbnail PNG
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        <audio ref={audioRef} src={audioFile?.url} crossOrigin="anonymous" />
        <div ref={hiddenContainerRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0 }}></div>
      </div>
    </div>
  );
};

export default AudioVisualMixer;