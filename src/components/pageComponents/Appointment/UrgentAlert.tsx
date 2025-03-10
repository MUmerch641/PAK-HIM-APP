import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/utils/ThemeContext'; // Make sure this path matches your project structure

interface UrgentCaseAlertProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export default function UrgentCaseAlert({ visible, message, onClose }: UrgentCaseAlertProps) {
  const { currentColors } = useTheme();

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles(currentColors).overlay}>
        <View style={styles(currentColors).modalContainer}>
          <View style={styles(currentColors).iconContainer}>
            <MaterialIcons name="warning" size={28} color={currentColors.error || '#FF3B30'} />
            <Text style={styles(currentColors).title}>Urgent Case</Text>
          </View>
          <Text style={styles(currentColors).message}>{message}</Text>
          <TouchableOpacity style={styles(currentColors).closeButton} onPress={onClose}>
            <Text style={styles(currentColors).closeButtonText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = (currentColors: { [key: string]: string }) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: currentColors.background || 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    color: currentColors.error || '#FF3B30',
    marginLeft: 8,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    color: currentColors.actionMenuTextColor || '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  closeButtonText: {
    color: currentColors.background === '#000' ? currentColors.actionMenuTextColor : 'white', // Adjust text color based on background
    fontSize: 16,
    fontWeight: '600',
  },
});