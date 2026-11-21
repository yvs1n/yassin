/**
 * Digital Twin Conversational Engine
 * Matches user questions against beta/data/twin-knowledge.js and delivers
 * multi-bubble responses with natural pacing and instant-skip support.
 */

import { QUESTION_POOLS, KNOWLEDGE_BASE, GENERAL_FALLBACK } from '../data/twin-knowledge.js';

export class TwinAgent {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.poolIndex = 0;
    this.isProcessing = false;
    this.skipRequested = false;
  }

  getInitialChips() {
    return QUESTION_POOLS[this.poolIndex % QUESTION_POOLS.length];
  }

  rotateChips() {
    this.poolIndex++;
    return QUESTION_POOLS[this.poolIndex % QUESTION_POOLS.length];
  }

  findBestMatch(query) {
    const q = query.toLowerCase().trim();
    let bestMatch = null;
    let highestScore = 0;

    for (const entry of KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of entry.keywords) {
        if (q.includes(kw)) score += kw.length;
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    return highestScore > 0 && bestMatch ? bestMatch : GENERAL_FALLBACK;
  }

  skip() {
    this.skipRequested = true;
  }

  async ask(question) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.skipRequested = false;

    this.callbacks.onStart?.(question);

    if (!this.skipRequested) {
      this.callbacks.onTyping?.(true);
      await new Promise((r) => setTimeout(r, 450));
    }

    const match = this.findBestMatch(question);
    this.callbacks.onTalking?.(true);

    for (let i = 0; i < match.bubbles.length; i++) {
      const bubbleText = match.bubbles[i];

      if (this.skipRequested) {
        this.callbacks.onBubble?.(bubbleText, i, match.bubbles.length, true);
        continue;
      }

      this.callbacks.onBubble?.(bubbleText, i, match.bubbles.length, false);

      if (i < match.bubbles.length - 1 && !this.skipRequested) {
        const pauseTime = Math.min(700, Math.max(350, bubbleText.length * 9));
        await new Promise((r) => setTimeout(r, pauseTime));
      }
    }

    this.callbacks.onTalking?.(false);
    this.callbacks.onTyping?.(false);
    this.isProcessing = false;
    this.callbacks.onDone?.(match.followups || GENERAL_FALLBACK.followups);
  }
}
