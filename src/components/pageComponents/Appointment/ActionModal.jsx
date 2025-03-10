import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, verticalScale } from 'react-native-size-matters';

const { width, height } = Dimensions.get('window');

const ActionMenu = ({ isOpen, onClose, onAction, appointment, activeTab, currentColors }) => {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (isOpen) {
      // Reset the modal position first
      modalAnim.setValue(height * 0.1);
      
      // Animate the overlay and modal in parallel
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    { 
      icon: 'pencil-outline', 
      label: 'Edit', 
      color: '#4CAF50', 
      action: () => onAction('edit', appointment),
      description: 'Modify appointment details'
    },
    { 
      icon: 'trash-outline', 
      label: 'Delete', 
      color: '#F44336', 
      action: () => onAction('delete', appointment),
      description: 'Remove this appointment'
    },
    { 
      icon: 'ticket-outline', 
      label: 'Token', 
      color: '#2196F3', 
      action: () => onAction('token', appointment),
      description: 'View/print token'
    },
    {
      icon: activeTab === 'checked' ? 'close-circle-outline' : 'checkmark-circle-outline',
      label: activeTab === 'checked' ? 'Uncheck' : 'Check',
      color: '#FF9800',
      action: () => onAction('check', appointment),
      description: activeTab === 'checked' ? 'Mark as active' : 'Mark as checked'
    },
    { 
      icon: 'pulse-outline', 
      label: 'Vitals', 
      color: '#9C27B0', 
      action: () => onAction('vitals', appointment),
      description: 'Record patient vitals'
    },
  ];

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { 
          opacity: fadeAnim,
          backgroundColor: 'rgba(0, 0, 0, 0.7)' 
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.overlayBackground} 
        onPress={onClose} 
        activeOpacity={1}
      >
        <Animated.View 
          style={[
            styles.modalContent(currentColors),
            {
              transform: [{ translateY: modalAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader(currentColors)}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="options-outline" size={moderateScale(22)} color="#0066FF" />
              </View>
              <Text style={styles.modalTitle(currentColors)}>Action Menu</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close-circle" size={moderateScale(26)} color="#F44336" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dragIndicator} />
          
          <View style={styles.patientInfoContainer(currentColors)}>
            {appointment && (
              <>
                <Text style={styles.patientInfoLabel(currentColors)}>
                  Patient: <Text style={styles.patientInfoValue(currentColors)}>
                    {appointment?.patientId?.patientName || appointment?.patientName || 'Unknown'}
                  </Text>
                </Text>
                <Text style={styles.patientInfoLabel(currentColors)}>
                  MRN: <Text style={styles.patientInfoValue(currentColors)}>{appointment?.mrn || 'N/A'}</Text>
                </Text>
                <Text style={styles.patientInfoLabel(currentColors)}>
                  Token: <Text style={styles.patientInfoValue(currentColors)}>{appointment?.tokenId || 'N/A'}</Text>
                </Text>
              </>
            )}
          </View>
          
          <Text style={styles.sectionTitle(currentColors)}>Available Actions</Text>
          
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton(currentColors, action.color)}
                onPress={() => {
                  action.action();
                  onClose();
                }}
              >
                <View style={styles.actionIconContainer(action.color)}>
                  <Ionicons name={action.icon} size={moderateScale(24)} color="#fff" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionLabel(currentColors)}>{action.label}</Text>
                  <Text style={styles.actionDescription(currentColors)}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={moderateScale(20)} color={action.color} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2000,
  },
  overlayBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: (currentColors) => ({
    width: '100%',
    backgroundColor: currentColors?.background || '#FFFFFF',
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingHorizontal: moderateScale(20),
    paddingBottom: moderateScale(30),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    maxHeight: height * 0.9,
  }),
  dragIndicator: {
    width: moderateScale(40),
    height: moderateScale(5),
    backgroundColor: '#E0E0E0',
    borderRadius: moderateScale(2.5),
    alignSelf: 'center',
    marginVertical: moderateScale(10),
  },
  modalHeader: (currentColors) => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: moderateScale(10),
    marginBottom: moderateScale(5),
    paddingBottom: moderateScale(10),
  }),
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(10),
  },
  modalTitle: (currentColors) => ({
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: currentColors?.AppointmentColor || '#333333',
  }),
  closeButton: {
    padding: moderateScale(5),
  },
  patientInfoContainer: (currentColors) => ({
    padding: moderateScale(15),
    backgroundColor: currentColors?.filterBackground || 'rgba(0, 102, 255, 0.05)',
    borderRadius: moderateScale(10),
    marginBottom: moderateScale(15),
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.2)',
  }),
  patientInfoLabel: (currentColors) => ({
    fontSize: moderateScale(14),
    color: currentColors?.AppointmentColor || '#555555',
    marginBottom: moderateScale(5),
  }),
  patientInfoValue: (currentColors) => ({
    fontWeight: 'bold',
    color: currentColors?.AppointmentColor || '#333333',
  }),
  sectionTitle: (currentColors) => ({
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: currentColors?.headerText || '#333333',
    marginBottom: moderateScale(10),
  }),
  actionsContainer: {
    width: '100%',
  },
  actionButton: (currentColors, color) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: moderateScale(15),
    borderRadius: moderateScale(10),
    marginBottom: moderateScale(10),
    backgroundColor: currentColors?.tableRowBackground || '#FFFFFF',
    borderWidth: 1,
    borderColor: `${color}30`,
    shadowColor: color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  }),
  actionIconContainer: (color) => ({
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: color,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(15),
  }),
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: (currentColors) => ({
    fontSize: moderateScale(15),
    fontWeight: '600',
    marginBottom: moderateScale(2),
    color: currentColors?.AppointmentColor || '#333333',
  }),
  actionDescription: (currentColors) => ({
    fontSize: moderateScale(12),
    color: currentColors?.AppointmentColor || '#777777',
  }),
};

export default ActionMenu;