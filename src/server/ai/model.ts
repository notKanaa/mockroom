/**
 * The AI model port: the only way the rest of Mockroom talks to an AI.
 *
 * Real providers (OpenAI, Anthropic, Gemini, Ollama) implement it in production;
 * tests inject a scripted fake so they stay deterministic, fast and free.
 */
export interface AIModel {
  /** Streams the model's reply to a conversation, chunk by chunk. */
  streamText(messages: ChatMessage[]): AsyncIterable<string>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Waits for a streamed reply to finish and returns it as one string. */
export async function collectText(stream: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}
