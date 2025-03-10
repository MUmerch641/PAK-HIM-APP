import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, BackHandler } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTheme } from '@/src/utils/ThemeContext';

interface DeleteDialogProps {
  visible: boolean;
  onClose: () => void;
  onDelete: (reason: string) => void;
}

export const DeleteDialog = ({ visible, onClose, onDelete }: DeleteDialogProps) => {
  const [reason, setReason] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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

  const handleDelete = () => {
    if (reason.trim() === '') {
      setIsEmpty(true);
    } else {
      onDelete(reason);
      setReason('');
      setIsEmpty(false);
    }
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
      setReason('');
      setIsEmpty(false);
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
          <Text style={styles(currentColors).title}>Are you sure you want to delete?</Text>
          
          <TextInput
            style={[
              styles(currentColors).input, 
              isEmpty && styles(currentColors).inputError, 
              { borderColor: isFocused ? currentColors.dropdownText : currentColors.dropdownBorder }
            ]}
            placeholder="Reason for deletion"
            value={reason}
            onChangeText={(text) => {
              setReason(text);
              if (text.trim() !== '') {
                setIsEmpty(false);
              }
            }}
            placeholderTextColor={'grey'}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          
          {isEmpty && <Text style={styles(currentColors).errorText}>Reason is required</Text>}
          
          <View style={styles(currentColors).buttonContainer}>
            <TouchableOpacity
              style={[styles(currentColors).button, styles(currentColors).cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles(currentColors).cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles(currentColors).button, styles(currentColors).deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles(currentColors).deleteButtonText}>DELETE</Text>
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
    fontSize: scale(18),
    fontWeight: '500',
    marginBottom: verticalScale(10),
    textAlign: 'center',
    color: currentColors.actionMenuTextColor,
  },
  input: {
    borderWidth: moderateScale(1),
    borderColor: currentColors.dropdownBorder,
    borderRadius: moderateScale(4),
    padding: moderateScale(12),
    marginBottom: verticalScale(10),
    fontSize: scale(16),
    color: currentColors.actionMenuTextColor,
  },
  inputError: {
    marginBottom: 0,
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: scale(12),
    marginBottom: verticalScale(10),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: moderateScale(10),
    marginTop: verticalScale(10),
  },
  button: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(4),
    minWidth: moderateScale(80),
  },
  cancelButton: {
    backgroundColor: '#0066FF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: scale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: scale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DeleteDialog;