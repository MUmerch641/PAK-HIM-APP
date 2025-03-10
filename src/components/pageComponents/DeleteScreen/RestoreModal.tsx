import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, BackHandler } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTheme } from '@/src/utils/ThemeContext';

interface RestoreModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export const RestoreModal = ({ visible, onClose, onRestore }: RestoreModalProps) => {
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

  const handleRestore = () => {
    animateAndExecute(onRestore);
  };

  const handleClose = () => {
    animateAndExecute(onClose);
  };

  const animateAndExecute = (callback: () => void) => {
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
      callback();
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
            Are you sure you want to restore{'\n'}this appointment?
          </Text>
          
          <View style={styles(currentColors).buttonContainer}>
            <TouchableOpacity
              style={[styles(currentColors).button, styles(currentColors).cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles(currentColors).cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles(currentColors).button, styles(currentColors).restoreButton]}
              onPress={handleRestore}
            >
              <Text style={styles(currentColors).restoreButtonText}>RESTORE</Text>
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
    textAlign: 'center',
    lineHeight: scale(24),
    color: currentColors.actionMenuTextColor,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: moderateScale(10),
  },
  button: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: moderateScale(24),
    borderRadius: moderateScale(4),
    minWidth: moderateScale(100),
  },
  cancelButton: {
    backgroundColor: currentColors.background,
    borderWidth: 1,
    borderColor: currentColors.dropdownText,
  },
  restoreButton: {
    backgroundColor: currentColors.dropdownText,
  },
  cancelButtonText: {
    color: currentColors.dropdownText,
    fontSize: scale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  restoreButtonText: {
    color: currentColors.background,
    fontSize: scale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default RestoreModal;