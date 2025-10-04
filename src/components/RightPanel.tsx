import React, { useImperativeHandle, forwardRef } from 'react'
import { FieldItem } from '@/service/socket';
import { openLinkInNewTab } from '@/common/utils';
import { useSocketData } from '@/contexts/SocketDataContext';

interface RightPanelProps {
  // Props kept for backward compatibility but not used
  conversationId?: string;
  onSectionUpdate?: () => void;
}

export interface RightPanelRef {
  resetExpandedSections: () => void;
  expandHighlightedSections: () => void;
}

const RightPanel = forwardRef<RightPanelRef, RightPanelProps>((props, ref) => {
  // Use socket data from context
  const {
    conversationVariables,
    applicantData,
    expandedSections,
    highlightedSections,
    animatedFields,
    toggleSection,
    resetExpandedSections,
    expandHighlightedSections,
  } = useSocketData();

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    resetExpandedSections,
    expandHighlightedSections
  }));

  const formatVariableName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'object') {
      // Handle nested object structure like {value: "actual value", isVerified: true}
      if ('value' in value) {
        return formatValue(value.value);
      }
      // Fallback to JSON representation for other objects
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getStatusIcon = (value: any, isVerified?: boolean) => {
    // Extract actual value if it's a nested object
    let actualValue = value;
    if (typeof value === 'object' && value !== null && 'value' in value) {
      actualValue = value.value;
    }
    
    // Show verification status if isVerified is defined
    const verificationStatus = typeof value === 'object' && value !== null && 'isVerified' in value 
      ? value.isVerified 
      : isVerified;
      
    if (verificationStatus !== undefined) {
      return verificationStatus ? (
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
    if (typeof actualValue === 'boolean') {
      return actualValue ? (
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
    if (actualValue && actualValue !== '') {
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

  // Special rendering for documents section with nested file arrays
  const renderDocumentsSection = (sectionKey: string, fields: FieldItem[]) => {
    if (!fields || fields.length === 0) return null;

    return (
      <div 
        key={sectionKey} 
        className={`border-b-1  border-b-[#0000001A] m-0 p-0 transition-all duration-500 ${
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
          <span className="font-semibold text-sm text-black">{formatVariableName(sectionKey)}</span>
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
          className={`overflow-hidden  transition-all duration-500 ease-in-out ${
            expandedSections.has(sectionKey) 
              ? 'max-h-[3000px] opacity-100' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-2 pb-5 space-y-4 ">
            {fields.map((field) => {
              // Each field is a document type (Pay Slips, Bank Statement, etc.)
              const documentType = field.key;
              const documentFiles = Array.isArray(field.value) ? field.value : [];
              const fileCount = documentFiles.length;

              return (
                <div key={field.key} className="space-y-2">
                  {/* Document Type Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-800">{field.lable || documentType}</h4>
                    <span className="text-xs text-gray-600">{fileCount} {fileCount === 1 ? 'File' : 'Files'}</span>
                  </div>
                  
                  {/* Files Grid */}
                  <div className="flex gap-2 overflow-x-auto pb-6">
                    {documentFiles.map((fileItem: any, fileIndex: number) => {
                      const fileUrl = typeof fileItem === 'object' ? fileItem.value : fileItem;
                      const isVerified = typeof fileItem === 'object' ? fileItem.isVerified : false;
                      const isPdf = fileUrl && typeof fileUrl === 'string' && fileUrl.toLowerCase().endsWith('.pdf');
                      
                      return (
                        <div key={fileIndex} className="relative flex-shrink-0 w-[81px] h-[102px]">
                          <div
                            onClick={() => fileUrl && openLinkInNewTab(fileUrl)}
                            className="block w-full h-full relative group cursor-pointer"
                          >
                            {/* File Preview */}
                            <div className="w-full h-full bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                              {fileUrl && !isPdf ? (
                                <img 
                                  src={fileUrl} 
                                  alt={`${documentType} ${fileIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                        <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                                        </svg>
                                      </div>
                                    `;
                                  }}
                                />
                              ) : isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                                  <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H12V10H18V20H6Z" />
                                  </svg>
                                  <span className="text-xs text-red-600 mt-1">PDF</span>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Verification Badge */}
                            <div className="absolute top-1 right-1">
                              {isVerified ? (
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                                  <span className="text-white text-xs font-bold">!</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* File Label */}
                          <p className="text-xs text-gray-600 mt-1 text-center truncate">
                            {documentType} {fileIndex + 1}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
              if(isAnimated){
                console.log("fieldId",fieldId);
              }
              return (
                <div 
                  key={field.key} 
                  className={`flex items-center justify-between py-1 px-2.5 ${
                    isAnimated ? 'field-zoom-animation scale-105 bg-[#edeff2] border-1 text-medium border-blue-700 shadow-lg animate-pulse' : ''
                  }`}
                >
                  <span className="text-xs font-normal w-[40%] text-black">{field.lable}</span>
                  <div className="flex items-end justify-end space-x-3  w-[58%]">
                    <span className="text-xs font-normal text-end text-gray-900">
                      {formatValue(field.value)}
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

        .gradient-wave-green {  
          background: linear-gradient(
            90deg,
            rgba(34, 197, 94, 0.1) 0%,
            rgba(16, 185, 129, 0.3) 25%,
            rgba(34, 197, 94, 0.2) 50%,
            rgba(16, 185, 129, 0.3) 75%,
            rgba(34, 197, 94, 0.1) 100%
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
            transform: scale(1.5);
            background-color: rgba(34, 197, 94, 0.1);
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
          }
          100% {
            transform: scale(1);
            background-color: transparent;
          }
        }
        
        .field-zoom-animation {
          animation: fieldZoom 1.5s ease-in-out;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
      `}</style>
      <div className="w-96    h-screen overflow-scroll ">
    <div className="p-6">
      {/* Applicant Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900">Applicant Details</h2>
        {/* <div className="flex items-center space-x-2">
          
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div> */}
      </div>
      <div className='flex items-center gap-4.5 mb-2 '>
        <img src="/icons/user1.svg" alt="user Logo" className="w-6 h-6" />
        <img src="/icons/user2.svg" alt="user Logo" className="w-6 h-6" />  
        <img src="/icons/user3.svg" alt="user Logo" className="w-6 h-6" />  
      </div>


      {/* Dynamic Sections based on applicant data or conversation variables */}
      <div className="space-y-4">
        {/* Render new applicant details structure if available */}
        {applicantData && applicantData.applicant_details && (
          <>
            {Object.entries(applicantData.applicant_details).map(([sectionKey, fields]) => {
              if (!Array.isArray(fields) || fields.length === 0) return null;
              
              // Use special rendering for documents section
              if (sectionKey.toLowerCase() === 'documents') {
                return renderDocumentsSection(sectionKey, fields);
              }
              
              // Use regular rendering for other sections
              return renderApplicantSection(sectionKey, fields);
            })}
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
});

RightPanel.displayName = 'RightPanel';

export default RightPanel   