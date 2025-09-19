'use client';

import React, { useState } from 'react';
import { X, Star, Send, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackData {
  rating: number;
  feedback_text: string;
  screenshot_base64?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [includeScreenshot, setIncludeScreenshot] = useState<boolean>(true);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setFeedbackText('');
    setSubmitStatus('idle');
    setErrorMessage('');
    setIncludeScreenshot(true);
    setScreenshotPreview('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      // Temporarily hide the modal for screenshot
      const modal = document.querySelector('[data-feedback-modal]') as HTMLElement;
      if (modal) {
        modal.style.display = 'none';
      }

      // Wait a bit for the modal to hide
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture screenshot
      const canvas = await html2canvas(document.body, {
        height: window.innerHeight,
        width: window.innerWidth,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
        scale: 0.5 // Reduce size for email attachment
      });

      // Show modal again
      if (modal) {
        modal.style.display = 'flex';
      }

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  };

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      timestamp: new Date().toISOString()
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setErrorMessage('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      let screenshotData: string | undefined;
      
      if (includeScreenshot) {
        screenshotData = await captureScreenshot() || undefined;
        if (screenshotData) {
          setScreenshotPreview(screenshotData);
        }
      }

      const feedbackData: FeedbackData & any = {
        rating,
        feedback_text: feedbackText.trim(),
        page_url: window.location.href,
        screenshot_base64: screenshotData,
        device_info: getDeviceInfo(),
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        platform: 'web'
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(feedbackData)
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.message || 'Failed to submit feedback');
      }

    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitStatus('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      data-feedback-modal
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Share Your Feedback</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {submitStatus === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Thank You!</h3>
              <p className="text-gray-600">Your feedback has been submitted successfully.</p>
            </div>
          ) : (
            <>
              {/* Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How would you rate your experience?
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-colors"
                      disabled={isSubmitting}
                    >
                      <Star
                        size={32}
                        className={`${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {rating === 1 && "We're sorry to hear that. Please tell us how we can improve."}
                    {rating === 2 && "We appreciate your feedback. How can we do better?"}
                    {rating === 3 && "Thank you for your feedback. What can we improve?"}
                    {rating === 4 && "Great! What did you like, and what can we improve?"}
                    {rating === 5 && "Awesome! We'd love to hear what you enjoyed most."}
                  </p>
                )}
              </div>

              {/* Feedback Text */}
              <div className="mb-6">
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us more (optional)
                </label>
                <textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or report any issues..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {feedbackText.length}/1000
                </div>
              </div>

              {/* Screenshot Option */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeScreenshot}
                    onChange={(e) => setIncludeScreenshot(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700 flex items-center">
                    <Camera size={16} className="mr-2" />
                    Include screenshot of current page
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  This helps us understand the context of your feedback
                </p>
              </div>

              {/* Error Message */}
              {(submitStatus === 'error' || errorMessage) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <AlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                  <span className="text-sm text-red-700">{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Submit Feedback
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
