import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { styles } from './FeedbackModal.styles';
import { API_BASE_URL } from '../../config/constants';
import { ApiService } from '../../services/ApiService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FeedbackData {
  rating: number;
  feedback_text: string;
  screenshot_base64?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [includeScreenshot, setIncludeScreenshot] = useState<boolean>(false);

  const resetForm = () => {
    setRating(0);
    setFeedbackText('');
    setIncludeScreenshot(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const captureScreenshot = async (): Promise<string | null> => {
    // Screenshot capture module is not included; return null gracefully
    console.warn('Screenshot capture not available in this build; proceeding without screenshot');
    return null;
  };

  const getDeviceInfo = async () => {
    const { width, height } = Dimensions.get('window');
    return {
      deviceId: 'unknown',
      brand: Platform.OS,
      model: 'unknown',
      systemName: Platform.OS,
      systemVersion: String(Platform.Version ?? ''),
      appVersion: 'unknown',
      buildNumber: 'unknown',
      bundleId: 'unknown',
      screen: { width, height },
      platform: Platform.OS,
      isTablet: false,
      hasNotch: false,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotData: string | undefined;
      
      if (includeScreenshot) {
        screenshotData = await captureScreenshot() || undefined;
      }

      const deviceInfo = await getDeviceInfo();

      const feedbackData: FeedbackData & any = {
        rating,
        feedback_text: feedbackText.trim(),
        screenshot_base64: screenshotData,
        device_info: deviceInfo,
        app_version: deviceInfo.appVersion,
        platform: 'mobile'
      };

      const token = (ApiService.getAuthToken && ApiService.getAuthToken()) || '';
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(feedbackData)
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Thank You!',
          'Your feedback has been submitted successfully. We appreciate your input!',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit feedback');
      }

    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
            disabled={isSubmitting}
          >
            <Text style={{ fontSize: 28, color: star <= rating ? '#FFD700' : '#D1D5DB' }}>
              {star <= rating ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingMessage = () => {
    switch (rating) {
      case 1:
        return "We're sorry to hear that. Please tell us how we can improve.";
      case 2:
        return "We appreciate your feedback. How can we do better?";
      case 3:
        return "Thank you for your feedback. What can we improve?";
      case 4:
        return "Great! What did you like, and what can we improve?";
      case 5:
        return "Awesome! We'd love to hear what you enjoyed most.";
      default:
        return "";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Share Your Feedback</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={isSubmitting}
          >
            <Text style={{ fontSize: 20, color: '#6B7280' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How would you rate your experience?</Text>
            {renderStars()}
            {rating > 0 && (
              <Text style={styles.ratingMessage}>{getRatingMessage()}</Text>
            )}
          </View>

          {/* Feedback Text Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tell us more (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Share your thoughts, suggestions, or report any issues..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={1000}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{feedbackText.length}/1000</Text>
          </View>

          {/* Screenshot Option */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIncludeScreenshot(!includeScreenshot)}
              disabled={isSubmitting}
            >
              <Text style={{ fontSize: 18, color: '#2563EB' }}>
                {includeScreenshot ? '\u2611' : '\u2610'}
              </Text>
              <View style={styles.checkboxTextContainer}>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>\ud83d\udcf7</Text>
                  <Text style={styles.checkboxLabel}>Include screenshot</Text>
                </View>
                <Text style={styles.checkboxDescription}>
                  This helps us understand the context of your feedback
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </View>
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={{ color: '#FFFFFF', fontSize: 16 }}>\u27A4</Text>
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};
