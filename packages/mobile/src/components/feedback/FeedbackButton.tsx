import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackButtonProps {
  variant?: 'floating' | 'inline' | 'header';
  style?: any;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ 
  variant = 'floating',
  style
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePress = () => {
    setIsModalVisible(true);
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'floating':
        return [styles.floatingButton, style];
      case 'inline':
        return [styles.inlineButton, style];
      case 'header':
        return [styles.headerButton, style];
      default:
        return [styles.floatingButton, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'floating':
        return styles.floatingButtonText;
      case 'inline':
        return styles.inlineButtonText;
      case 'header':
        return styles.headerButtonText;
      default:
        return styles.floatingButtonText;
    }
  };

  const renderContent = () => {
    switch (variant) {
      case 'floating':
        return <Ionicons name="chatbubble" size={24} color="#FFFFFF" />;
      case 'inline':
        return (
          <View style={styles.inlineContent}>
            <Ionicons name="star" size={16} color="#FFFFFF" />
            <Text style={getTextStyle()}>Feedback</Text>
          </View>
        );
      case 'header':
        return (
          <View style={styles.headerContent}>
            <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
            <Text style={getTextStyle()}>Feedback</Text>
          </View>
        );
      default:
        return <Ionicons name="chatbubble" size={24} color="#FFFFFF" />;
    }
  };

  return (
    <>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {renderContent()}
      </TouchableOpacity>

      <FeedbackModal 
        visible={isModalVisible} 
        onClose={() => setIsModalVisible(false)} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  inlineButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inlineButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  inlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
