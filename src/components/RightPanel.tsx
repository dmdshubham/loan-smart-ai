import React, { useState, useEffect } from 'react'
import { ApplicantData, Step } from './type';
import { socketService, ConversationVariable } from '@/service/socket';

interface RightPanelProps {
  conversationId?: string;
}

const RightPanel: React.FC<RightPanelProps> = ({ conversationId }) => {
  const [conversationVariables, setConversationVariables] = useState<ConversationVariable[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Set up socket callbacks
    socketService.setCallbacks({
      onVariablesUpdate: (variables) => {
        console.log('Variables updated:', variables);
        setConversationVariables(variables);
      },
      onError: (error) => {
        console.error('Socket error:', error);
      },
      onConnect: () => {
        console.log('Socket connected');
      },
      onDisconnect: () => {
        console.log('Socket disconnected');
      }
    });

    // Join conversation when conversationId is available
    if (conversationId) {
      socketService.joinConversation(conversationId);
    }

    return () => {
      if (conversationId) {
        socketService.leaveConversation();
      }
    };
  }, [conversationId]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  const formatVariableName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getStatusIcon = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      );
    }
    return (
      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  return (
    <div> <div className="w-96 bg-white shadow-lg border-l border-gray-200 h-screen overflow-scroll ">
    <div className="p-6">
      {/* Applicant Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-black text-gray-900">Applicant Details</h2>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>


      {/* Dynamic Sections based on conversation variables */}
      <div className="space-y-4">
        {/* Dynamic sections based on conversation variables */}
        {conversationVariables.map((variable) => (
          <div key={variable.variable_name} className="border-b-1 border-b-[#0000001A] m-0 p-0  ">
            <button 
              onClick={() => toggleSection(variable.variable_name)}
              className="w-full px-2 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-gray-900">{formatVariableName(variable.variable_name)}</span>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.has(variable.variable_name) ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has(variable.variable_name) && (
              <div className="px-2 pb-5 space-y-4">
                {Object.entries(variable.variable_value).map(([key, value]) => (
                  <div key={key}>
                    {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                      // Render nested object
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-800 mb-2">{formatVariableName(key)}</div>
                        <div className="pl-4 space-y-2 border-l-2 border-gray-200">
                          {Object.entries(value).map(([nestedKey, nestedValue]) => (
                            <div key={nestedKey} className="flex items-center justify-between py-1">
                              <span className="text-sm font-medium text-gray-600">{formatVariableName(nestedKey)}</span>
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-semibold text-gray-900">{formatValue(nestedValue)}</span>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(nestedValue)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Render simple key-value pair
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-600">{formatVariableName(key)}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-semibold text-gray-900">{formatValue(value)}</span>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(value)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Show message when no variables are available */}
        {conversationVariables.length === 0 && (
          <div className="border border-gray-200 rounded-lg shadow-sm p-6 text-center">
            <div className="text-gray-500 text-sm">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No conversation data available yet.</p>
              <p className="text-xs mt-1">Data will appear here as the conversation progresses.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div></div>
  )
}

export default RightPanel   