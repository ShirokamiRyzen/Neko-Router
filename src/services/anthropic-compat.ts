import { parseUpstreamModels } from "./router";
import type { UpstreamKey } from "../db/schema";

/**
 * Translation layer between the Anthropic Messages API (used by Claude Code)
 * and OpenAI-compatible Chat Completions upstreams.
 *
 * This lets `/v1/messages` keep working even when no ANTHROPIC provider is
 * configured: the request is converted to Chat Completions, routed through the
 * normal OpenAI pool, and the response (including SSE streams) is converted
 * back into Anthropic format.
 */

function asBlocks(content: any): any[] {
 if (typeof content === "string") return [{ type: "text", text: content }];
 if (Array.isArray(content)) return content;
 if (content == null) return [];
 return [{ type: "text", text: String(content) }];
}

function blockTextToPlain(content: any): string {
 if (typeof content === "string") return content;
 if (Array.isArray(content)) {
  return content
   .map((block: any) => {
    if (typeof block === "string") return block;
    if (typeof block?.text === "string") return block.text;
    if (typeof block?.content === "string") return block.content;
    return "";
   })
   .filter((part) => part.length > 0)
   .join("\n");
 }
 if (content == null) return "";
 return typeof content === "object" ? JSON.stringify(content) : String(content);
}

function toolResultText(content: any): string {
 if (typeof content === "string") return content;
 if (Array.isArray(content)) {
  return content
   .map((block: any) => {
    if (typeof block === "string") return block;
    if (typeof block?.text === "string") return block.text;
    return JSON.stringify(block);
   })
   .join("\n");
 }
 if (content == null) return "";
 return typeof content === "object" ? JSON.stringify(content) : String(content);
}

function imageBlockToOpenAI(block: any): any | null {
 const source = block?.source;
 if (!source) return null;
 if (source.type === "base64" && typeof source.data === "string") {
  const mediaType = source.media_type || "image/png";
  return {
   type: "image_url",
   image_url: { url: `data:${mediaType};base64,${source.data}` },
  };
 }
 if (source.type === "url" && typeof source.url === "string") {
  return { type: "image_url", image_url: { url: source.url } };
 }
 return null;
}

function convertTools(tools: any): any[] | undefined {
 if (!Array.isArray(tools) || tools.length === 0) return undefined;
 const converted = tools
  .map((tool: any) => {
   if (!tool || typeof tool.name !== "string" || tool.name.length === 0) {
    return null;
   }
   return {
    type: "function",
    function: {
     name: tool.name,
     description: tool.description || "",
     parameters:
      tool.input_schema || { type: "object", properties: {} },
    },
   };
  })
  .filter(Boolean);
 return converted.length > 0 ? converted : undefined;
}

function convertToolChoice(choice: any): any {
 if (!choice) return undefined;
 if (typeof choice === "string") return choice;
 switch (choice.type) {
  case "auto":
   return "auto";
  case "any":
   return "required";
  case "none":
   return "none";
  case "tool":
   return choice.name
    ? { type: "function", function: { name: choice.name } }
    : "auto";
  default:
   return "auto";
 }
}

/**
 * Convert an Anthropic Messages request into an OpenAI Chat Completions body.
 */
