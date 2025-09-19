import React, {createContext, useContext, useEffect, useState} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {NOTIFICATION_CONFIG} from '../config/constants';

interface NotificationContextType {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  scheduleNotification: (notification: LocalNotification) => void;
  cancelNotification: (id: string) => void;
  cancelAllNotifications: () => void;
}

interface LocalNotification {
  id: string;
  title: string;
  message: string;
  date?: Date;
  repeatType?: 'day' | 'week' | 'month' | 'year';
  actions?: string[];
  userInfo?: any;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<Props> = ({children}) => {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = () => {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },

      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          // User tapped on notification
          handleNotificationTap(notification);
        }
      },

      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      onRegistrationError: function (err) {
        console.error(err.message, err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: NOTIFICATION_CONFIG.PRICE_ALERT_CHANNEL,
          channelName: 'Price Alerts',
          channelDescription: 'Notifications for stock price alerts',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Price alerts channel created: ${created}`),
      );

      PushNotification.createChannel(
        {
          channelId: NOTIFICATION_CONFIG.NEWS_CHANNEL,
          channelName: 'News Updates',
          channelDescription: 'Notifications for news and market updates',
          playSound: false,
          importance: 3,
          vibrate: false,
        },
        (created) => console.log(`News channel created: ${created}`),
      );

      PushNotification.createChannel(
        {
          channelId: NOTIFICATION_CONFIG.PORTFOLIO_CHANNEL,
          channelName: 'Portfolio Updates',
          channelDescription: 'Notifications for portfolio performance updates',
          playSound: false,
          importance: 2,
          vibrate: false,
        },
        (created) => console.log(`Portfolio channel created: ${created}`),
      );
    }

    checkPermissions();
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        setHasPermission(granted);
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPermission(false);
      }
    } else {
      // iOS permissions are handled by the library
      setHasPermission(true);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(hasPermission);
        return hasPermission;
      } catch (error) {
        console.error('Permission request error:', error);
        return false;
      }
    } else {
      // iOS permissions are requested automatically
      return true;
    }
  };

  const scheduleNotification = (notification: LocalNotification) => {
    PushNotification.localNotification({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      date: notification.date,
      repeatType: notification.repeatType,
      actions: notification.actions,
      userInfo: notification.userInfo,
      channelId: NOTIFICATION_CONFIG.PRICE_ALERT_CHANNEL, // Default channel
    });
  };

  const cancelNotification = (id: string) => {
    PushNotification.cancelLocalNotifications({id});
  };

  const cancelAllNotifications = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  const handleNotificationTap = (notification: any) => {
    // Handle different types of notifications
    if (notification.userInfo?.type === 'price_alert') {
      // Navigate to stock details
      // You can use navigation service or emit an event here
    } else if (notification.userInfo?.type === 'portfolio_update') {
      // Navigate to portfolio
    }
  };

  const value: NotificationContextType = {
    hasPermission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
