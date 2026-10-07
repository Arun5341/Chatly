import React from 'react';

interface TypingIndicatorProps {
  typingUsers: { [key: string]: string };
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  const names = Object.values(typingUsers);
  if (names.length === 0) return null;

  const typingText =
    names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-400 animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span>{typingText}...</span>
    </div>
  );
};