export function anthropicToOpenAI(body: any): any {
 const source = body && typeof body === "object" ? body : {};
 const converted: any = { messages: [] };

 if (typeof source.model === "string" && source.model.length > 0) {
  converted.model = source.model;
 }

 const systemText = blockTextToPlain(source.system);
 if (systemText.trim().length > 0) {
  converted.messages.push({ role: "system", content: systemText });
 }

 for (const message of Array.isArray(source.messages) ? source.messages : []) {
  if (!message) continue;

  if (message.role === "assistant") {
   const textParts: string[] = [];
   const toolCalls: any[] = [];

   for (const block of asBlocks(message.content)) {
    if (!block) continue;
    if (block.type === "tool_use") {
     toolCalls.push({
      id: block.id || `call_${crypto.randomUUID().replace(/-/g, "")}`,
      type: "function",
      function: {
       name: block.name || "",
       arguments: JSON.stringify(block.input ?? {}),
      },
     });
    } else if (typeof block.text === "string") {
     textParts.push(block.text);
    }
   }

   const assistant: any = { role: "assistant" };
   const text = textParts.join("");
   assistant.content = text.length > 0 ? text : null;
   if (toolCalls.length > 0) assistant.tool_calls = toolCalls;
   if (assistant.content === null && toolCalls.length === 0) {
    assistant.content = "";
   }
   converted.messages.push(assistant);
   continue;
  }

  if (message.role === "user") {
   const toolMessages: any[] = [];
   const textParts: string[] = [];
   const userParts: any[] = [];

   for (const block of asBlocks(message.content)) {
    if (!block) continue;
    if (block.type === "tool_result") {
     toolMessages.push({
      role: "tool",
      tool_call_id: block.tool_use_id || "call_default",
      content: toolResultText(block.content),
     });
    } else if (block.type === "image") {
     const imagePart = imageBlockToOpenAI(block);
     if (imagePart) userParts.push(imagePart);
    } else if (typeof block.text === "string") {
     textParts.push(block.text);
    }
   }

   if (toolMessages.length > 0) converted.messages.push(...toolMessages);

   const text = textParts.join("");
   if (userParts.length > 0) {
    const parts: any[] = [];
    if (text.length > 0) parts.push({ type: "text", text });
    parts.push(...userParts);
    if (parts.length > 0) {
     converted.messages.push({ role: "user", content: parts });
    }
   } else if (text.length > 0) {
    converted.messages.push({ role: "user", content: text });
   }
   continue;
  }

  // Anthropic has no direct "system"/"tool" role inside messages, but accept
  // them defensively when a proxy forwards such payloads.
  if (message.role === "system" || message.role === "tool") {
   converted.messages.push({
    role: message.role,
    content: blockTextToPlain(message.content),
   });
  }
 }

 const tools = convertTools(source.tools);
 if (tools) converted.tools = tools;

 const toolChoice = convertToolChoice(source.tool_choice);
 if (toolChoice !== undefined) converted.tool_choice = toolChoice;

 if (typeof source.max_tokens === "number") converted.max_tokens = source.max_tokens;
 if (typeof source.temperature === "number") converted.temperature = source.temperature;
 if (typeof source.top_p === "number") converted.top_p = source.top_p;
 if (Array.isArray(source.stop_sequences) && source.stop_sequences.length > 0) {
  converted.stop = source.stop_sequences;
 }
 if (typeof source.stream === "boolean") converted.stream = source.stream;
 if (converted.stream) {
  converted.stream_options = { include_usage: true };
 }

 return converted;
}

function mapStopReason(reason: string | null | undefined, hasToolUse: boolean): string {
 switch (reason) {
  case "length":
   return "max_tokens";
  case "tool_calls":
  case "function_call":
   return "tool_use";
  case "content_filter":
   return "end_turn";
  case "stop":
   return hasToolUse ? "tool_use" : "end_turn";
  default:
   return hasToolUse ? "tool_use" : "end_turn";
 }
}

function parseToolInput(raw: any): any {
 if (raw == null || raw === "") return {};
 if (typeof raw === "object") return raw;
 if (typeof raw !== "string") return {};
 try {
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === "object" ? parsed : {};
 } catch (e) {
  return { raw };
 }
}

function usageFromOpenAI(usage: any): any {
 const inputTokens = Number(usage?.prompt_tokens) || 0;
 const outputTokens = Number(usage?.completion_tokens) || 0;
 const cachedTokens = Number(usage?.prompt_tokens_details?.cached_tokens) || 0;
 const result: any = {
  input_tokens: inputTokens,
  output_tokens: outputTokens,
 };
 if (cachedTokens > 0) result.cache_read_input_tokens = cachedTokens;
 return result;
}

/**
 * Convert a non-streaming OpenAI Chat Completions response to Anthropic format.
 */
export function openAIToAnthropic(data: any, fallbackModel: string): any {
 const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
 const message = choice?.message || {};
 const content: any[] = [];

 if (typeof message.content === "string" && message.content.length > 0) {
  content.push({ type: "text", text: message.content });
 } else if (Array.isArray(message.content)) {
  const text = message.content
   .map((part: any) => {
    if (typeof part === "string") return part;
    if (typeof part?.text === "string") return part.text;
    return "";
   })
   .join("");
  if (text.length > 0) content.push({ type: "text", text });
 }

 const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
 for (const call of toolCalls) {
  content.push({
   type: "tool_use",
   id: call?.id || `toolu_${crypto.randomUUID().replace(/-/g, "")}`,
   name: call?.function?.name || "",
   input: parseToolInput(call?.function?.arguments),
  });
 }

 const hasToolUse = content.some((block) => block.type === "tool_use");

 return {
  id: data?.id ? `msg_${String(data.id).replace(/^chatcmpl-/, "")}` : `msg_${crypto.randomUUID().replace(/-/g, "")}`,
  type: "message",
  role: "assistant",
  model: data?.model || fallbackModel,
  content,
  stop_reason: mapStopReason(choice?.finish_reason, hasToolUse),
  stop_sequence: null,
  usage: usageFromOpenAI(data?.usage),
 };
}

