/**
 * Poetry Module
 * 
 * Transforms scene descriptions into contemplative poetry.
 * Uses GPT-4o to generate observational poetry with uplifting themes.
 * 
 * Key concepts:
 * - System prompts: Define the AI's personality and constraints
 * - Context window: Passing previous lines for continuity
 * - Temperature: Controls creativity vs. predictability
 */

import OpenAI from 'openai';
import { config } from '../utils/config.js';

class PoetryModule {
  constructor() {
    this.client = null;
    this.previousLines = [];
    this.maxPreviousLines = 12; // Keep ~3 stanzas for context
    this.isInitialized = false;
    this.sessionTheme = null;
  }

  /**
   * Initialize the OpenAI client
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true,
    });
    
    this.isInitialized = true;
    console.log('✨ Poetry module initialized');
  }

  /**
   * Generate poetry from a scene description
   * 
   * @param {string} sceneDescription - What the camera sees
   * @returns {Promise<Poetry>} - Generated poetry with metadata
   * 
   * The poetry style is:
   * - Observational: Starts with what is seen
   * - Transformational: Finds meaning, lessons, beauty
   * - Flowing: Natural rhythms for speech
   */
  async generate(sceneDescription) {
    this.initialize();
    
    const startTime = Date.now();
    
    // The system prompt defines the poet's voice and style
    const systemPrompt = `You are a contemplative poet who finds meaning in ordinary moments.

YOUR STYLE:
- Begin with observation of what is seen
- Transform observations into reflections on life, love, or beauty
- Find lessons and meaning in the mundane
- Use accessible, flowing language
- Avoid clichés; find fresh perspectives

TECHNICAL REQUIREMENTS:
- Write exactly 4-6 lines of poetry
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
    const previousContext = this.previousLines.length > 0
      ? `\n\nPrevious verses (maintain thematic continuity):\n${this.previousLines.join('\n')}`
      : '';

    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `What I see: ${sceneDescription}${previousContext}

Write the next verses. Begin with the observation, end with meaning.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8, // Higher = more creative, lower = more predictable
      });

      const poetry = response.choices[0].message.content.trim();
      const latency = Date.now() - startTime;
      
      // Update context for next generation
      this.addToHistory(poetry);
      
      // Count actual lines (non-empty)
      const lines = poetry.split('\n').filter(line => line.trim());
      
      console.log(`✨ Poetry (${latency}ms, ${lines.length} lines):\n${poetry}`);
      
      return {
        text: poetry,
        lines,
        lineCount: lines.length,
        timestamp: Date.now(),
        latency,
        tokens: response.usage?.total_tokens || 0,
      };
      
    } catch (error) {
      console.error('Poetry generation error:', error);
      throw error;
    }
  }

  /**
   * Add generated poetry to history for continuity
   * 
   * @param {string} poetry - The generated poetry text
   * 
   * Why keep history?
   * - Prevents repetition
   * - Maintains thematic threads
   * - Creates a sense of journey
   */
  addToHistory(poetry) {
    const lines = poetry.split('\n').filter(line => line.trim());
    this.previousLines.push(...lines);
    
    // Keep only recent history to avoid context overflow
    if (this.previousLines.length > this.maxPreviousLines) {
      this.previousLines = this.previousLines.slice(-this.maxPreviousLines);
    }
  }

  /**
   * Set a session theme to guide poetry direction
   * @param {string} theme - e.g., "love", "solitude", "wonder"
   */
  setTheme(theme) {
    this.sessionTheme = theme;
    console.log(`🎭 Session theme set to: ${theme}`);
  }

  /**
   * Clear history and start fresh
   * Useful when starting a new session
   */
  clearHistory() {
    this.previousLines = [];
    this.sessionTheme = null;
    console.log('✨ Poetry history cleared');
  }

  /**
   * Get current history for debugging/display
   * @returns {string[]}
   */
  getHistory() {
    return [...this.previousLines];
  }
}

/**
 * @typedef {Object} Poetry
 * @property {string} text - The full poetry text
 * @property {string[]} lines - Array of individual lines
 * @property {number} lineCount - Number of lines
 * @property {number} timestamp - When generated
 * @property {number} latency - API response time (ms)
 * @property {number} tokens - API tokens used
 */

// Export singleton instance
export const poetry = new PoetryModule();

