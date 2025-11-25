# Product Requirements Document (PRD)

# Camera-Reactive Poetry Generator

**Project Codename:** Mil4dy  
**Version:** 2.0  
**Last Updated:** November 25, 2025  
**Author:** [Your Name]

---

## 1. Executive Summary

Mil4dy is a real-time, camera-reactive poetry generation system that creates continuous spoken-word poetry based on what it "sees" through your laptop camera. The system analyzes live camera input, generates observational poetry with uplifting philosophical undertones, and narrates it through text-to-speech—creating an endless stream of poetic interpretation of your surroundings.

---

## 2. Problem Statement

Current AI creative tools generate static, one-shot content that cannot adapt to live input. Artists, performers, and experimenters lack tools to create truly reactive experiences where:

- Poetry adapts in real-time to visual stimuli
- The environment becomes part of the creative process
- Content flows continuously without interruption
- Observations are transformed into meaningful reflections

---

## 3. Vision

Create a system where pointing a camera at any scene generates a continuous stream of spoken poetry—observational yet uplifting—that transforms ordinary moments into philosophical reflections on life, love, and meaning. The poetry never stops; it flows like a meditation on the present moment.

---

## 4. Goals & Non-Goals

### Goals

- ✅ Generate continuous poetry based on camera input
- ✅ Transform observations into positive, meaningful reflections
- ✅ Maintain uninterrupted audio output through smart buffering
- ✅ Achieve low-latency visual analysis (< 5 second scene-to-poetry)
- ✅ Run in a web browser for maximum accessibility
- ✅ Modular architecture to allow future music integration

### Non-Goals

- ❌ Music generation (deferred to future version)
- ❌ Sung vocals (spoken word only for v1)
- ❌ Multiple simultaneous camera inputs (v1)
- ❌ Offline/mobile operation (v1)
- ❌ Real-time lip-synced avatar (future consideration)

---

## 5. User Stories

### Primary User: Interactive Artist/Performer

> "As a digital artist, I want to point a camera at any scene and hear poetry that finds meaning in what it sees, creating a meditative, reflective experience."

### Secondary User: Creative Technologist

> "As a developer, I want to experiment with AI-generated poetry that responds to the real world in real-time."

### Tertiary User: Mindfulness Practitioner

> "As someone seeking presence, I want a tool that helps me see ordinary moments through a poetic lens, finding lessons and beauty in everyday observations."

---

## 6. Technical Architecture

### 6.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                                           │
│  │   CAMERA     │                                                           │
│  │   INPUT      │                                                           │
│  │              │                                                           │
│  │  getUserMedia│                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐         ┌──────────────────────────────────────────────┐  │
│  │   VISION     │         │           AUDIO PLAYBACK ENGINE              │  │
│  │   ANALYSIS   │         │                                              │  │
│  │              │         │  ┌─────────────────────────────────────────┐ │  │
│  │ • Scene desc │         │  │         POETRY BUFFER                   │ │  │
│  │ • Key objects│         │  │                                         │ │  │
│  │ • Mood/tone  │         │  │  [Clip 1] [Clip 2] [Clip 3] [Clip 4]   │ │  │
│  │              │         │  │     ▲        ▲                          │ │  │
│  └──────┬───────┘         │  │  playing  generating                    │ │  │
│         │                 │  └─────────────────────────────────────────┘ │  │
│         │                 │                     │                        │  │
│         │                 │                     ▼                        │  │
│         │                 │            ┌───────────────┐                 │  │
│         │                 │            │    OUTPUT     │                 │  │
│         │                 │            │   🔊 Audio    │                 │  │
│         │                 │            │   📝 Text     │                 │  │
│         │                 │            └───────────────┘                 │  │
│         │                 └──────────────────────────────────────────────┘  │
│         │                                                                   │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          │ API Calls (every 4-6 seconds)
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND SERVICES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  VISION LLM  │───▶│  POETRY LLM  │───▶│     TTS      │                  │
│  │              │    │              │    │              │                  │
│  │  GPT-4o or   │    │  GPT-4o or   │    │  ElevenLabs  │                  │
│  │  Claude      │    │  Claude      │    │  or OpenAI   │                  │
│  │              │    │              │    │              │                  │
│  │ "I see a    │    │ "In the cup  │    │   🔊 .mp3    │                  │
│  │  coffee cup │    │  of morning, │    │              │                  │
│  │  on desk"   │    │  we find..." │    │              │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Data Flow - The Poetry Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS GENERATION LOOP                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. CAPTURE        Camera frame captured
   (t+0s)                │
                         ▼
