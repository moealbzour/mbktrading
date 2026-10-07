import React from 'react';
import { AiAssistant, AiAssistantProps } from './dashboard/AiAssistant';

export * from './dashboard/AiAssistant';

export const AITraderChatbot: React.FC<AiAssistantProps> = (props) => {
  return <AiAssistant {...props} />;
};

export default AITraderChatbot;
