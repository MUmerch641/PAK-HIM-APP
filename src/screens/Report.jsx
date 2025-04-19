import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { verticalScale, moderateScale } from 'react-native-size-matters';
import PatientRegistrationForm from './PatientRegistration';
import CircularProgressComponent from '../components/pageComponents/Appointment/Circular';
import { renderTableHeader } from '../components/pageComponents/Report/renderTableHeader';
import { RenderTableRow } from '../components/pageComponents/Report/renderTableRow';
import { getHospitalReport } from '../ApiHandler/Report';
import FinancialReport from '../components/pageComponents/Report/View';
import DateRangePicker from '../components/pageComponents/Report/DateRangePicker';
import { getAssignedDoctors } from '../ApiHandler/Appointment';
import ExpandableDetails from '../components/Reuseable/Expandable';
import Toast from 'react-native-toast-message';
import { useTheme } from '../utils/ThemeContext';
import ThemeToggleButton from '../components/Reuseable/ThemeToggleButton';
import { useFocusEffect } from '@react-navigation/native';
import socketService from '../socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const Report = () => {
  const { currentColors } = useTheme();
  const defaultDateRange = {
    fromDate: new Date(new Date().setDate(new Date().getDate())).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  };
  const [loading, setOverlayLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [showPatientScreen, setShowPatientScreen] = useState(false);
  const [showViewScreen, setShowViewScreen] = useState(false);
  const [report, setReport] = useState([]);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [sumOfReport, setSumOfReport] = useState({
    totalCharges: 0,
    totalDoctorCharges: 0,
    totalHospitalCharges: 0,
    totalDiscountCharges: 0,
    totalCompany_charges: 0,
  });
  const [noReportFound, setNoReportFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(false);

  const [Reports, setReports] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);
  const [isCurrentUserDoctor, setIsCurrentUserDoctor] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setProjectId(userData.projectId || null);
          if (userData.fullName) {
            window.currentUserFullName = userData.fullName;
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    setConnectionStatus(socketService.isConnected());
    const handleConnect = () => setConnectionStatus(true);
    const handleDisconnect = () => setConnectionStatus(false);
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
    };
  }, []);

  const fetchReport = async (doctorId = '') => {
    setIsLoading(true);
    const params = {
      userIds: [],
      doctorIds: doctorId ? [doctorId] : [],
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate
    };
    try {
      const response = await getHospitalReport(params);
      if (response.data.length === 0) {
        setNoReportFound(true);
      } else {
        const reportData = response.data.map((item, index) => ({
          No: index + 1,
          DrName: item.doctorName,
          TotalAppointments: item.totalAppointments,
          DiscountCharges: item.discountCharges,
          DoctorCharges: item.docterCharges,
          DoctorId: item.doctorId
        }));
        setReport(reportData);
        setSumOfReport(response.sumReports);
        setNoReportFound(false);
      }
    } catch (error) {
      console.error("Error fetching hospital report:", error);
      setNoReportFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = socketService.listenToProjectEvents((data) => {
      if (data.module === 'appointments' || 
         (data.module === 'employee' && 
          (data.operation === 'update' || data.operation === 'delete'))) {
        fetchReport(selectedDoctor);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [projectId, selectedDoctor, dateRange]);

  useFocusEffect(
    useCallback(() => {
      fetchReport(selectedDoctor);
    }, [selectedDoctor, dateRange])
  );

  useEffect(() => {
    fetchReport(selectedDoctor);
  }, [dateRange, selectedDoctor]);

  const { themeMode } = useTheme();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await getAssignedDoctors();
        const doctorsList = response.map(doctor => ({
          _id: doctor._id,
          fullName: doctor.fullName,
          services: doctor.services || []
        }));
        setDoctors(doctorsList);
        const currentUserFullName = window.currentUserFullName;
        if (currentUserFullName) {
          const matchingDoctor = doctorsList.find(
            doctor => doctor.fullName.toLowerCase() === currentUserFullName.toLowerCase()
          );
          if (matchingDoctor) {
            setSelectedDoctor(matchingDoctor._id);
            setServices(matchingDoctor.services || []);
            setIsCurrentUserDoctor(true);
          } else if (doctorsList.length > 0) {
            setServices(doctorsList[0].services || []);
          }
        } else if (doctorsList.length > 0) {
          setServices(doctorsList[0].services || []);
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };
    fetchDoctors();
  }, []);

  const handleDoctorChange = (doctorId) => {
    if (isCurrentUserDoctor) return;
    setIsDoctorDropdownOpen(false);
    if (doctorId === '') {
      setSelectedDoctor('');
      setServices([]);
      return;
    }
    const selectedDoctor = doctors.find((doctor) => doctor._id === doctorId);
    if (selectedDoctor) {
      setSelectedDoctor(selectedDoctor._id);
      setServices(selectedDoctor.services);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReport(selectedDoctor);
    setRefreshing(false);
  };

  const toggleExpand = (index) => {
    if (expandedRowIndex === index) {
      setExpandedRowIndex(null);
    } else {
      setExpandedRowIndex(index);
      setSelectedRowIndex(null)
    }
  };

  const closeDropdown = () => {
    if (isDoctorDropdownOpen) {
      setIsDoctorDropdownOpen(false);
    }
  };

  return (
    <SafeAreaView style={[styles(currentColors).container, { position: 'relative' }]}>
      {!connectionStatus && (
        <View style={styles(currentColors).connectionStatusBar}>
          <Ionicons name="cloud-offline-outline" size={moderateScale(16)} color="white" />
          <Text style={styles(currentColors).connectionStatusText}>Offline - Updates may be delayed</Text>
        </View>
      )}
      {loading && (
        <View style={styles(currentColors).loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles(currentColors).loadingText}>Generating PDF...</Text>
        </View>
      )}
      {showPatientScreen ? (
        <PatientRegistrationForm onClose={() => setShowPatientScreen(false)} />
      ) : showViewScreen ? (
        <FinancialReport Reports={Reports} selectedDate={dateRange} onClose={() => setShowViewScreen(false)} />
      ) : (
        <>
          <View style={styles(currentColors).header}>
            <TouchableOpacity onPress={() => logout()}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles(currentColors).headerTitle}>Report</Text>
            <ThemeToggleButton themeMode={themeMode} />
          </View>

          <View style={styles(currentColors).searchContainer}>
            <View style={styles(currentColors).filterButton}>
              <TouchableOpacity
                style={[
                  styles(currentColors).dropdownButton,
                  isCurrentUserDoctor && styles(currentColors).disabledDropdown
                ]}
                onPress={() => !isCurrentUserDoctor && setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
                disabled={isCurrentUserDoctor}
              >
                <Text style={styles(currentColors).dropdownButtonText}>
                  {selectedDoctor ? doctors.find(doc => doc._id === selectedDoctor)?.fullName : 'All Doctor'}
                </Text>
                {!isCurrentUserDoctor && (
                  <Ionicons
                    name={isDoctorDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={moderateScale(20)}
                    color={currentColors.dropdownText}
                  />
                )}
              </TouchableOpacity>
              {isDoctorDropdownOpen && !isCurrentUserDoctor && (
                <View style={styles(currentColors).dropdown}>
                  <ScrollView 
                    style={styles(currentColors).dropdownScroll}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <TouchableOpacity
                      style={styles(currentColors).dropdownItem}
                      onPress={() => handleDoctorChange('')}
                    >
                      <Text style={styles(currentColors).dropdownItemText}>All Doctor</Text>
                    </TouchableOpacity>
                    {doctors.map((doctor) => (
                      <TouchableOpacity
                        key={doctor._id}
                        style={styles(currentColors).dropdownItem}
                        onPress={() => handleDoctorChange(doctor._id)}
                      >
                        <Text style={styles(currentColors).dropdownItemText}>{doctor.fullName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <DateRangePicker
              onDateRangeChange={(range) => {
                setDateRange(range);
              }}
              currentColors={currentColors}
            />
          </View>

          <View style={styles(currentColors).filterContainer}>
            <CircularProgressComponent sumOfReport={sumOfReport} />
          </View>

          {isLoading ? (
            <View style={styles(currentColors).loaderContainer}>
              <ActivityIndicator size="large" color={currentColors.paginationButtonBorder} />
            </View>
          ) : noReportFound ? (
            <View style={styles(currentColors).noReportContainer}>
              <Text style={styles(currentColors).noReportText}>No report found</Text>
            </View>
          ) : (
            <>
              {renderTableHeader(currentColors)}
              <FlatList
                data={report}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View>
                    <TouchableOpacity onPress={() => toggleExpand(index)}>
                      <RenderTableRow
                        report={item}
                        index={index}
                        selectedRowIndex={selectedRowIndex}
                        setSelectedRowIndex={setSelectedRowIndex}
                        setShowViewScreen={setShowViewScreen}
                        dateRange={dateRange}
                        setReports={setReports}
                        setOverlayLoading={setOverlayLoading}
                        closeExpandable={() => setExpandedRowIndex(null)}
                        currentColors={currentColors}
                      />
                    </TouchableOpacity>
                    {expandedRowIndex === index && (
                      <ExpandableDetails data={item} type="report" />
                    )}
                  </View>
                )}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={!isLoading ? (
                  <View style={styles(currentColors).noDataContainer}>
                    <Text style={styles(currentColors).noDataText}>No reports found</Text>
                  </View>
                ) : null}
              />
            </>
          )}

          {isDoctorDropdownOpen && (
            <TouchableWithoutFeedback onPress={closeDropdown}>
              <View style={styles(currentColors).dropdownOverlay} />
            </TouchableWithoutFeedback>
          )}
        </>
      )}
      <Toast />
    </SafeAreaView>
  );
};

export default Report;

const styles = (currentColors) => {
  return StyleSheet.create({
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingText: {
      color: '#fff',
      marginTop: moderateScale(10),
      fontSize: moderateScale(16),
    },
    container: {
      flex: 1,
      backgroundColor: currentColors.background
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      backgroundColor: currentColors.headerBackground,
    },
    headerTitle: {
      color: currentColors.headerText,
      fontSize: moderateScale(18),
      fontWeight: '600',
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      gap: moderateScale(10),
    },
    filterButton: {
      flexDirection: 'row',
      width: width / 2 - moderateScale(20),
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      borderRadius: moderateScale(10),
      borderWidth: moderateScale(1),
      borderColor: currentColors.dropdownBorder,
    },
    filterContainer: {
      backgroundColor: 'white',
      flexDirection: 'row',
    },
    filterButtonText: {
      color: '#0066FF',
      fontSize: moderateScale(12),
    },
    tabContainerMain: {
      backgroundColor: 'white'
    },
    activeTab: {
      backgroundColor: '#0066FF',
      color: 'white',
    },
    tabText: {
      color: '#0066FF',
      fontSize: moderateScale(14),
      fontWeight: '800',
    },
    activeTabText: {
      color: 'white',
    },
    tableContainer: {
      flex: 1,
      backgroundColor: 'white',
    },
    tableHeader: {
      flexDirection: 'row',
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
      backgroundColor: '#0066FF',
      alignItems: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
      alignItems: 'center',
      backgroundColor: 'white',
    },
    headerText: {
      color: 'white',
      fontSize: moderateScale(11),
      fontWeight: '500',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cellText: {
      color: '#333',
      fontSize: moderateScale(12),
    },
    tokenColumn: {
      width: '16%',
      alignItems: 'flex-start',
      marginLeft: moderateScale(5),
    },
    mrnColumn: {
      width: '15%',
      alignItems: 'flex-start',
    },
    nameColumn: {
      width: '16%',
      alignItems: 'center',
    },
    ageColumn: {
      width: '14%',
      alignItems: 'center',
    },
    timeColumn: {
      width: '17%',
      alignItems: 'center',
    },
    statusColumn: {
      width: '10%',
      alignItems: 'center',
      marginRight: moderateScale(5),
    },
    actionColumn: {
      width: '12%',
      alignItems: 'center',
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: moderateScale(8),
      gap: moderateScale(8),
    },
    actionText: {
      fontSize: moderateScale(14),
    },
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
      backgroundColor: '#f5f5f5',
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
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: moderateScale(15),
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
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
    patientScreen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
    },
    patientTitle: {
      fontSize: moderateScale(24),
      fontWeight: 'bold',
      marginBottom: verticalScale(20),
    },
    closeButton: {
      padding: moderateScale(10),
      backgroundColor: '#0066FF',
      borderRadius: moderateScale(5),
    },
    closeButtonText: {
      color: 'white',
      fontSize: moderateScale(16),
    },
    noReportContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noReportText: {
      fontSize: moderateScale(18),
      color: '#0066FF',
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      height: verticalScale(400),
    },
    noDataContainer: {
      padding: moderateScale(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    noDataText: {
      fontSize: moderateScale(14),
      color: '#0066FF',
      textAlign: 'center',
    },
    dropdownButton: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      padding: moderateScale(6),
      borderRadius: moderateScale(10),
      borderWidth: moderateScale(1),
      borderColor: 'transparent',
    },
    dropdownButtonText: {
      color: currentColors.dropdownText,
      fontSize: moderateScale(12),
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: currentColors.dropdownBackground,
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 1000,
      maxHeight: verticalScale(250),
    },
    dropdownScroll: {
      maxHeight: verticalScale(250),
    },
    dropdownItem: {
      padding: moderateScale(12),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
    },
    dropdownItemText: {
      fontSize: moderateScale(14),
      color: currentColors.dropdownText,
    },
    dropdownOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 999,
    },
    connectionStatusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: verticalScale(5),
      marginHorizontal: moderateScale(15),
      marginTop: verticalScale(5),
      marginBottom: 0,
      borderRadius: moderateScale(4),
      backgroundColor: '#e53935',
      zIndex: 10,
    },
    connectionStatusText: {
      color: 'white',
      fontSize: moderateScale(12),
      fontWeight: '500',
      marginLeft: moderateScale(5),
    },
    disabledDropdown: {
      opacity: 0.8,
      borderColor: currentColors.dropdownBorder,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
  });
}