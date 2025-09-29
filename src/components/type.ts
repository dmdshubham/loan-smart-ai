export interface Message {
    id: number;
    text: string;
    isBot: boolean;
    timestamp: Date;
  }
  
  export interface Step {
    id: number;
    title: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    description?: string;
  }
  
  export interface ApplicantData {
    personalInfo: {
      aadharNo?: string;
      mobileNumber?: string;
      email?: string;
    };
  }