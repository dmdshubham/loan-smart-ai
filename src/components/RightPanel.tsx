import React, { useState, useEffect } from 'react'
import { ApplicantData, Step } from './type';
import { socketService, ConversationVariable, ApplicantData as SocketApplicantData, FieldItem } from '@/service/socket';

interface RightPanelProps {
  conversationId?: string;
}

const RightPanel: React.FC<RightPanelProps> = ({ conversationId }) => {
  const [conversationVariables, setConversationVariables] = useState<ConversationVariable[]>([]);
  const [applicantData, setApplicantData] = useState<SocketApplicantData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [highlightedSections, setHighlightedSections] = useState<Set<string>>(new Set());
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [animatedFields, setAnimatedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Set up socket callbacks
    socketService.setCallbacks({
      onApplicantDataUpdate: (data) => {
        console.log('Applicant data updated:', data);
        
        // Get the section names from the new data
        const newSectionNames = Object.keys(data.applicantDetails || {});
        console.log('New section names:', newSectionNames);
        
        // Detect field value changes and new sections
        setApplicantData((prevData) => {
          if (prevData) {
            console.log('Previous data exists, checking for changes...');
            const prevSectionNames = new Set(Object.keys(prevData.applicantDetails || {}));
            console.log('Previous section names:', Array.from(prevSectionNames));
            
            const newSections = newSectionNames.filter(name => !prevSectionNames.has(name));
            console.log('New sections detected:', newSections);
            
            const updatedSections = new Set<string>();
            const updatedFields = new Set<string>();
            
            // Check for field value changes in existing sections
            newSectionNames.forEach(sectionName => {
              const currentFields = (data.applicantDetails as any)?.[sectionName] || [];
              const prevFields = (prevData.applicantDetails as any)?.[sectionName] || [];
              
              console.log(`Checking section: ${sectionName}`);
              console.log('Current fields:', currentFields);
              console.log('Previous fields:', prevFields);
              
              // Check if any field values have changed or new fields added
              const hasChanges = currentFields.some((currentField: FieldItem) => {
                const prevField = prevFields.find((prev: FieldItem) => prev.key === currentField.key);
                
                // Field is new (not in previous data)
                if (!prevField) {
                  console.log(`New field detected: ${currentField.key} with value "${currentField.value}"`);
                  const fieldId = `${sectionName}.${currentField.key}`;
                  updatedFields.add(fieldId);
                  return true;
                }
                
                // Field value has changed
                const hasChanged = prevField.value !== currentField.value;
                if (hasChanged) {
                  console.log(`Field ${currentField.key} changed from "${prevField.value}" to "${currentField.value}"`);
                  const fieldId = `${sectionName}.${currentField.key}`;
                  updatedFields.add(fieldId);
                }
                return hasChanged;
              });
              
              if (hasChanges) {
                console.log(`Section ${sectionName} has changes`);
                updatedSections.add(sectionName);
              }
            });
            
            // Auto-expand and highlight only new sections or sections with changes
            const sectionsToHighlight = [...newSections, ...updatedSections];
            console.log('Sections to highlight:', sectionsToHighlight);
            
            if (sectionsToHighlight.length > 0) {
              console.log('Expanding and highlighting sections:', sectionsToHighlight);
              setExpandedSections(prev => {
                const newSet = new Set(prev);
                sectionsToHighlight.forEach(name => newSet.add(name));
                return newSet;
              });
              
              setHighlightedSections(new Set(sectionsToHighlight));
              
              // Remove highlight after 4 seconds
              setTimeout(() => {
                setHighlightedSections(new Set());
              }, 4000);
            } else {
              console.log('No sections to highlight');
            }
            
            // Trigger field animations for updated fields
            if (updatedFields.size > 0) {
              console.log('Animating updated fields:', Array.from(updatedFields));
              setAnimatedFields(new Set(updatedFields));
              
              // Remove field animations after 2 seconds
              setTimeout(() => {
                setAnimatedFields(new Set());
              }, 2000);
            }
          } else {
            // First time receiving data - don't auto-expand any sections
            console.log('First time receiving applicant data - no auto-expansion');
            setIsFirstLoad(false);
          }
          
          return data;
        });
      },
      onVariablesUpdate: (variables) => {
        console.log('Variables updated:', variables);
        
        // Detect new variables and value changes
        setConversationVariables((prevVariables) => {
          if (prevVariables.length === 0 || isFirstLoad) {
            // First time receiving data - don't auto-expand any sections
            console.log('First time receiving conversation variables - no auto-expansion');
            return variables;
          }
          
          console.log('Previous variables:', prevVariables);
          const prevVariableNames = new Set(prevVariables.map(v => v.variable_name));
          const newVariableNames = variables
            .filter(v => !prevVariableNames.has(v.variable_name))
            .map(v => v.variable_name);
          
          console.log('New variable names:', newVariableNames);
          
          const updatedVariableNames = new Set<string>();
          const updatedVariableFields = new Set<string>();
          
          // Check for value changes in existing variables
          variables.forEach(currentVar => {
            const prevVar = prevVariables.find(prev => prev.variable_name === currentVar.variable_name);
            if (prevVar) {
              const hasChanged = JSON.stringify(prevVar.variable_value) !== JSON.stringify(currentVar.variable_value);
              if (hasChanged) {
                console.log(`Variable ${currentVar.variable_name} changed:`, {
                  from: prevVar.variable_value,
                  to: currentVar.variable_value
                });
                updatedVariableNames.add(currentVar.variable_name);
                
                // Track individual field changes within the variable
                Object.keys(currentVar.variable_value).forEach(fieldKey => {
                  const fieldId = `${currentVar.variable_name}.${fieldKey}`;
                  updatedVariableFields.add(fieldId);
                });
              }
            }
          });
          
          // Auto-expand and highlight only new variables or variables with value changes
          const variablesToHighlight = [...newVariableNames, ...updatedVariableNames];
          console.log('Variables to highlight:', variablesToHighlight);
          
          if (variablesToHighlight.length > 0) {
            console.log('Expanding and highlighting variables:', variablesToHighlight);
            setExpandedSections(prev => {
              const newSet = new Set(prev);
              variablesToHighlight.forEach(name => newSet.add(name)); 
              return newSet;
            });
            
            setHighlightedSections(new Set(variablesToHighlight));
            
            // Remove highlight after 4 seconds
            setTimeout(() => {
              setHighlightedSections(new Set());
            }, 4000);
          } else {
            console.log('No variables to highlight');
          }
          
          // Trigger field animations for updated variable fields
          if (updatedVariableFields.size > 0) {
            console.log('Animating updated variable fields:', Array.from(updatedVariableFields));
            setAnimatedFields(prev => {
              const newSet = new Set(prev);
              updatedVariableFields.forEach(fieldId => newSet.add(fieldId));
              return newSet;
            });
            
            // Remove field animations after 2 seconds
            setTimeout(() => {
              setAnimatedFields(prev => {
                const newSet = new Set(prev);
                updatedVariableFields.forEach(fieldId => newSet.delete(fieldId));
                return newSet;
              });
            }, 2000);
          }
          
          return variables;
        });
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

  const getStatusIcon = (value: any, isVerified?: boolean) => {
    // Show verification status if isVerified is defined
    if (isVerified !== undefined) {
      return isVerified ? (
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
    
    // Show status based on value if no verification status
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
    
    // Show blue checkmark for non-empty values
    if (value && value !== '') {
      return (
        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    // Show gray icon for empty values
    return (
      <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center shadow-sm">
        <span className="text-white text-xs font-bold">-</span>
      </div>
    );
  };

  const renderApplicantSection = (sectionKey: string, fields: FieldItem[]) => {
    if (!fields || fields.length === 0) return null;

    return (
      
      <div 
        key={sectionKey} 
        className={`border-b-1 border-b-[#0000001A] m-0 p-0 transition-all duration-500 ${
          highlightedSections.has(sectionKey) ? 'bg-blue-50 shadow-md' : ''
        }`}
      >
        <button 
          onClick={() => toggleSection(sectionKey)}
          className={`w-full px-2 py-2.5 flex cursor-pointer items-center justify-between text-left transition-all duration-300 ${
            highlightedSections.has(sectionKey) 
              ? 'gradient-wave bg-blue-100 border-l-4 border-blue-500 shadow-lg animate-pulse' 
              : 'hover:bg-gray-200'
          }`}
        >
          <span className="font-semibold text-sm  text-black">{formatVariableName(sectionKey)}</span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedSections.has(sectionKey) ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            expandedSections.has(sectionKey) 
              ? 'max-h-[2000px] opacity-100' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-2 pb-5 space-y-4">
            {fields.map((field) => {
              const fieldId = `${sectionKey}.${field.key}`;
              const isAnimated = animatedFields.has(fieldId);
              
              return (
                <div 
                  key={field.key} 
                  className={`flex items-center justify-between py-1 px-2.5 ${
                    isAnimated ? 'field-zoom-animation' : ''
                  }`}
                >
                  <span className="text-xs font-normal text-black">{field.lable}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {field.value || '-'}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(field.value, field.isVerified)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div> 
      <style jsx>{`
        @keyframes gradientWave {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        @keyframes blink {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 rgba(59, 130, 246, 0);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
          }
        }
        
        .gradient-wave {
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0.1) 0%,
            rgba(147, 197, 253, 0.3) 25%,
            rgba(59, 130, 246, 0.2) 50%,
            rgba(147, 197, 253, 0.3) 75%,
            rgba(59, 130, 246, 0.1) 100%
          );
          background-size: 200% 100%;
          animation: gradientWave 2s ease-in-out infinite, blink 1.5s ease-in-out infinite;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }
        
        .gradient-wave::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .gradient-wave:hover {
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0.15) 0%,
            rgba(147, 197, 253, 0.4) 25%,
            rgba(59, 130, 246, 0.25) 50%,
            rgba(147, 197, 253, 0.4) 75%,
            rgba(59, 130, 246, 0.15) 100%
          );
          background-size: 200% 100%;
        }
        
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
        
        @keyframes fieldZoom {
          0% {
            transform: scale(1);
            background-color: transparent;
          }
          50% {
            transform: scale(1.05);
            background-color: rgba(34, 197, 94, 0.1);
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
          }
          100% {
            transform: scale(1);
            background-color: transparent;
          }
        }
        
        .field-zoom-animation {
          animation: fieldZoom 0.8s ease-in-out;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
      `}</style>
      <div className="w-96    h-screen overflow-scroll ">
    <div className="p-6">
      {/* Applicant Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-black text-gray-900">Applicant Details</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => {
              console.log('Manual test - expanding all sections and animating fields');
              const allSections = Object.keys(applicantData?.applicantDetails || {});
              console.log('All sections:', allSections);
              
              // Test section highlighting
              setExpandedSections(new Set(allSections));
              setHighlightedSections(new Set(allSections));
              
              // Test field animations - animate first field of each section
              const testFields = new Set<string>();
              allSections.forEach(sectionName => {
                const fields = (applicantData?.applicantDetails as any)?.[sectionName] || [];
                if (fields.length > 0) {
                  const fieldId = `${sectionName}.${fields[0].key}`;
                  testFields.add(fieldId);
                }
              });
              
              console.log('Testing field animations:', Array.from(testFields));
              setAnimatedFields(testFields);
              
              // Clear animations
              setTimeout(() => {
                console.log('Clearing highlighted sections and field animations');
                setHighlightedSections(new Set());
                setAnimatedFields(new Set());
              }, 4000);
            }}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Test
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>


      {/* Dynamic Sections based on applicant data or conversation variables */}
      <div className="space-y-4">
        {/* Render new applicant details structure if available */}
        {applicantData && applicantData.applicantDetails && (
          <>
            {Object.entries(applicantData.applicantDetails).map(([sectionKey, fields]) => 
              Array.isArray(fields) && fields.length > 0 ? renderApplicantSection(sectionKey, fields) : null
            )}
          </>
        )}
        {/* Show message when no data is available */}
        {!applicantData && conversationVariables.length === 0 && (
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