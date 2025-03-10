import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { verticalScale, moderateScale } from 'react-native-size-matters';
import Drawer from '../components/pageComponents/Appointment/Drawer';
import PatientRegistrationForm from './PatientRegistration';
import CircularProgressComponent from '../components/pageComponents/Appointment/Circular';
import { renderTableHeader } from '../components/pageComponents/Report/renderTableHeader';
import { RenderTableRow } from '../components/pageComponents/Report/renderTableRow';
import { getHospitalReport } from '../ApiHandler/Report';
import FinancialReport from '../components/pageComponents/Report/View';
import DateRangePicker from '../components/pageComponents/Report/DateRangePicker';
import { Picker } from '@react-native-picker/picker';
import { getDoctors } from '../ApiHandler/Patient';
import ExpandableDetails from '../components/Reuseable/Expandable';
import Toast from 'react-native-toast-message';
import { useTheme } from '../utils/ThemeContext';
import ThemeToggleButton from '../components/Reuseable/ThemeToggleButton';

const { width } = Dimensions.get('window');

const Report = () => {
  // Move useColorScheme to the top level

  const { currentColors } = useTheme();
  // Set the initial date range to the default values used in DateRangePicker
  const defaultDateRange = {
    fromDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  };
  const [loading, setOverlayLoading] = useState(false); // Add loading state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Active');
  const [selectedDate, setSelectedDate] = useState('12/12/2024');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState(null); // Update state to handle new object structure
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

  const [Reports, setReports] = useState([]); // Initialize as an empty array
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);

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
    fetchReport(selectedDoctor);
  }, [dateRange, selectedDoctor]);
  const { themeMode } = useTheme(); // Get the current theme mode

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await getDoctors({});
        const doctorsList = response.data;
        setDoctors(doctorsList);
        if (doctorsList.length > 0) {
          setServices(doctorsList[0].services);
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };

    fetchDoctors();
  }, []);

  const handleDoctorChange = (doctorId) => {
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

  return (
    <SafeAreaView style={[styles(currentColors).container, { position: 'relative' }]}>
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
            <TouchableOpacity onPress={() => logout()}
            >
              <Ionicons name="log-in-outline" size={moderateScale(24)} color="white" />
            </TouchableOpacity>
            <Text style={styles(currentColors).headerTitle}>Report</Text>
            <ThemeToggleButton themeMode={themeMode} />
          </View>


          <View style={styles(currentColors).searchContainer}>
            <View style={styles(currentColors).filterButton}>
              <TouchableOpacity
                style={styles(currentColors).dropdownButton}
                onPress={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
              >
                <Text style={styles(currentColors).dropdownButtonText}>
                  {selectedDoctor ? doctors.find(doc => doc._id === selectedDoctor)?.fullName : 'Select Doctor'}
                </Text>
                <Ionicons
                  name={isDoctorDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={moderateScale(20)}
                  color={currentColors.dropdownText}
                />
              </TouchableOpacity>
              {isDoctorDropdownOpen && (
                <View style={styles(currentColors).dropdown}>
                  <TouchableOpacity
                    style={styles(currentColors).dropdownItem}
                    onPress={() => handleDoctorChange('')}
                  >
                    <Text style={styles(currentColors).dropdownItemText}>Select Doctor</Text>
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
                </View>
              )}
            </View>
            <DateRangePicker
              onDateRangeChange={(range) => {
                setDateRange(range);
              }}
              currentColors={currentColors} // Pass currentColors
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
              {renderTableHeader(currentColors)} {/* Pass currentColors */}
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
      zIndex: 1000, // Ensure this is higher than other components
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
    picker: {
      flex: 1,
      color: '#0066FF',
    },
    // searchBar: {
    //   flex: 1,
    //   flexDirection: 'row',
    //   alignItems: 'center',
    //   backgroundColor: 'white',
    //   borderRadius: moderateScale(12),
    //   paddingHorizontal: moderateScale(8),
    //   backgroundColor: 'transparent',
    //   borderRadius: moderateScale(8),
    //   borderColor: '#ffffff8d',
    //   borderWidth: moderateScale(1),
    // },
    // searchInput: {
    //   flex: 1,
    //   paddingVertical: verticalScale(8),
    //   marginLeft: moderateScale(10),
    //   fontSize: moderateScale(14),
    // },
    // addButton: {
    //   backgroundColor: '#4D94FF',
    //   width: moderateScale(40),
    //   height: moderateScale(40),
    //   borderRadius: moderateScale(8),
    //   justifyContent: 'center',
    //   alignItems: 'center',
    // },
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
  });
}