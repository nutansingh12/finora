'use client';

import React, { useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackButtonProps {
  variant?: 'floating' | 'inline' | 'header';
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ 
  variant = 'floating',
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const baseClasses = "flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  
  const variantClasses = {
    floating: "fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl z-40 w-14 h-14 group",
    inline: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md",
    header: "text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md hover:bg-gray-100"
  };

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        title="Share your feedback"
        aria-label="Share your feedback"
      >
        {variant === 'floating' ? (
          <>
            <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
            <span className="sr-only">Feedback</span>
          </>
        ) : variant === 'inline' ? (
          <>
            <Star size={16} className="mr-2" />
            Feedback
          </>
        ) : (
          <>
            <MessageSquare size={16} className="mr-1" />
            <span className="hidden sm:inline">Feedback</span>
          </>
        )}
      </button>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
