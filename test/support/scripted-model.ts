import type { AIModel, ChatMessage } from "../../src/server/ai/model.js";

/**
 * Fake AI model for tests: replies with a fixed script, one reply per call,
 * and records every conversation it was sent.
 */
export class ScriptedModel implements AIModel {
  readonly calls: ChatMessage[][] = [];
  readonly #replies: string[];

  constructor(replies: string[]) {
    this.#replies = [...replies];
  }

  async *streamText(messages: ChatMessage[]): AsyncIterable<string> {
    this.calls.push(messages);
    const reply = this.#replies.shift();
    if (reply === undefined) {
      throw new Error(`ScriptedModel has no reply left for call #${this.calls.length}.`);
    }
    // Stream word by word, like a real provider sends chunks.
    for (const chunk of reply.split(/(?<=\s)/)) yield chunk;
  }
}
