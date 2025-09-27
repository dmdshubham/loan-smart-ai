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
  actualThreadId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isThinking: boolean;
  isStreaming: boolean;
  currentStreamingMessage: string;
  sendMessage: (text: string) => Promise<void>;
}

export function useAgentChat(initialThreadId: string): UseAgentChatReturn {
  const [actualThreadId, setActualThreadId] = useState<string>(initialThreadId);
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
    if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current);
    streamingTimeoutRef.current = setTimeout(() => {
      finalizeStreamingMessage();
    }, 3000);
  };

  const handleSseEvent = (data: any) => {
    if (data?.type === 'thread_id' && data?.thread_id) {
      setActualThreadId(data.thread_id);
      try {
        window.history.replaceState(null, '', `/agent-chat/${data.thread_id}`);
      } catch {/* noop */}
      return;
    }
    if (data?.type === 'token') {
      const tokenContent = data.content ?? data.token ?? '';
      if (tokenContent !== undefined && tokenContent !== null) {
        if (isThinking) setIsThinking(false);
        appendStreamingToken(tokenContent);
      }
      return;
    }
    if (data?.type === 'message' || data?.content || data?.text) {
      const messageText = data.content ?? data.text ?? data.message ?? '';
      if (messageText) {
        if (isStreamingRef.current) finalizeStreamingMessage();
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
    const initialize = async () => {
      try {
        setIsLoading(true);
        setIsThinking(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await startLoanAgentStream({
          threadId: actualThreadId,
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

    if (initialThreadId) initialize();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  const sendMessage = async (text: string) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    if (isStreamingRef.current) finalizeStreamingMessage();
    setIsStreaming(false);
    setCurrentStreamingMessage('');
    if (streamingTimeoutRef.current) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null; }
    setIsThinking(true);

    // Add user message
    setMessages(prev => [...prev, { id: Date.now(), text: trimmed, isBot: false, timestamp: new Date() }]);

    try {
      const response = await startLoanAgentStream({
        threadId: actualThreadId,
        input: {
          messages: [{
            role: 'user',
            content: [{ type: 'text', text: trimmed }]
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