2. DESCRIBE       ┌─────────────────┐
   (t+1-2s)       │  Vision LLM     │
                  │                 │
                  │  "A person      │
                  │   sitting by    │
                  │   a window,     │
                  │   rain outside" │
                  └────────┬────────┘
                           │
3. POETICIZE              ▼
   (t+2-4s)       ┌─────────────────┐
                  │  Poetry LLM     │
                  │                 │
                  │  "By the glass  │
                  │   where droplets│
                  │   trace their   │
                  │   stories down, │
                  │   you sit—a     │
                  │   quiet witness │
                  │   to the sky's  │
                  │   soft tears..."│
                  └────────┬────────┘
                           │
4. VOCALIZE               ▼
   (t+4-8s)       ┌─────────────────┐
                  │  TTS Engine     │
                  │                 │
                  │  Generates      │
                  │  8-10 second    │
                  │  audio clip     │
                  └────────┬────────┘
                           │
5. BUFFER                 ▼
                  ┌─────────────────┐
                  │  Audio Queue    │
                  │                 │
                  │  [████████░░░]  │
                  │  Always 2-3     │
                  │  clips ahead    │
                  └────────┬────────┘
                           │
6. PLAY                   ▼
                       🔊 Speakers
                       📝 Subtitles

┌─────────────────────────────────────────────────────────────────────────────┐
│  KEY INSIGHT: Start generating next clip BEFORE current one finishes        │
│  This ensures the buffer never empties and poetry never stops               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Buffer Management Strategy

```
Timeline (seconds):
0    5    10   15   20   25   30   35   40   45   50
│    │    │    │    │    │    │    │    │    │    │
▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼

GENERATION:
[===Gen 1===]
     [===Gen 2===]
          [===Gen 3===]
               [===Gen 4===]
                    [===Gen 5===]
                         ...continues...

PLAYBACK:
          [===Play 1===]
                    [===Play 2===]
                              [===Play 3===]
                                        ...continues...

BUFFER STATE:
t=0:   Generating Clip 1
t=8:   Buffer: [Clip 1] ← Playing, Generating Clip 2
t=16:  Buffer: [Clip 2] ← Playing, [Clip 3] ready, Generating Clip 4
t=24:  Buffer: [Clip 3] ← Playing, [Clip 4] ready, Generating Clip 5

Rule: Always maintain 2-3 clips in buffer ahead of playback
```

---

## 7. Component Specifications

### 7.1 Camera Input Module

**Technology:** WebRTC / getUserMedia API

**Requirements:**

- Capture video at minimum 640x480 @ 30fps
- Extract frames as base64 for Vision API
- Handle camera permission requests gracefully
- Support camera switching (front/back)

**Interface:**

```typescript
interface CameraModule {
  initialize(): Promise<void>;
  captureFrame(): Promise<string>; // base64 encoded image
  getStream(): MediaStream;
  switchCamera(): Promise<void>;
}
```

### 7.2 Vision Analysis Module

**Technology:** GPT-4o Vision or Claude 3.5 Vision

**Purpose:** Describe what the camera sees in natural language

**Interface:**

```typescript
interface VisionModule {
  analyzeFrame(imageBase64: string): Promise<SceneDescription>;
}

interface SceneDescription {
  description: string; // Natural language scene description
  keyElements: string[]; // Main objects/subjects
  mood: string; // Detected emotional tone
  timestamp: number;
}
```

**Prompt Strategy:**

```
You are an observant poet's eye. Describe what you see in this image
in 2-3 sentences. Focus on:
- The main subject or action
- Notable details that could inspire reflection
- The mood or atmosphere

Be specific but concise. This description will inspire poetry.
```

### 7.3 Poetry Generation Module

**Technology:** GPT-4o or Claude 3.5 Sonnet

**Purpose:** Transform scene descriptions into meaningful poetry

