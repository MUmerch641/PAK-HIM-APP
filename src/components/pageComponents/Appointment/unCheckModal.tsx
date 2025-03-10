import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, BackHandler, Dimensions } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTheme } from '@/src/utils/ThemeContext';

const { width } = Dimensions.get('window');

interface StatusChangeConfirmationProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StatusChangeConfirmation = ({ visible, onClose, onConfirm }: StatusChangeConfirmationProps) => {
  const { currentColors } = useTheme();
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    // Handle back button press
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        handleClose();
        return true;
      }
      return false;
    });

    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset values when hidden
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }

    return () => backHandler.remove();
  }, [visible, fadeAnim, scaleAnim]);

  const handleConfirm = () => {
    // Animate out and then confirm
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onConfirm();
    });
  };

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles(currentColors).overlay,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity 
        style={styles(currentColors).backdrop} 
        activeOpacity={1} 
        onPress={handleClose}
      />
      
      <Animated.View 
        style={[
          styles(currentColors).dialogContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={styles(currentColors).dialogContent}>
          <Text style={styles(currentColors).title}>
            Change status from Check to Active?
          </Text>
          
          <View style={styles(currentColors).buttonContainer}>
            <TouchableOpacity
              style={[styles(currentColors).button, styles(currentColors).cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles(currentColors).cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles(currentColors).button, styles(currentColors).confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles(currentColors).confirmButtonText}>yes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = (currentColors: { [key: string]: string }) => StyleSheet.create({
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialogContainer: {
    width: '80%',
    maxWidth: moderateScale(400),
    minWidth: moderateScale(300),
    zIndex: 1001,
  },
  dialogContent: {
    backgroundColor: currentColors.background,
    borderRadius: moderateScale(8),
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: scale(16),
    marginBottom: verticalScale(20),
    color: currentColors.actionMenuTextColor,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: moderateScale(10),
  },
  button: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(4),
    minWidth: moderateScale(80),
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0066FF',
  },
  confirmButton: {
    backgroundColor: '#0066FF',
  },
  cancelButtonText: {
    color: '#0066FF',
    fontSize: scale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: scale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StatusChangeConfirmation;