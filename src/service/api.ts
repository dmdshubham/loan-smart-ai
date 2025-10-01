export interface AgentMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: Array<{ type: 'text'; text: string }> | [];
}

export interface StreamRequest {
  threadId: string;
  input: { messages: AgentMessageInput[] };
  signal?: AbortSignal;
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  return envUrl;
}

/**
 * Starts the loan agent streaming request and returns the fetch Response.
 * The caller is responsible for reading the Response body as an SSE stream.
 */
export async function startLoanAgentStream({ threadId, input, signal }: StreamRequest): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/loan-agent/stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input,
      thread_id: threadId
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}