**Poetry Style Guidelines:**

1. **Observational Foundation:** Start with what is literally seen
2. **Uplifting Transformation:** Find meaning, lessons, or beauty
3. **Themes:** Love, growth, presence, connection, wonder, gratitude
4. **Length:** 4-8 lines per generation (8-10 seconds when spoken)
5. **Tone:** Contemplative, warm, gently philosophical

**Interface:**

```typescript
interface PoetryModule {
  generatePoetry(
    scene: SceneDescription,
    context: PoetryContext
  ): Promise<Poetry>;
}

interface PoetryContext {
  previousLines: string[]; // Last 2-3 stanzas for continuity
  sessionTheme?: string; // Optional overarching theme
}

interface Poetry {
  text: string;
  estimatedDuration: number; // seconds when spoken
}
```

**Prompt Strategy:**

```
You are a contemplative poet who finds meaning in ordinary moments.

What I see: [SCENE_DESCRIPTION]

Previous verses (for continuity):
[PREVIOUS_LINES]

Write the next 4-8 lines of poetry. Guidelines:
- Begin with observation, end with meaning
- Find love, lessons, or beauty in the mundane
- Use accessible, flowing language
- Avoid clichés; find fresh perspectives
- Each stanza should feel complete yet connected

The poetry will be spoken aloud, so:
- Use natural rhythms (not strict meter)
- Include natural pause points
- Avoid tongue-twisters
```

**Example Transformations:**

| Scene                                                                       | Poetry                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "A coffee cup on a wooden desk, steam rising, morning light through blinds" | "The steam rises like questions we forget to ask, / curling toward light that finds its way through slats. / In this cup, a universe of warmth waits— / teaching us that small rituals hold us together." |
| "An empty chair by a window, rain outside"                                  | "The chair holds space for who might come, / patient as rain that asks nothing of the glass. / We are all waiting for something, / and in the waiting, we become."                                        |
| "A hand typing on a keyboard, multiple monitors"                            | "These fingers dance their quiet spells, / weaving worlds from light and thought. / What we create when no one watches / becomes the truest gift we've brought."                                          |

### 7.4 Text-to-Speech Module

**Technology:** ElevenLabs API (primary) or OpenAI TTS (fallback)

**Voice Selection Criteria:**

- Warm, contemplative tone
- Clear enunciation
- Moderate pace (not rushed)
- Slight breathiness (poetic feel)

**Interface:**

```typescript
interface TTSModule {
  synthesize(text: string): Promise<AudioClip>;
  getAvailableVoices(): Promise<Voice[]>;
  setVoice(voiceId: string): void;
}

interface AudioClip {
  audioBuffer: ArrayBuffer;
  duration: number; // seconds
  text: string; // original text
}
```

**Configuration:**

- Target duration: 8-10 seconds per clip
- Sample rate: 44.1kHz
- Format: MP3 or WAV
- Stability: 0.5 (balanced)
- Similarity boost: 0.75

### 7.5 Audio Playback & Buffer Module

**Technology:** Web Audio API

**Purpose:** Manage continuous, gapless playback

**Interface:**

```typescript
interface AudioBufferManager {
  addToQueue(clip: AudioClip): void;
  getBufferStatus(): BufferStatus;
  play(): void;
  pause(): void;
  onClipStart(callback: (clip: AudioClip) => void): void;
  onBufferLow(callback: () => void): void;
}

interface BufferStatus {
  currentlyPlaying: AudioClip | null;
  queuedClips: number;
  totalBufferedSeconds: number;
  isPlaying: boolean;
}
```

**Buffer Rules:**

- Minimum buffer: 2 clips (~16-20 seconds)
- Maximum buffer: 5 clips (drop oldest if exceeded)
- Crossfade between clips: 500ms
- Trigger new generation when buffer < 3 clips

---

## 8. User Interface

