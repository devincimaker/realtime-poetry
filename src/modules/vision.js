/**
 * Vision Module
 * 
 * Analyzes camera frames using GPT-4o Vision API.
 * Converts what the camera "sees" into natural language descriptions.
 * 
 * Key concepts:
 * - Multimodal AI: Models that understand both text and images
 * - Base64 images: How to send images to APIs as text
 * - Prompt engineering: Crafting instructions for desired output
 */

import OpenAI from 'openai';
import { config } from '../utils/config.js';

class VisionModule {
  constructor() {
    this.client = null;
    this.lastDescription = '';
    this.isInitialized = false;
  }

  /**
   * Initialize the OpenAI client
   * Called lazily on first use to avoid errors if API key is missing
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      // Note: In production, you'd proxy through a backend to hide the API key
      // This flag acknowledges we're making direct browser calls
      dangerouslyAllowBrowser: true,
    });
    
    this.isInitialized = true;
    console.log('👁️ Vision module initialized');
  }

  /**
   * Analyze a camera frame and return a scene description
   * 
   * @param {string} imageBase64 - Base64 encoded JPEG image
   * @returns {Promise<SceneDescription>} - Scene analysis results
   * 
   * The prompt is crafted to get descriptions that inspire poetry:
   * - Focus on observable details
   * - Note mood and atmosphere
   * - Be evocative but concise
   */
  async analyzeFrame(imageBase64) {
    this.initialize();
    
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an observant poet's eye. Describe what you see in this image in 2-3 sentences.

Focus on:
- The main subject or action happening
- Notable details that could inspire reflection
- The mood, atmosphere, or feeling

Be specific and evocative, but concise. This description will inspire poetry.
Avoid generic descriptions. Find something interesting or meaningful in the scene.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  // 'low' = faster & cheaper (~85 tokens), good for our use case
                  // 'high' = more detail (~765 tokens), for detailed analysis
                  detail: config.vision.imageDetail,
                },
              },
            ],
          },
        ],
        max_tokens: config.vision.maxTokens,
      });

      const description = response.choices[0].message.content;
      const latency = Date.now() - startTime;
      
      // Check if scene changed significantly
      const isNewScene = this.detectSceneChange(description);
      this.lastDescription = description;
      
      console.log(`👁️ Vision (${latency}ms): ${description.substring(0, 100)}...`);
      
      return {
        description,
        timestamp: Date.now(),
        latency,
        isNewScene,
        tokens: response.usage?.total_tokens || 0,
      };
      
    } catch (error) {
      // Handle specific API errors
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Check your .env file.');
      } else if (error.status === 429) {
        throw new Error('Rate limited by OpenAI. Please wait a moment.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error. Retrying...');
      }
      
      console.error('Vision API error:', error);
      throw error;
    }
  }

  /**
   * Detect if the scene has changed significantly
   * Uses simple word overlap similarity
   * 
   * @param {string} newDescription - New scene description
   * @returns {boolean} - True if scene changed significantly
   * 
   * This helps avoid generating redundant poetry for static scenes
   */
  detectSceneChange(newDescription) {
    if (!this.lastDescription) return true;
    
    const similarity = this.calculateSimilarity(newDescription, this.lastDescription);
    
    // If less than 50% similar, consider it a new scene
    return similarity < 0.5;
  }

  /**
   * Calculate word overlap similarity between two strings
   * Simple but effective for our use case
   * 
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} - Similarity score 0-1
   */
  calculateSimilarity(a, b) {
    // Normalize and tokenize
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    // Count overlapping words
    const intersection = [...wordsA].filter(word => wordsB.has(word));
    
    // Jaccard similarity
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.length / union.size;
  }

  /**
   * Reset scene tracking (for starting fresh)
   */
  reset() {
    this.lastDescription = '';
  }
}

/**
 * @typedef {Object} SceneDescription
 * @property {string} description - Natural language scene description
 * @property {number} timestamp - When the analysis was done
 * @property {number} latency - How long the API call took (ms)
 * @property {boolean} isNewScene - Whether scene changed significantly
 * @property {number} tokens - API tokens used
 */

// Export singleton instance
export const vision = new VisionModule();

