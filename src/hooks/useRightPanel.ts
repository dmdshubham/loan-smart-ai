import { useSocketData } from '@/contexts/SocketDataContext';
import { ConversationVariable, ApplicantData as SocketApplicantData, StageData } from '@/service/socket';

interface UseRightPanelProps {
  conversationId?: string;
  onSectionUpdate?: () => void;
}

interface UseRightPanelReturn {
  conversationVariables: ConversationVariable[];
  applicantData: SocketApplicantData | null;
  stageData: StageData | null;
  expandedSections: Set<string>;
  highlightedSections: Set<string>;
  animatedFields: Set<string>;
  toggleSection: (sectionName: string) => void;
  resetExpandedSections: () => void;
  expandHighlightedSections: () => void;
}

/**
 * @deprecated Use useSocketData() hook directly from SocketDataContext instead.
 * This hook is kept for backward compatibility.
 */
export const useRightPanel = ({ conversationId, onSectionUpdate }: UseRightPanelProps): UseRightPanelReturn => {
  // Simply return the context data - the provider handles all the logic
  const socketData = useSocketData();
  
  return socketData;
};
