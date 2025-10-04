'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { socketService, ConversationVariable, ApplicantData as SocketApplicantData, FieldItem, StageData } from '@/service/socket';

interface SocketDataContextValue {
  conversationVariables: ConversationVariable[];
  applicantData: SocketApplicantData | null;
  stageData: StageData | null;
  expandedSections: Set<string>;
  highlightedSections: Set<string>;
  animatedFields: Set<string>;
  sectionUpdateCounter: number;
  toggleSection: (sectionName: string) => void;
  resetExpandedSections: () => void;
  expandHighlightedSections: () => void;
  triggerSectionUpdate: () => void;
}

const SocketDataContext = createContext<SocketDataContextValue | undefined>(undefined);

interface SocketDataProviderProps {
  children: ReactNode;
  conversationId?: string;
  onSectionUpdate?: () => void;
}

export const SocketDataProvider: React.FC<SocketDataProviderProps> = ({ 
  children, 
  conversationId,
  onSectionUpdate 
}) => {
  const [conversationVariables, setConversationVariables] = useState<ConversationVariable[]>([]);
  const [applicantData, setApplicantData] = useState<SocketApplicantData | null>(null);
  const [stageData, setStageData] = useState<StageData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [highlightedSections, setHighlightedSections] = useState<Set<string>>(new Set());
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [animatedFields, setAnimatedFields] = useState<Set<string>>(new Set());
  const [sectionUpdateTrigger, setSectionUpdateTrigger] = useState<number>(0);
  const [lastHighlightedSections, setLastHighlightedSections] = useState<Set<string>>(new Set());

  // Helper function to deep compare values
  const deepCompareValues = useCallback((val1: any, val2: any): boolean => {
    // Handle exact equality (including null === null, undefined === undefined)
    if (val1 === val2) return true;
    
    // Handle null/undefined cases where they're not equal
    if (val1 == null || val2 == null) return false;
    
    // Handle different types
    if (typeof val1 !== typeof val2) return false;
    
    // Handle arrays (for documents section)
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      
      for (let i = 0; i < val1.length; i++) {
        const item1 = val1[i];
        const item2 = val2[i];
        
        // Handle nested objects with {value, isVerified}
        if (typeof item1 === 'object' && item1 !== null && typeof item2 === 'object' && item2 !== null) {
          // Deep compare the object properties
          if (!deepCompareValues(item1, item2)) {
            return false;
          }
        } else if (item1 !== item2) {
          return false;
        }
      }
      return true;
    }
    
    // Handle objects with {value, isVerified}
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      if ('value' in val1 && 'value' in val2) {
        return val1.value === val2.value && val1.isVerified === val2.isVerified;
      }
      return JSON.stringify(val1) === JSON.stringify(val2);
    }
    
    return val1 === val2;
  }, []);

  // Handle applicant data updates
  const handleApplicantDataUpdate = useCallback((data: SocketApplicantData) => {
    console.log('Applicant data updated:', data);
    
    // Get the section names from the new data
    const newSectionNames = Object.keys(data.applicant_details || {});
    console.log('New section names:', newSectionNames);
    
    // Detect field value changes and new sections
    setApplicantData((prevData) => {
      if (prevData) {
        console.log('Previous data exists, checking for changes...');
        const prevSectionNames = new Set(Object.keys(prevData.applicant_details || {}));
        console.log('Previous section names:', Array.from(prevSectionNames));
        
        const newSections = newSectionNames.filter(name => !prevSectionNames.has(name));
        console.log('New sections detected:', newSections);
        
        const updatedSections = new Set<string>();
        const updatedFields = new Set<string>();
        
        // Check for field value changes in existing sections
        newSectionNames.forEach(sectionName => {
          const currentFields = (data.applicant_details as any)?.[sectionName] || [];
          const prevFields = (prevData.applicant_details as any)?.[sectionName] || [];
          
          console.log(`Checking section: ${sectionName}`);
          console.log('Current fields:', currentFields);
          console.log('Previous fields:', prevFields);
          
          // Check if any field values have changed or new fields added
          const hasChanges = currentFields.some((currentField: FieldItem) => {
            const prevField = prevFields.find((prev: FieldItem) => prev.key === currentField.key);
            
            // Field is new (not in previous data)
            if (!prevField) {
              console.log(`New field detected: ${currentField.key} with value`, currentField.value);
              const fieldId = `${sectionName}.${currentField.key}`;
              updatedFields.add(fieldId);
              return true;
            }
            
            // Field value has changed - use deep comparison
            const hasChanged = !deepCompareValues(prevField.value, currentField.value);
            if (hasChanged) {
              console.log(`Field ${currentField.key} changed:`, {
                from: prevField.value,
                to: currentField.value
              });
              const fieldId = `${sectionName}.${currentField.key}`;
              updatedFields.add(fieldId);
              setSectionUpdateTrigger(prev => prev + 1);
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
          const highlightSet = new Set(sectionsToHighlight);
          
          setExpandedSections(prev => {
            const newSet = new Set(prev);
            sectionsToHighlight.forEach(name => newSet.add(name));
            return newSet;
          });
          
          setHighlightedSections(highlightSet);
          setLastHighlightedSections(highlightSet);
          
          // Trigger parent notification about section update (via state, not direct call)
          setSectionUpdateTrigger(prev => prev + 1);
          
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
          setSectionUpdateTrigger(prev => prev + 1);
          
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
  }, [deepCompareValues]);

  // Handle conversation variables updates
  const handleVariablesUpdate = useCallback((variables: ConversationVariable[]) => {
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
        const highlightSet = new Set(variablesToHighlight);
        
        setExpandedSections(prev => {
          const newSet = new Set(prev);
          variablesToHighlight.forEach(name => newSet.add(name)); 
          return newSet;
        });
        
        setHighlightedSections(highlightSet);
        setLastHighlightedSections(highlightSet);
        
        // Trigger parent notification about section update (via state, not direct call)
        setSectionUpdateTrigger(prev => prev + 1);
        
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
  }, [isFirstLoad]);

  // Handle stage data updates
  const handleStageDataUpdate = useCallback((data: StageData) => {
    console.log('Stage data updated:', data);
    setStageData(data);
  }, []);

  // Effect to call onSectionUpdate when sections are updated
  useEffect(() => {
    if (sectionUpdateTrigger > 0) {
      onSectionUpdate?.();
    }
  }, [sectionUpdateTrigger, onSectionUpdate]);

  // Socket setup effect
  useEffect(() => {
    // Set up socket callbacks
    socketService.setCallbacks({
      onApplicantDataUpdate: handleApplicantDataUpdate,
      onVariablesUpdate: handleVariablesUpdate,
      onStageDataUpdate: handleStageDataUpdate,
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
  }, [conversationId, handleApplicantDataUpdate, handleVariablesUpdate, handleStageDataUpdate]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  }, []);

  // Reset all expanded sections
  const resetExpandedSections = useCallback(() => {
    setExpandedSections(new Set([]));
  }, []);

  // Expand all highlighted sections (useful when opening bottom sheet on mobile)
  const expandHighlightedSections = useCallback(() => {
    console.log('Expanding highlighted sections:', Array.from(lastHighlightedSections));
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      lastHighlightedSections.forEach(name => newSet.add(name));
      return newSet;
    });
  }, [lastHighlightedSections]);

  // Trigger section update manually
  const triggerSectionUpdate = useCallback(() => {
    setSectionUpdateTrigger(prev => prev + 1);
  }, []);

  const value: SocketDataContextValue = {
    conversationVariables,
    applicantData,
    stageData,
    expandedSections,
    highlightedSections,
    animatedFields,
    sectionUpdateCounter: sectionUpdateTrigger,
    toggleSection,
    resetExpandedSections,
    expandHighlightedSections,
    triggerSectionUpdate,
  };

  return (
    <SocketDataContext.Provider value={value}>
      {children}
    </SocketDataContext.Provider>
  );
};

// Custom hook to use the socket data context
export const useSocketData = () => {
  const context = useContext(SocketDataContext);
  if (context === undefined) {
    throw new Error('useSocketData must be used within a SocketDataProvider');
  }
  return context;
};