/**
 * Serialize a completed Anthropic message into the equivalent SSE event
 * sequence. Used when the client asked for a stream but the upstream answered
 * with a regular JSON payload.
 */
export function anthropicMessageToSSE(message: any): string {
 const event = (type: string, data: any) =>
  `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;

 const usage = message?.usage || {};
 const parts: string[] = [];

 parts.push(
  event("message_start", {
   type: "message_start",
   message: {
    ...message,
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: {
     input_tokens: usage.input_tokens || 0,
     output_tokens: 0,
    },
   },
  })
 );

 const content = Array.isArray(message?.content) ? message.content : [];
 content.forEach((block: any, index: number) => {
  if (block?.type === "text") {
   parts.push(
    event("content_block_start", {
     type: "content_block_start",
     index,
     content_block: { type: "text", text: "" },
    })
   );
   if (typeof block.text === "string" && block.text.length > 0) {
    parts.push(
     event("content_block_delta", {
      type: "content_block_delta",
      index,
      delta: { type: "text_delta", text: block.text },
     })
    );
   }
   parts.push(
    event("content_block_stop", { type: "content_block_stop", index })
   );
  } else if (block?.type === "tool_use") {
   parts.push(
    event("content_block_start", {
     type: "content_block_start",
     index,
     content_block: {
      type: "tool_use",
      id: block.id,
      name: block.name,
      input: {},
     },
    })
   );
   parts.push(
    event("content_block_delta", {
     type: "content_block_delta",
     index,
     delta: {
      type: "input_json_delta",
      partial_json: JSON.stringify(block.input ?? {}),
     },
    })
   );
   parts.push(
    event("content_block_stop", { type: "content_block_stop", index })
   );
  }
 });

 const deltaUsage: any = { output_tokens: usage.output_tokens || 0 };
 if (usage.input_tokens) deltaUsage.input_tokens = usage.input_tokens;
 if (usage.cache_read_input_tokens) {
  deltaUsage.cache_read_input_tokens = usage.cache_read_input_tokens;
 }

 parts.push(
  event("message_delta", {
   type: "message_delta",
   delta: {
    stop_reason: message?.stop_reason || "end_turn",
    stop_sequence: null,
   },
   usage: deltaUsage,
  })
 );
 parts.push(event("message_stop", { type: "message_stop" }));

 return parts.join("");
}

/**
 * Estimate input tokens for the initial `message_start` event. OpenAI only
 * reports real usage at the end of a stream, but Anthropic clients expect
 * `input_tokens` when the message starts.
 */
export function estimateInputTokens(body: any): number {
 try {
  const serialized = JSON.stringify({
   system: body?.system,
   messages: body?.messages,
   tools: body?.tools,
  });
  return Math.max(0, Math.ceil(serialized.length / 4));
 } catch (e) {
  return 0;
 }
}

/**
 * Convert an OpenAI Chat Completions SSE stream into an Anthropic Messages
 * SSE stream (`message_start`, `content_block_*`, `message_delta`,
 * `message_stop`), including streaming tool calls.
 */
export function createOpenAIToAnthropicStream(
 fallbackModel: string,
 estimatedInputTokens = 0
): TransformStream<Uint8Array, Uint8Array> {
 const encoder = new TextEncoder();
 const decoder = new TextDecoder();

 let buffer = "";
 let started = false;
 let errored = false;
 let finalized = false;
 let textBlockIndex: number | null = null;
 let nextBlockIndex = 0;
 let hasToolUse = false;
 let stopReason: string | null = null;
 let outputChars = 0;
 let resolvedModel = fallbackModel;
 const toolBlocks = new Map<number, { index: number; id: string; name: string }>();
 let usage = { input: 0, output: 0, cached: 0 };

 const messageId = `msg_${crypto.randomUUID().replace(/-/g, "")}`;

 const emit = (
  controller: TransformStreamDefaultController<Uint8Array>,
  event: string,
  data: any
 ) => {
  controller.enqueue(
   encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
 };

 const ensureStarted = (
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (started) return;
  started = true;
  emit(controller, "message_start", {
   type: "message_start",
   message: {
    id: messageId,
    type: "message",
    role: "assistant",
    model: resolvedModel,
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: {
     input_tokens: usage.input || estimatedInputTokens,
     output_tokens: 0,
    },
   },
  });
 };

 const closeTextBlock = (
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (textBlockIndex === null) return;
  emit(controller, "content_block_stop", {
   type: "content_block_stop",
   index: textBlockIndex,
  });
  textBlockIndex = null;
 };

 const startTextBlock = (
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (textBlockIndex !== null) return;
  textBlockIndex = nextBlockIndex++;
  emit(controller, "content_block_start", {
   type: "content_block_start",
   index: textBlockIndex,
   content_block: { type: "text", text: "" },
  });
 };

 const handleToolCalls = (
  calls: any[],
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  for (const call of calls) {
   if (!call) continue;
   const key = typeof call.index === "number" ? call.index : 0;
   let block = toolBlocks.get(key);

   if (!block) {
    if (!call.function?.name && !call.id) continue;
    closeTextBlock(controller);
    block = {
     index: nextBlockIndex++,
     id: call.id || `toolu_${crypto.randomUUID().replace(/-/g, "")}`,
     name: call.function?.name || "",
    };
    toolBlocks.set(key, block);
    hasToolUse = true;
    emit(controller, "content_block_start", {
     type: "content_block_start",
     index: block.index,
     content_block: {
      type: "tool_use",
      id: block.id,
      name: block.name,
      input: {},
     },
    });
   }

   const argsDelta = call.function?.arguments;
   if (typeof argsDelta === "string" && argsDelta.length > 0) {
    outputChars += argsDelta.length;
    emit(controller, "content_block_delta", {
     type: "content_block_delta",
     index: block.index,
     delta: { type: "input_json_delta", partial_json: argsDelta },
    });
   }
  }
 };

 const processChunk = (
  dataStr: string,
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (!dataStr || dataStr === "[DONE]") return;

  let parsed: any;
  try {
   parsed = JSON.parse(dataStr);
  } catch (e) {
   return;
  }

  if (parsed?.error) {
   if (!errored) {
    errored = true;
    emit(controller, "error", {
     type: "error",
     error: {
      type: "api_error",
      message:
       parsed.error?.message ||
       (typeof parsed.error === "string" ? parsed.error : "Upstream error"),
     },
    });
   }
   return;
  }

  if (typeof parsed?.model === "string" && parsed.model.length > 0) {
   resolvedModel = parsed.model;
  }

  ensureStarted(controller);

  if (parsed?.usage) {
   if (typeof parsed.usage.prompt_tokens === "number") {
    usage.input = parsed.usage.prompt_tokens;
   }
   if (typeof parsed.usage.completion_tokens === "number") {
    usage.output = parsed.usage.completion_tokens;
   }
   const cached = parsed.usage.prompt_tokens_details?.cached_tokens;
   if (typeof cached === "number") usage.cached = cached;
  }

  const choice = Array.isArray(parsed?.choices) ? parsed.choices[0] : null;
  if (!choice) return;

  const delta = choice.delta || choice.message || {};

  if (typeof delta.content === "string" && delta.content.length > 0) {
   outputChars += delta.content.length;
   startTextBlock(controller);
   emit(controller, "content_block_delta", {
    type: "content_block_delta",
    index: textBlockIndex,
    delta: { type: "text_delta", text: delta.content },
   });
  }

  if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
   handleToolCalls(delta.tool_calls, controller);
  } else if (delta.function_call) {
   handleToolCalls([{ index: 0, function: delta.function_call }], controller);
  }

  if (choice.finish_reason) {
   stopReason = String(choice.finish_reason);
  }
 };

 return new TransformStream<Uint8Array, Uint8Array>({
  transform(chunk, controller) {
   if (errored) return;
   buffer += decoder.decode(chunk, { stream: true });

   const lines = buffer.split("\n");
   buffer = lines.pop() || "";

   for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) continue;
    if (trimmed.startsWith("event:")) continue;
    if (!trimmed.startsWith("data:")) continue;
    processChunk(trimmed.slice(5).trim(), controller);
   }
  },
  flush(controller) {
   if (finalized) return;
   finalized = true;
   if (errored) return;

   if (buffer.trim().length > 0) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
     processChunk(trimmed.slice(5).trim(), controller);
    }
   }

   ensureStarted(controller);
   closeTextBlock(controller);

   for (const block of toolBlocks.values()) {
    emit(controller, "content_block_stop", {
     type: "content_block_stop",
     index: block.index,
    });
   }

   const outputTokens =
    usage.output > 0 ? usage.output : Math.ceil(outputChars / 4);
   const inputTokens = usage.input > 0 ? usage.input : estimatedInputTokens;

   const deltaUsage: any = { output_tokens: outputTokens };
   if (inputTokens > 0) deltaUsage.input_tokens = inputTokens;
   if (usage.cached > 0) {
    deltaUsage.cache_read_input_tokens = usage.cached;
   }

   emit(controller, "message_delta", {
    type: "message_delta",
    delta: {
     stop_reason: mapStopReason(stopReason, hasToolUse),
     stop_sequence: null,
    },
    usage: deltaUsage,
   });
   emit(controller, "message_stop", { type: "message_stop" });
  },
 });
}

/**
 * Pick a usable model from an upstream. When the requested model is not
 * available (for example Claude Code's `claude-*` ids against an
 * OpenAI-compatible provider) fall back to the provider's first enabled model.
 */
export function resolveCompatModel(
  upstream: UpstreamKey,
  requestedModel: string
): string {
  const requested = (requestedModel || "").trim();

  if (Boolean((upstream as any).followUpstream)) return requested;

  const models = parseUpstreamModels((upstream as any).models).filter(
    (model) => model.enabled
  );

  if (models.length === 0) return requested;

  const target = requested.toLowerCase();
  const cleanTarget = target.includes("/")
    ? target.split("/").slice(1).join("/")
    : target;

  if (!cleanTarget || cleanTarget === "unknown") return models[0]!.id;

  const found = models.find((model) => {
    const id = model.id.toLowerCase();
    const cleanId = id.includes("/") ? id.split("/").slice(1).join("/") : id;
    return id === target || id === cleanTarget || cleanId === cleanTarget;
  });

  return found ? found.id : models[0]!.id;
}

function openAIContentToText(content: any): string {
 if (typeof content === "string") return content;
 if (Array.isArray(content)) {
  return content
   .map((part: any) => {
    if (typeof part === "string") return part;
    if (typeof part?.text === "string") return part.text;
    return "";
   })
   .filter((part) => part.length > 0)
   .join("\n");
 }
 if (content == null) return "";
 return typeof content === "object" ? JSON.stringify(content) : String(content);
}

function openAIImagePartToAnthropic(part: any): any | null {
 const url = part?.image_url?.url || part?.image_url;
 if (typeof url !== "string" || url.length === 0) return null;

 const dataMatch = /^data:([^;]+);base64,(.*)$/s.exec(url);
 if (dataMatch) {
  return {
   type: "image",
   source: {
    type: "base64",
    media_type: dataMatch[1],
    data: dataMatch[2],
   },
  };
 }
 return { type: "image", source: { type: "url", url } };
}

function openAIContentToAnthropicBlocks(content: any): any[] {
 if (typeof content === "string") {
  return content.length > 0 ? [{ type: "text", text: content }] : [];
 }
 if (!Array.isArray(content)) {
  if (content == null) return [];
  const text = openAIContentToText(content);
  return text.length > 0 ? [{ type: "text", text }] : [];
 }

 const blocks: any[] = [];
 for (const part of content) {
  if (typeof part === "string") {
   if (part.length > 0) blocks.push({ type: "text", text: part });
   continue;
  }
  if (!part) continue;
  if (part.type === "image_url") {
   const image = openAIImagePartToAnthropic(part);
   if (image) blocks.push(image);
   continue;
  }
  if (typeof part.text === "string" && part.text.length > 0) {
   blocks.push({ type: "text", text: part.text });
  }
 }
 return blocks;
}

/**
 * Convert an OpenAI Chat Completions request into an Anthropic Messages
 * request. This is the inverse of `anthropicToOpenAI`.
 */
export function openAIToAnthropicRequest(body: any): any {
 const source = body && typeof body === "object" ? body : {};
 const result: any = { messages: [] };

 if (typeof source.model === "string" && source.model.length > 0) {
  result.model = source.model;
 }

 const systemParts: string[] = [];
 const messages = Array.isArray(source.messages) ? source.messages : [];

 for (const message of messages) {
  if (!message) continue;

  if (message.role === "system" || message.role === "developer") {
   const text = openAIContentToText(message.content);
   if (text.length > 0) systemParts.push(text);
   continue;
  }

  if (message.role === "assistant") {
   const blocks: any[] = [];
   const text = openAIContentToText(message.content);
   if (text.length > 0) blocks.push({ type: "text", text });

   for (const call of Array.isArray(message.tool_calls) ? message.tool_calls : []) {
    blocks.push({
     type: "tool_use",
     id: call?.id || `toolu_${crypto.randomUUID().replace(/-/g, "")}`,
     name: call?.function?.name || "",
     input: parseToolInput(call?.function?.arguments),
    });
   }

   if (message.function_call) {
    blocks.push({
     type: "tool_use",
     id: `toolu_${crypto.randomUUID().replace(/-/g, "")}`,
     name: message.function_call.name || "",
     input: parseToolInput(message.function_call.arguments),
    });
   }

   if (blocks.length === 0) blocks.push({ type: "text", text: "" });
   result.messages.push({ role: "assistant", content: blocks });
   continue;
  }

  if (message.role === "tool") {
   const block = {
    type: "tool_result",
    tool_use_id: message.tool_call_id || message.name || "call_default",
    content: openAIContentToText(message.content),
   };
   const previous = result.messages[result.messages.length - 1];
   if (
    previous &&
    previous.role === "user" &&
    Array.isArray(previous.content) &&
    previous.content.some((candidate: any) => candidate?.type === "tool_result")
   ) {
    previous.content.push(block);
   } else {
    result.messages.push({ role: "user", content: [block] });
   }
   continue;
  }

  const blocks = openAIContentToAnthropicBlocks(message.content);
  result.messages.push({
   role: "user",
   content: blocks.length > 0 ? blocks : [{ type: "text", text: "" }],
  });
 }

 if (systemParts.length > 0) result.system = systemParts.join("\n\n");

 if (Array.isArray(source.tools) && source.tools.length > 0) {
  const tools = source.tools
   .map((tool: any) => {
    if (!tool || tool.type !== "function" || !tool.function?.name) return null;
    return {
     name: tool.function.name,
     description: tool.function.description || "",
     input_schema:
      tool.function.parameters || { type: "object", properties: {} },
    };
   })
   .filter(Boolean);
  if (tools.length > 0) result.tools = tools;
 }

 const toolChoice = source.tool_choice;
 if (toolChoice !== undefined && toolChoice !== null) {
  if (toolChoice === "auto") {
   result.tool_choice = { type: "auto" };
  } else if (toolChoice === "required") {
   result.tool_choice = { type: "any" };
    } else if (toolChoice === "none") {
      delete result.tools;
    } else if (
   typeof toolChoice === "object" &&
   toolChoice.type === "function" &&
   toolChoice.function?.name
  ) {
   result.tool_choice = { type: "tool", name: toolChoice.function.name };
  }

  if (
   source.parallel_tool_calls === false &&
   result.tool_choice &&
   typeof result.tool_choice === "object"
  ) {
   result.tool_choice.disable_parallel_tool_use = true;
  }
 }

 const maxTokens = source.max_completion_tokens ?? source.max_tokens;
 result.max_tokens = typeof maxTokens === "number" ? maxTokens : 4096;
 if (typeof source.temperature === "number") {
  result.temperature = source.temperature;
 }
 if (typeof source.top_p === "number") result.top_p = source.top_p;
 if (typeof source.stop === "string") {
  result.stop_sequences = [source.stop];
 } else if (Array.isArray(source.stop)) {
  result.stop_sequences = source.stop;
 }
 if (typeof source.stream === "boolean") result.stream = source.stream;
 if (typeof source.user === "string" && source.user.length > 0) {
  result.metadata = { user_id: source.user };
 }

 return result;
}

function mapAnthropicStopReason(reason: any, hasToolUse: boolean): string {
 if (hasToolUse && reason !== "max_tokens") return "tool_calls";
 switch (reason) {
  case "max_tokens":
   return "length";
  case "tool_use":
   return "tool_calls";
  case "refusal":
  case "content_filter":
   return "content_filter";
  case "end_turn":
  case "stop_sequence":
  case "pause_turn":
  default:
   return "stop";
 }
}

function buildOpenAIUsage(usage: any): any {
 const promptTokens = Number(usage?.input_tokens) || 0;
 const completionTokens = Number(usage?.output_tokens) || 0;
 const cachedTokens = Number(usage?.cache_read_input_tokens) || 0;

 const payload: any = {
  prompt_tokens: promptTokens,
  completion_tokens: completionTokens,
  total_tokens: promptTokens + completionTokens,
 };
 if (cachedTokens > 0) {
  payload.prompt_tokens_details = { cached_tokens: cachedTokens };
 }
 return payload;
}

/**
 * Convert a non-streaming Anthropic Messages response to OpenAI Chat
 * Completions format.
 */
export function anthropicToOpenAIResponse(
 data: any,
 fallbackModel: string
): any {
 const content = Array.isArray(data?.content) ? data.content : [];
 const textParts: string[] = [];
 const toolCalls: any[] = [];

 for (const block of content) {
  if (!block) continue;
  if (block.type === "text" && typeof block.text === "string") {
   textParts.push(block.text);
  } else if (block.type === "tool_use") {
   toolCalls.push({
    id: block.id || `call_${crypto.randomUUID().replace(/-/g, "")}`,
    type: "function",
    function: {
     name: block.name || "",
     arguments: JSON.stringify(block.input ?? {}),
    },
   });
  }
 }

 const text = textParts.join("");
 const message: any = { role: "assistant" };
 message.content = text.length > 0 ? text : toolCalls.length > 0 ? null : "";
 if (toolCalls.length > 0) message.tool_calls = toolCalls;

 return {
  id: data?.id
   ? String(data.id).replace(/^msg_/, "chatcmpl-")
   : `chatcmpl-${crypto.randomUUID().replace(/-/g, "")}`,
  object: "chat.completion",
  created: Math.floor(Date.now() / 1000),
  model: data?.model || fallbackModel,
  choices: [
   {
    index: 0,
    message,
    finish_reason: mapAnthropicStopReason(
     data?.stop_reason,
     toolCalls.length > 0
    ),
    logprobs: null,
   },
  ],
  usage: buildOpenAIUsage(data?.usage),
 };
}

/**
 * Serialize a completed Anthropic message into an OpenAI Chat Completions SSE
 * stream. Used when the client asked for a stream but the upstream answered
 * with a regular JSON payload.
 */
export function anthropicMessageToOpenAISSE(message: any): string {
 const textParts: string[] = [];
 const toolCalls: any[] = [];
 for (const block of Array.isArray(message?.content) ? message.content : []) {
  if (!block) continue;
  if (block.type === "text" && typeof block.text === "string") {
   textParts.push(block.text);
  } else if (block.type === "tool_use") {
   toolCalls.push({
    id: block.id || `call_${crypto.randomUUID().replace(/-/g, "")}`,
    type: "function",
    function: {
     name: block.name || "",
     arguments: JSON.stringify(block.input ?? {}),
    },
   });
  }
 }

 const id = message?.id
  ? String(message.id).replace(/^msg_/, "chatcmpl-")
  : `chatcmpl-${crypto.randomUUID().replace(/-/g, "")}`;
 const created = Math.floor(Date.now() / 1000);
 const model = message?.model || "";
 const chunks: string[] = [];
 const push = (delta: any, finishReason: any, usage?: any) => {
  const payload: any = {
   id,
   object: "chat.completion.chunk",
   created,
   model,
   choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  if (usage) payload.usage = usage;
  chunks.push(`data: ${JSON.stringify(payload)}\n\n`);
 };

 push({ role: "assistant" }, null);
 const text = textParts.join("");
 if (text.length > 0) push({ content: text }, null);
 toolCalls.forEach((call, index) => {
  push(
   {
    tool_calls: [
     {
      index,
      id: call.id,
      type: "function",
      function: {
       name: call.function.name,
       arguments: call.function.arguments,
      },
     },
    ],
   },
   null
  );
 });
 push(
  {},
  mapAnthropicStopReason(message?.stop_reason, toolCalls.length > 0),
  buildOpenAIUsage(message?.usage)
 );
 chunks.push("data: [DONE]\n\n");

 return chunks.join("");
}

/**
 * Convert an Anthropic Messages SSE stream into an OpenAI Chat Completions
 * SSE stream, including streaming tool calls.
 */
export function createAnthropicToOpenAIStream(
 fallbackModel: string
): TransformStream<Uint8Array, Uint8Array> {
 const encoder = new TextEncoder();
 const decoder = new TextDecoder();

 let buffer = "";
 let currentEvent = "";
 let started = false;
 let finalized = false;
 let model = fallbackModel;
 let messageId = `chatcmpl-${crypto.randomUUID().replace(/-/g, "")}`;
 const created = Math.floor(Date.now() / 1000);
 let stopReason: any = null;
 let usage: any = {};
 let nextToolIndex = 0;
 const toolBlocks = new Map<
  number,
  { toolIndex: number; id: string; name: string }
 >();

 const emitPayload = (
  controller: TransformStreamDefaultController<Uint8Array>,
  payload: any
 ) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
 };

 const emitChunk = (
  controller: TransformStreamDefaultController<Uint8Array>,
  delta: any,
  finishReason: any,
  includeUsage = false
 ) => {
  const payload: any = {
   id: messageId,
   object: "chat.completion.chunk",
   created,
   model,
   choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  if (includeUsage) payload.usage = buildOpenAIUsage(usage);
  emitPayload(controller, payload);
 };

 const ensureStarted = (
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (started) return;
  started = true;
  emitChunk(controller, { role: "assistant" }, null);
 };

 const finalize = (
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (finalized) return;
  finalized = true;
  ensureStarted(controller);
  const finishReason = mapAnthropicStopReason(
   stopReason,
   toolBlocks.size > 0
  );
  emitChunk(controller, {}, finishReason, true);
  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
 };

 const processEvent = (
  eventName: string,
  dataStr: string,
  controller: TransformStreamDefaultController<Uint8Array>
 ) => {
  if (!dataStr) return;

  let parsed: any;
  try {
   parsed = JSON.parse(dataStr);
  } catch (e) {
   return;
  }

  const type = eventName || parsed?.type || "";

  if (type === "error" || parsed?.type === "error") {
   if (finalized) return;
   finalized = true;
   emitPayload(controller, {
    error: {
     message:
      parsed?.error?.message ||
      (typeof parsed?.error === "string" ? parsed.error : "Upstream error"),
     type: "api_error",
    },
   });
   controller.enqueue(encoder.encode("data: [DONE]\n\n"));
   return;
  }

  if (type === "ping") return;

  if (type === "message_start") {
   const message = parsed?.message || {};
   if (message.id) {
    messageId = String(message.id).replace(/^msg_/, "chatcmpl-");
   }
   if (message.model) model = message.model;
   if (message.usage) usage = { ...usage, ...message.usage };
   ensureStarted(controller);
   return;
  }

  ensureStarted(controller);

  if (type === "content_block_start") {
   const block = parsed?.content_block || {};
   const blockIndex = typeof parsed?.index === "number" ? parsed.index : 0;
   if (block.type === "tool_use") {
    const toolIndex = nextToolIndex++;
    toolBlocks.set(blockIndex, {
     toolIndex,
     id: block.id || `call_${crypto.randomUUID().replace(/-/g, "")}`,
     name: block.name || "",
    });
    emitChunk(
     controller,
     {
      tool_calls: [
       {
        index: toolIndex,
        id: block.id || `call_${crypto.randomUUID().replace(/-/g, "")}`,
        type: "function",
        function: { name: block.name || "", arguments: "" },
       },
      ],
     },
     null
    );
   }
   return;
  }

  if (type === "content_block_delta") {
   const delta = parsed?.delta || {};
   if (delta.type === "text_delta" && typeof delta.text === "string" && delta.text.length > 0) {
    emitChunk(controller, { content: delta.text }, null);
   } else if (
    delta.type === "input_json_delta" &&
    typeof delta.partial_json === "string" &&
    delta.partial_json.length > 0
   ) {
    const blockIndex = typeof parsed?.index === "number" ? parsed.index : 0;
    const toolIndex = toolBlocks.get(blockIndex)?.toolIndex ?? 0;
    emitChunk(
     controller,
     {
      tool_calls: [
       { index: toolIndex, function: { arguments: delta.partial_json } },
      ],
     },
     null
    );
   }
   return;
  }

  if (type === "message_delta") {
   if (parsed?.delta?.stop_reason) stopReason = parsed.delta.stop_reason;
   if (parsed?.usage) usage = { ...usage, ...parsed.usage };
   return;
  }

  if (type === "message_stop") {
   finalize(controller);
  }
 };

 return new TransformStream<Uint8Array, Uint8Array>({
  transform(chunk, controller) {
   if (finalized) return;
   buffer += decoder.decode(chunk, { stream: true });

   const lines = buffer.split("\n");
   buffer = lines.pop() || "";

   for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("event:")) {
     currentEvent = trimmed.slice(6).trim();
     continue;
    }
    if (!trimmed.startsWith("data:")) continue;
    processEvent(currentEvent, trimmed.slice(5).trim(), controller);
    currentEvent = "";
   }
  },
  flush(controller) {
   if (buffer.trim().length > 0) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
     processEvent(currentEvent, trimmed.slice(5).trim(), controller);
    }
   }
   finalize(controller);
  },
 });
}