### 8.1 Main View

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                                                           │  │
│  │                    CAMERA FEED                            │  │
│  │              (subtle vignette effect)                     │  │
│  │                                                           │  │
│  │                                                           │  │
│  │                                                           │  │
│  │                                                           │  │
│  │   ┌─────────────────────────────────────────────────┐    │  │
│  │   │                                                 │    │  │
│  │   │   "The steam rises like questions              │    │  │
│  │   │    we forget to ask,                           │    │  │
│  │   │    curling toward light that finds             │    │  │
│  │   │    its way through slats..."                   │    │  │
│  │   │                                                 │    │  │
│  │   │              CURRENT POETRY                     │    │  │
│  │   │         (text synced with audio)               │    │  │
│  │   │                                                 │    │  │
│  │   └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  ▶ START    🔊 ━━━━━━━━━●━━━━━━    ⚙️     Buffer: ████░░   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 UI Elements

| Element          | Purpose                                    |
| ---------------- | ------------------------------------------ |
| Camera Feed      | Full-screen background with subtle overlay |
| Poetry Text      | Large, readable text overlaid on video     |
| Start/Pause      | Begin or pause the poetry generation       |
| Volume           | Control audio output level                 |
| Buffer Indicator | Visual showing how much poetry is queued   |
| Settings Gear    | Access voice selection, theme options      |

### 8.3 Text Display Behavior

- Text fades in line-by-line as it's spoken
- Previous lines fade slightly (remain readable)
- Smooth transitions between stanzas
- Optional: karaoke-style word highlighting

---

## 9. Technical Requirements

### 9.1 Frontend

| Requirement     | Specification                       |
| --------------- | ----------------------------------- |
| Framework       | Vanilla JS or React                 |
| Build Tool      | Vite                                |
| Audio           | Web Audio API                       |
| Styling         | CSS with animations                 |
| Browser Support | Chrome 90+, Firefox 88+, Safari 15+ |

### 9.2 Backend (Serverless recommended)

| Requirement | Specification                       |
| ----------- | ----------------------------------- |
| Runtime     | Node.js 18+ (for API proxy)         |
| Hosting     | Vercel/Netlify Functions or similar |
| Purpose     | Secure API key handling             |

### 9.3 External APIs

| Service         | Purpose                    | Estimated Cost    |
| --------------- | -------------------------- | ----------------- |
| OpenAI GPT-4o   | Vision + Poetry generation | ~$0.02/generation |
| ElevenLabs      | Text-to-speech             | ~$0.01/clip       |
| **Alternative** |                            |                   |
| Claude 3.5      | Vision + Poetry            | ~$0.02/generation |
| OpenAI TTS      | Text-to-speech             | ~$0.005/clip      |

**Estimated running cost:** ~$0.03 per 10-second clip → ~$0.18/minute of poetry

### 9.4 Performance Targets

| Metric                    | Target              |
| ------------------------- | ------------------- |
| Vision analysis latency   | < 2s                |
| Poetry generation latency | < 2s                |
| TTS generation latency    | < 4s                |
| Total pipeline latency    | < 8s                |
| Minimum buffer            | > 16s ahead         |
| Audio gap between clips   | < 100ms (crossfade) |

---

## 10. MVP Scope

### Phase 1: MVP (This Version)

- [x] Camera input with frame capture
- [x] Vision API integration (scene description)
- [x] Poetry LLM integration (text generation)
- [x] TTS integration (audio synthesis)
- [x] Audio buffer management (continuous playback)
- [x] Basic UI with camera feed and text overlay
- [x] Start/pause controls

### Phase 2: Polish

- [ ] Voice selection UI
- [ ] Theme/style presets (philosophical, romantic, humorous)
- [ ] Session recording (save generated poetry)
- [ ] Improved text animations
- [ ] Mobile-responsive design

### Phase 3: Music Integration (Future)

- [ ] Ambient synthesizer module
- [ ] Visual-reactive music parameters
- [ ] Music + poetry synchronization
- [ ] Multiple musical moods

---

## 11. Success Metrics

| Metric           | Target                 | Measurement       |
| ---------------- | ---------------------- | ----------------- |
| Pipeline latency | < 10s                  | Automated logging |
| Buffer underruns | 0 per session          | Error tracking    |
| Session length   | > 3 minutes average    | Analytics         |
| Poetry coherence | Positive user feedback | Manual review     |
| Audio quality    | No gaps or glitches    | User testing      |

---

## 12. Risks & Mitigations

