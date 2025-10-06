import { useEffect, useRef, useState } from 'react';
import { startLoanAgentStream } from '@/service/api';
import { readSseStream } from '@/common/utils';

export interface ChatMessage {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface UseAgentChatReturn {
  actualThreadId: string | undefined;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isThinking: boolean;
  isStreaming: boolean;
  currentStreamingMessage: string;
  sendMessage: (text: string, fileUrls?: string[]) => Promise<void>;
}

export function useAgentChat(initialThreadId: string | undefined): UseAgentChatReturn {
  const [actualThreadId, setActualThreadId] = useState<string | undefined>(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');

  // Refs to avoid stale closures in async stream handlers
  const isStreamingRef = useRef<boolean>(false);
  const streamingMessageRef = useRef<string>('');
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { streamingMessageRef.current = currentStreamingMessage; }, [currentStreamingMessage]);

  const finalizeStreamingMessage = () => {
    const text = (streamingMessageRef.current || '').trim();
    if (text) {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        text,
        isBot: true,
        timestamp: new Date()
      }]);
    }
    setCurrentStreamingMessage('');
    setIsStreaming(false);
    streamingMessageRef.current = '';
    isStreamingRef.current = false;
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
  };

  const appendStreamingToken = (token: string) => {
    const piece = typeof token === 'string' ? token : String(token ?? '');

    setCurrentStreamingMessage(prev => {
      const combined = (prev ?? '') + piece;
      streamingMessageRef.current = combined; 
      return combined;
    });
    if (!isStreamingRef.current) {
      setIsStreaming(true);
      isStreamingRef.current = true;
    }

    // No debounce: finalize only when stream_end/done arrives
  };

  const handleSseEvent = (data: any) => {
    if (data?.type === 'thread_id' && data?.thread_id) {
      // Only update threadId if we don't have one from URL (coming from home page)
      if (!initialThreadId) {
        setActualThreadId(data.thread_id);
        try {
          window.history.replaceState(null, '', `/agent-chat/${data.thread_id}`);
        } catch {/* noop */}
      }
      return;
    }
    if (data?.type === 'token') {
      const tokenContent = data.content ?? data.token ?? '';
      if (tokenContent !== undefined && tokenContent !== null) {
        if (isThinking) setIsThinking(false);
        // Do not append token if we already received the final message
        if (!isStreamingRef.current && streamingMessageRef.current === '') {
          // Start a fresh streaming session
          appendStreamingToken(tokenContent);
        } else {
          appendStreamingToken(tokenContent);
        }
      }
      return;
    }
    if (data?.type === 'message' || data?.content || data?.text) {
      const messageText = data.content ?? data.text ?? data.message ?? '';
      if (messageText) {
        // Prefer the full message from server over partial token accumulation.
        // Do not finalize the token stream as a separate message to avoid duplication.
        if (isStreamingRef.current) {
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          streamingMessageRef.current = '';
          isStreamingRef.current = false;
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
          }
        }
        if (isThinking) setIsThinking(false);
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          text: messageText,
          isBot: true,
          timestamp: new Date()
        }]);
      }
      return;
    }
    if (data?.type === 'stream_end' || data?.type === 'done') {
      if (isStreamingRef.current) finalizeStreamingMessage();
      setIsThinking(false);
      return;
    }
  };
  // Initialize connection once with an empty message to bootstrap the thread
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      console.log('Already initialized, skipping');
      return;
    }

    const initialize = async () => {
      try {
        hasInitializedRef.current = true;
        setIsLoading(true);
        setIsThinking(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Use initialThreadId if available (from URL on page load/reload)
        // Otherwise send empty string to let API generate a new thread
        const response = await startLoanAgentStream({
          threadId: initialThreadId || "",
          input: { messages: [{ role: 'user', content: [] }] },
          signal: abortController.signal
        });

        setIsLoading(false);

        await readSseStream(
          response,
          (data) => handleSseEvent(data),
          () => { if (isStreamingRef.current) finalizeStreamingMessage(); setIsThinking(false); },
          (err) => { setError('Connection interrupted. Please try again.'); setIsThinking(false); }
        );
      } catch (err) {
        setError('Failed to connect to the agent. Please try again.');
        setIsLoading(false);
        setMessages([{ id: 1, text: "Hi! I'm your loan agent. I'll help you through the application process. Let's start with some basic information.", isBot: true, timestamp: new Date() }]);
      }
    };

    initialize();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (text: string, fileUrls: string[] = []) => {
    const trimmed = (text || '').trim();
    if (!trimmed && fileUrls.length === 0) return;

    if (isStreamingRef.current) finalizeStreamingMessage();
    setIsStreaming(false);
    setCurrentStreamingMessage('');
    if (streamingTimeoutRef.current) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null; }
    setIsThinking(true);

    // Add user message
    const messageText = trimmed || (fileUrls.length > 0 ? `📎 Attached ${fileUrls.length} file(s)` : '');
    setMessages(prev => [...prev, { id: Date.now(), text: messageText, isBot: false, timestamp: new Date() }]);

    try {
      const response = await startLoanAgentStream({
        threadId: actualThreadId || "",
        input: {
          messages: [{
            role: 'user',
            content: trimmed ? [{ type: 'text', text: trimmed }] : []
          }]
        }
      });

      await readSseStream(
        response,
        (data) => handleSseEvent(data),
        () => { if (isStreamingRef.current) finalizeStreamingMessage(); setIsThinking(false); },
        () => { setIsThinking(false); }
      );
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), text: "Sorry, I couldn't process your message. Please try again.", isBot: true, timestamp: new Date() }]);
      setIsThinking(false);
    }
  };

  return {
    actualThreadId,
    messages,
    isLoading,
    error,
    isThinking,
    isStreaming,
    currentStreamingMessage,
    sendMessage,
  };
}

