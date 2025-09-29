import { io, Socket } from 'socket.io-client';

export interface ConversationVariable {
  conversation_id: string;
  variable_name: string;
  variable_value: Record<string, any>;
  created_at: {
    $date: string;
  };
  updated_at: {
    $date: string;
  };
}

export interface SocketResponse {
  conversation_id: string;
  variable_name: string;
  variable_value: Record<string, any>;
  created_at: string | { $date: string };
  updated_at: string | { $date: string };
}

export interface SocketEventResponse {
  conversation_id: string;
  data: SocketResponse[];
  operation: string;
  timestamp: string;
}

export interface SocketServiceCallbacks {
  onVariablesUpdate?: (variables: ConversationVariable[]) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class SocketService {
  private socket: Socket | null = null;
  private conversationId: string | null = null;
  private callbacks: SocketServiceCallbacks = {};
  private variables: Map<string, ConversationVariable> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    this.socket = io('http://144.24.127.147:3000', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.callbacks.onConnect?.();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.callbacks.onDisconnect?.();
    });

    this.socket.on('session_variables_updated', (response: SocketEventResponse) => {
      console.log('Received session variables update:', response);
      this.handleVariablesUpdate(response);
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.callbacks.onError?.(error);
    });
  }

  private handleVariablesUpdate(response: SocketEventResponse) {
    // Check if data is an array and handle empty arrays
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('Invalid data structure received:', response);
      return;
    }

    // Update the variables map
    response.data.forEach(item => {
      const variable: ConversationVariable = {
        conversation_id: item.conversation_id,
        variable_name: item.variable_name,
        variable_value: item.variable_value,
        created_at: typeof item.created_at === 'string' 
          ? { $date: item.created_at } 
          : item.created_at,
        updated_at: typeof item.updated_at === 'string' 
          ? { $date: item.updated_at } 
          : item.updated_at
      };
      
      this.variables.set(item.variable_name, variable);
    });

    // Notify callbacks with all current variables
    const allVariables = Array.from(this.variables.values());
    this.callbacks.onVariablesUpdate?.(allVariables);
  }

  joinConversation(conversationId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.conversationId = conversationId;
    this.socket.emit('join_conversation', { conversation_id: conversationId });
    console.log(`Joined conversation: ${conversationId}`);
  }

  leaveConversation() {
    if (this.socket && this.conversationId) {
      this.socket.emit('leave_conversation', { conversation_id: this.conversationId });
      this.conversationId = null;
      this.variables.clear();
    }
  }

  setCallbacks(callbacks: SocketServiceCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getVariables(): ConversationVariable[] {
    return Array.from(this.variables.values());
  }

  getVariable(variableName: string): ConversationVariable | undefined {
    return this.variables.get(variableName);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.conversationId = null;
      this.variables.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketService = new SocketService();