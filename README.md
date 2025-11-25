# Mil4dy - Poetry from Sight

A real-time, camera-reactive poetry generator that transforms what you see into spoken-word poetry.

## How It Works

```
📷 Camera → 👁️ Vision AI → ✨ Poetry AI → 🔊 Speech → 🎧 You
```

1. **Camera** captures your surroundings
2. **GPT-4o Vision** describes what it sees
3. **GPT-4o** transforms the description into contemplative poetry
4. **ElevenLabs** speaks the poetry aloud
5. **Buffer system** ensures continuous, uninterrupted playback

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

**How to get API keys:**

- **OpenAI**: https://platform.openai.com/api-keys (needs GPT-4o access)
- **ElevenLabs**: https://elevenlabs.io/app/settings/api-keys

### 3. Run the App

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 4. Use It

1. Allow camera access when prompted
2. Click **"Begin"** to start generating poetry
3. Point your camera at anything interesting
4. Listen as poetry flows based on what you see

## Project Structure

```
mil4dy/
├── src/
│   ├── modules/
│   │   ├── camera.js       # Webcam capture
│   │   ├── vision.js       # GPT-4o scene analysis
│   │   ├── poetry.js       # Poetry generation
│   │   ├── tts.js          # ElevenLabs text-to-speech
│   │   └── audioBuffer.js  # Continuous playback
│   ├── utils/
│   │   └── config.js       # Configuration
│   ├── main.js             # Orchestrator
│   └── style.css           # Styling
├── index.html              # Entry point
├── docs/
│   ├── PRD.md              # Product requirements
│   └── IMPLEMENTATION.md   # Implementation guide
└── package.json
```

## Configuration

Edit `src/utils/config.js` to adjust:

- **Timing**: How often to capture frames, buffer size
- **Poetry**: Style, length, themes
- **Vision**: Image quality, detail level
- **Voice**: ElevenLabs voice ID

## Estimated Costs

- ~$0.02 per poetry generation (Vision + Poetry)
- ~$0.01 per TTS clip (ElevenLabs)
- **Total: ~$0.18 per minute** of continuous poetry

## Troubleshooting

### "Missing API keys" error

Create a `.env` file with your OpenAI and ElevenLabs API keys.

### Camera not working

Make sure you've granted camera permissions. Try a different browser if issues persist.

### Poetry stops/stutters

The buffer might be empty. This can happen on slow connections. The app will recover automatically.

### High latency

- Check your internet connection
- Vision API calls can take 1-3 seconds
- TTS can take 2-5 seconds

## Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 15+ ✅
- Edge 90+ ✅

## License

ISC

---

_"Every moment is an opportunity for presence."_
