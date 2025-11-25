import OpenAI from "openai";
import { config } from "../utils/config.js";

class PoetryModule {
  constructor() {
    this.client = null;
    this.previousLines = [];
    this.maxPreviousLines = 12; // Keep ~3 stanzas for context
    this.isInitialized = false;
    this.sessionTheme = null;
  }

  initialize() {
    if (this.isInitialized) return;

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true,
    });

    this.isInitialized = true;
  }

  async generate(sceneDescription) {
    this.initialize();

    const startTime = Date.now();

    const systemPrompt = `You are a contemplative poet who finds meaning in ordinary moments.

YOUR STYLE:
- Begin with observation of what is seen
- Transform observations into reflections on life, love, or beauty
- Find lessons and meaning in the mundane
- Use accessible, flowing language
- Avoid clichés; find fresh perspectives

TECHNICAL REQUIREMENTS:
- Write exactly 2 lines of poetry
- Each line should be speakable in one breath
- Create natural pause points (line breaks)
- Avoid tongue-twisters or complex phrases
- The poetry will be spoken aloud by text-to-speech

THEMATIC GUIDANCE:
- Even mundane scenes contain beauty
- Loneliness can be solitude; emptiness can be possibility
- Technology connects us; screens are windows
- Every moment is an opportunity for presence
- Find the universal in the specific`;

    // Build context from previous generations
    const previousContext =
      this.previousLines.length > 0
        ? `\n\nPrevious verses (maintain thematic continuity):\n${this.previousLines.join(
            "\n"
          )}`
        : "";

    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `What I see: ${sceneDescription}${previousContext}

Write the next verses. Begin with the observation, end with meaning.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8, // Higher = more creative, lower = more predictable
      });

      const poetry = response.choices[0].message.content.trim();
      const latency = Date.now() - startTime;

      this.addToHistory(poetry);

      const lines = poetry.split("\n").filter((line) => line.trim());

      console.log(
        `✨ Poetry (${latency}ms, ${lines.length} lines):\n${poetry}`
      );

      return {
        text: poetry,
        lines,
        lineCount: lines.length,
        timestamp: Date.now(),
        latency,
        tokens: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error("Poetry generation error:", error);
      throw error;
    }
  }

  addToHistory(poetry) {
    const lines = poetry.split("\n").filter((line) => line.trim());
    this.previousLines.push(...lines);

    if (this.previousLines.length > this.maxPreviousLines) {
      this.previousLines = this.previousLines.slice(-this.maxPreviousLines);
    }
  }

  getHistory() {
    return [...this.previousLines];
  }
}

export const poetry = new PoetryModule();
