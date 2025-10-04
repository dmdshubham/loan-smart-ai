import { io, Socket } from 'socket.io-client';

export interface FieldItem {
  lable: string;
  key: string;
  value: any;
  isVerified?: boolean;
}

export interface applicant_details {
  personalDetails?: FieldItem[];
  demographics?: FieldItem[];
  loanDetails?: FieldItem[];
  employmentDetails?: FieldItem[];
  bankDetails?: FieldItem[];
  documents?: FieldItem[];
  propertyDetails?: FieldItem[];
  otherLoanDetails?: FieldItem[];
  addressDetails?: FieldItem[];
}

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

export interface ApplicantData {
  conversation_id: string;
  applicant_details: applicant_details;
  timestamp: string;
}

export interface StageData {
  conversation_id: string;
  completed_steps: string[];
  total_steps: number;
  timestamp: string;
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
  onApplicantDataUpdate?: (data: ApplicantData) => void;
  onStageDataUpdate?: (data: StageData) => void;
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
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL, {
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

    this.socket.on('session_variables_updated', (response: any) => {
      console.log('Received session variables update:', response);
      
      // Check if this is stage data
      if (response.data?.stage_data) {
        this.handleStageDataUpdate(response);
      }
      
      // Check if this is the new applicant details structure
      if (response.data?.applicant_details) {
        this.handleApplicantDataUpdate(response);
      }
      
      // Handle old structure
      if (Array.isArray(response.data)) {
        this.handleVariablesUpdate(response as SocketEventResponse);
      }
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.callbacks.onError?.(error);
    });
  }

  private handleApplicantDataUpdate(response: any) {
    const applicantData: ApplicantData = {
      conversation_id: response.conversation_id,
      applicant_details: response.data.applicant_details,
      timestamp: response.timestamp
    };
    
    console.log('Parsed applicant data:', applicantData);
    this.callbacks.onApplicantDataUpdate?.(applicantData);
  }

  private handleStageDataUpdate(response: any) {
    const stageData: StageData = {
      conversation_id: response.conversation_id,
      completed_steps: response.data.stage_data.completed_steps || [],
      total_steps: response.data.stage_data.total_steps || 5,
      timestamp: response.timestamp
    };
    
    console.log('Parsed stage data:', stageData);
    this.callbacks.onStageDataUpdate?.(stageData);
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