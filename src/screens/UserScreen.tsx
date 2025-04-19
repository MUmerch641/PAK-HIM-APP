import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Clipboard,
  Alert,
  RefreshControl,
  Share
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../utils/ThemeContext";
import ThemeToggleButton from "../components/Reuseable/ThemeToggleButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logout, getUserProfile, getProjectProfile, UserProfileData, ProjectProfileData } from "../Auth/authService";
import { Ionicons } from "@expo/vector-icons";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Toast from "react-native-toast-message";

interface ExtendedUserProfileData extends UserProfileData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  userCategory?: string;
  userType?: string[];
  isActive?: boolean;
  phonNumber?: string;
  photoUrl?: string;
  projectId?: string;
  city?: string;
  nationality?: string;
  jobType?: string;
  dr_details?: {
    specialization?: string;
    slotIntervalTime?: string;
  };
}

const { width } = Dimensions.get('window');

export default function ResponsiveProfileScreen() {
  const { currentColors, themeMode } = useTheme();

  const [userData, setUserData] = useState<ExtendedUserProfileData | null>(null);
  const [projectData, setProjectData] = useState<ProjectProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [showQr, setShowQr] = useState<boolean>(false);
  const profileScale = useSharedValue(1);
  const popupOpacity = useSharedValue(0);
  const qrValue = projectId ? `https://patient.pakhims.com/signup/${projectId}` : '';

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [profileData, projectProfileData] = await Promise.all([
        getUserProfile(),
        getProjectProfile()
      ]);
      if (profileData) {
        setUserData(profileData as ExtendedUserProfileData);
        setProjectId(profileData.projectId || '');
      } else {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const storedData = JSON.parse(userDataString);
          setUserData(storedData);
          setProjectId(storedData.projectId || '');
        }
      }

      if (projectProfileData) {
        setProjectData(projectProfileData);
      }
      else{
        const projectDataString = await AsyncStorage.getItem('projectProfileData');
        if (projectDataString) {
          const storedProjectData = JSON.parse(projectDataString);
          setProjectData(storedProjectData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setShowQr(projectData?.departmentsAccess?.includes('online_appointment') || false);
  }, [projectData]);

  const handleEmailClick = () => {
    popupOpacity.value = withSpring(1);
    setTimeout(() => {
      popupOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    }, 2000);
  };

  const handleCopyLink = () => {
    if (qrValue) {
      Clipboard.setString(qrValue);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Link copied to clipboard!"
      });
    }
  };

  const handleShare = async () => {
    if (qrValue) {
      try {
        const result = await Share.share({
          message: 'Make an online appointment using this link:',
          url: qrValue,
          title: 'Online Appointment Link',
        });
        
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            console.log('Shared with activity type:', result.activityType);
          } else {
            console.log('Shared successfully');
          }
        } else if (result.action === Share.dismissedAction) {
          console.log('Share dismissed');
        }
      } catch (error) {
        console.error('Error sharing:', error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Could not share the link"
        });
      }
    }
  };

  const animatedPopupStyle = useAnimatedStyle(() => ({
    opacity: popupOpacity.value,
    transform: [{ scale: popupOpacity.value }],
  }));

  const ProfileStat = ({ label, value, icon, color, onPress }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statContainer, { backgroundColor: currentColors.dropdownBackground }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color || currentColors.tabBackground }]}>
        {icon}
      </View>
      <Text style={[styles.statLabel, { color: currentColors.AppointmentColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: currentColors.AppointmentColor }]} numberOfLines={1}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: currentColors.AppointmentColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: currentColors.AppointmentColor }]}>{value}</Text>
    </View>
  );

  const handleProfilePress = () => {
    profileScale.value = withSpring(0.95);
    setTimeout(() => profileScale.value = withSpring(1), 100);
  };

  const animatedProfileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: profileScale.value }]
  }));

  const isAdmin = userData?.userType?.includes('admin');

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[styles.loadingText, { color: currentColors.AppointmentColor }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderUserSpecificDetails = () => {
    if (!userData) return null;

    if (isAdmin) {
      return (
        <View style={[styles.detailsCard, { backgroundColor: currentColors.bgColorCards, marginTop: verticalScale(10) }]}>
          <Text style={[styles.sectionSubtitle, { color: currentColors.AppointmentColor }]}>
            Hospital Details
          </Text>
          <DetailRow label="Hospital Name" value="Demo hospital" />
          <DetailRow label="Description" value="Demo description" />
          <DetailRow label="Address" value="Rahim Yar Khan" />
          <DetailRow label="Official Email" value="mnadeem76298@gmail.com" />
          <DetailRow label="Phone number" value="03028876298" />
          <DetailRow label="Contract Expiry Date" value="04.06.2025" />
        </View>
      );
    } else if (userData.userCategory === "Doctor") {
      return (
        <View style={[styles.detailsCard, { backgroundColor: currentColors.bgColorCards, marginTop: verticalScale(10) }]}>
          <Text style={[styles.sectionSubtitle, { color: currentColors.AppointmentColor }]}>
            Doctor Details
          </Text>
          <DetailRow label="Specialization" value={userData.dr_details?.specialization || 'N/A'} />
          <DetailRow label="Job Type" value={userData.jobType || 'N/A'} />
          <DetailRow label="Interval Time" value={`${userData.dr_details?.slotIntervalTime || 'N/A'} min`} />
        </View>
      );
    } else {
      return (
        <View style={[styles.detailsCard, { backgroundColor: currentColors.bgColorCards, marginTop: verticalScale(10) }]}>
          <Text style={[styles.sectionSubtitle, { color: currentColors.AppointmentColor }]}>
            Additional Details
          </Text>
          <DetailRow label="User Category" value={userData.userCategory || 'Regular User'} />
          <DetailRow label="City" value={userData.city || 'N/A'} />
          <DetailRow label="Nationality" value={userData.nationality || 'N/A'} />
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { backgroundColor: currentColors.headerBackground }]}>
        <TouchableOpacity onPress={() => logout()}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <ThemeToggleButton themeMode={themeMode} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={fetchData} 
          />
        }
      >
        <Animated.View style={animatedProfileStyle}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleProfilePress}
            style={styles.profileSection}
          >
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: userData?.photoUrl || "https://i.pinimg.com/736x/57/ed/25/57ed25ccf5133bf3dfe5aa440a8273de.jpg" }}
                style={styles.profileImage}
              />
              <View style={[styles.statusBadge, { backgroundColor: userData?.isActive ? '#4CAF50' : '#F44336' }]} />
            </View>
            <Text style={[styles.name, { color: currentColors.AppointmentColor }]}>
              {userData?.fullName || `${userData?.firstName || ''} ${userData?.lastName || ''}`}
            </Text>
            <Text style={[styles.role, { color: currentColors.AppointmentColor }]}>
              {userData?.userCategory || userData?.userType?.join(', ') || 'User'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statsContainer}>
          <ProfileStat
            label="Email"
            value={userData?.email || 'N/A'}
            icon={<Ionicons name="mail-outline" size={20} color={currentColors.activeTabBackground} />}
            color={currentColors.tabBackground}
            onPress={handleEmailClick}
          />
          <ProfileStat
            label="Phone"
            value={userData?.phonNumber || 'N/A'}
            icon={<Ionicons name="call-outline" size={20} color="#4CAF50" />}
            color={currentColors.tabBackground}
          />
          <ProfileStat
            label="Status"
            value={userData?.isActive ? 'Active' : 'Inactive'}
            icon={<Ionicons name="pulse-outline" size={20} color={userData?.isActive ? '#4CAF50' : currentColors.toastErrorBorder} />}
            color={userData?.isActive ? currentColors.tabBackground : "rgba(255,235,238,0.5)"}
          />
        </View>

        <Animated.View
          style={[
            styles.emailPopup,
            animatedPopupStyle,
            { backgroundColor: currentColors.bgColorCards }
          ]}
        >
          <Text style={[styles.emailPopupText, { color: currentColors.AppointmentColor }]}>
            {userData?.email || 'N/A'}
          </Text>
        </Animated.View>

        <View style={styles.detailsContainer}>
          {renderUserSpecificDetails()}
          {projectId && showQr && (
            <View style={[styles.qrCard, { backgroundColor: currentColors.bgColorCards, marginTop: verticalScale(10) }]}>
              <Text style={[styles.sectionSubtitle, { color: currentColors.AppointmentColor }]}>
                Scan QR Code For Online Appointment
              </Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrValue}
                  size={scale(150)}
                  color={currentColors.AppointmentColor}
                  backgroundColor={currentColors.bgColorCards}
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: currentColors.tabBackground }]}
                  onPress={handleCopyLink}
                >
                  <Text style={[styles.copyButtonText, { color: currentColors.activeTabBackground }]}>
                    Copy Link
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: currentColors.tabBackground }]}
                  onPress={handleShare}
                >
                  <Ionicons name="share-social" size={moderateScale(16)} color={currentColors.activeTabBackground} style={styles.shareIcon} />
                  <Text style={[styles.shareButtonText, { color: currentColors.activeTabBackground }]}>
                    Share Link
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    color: 'white',
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  content: {
    padding: scale(15),
    paddingBottom: verticalScale(20),
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: verticalScale(25),
    padding: scale(10),
    borderRadius: 15,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: verticalScale(12),
  },
  profileImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 2,
    borderColor: '#4287f5',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontSize: moderateScale(22),
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  role: {
    fontSize: moderateScale(14),
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(5),
  },
  statContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: scale(5),
    padding: scale(8),
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  statIconContainer: {
    width: scale(45),
    height: scale(45),
    borderRadius: scale(22.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  statLabel: {
    fontSize: moderateScale(12),
    opacity: 0.7,
    textAlign: 'center',
  },
  statValue: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsContainer: {
    marginTop: verticalScale(15),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: verticalScale(10),
  },
  sectionSubtitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: verticalScale(8),
  },
  detailsCard: {
    padding: scale(12),
    borderRadius: 12,
  },
  qrCard: {
    padding: scale(12),
    borderRadius: 12,
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: verticalScale(8),
    marginVertical: verticalScale(8),
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    fontSize: moderateScale(13),
    opacity: 0.7,
    flex: 1,
  },
  detailValue: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  emailPopup: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    padding: scale(12),
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(34, 21, 151, 0.9)',
  },
  emailPopupText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: moderateScale(16),
    marginTop: verticalScale(10),
  },
  qrContainer: {
    marginVertical: verticalScale(10),
    padding: scale(8),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(10),
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  shareIcon: {
    marginRight: scale(8),
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
});