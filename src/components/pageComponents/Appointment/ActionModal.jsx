import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTheme } from '@/src/utils/ThemeContext';

const { width, height } = Dimensions.get('window');

const ActionMenu = ({ isOpen, onClose, onAction, appointment, activeTab }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const { currentColors } = useTheme();

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height / 2 - moderateScale(200), // Using moderateScale for consistency
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    {
      icon: 'pencil',
      label: 'Edit',
      action: () => onAction('edit', appointment),
      iconColor: '#2196F3'
    },
    {
      icon: 'trash',
      label: 'Delete',
      action: () => onAction('delete', appointment),
      iconColor: '#F44336'
    },
    {
      icon: 'ticket',
      label: 'Token',
      action: () => onAction('token', appointment),
      iconColor: '#4CAF50'
    },
    {
      icon: activeTab === 'checked' ? 'close-circle' : 'checkmark-circle',
      label: activeTab === 'checked' ? 'Uncheck' : 'Check',
      action: () => onAction('check', appointment),
      iconColor: activeTab === 'checked' ? '#FF9800' : '#009688'
    },
    activeTab === 'active' && {
      icon: 'pulse',
      label: 'Vitals',
      action: () => onAction('vitals', appointment),
      iconColor: '#9C27B0',
      hasVitals: appointment?.vitals // Check if vitals exist
    },
  ];

  return (
    <Animated.View
      style={[
        styles(currentColors).overlay,
        {
          opacity: overlayOpacity,
          backgroundColor: overlayOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']
          })
        }
      ]}
    >
      <TouchableOpacity 
        style={styles(currentColors).overlayTouchable} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles(currentColors).container,
            {
              transform: [{
                translateY: slideAnim
              }]
            }
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {actions.map((action, index) => (
              action && (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles(currentColors).actionItem,
                    index < actions.length - 1 && styles(currentColors).actionItemBorder
                  ]}
                  onPress={() => {
                    action.action();
                    onClose();
                  }}
                >
                  <Ionicons
                    name={action.icon}
                    size={moderateScale(20)}
                    color={action.iconColor}
                    style={styles(currentColors).actionIcon}
                  />
                  <Text style={styles(currentColors).actionLabel}>{action.label}</Text>
                  
                  {/* Add small green tick if vitals exist */}
                  {action.hasVitals && (
                    <Ionicons
                      name="checkmark-circle"
                      size={moderateScale(14)}
                      color="#4CAF50"
                      style={styles(currentColors).vitalsCheckIcon}
                    />
                  )}
                </TouchableOpacity>
              )
            ))}

            <TouchableOpacity
              style={styles(currentColors).cancelButton}
              onPress={onClose}
            >
              <Text style={styles(currentColors).cancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = (currentColors) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '85%',
    backgroundColor: currentColors?.background || 'white',
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    backgroundColor: currentColors?.dropdownBackground || 'white',
  },
  actionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: currentColors?.borderColor || '#F0F0F0',
  },
  actionIcon: {
    marginRight: moderateScale(12),
    width: moderateScale(24),
    textAlign: 'center',
  },
  actionLabel: {
    fontSize: moderateScale(16),
    color: currentColors?.actionMenuTextColor || '#333',
    fontWeight: '500',
    flex: 1,
  },
  vitalsCheckIcon: {
    marginLeft: moderateScale(6),
  },
  cancelButton: {
    paddingVertical: moderateScale(12),
    backgroundColor: currentColors?.filterBackground ,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: currentColors?.borderColor || '#F0F0F0',
  },
  cancelText: {
    fontSize: moderateScale(16),
    color: '#F44336',
    fontWeight: '600',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ActionMenu;