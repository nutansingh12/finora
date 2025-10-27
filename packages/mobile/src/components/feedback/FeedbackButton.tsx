import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
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
        return <Text style={{ color: '#FFFFFF', fontSize: 20 }}>💬</Text>;
      case 'inline':
        return (
          <View style={styles.inlineContent}>
            <Text style={{ color: '#FFFFFF', fontSize: 14 }}>⭐</Text>
            <Text style={getTextStyle()}>Feedback</Text>
          </View>
        );
      case 'header':
        return (
          <View style={styles.headerContent}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>💬</Text>
            <Text style={getTextStyle()}>Feedback</Text>
          </View>
        );
      default:
        return <Text style={{ color: '#FFFFFF', fontSize: 20 }}>💬</Text>;
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

      {isModalVisible ? (
        <FeedbackModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} />
      ) : null}
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
