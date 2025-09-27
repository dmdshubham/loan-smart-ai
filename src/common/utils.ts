export type SseHandler = (data: any) => void;

export async function readSseStream(response: Response, onData: SseHandler, onDone?: () => void, onError?: (err: unknown) => void) {
  try {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onError?.(new Error('No readable stream in response'));
      return;
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6);
          if (content.trim() === '[DONE]') {
            onDone?.();
            continue;
          }
          try {
            const data = JSON.parse(content);
            onData(data);
          } catch {
            // ignore non-JSON lines
          }
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}