| Risk                                  | Impact | Likelihood | Mitigation                                     |
| ------------------------------------- | ------ | ---------- | ---------------------------------------------- |
| API costs exceed budget               | High   | Medium     | Usage caps, caching similar scenes             |
| TTS latency causes buffer underrun    | High   | Medium     | Aggressive pre-generation, larger buffer       |
| Poetry becomes repetitive             | Medium | Medium     | Diverse prompting, theme rotation              |
| Vision API misinterprets scenes       | Low    | Medium     | Multiple retries, context from previous frames |
| Browser audio policies block playback | Medium | Low        | User interaction required before start         |

---

## 13. Open Questions

1. **Voice selection:** Which ElevenLabs voice best suits contemplative poetry?
2. **Poetry length:** Is 4-8 lines (8-10 seconds) the right length per generation?
3. **Scene sampling:** Should we capture frames at fixed intervals or detect significant changes?
4. **Continuity:** How much should consecutive poems reference each other?
5. **Edge cases:** What happens when the camera sees nothing interesting (blank wall)?

---

## 14. Appendix

### A. Example Poetry Generation Flow

**Input Frame:** Person at laptop with coffee, morning light

**Vision API Output:**

```
"A person sits at a wooden desk with a laptop, a white coffee mug
nearby with visible steam. Morning sunlight streams through window
blinds, creating striped shadows across the workspace. The atmosphere
is quiet and focused."
```

**Poetry LLM Output:**

```
In the geometry of morning light,
you bend toward the glowing screen—
a quiet pilgrim at the altar of doing.

The coffee steams its small offering,
rising like the thoughts you're gathering,
and somewhere between the blinds' soft bars,
the day is learning your name.
```

**TTS Output:** 10.2 second audio clip

### B. API Integration Examples

**Vision API Call:**

```javascript
const describeScene = async (imageBase64) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this scene in 2-3 sentences for a poet.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 150,
  });
  return response.choices[0].message.content;
};
```

**Poetry Generation Call:**

```javascript
const generatePoetry = async (sceneDescription, previousLines) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a contemplative poet who finds meaning in ordinary moments.
                Write 4-8 lines of poetry. Begin with observation, end with meaning.
                Find love, lessons, or beauty in the mundane.`,
      },
      {
        role: "user",
        content: `Scene: ${sceneDescription}\n\nPrevious verses:\n${previousLines.join(
          "\n"
        )}`,
      },
    ],
    max_tokens: 200,
  });
  return response.choices[0].message.content;
};
```

### C. Technology Alternatives

| Component  | Chosen     | Alternative       | Why Chosen            |
| ---------- | ---------- | ----------------- | --------------------- |
| Vision LLM | GPT-4o     | Claude 3.5 Sonnet | Faster, native vision |
| Poetry LLM | GPT-4o     | Claude 3.5 Sonnet | Same API, simpler     |
| TTS        | ElevenLabs | OpenAI TTS        | Better voice quality  |
| Frontend   | Vanilla JS | React             | Simpler for MVP       |

---

## 15. Timeline Estimate

| Phase              | Duration     | Deliverable                    |
| ------------------ | ------------ | ------------------------------ |
| Setup & Camera     | 2 days       | Camera capture working         |
| Vision Integration | 2 days       | Scene descriptions from frames |
| Poetry Pipeline    | 3 days       | Poetry generating from scenes  |
| TTS Integration    | 2 days       | Audio playing from text        |
| Buffer System      | 3 days       | Continuous, gapless playback   |
| UI & Polish        | 3 days       | Usable, pleasant interface     |
| **Total MVP**      | **~2 weeks** |                                |

---

## 16. Future: Music Integration (Phase 3)

_Preserved for future reference—not in current scope_

When ready to add music, the architecture supports:

```
┌─────────────────┐
│  Vision Input   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Poetry │ │ Music │  ← Separate modules
│Module │ │Module │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│  Audio Mixer    │  ← Synchronized output
│ (Poetry + Music)│
└─────────────────┘
```

**Music module considerations:**

- Ambient synthesizers (Tone.js)
- Subtle reactivity to visual changes
- Volume ducking when poetry plays
- Mood matching with poetry theme

---

_Document Status: Draft v2.0 - Focused on Poetry Generation_
