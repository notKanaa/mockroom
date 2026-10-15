import type { AIModel, ChatMessage } from "../../src/server/ai/model.js";

/**
 * Fake AI model for tests: replies with a fixed script, one reply per call,
 * and records every conversation it was sent. An Error in the script makes
 * that call fail, like a provider going down.
 */
export class ScriptedModel implements AIModel {
  readonly calls: ChatMessage[][] = [];
  readonly #replies: (string | Error)[];

  constructor(replies: (string | Error)[]) {
    this.#replies = [...replies];
  }

  async *streamText(messages: ChatMessage[]): AsyncIterable<string> {
    this.calls.push(messages);
    const reply = this.#replies.shift();
    if (reply === undefined) {
      throw new Error(`ScriptedModel has no reply left for call #${this.calls.length}.`);
    }
    if (reply instanceof Error) throw reply;
    // Stream word by word, like a real provider sends chunks.
    for (const chunk of reply.split(/(?<=\s)/)) yield chunk;
  }
}
