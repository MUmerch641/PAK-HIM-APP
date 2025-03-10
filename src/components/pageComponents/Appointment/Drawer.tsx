import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  TouchableHighlight,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import { logout } from '@/src/Auth/authService';

const { width } = Dimensions.get('window');

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, activeTab }) => {
  const [animation] = useState(new Animated.Value(-width));

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isOpen ? 0 : -width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const menuItems = [
    { icon: '👥', label: 'Employees' },
    { icon: '🏥', label: 'Insurance' },
    { icon: '🏨', label: 'OPD' },
    { icon: '🛏️', label: 'IPD' },
    { icon: '🔬', label: 'Pathology' },
    { icon: '📡', label: 'Radiology' },
  ];

  const getDrawerBackgroundColor = () => {
    switch (activeTab) {
      case 'Active':
        return '#DDE6FB';
      case 'Checked':
        return '#E6FBD4';
      default:
        return 'white';
    }
  };

  return (
    <>
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: animation }],
            backgroundColor: getDrawerBackgroundColor(),
          },
        ]}
      >
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507206130118-b5907f817163?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.profileName}>Jawaria Ahsan</Text>
          <Text style={styles.profileEmail}>Jawariahsan770@gmail.com</Text>
        </View>

        {/* Navigation Items */}
        <View style={styles.drawerContent}>
          <TouchableOpacity style={[styles.drawerItem, styles.activeDrawerItem]}>
            <Ionicons name="calendar" size={24} color="#0066FF" />
            <Text style={[styles.drawerItemText, styles.activeDrawerItemText]}>Appointments</Text>
          </TouchableOpacity>

          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.drawerItem}>
              <Text style={styles.drawerItemIcon}>{item.icon}</Text>
              <Text style={styles.drawerItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableHighlight
        onPress={() => logout()}
        style={{
          padding: moderateScale(15),
          backgroundColor: '#0066FF',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        underlayColor="#0056D2"
      >
        <Text style={{ color: 'white', fontSize: moderateScale(16), fontWeight: '600' }}>Logout</Text>
      </TouchableHighlight>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.75,
    backgroundColor: 'white',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileSection: {
    padding: moderateScale(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    overflow: 'hidden',
    marginBottom: moderateScale(10),
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: moderateScale(5),
  },
  profileEmail: {
    fontSize: moderateScale(14),
    color: '#666',
  },
  drawerContent: {
    flex: 1,
    paddingTop: moderateScale(15),
    backgroundColor: '#fff',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeDrawerItem: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF',
  },
  drawerItemIcon: {
    fontSize: moderateScale(20),
    marginRight: moderateScale(15),
    marginLeft: moderateScale(5),
  },
  drawerItemText: {
    fontSize: moderateScale(16),
    color: '#333',
  },
  activeDrawerItemText: {
    color: '#0066FF',
    fontWeight: '600',
    marginRight: moderateScale(15),
    marginLeft: moderateScale(5),
  },
});

export default Drawer;
