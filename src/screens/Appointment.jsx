import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Drawer from '../components/pageComponents/Appointment/Drawer';
import PatientRegistrationForm from './PatientRegistration'; // Ensure this is correctly exported
import EditAppointmentModal from '../components/pageComponents/Appointment/EditModal'; // Ensure this is correctly exported
import Vitals from '../components/pageComponents/Appointment/Vitals'; // Ensure this is correctly exported
import Toast from 'react-native-toast-message'; // Import Toast
import { deleteAppointment, getAllAppointments, updateAppointment, checkAppointment, getAppointmentsByDoctorId, uncheckAppointment, addVitals } from '../ApiHandler/Appointment';
import { UpdateAppointments } from '../components/pageComponents/Appointment/UpdateAppoint';
import { getDoctors, getPatientByMRN } from '../ApiHandler/Patient';
import PDFGenerator from '../components/pageComponents/Appointment/PDFGenerator'; // Ensure this is correctly exported
import GetDoctors from '../components/Reuseable/GetDoctors'; // Ensure this is correctly exported
import StatusSelectionModal from '../components/pageComponents/Appointment/StatusSelectionModal'; // Ensure this is correctly exported
import UnCheckModal from '../components/pageComponents/Appointment/unCheckModal'; // Ensure this is correctly exported
import { FlatList } from 'react-native';
import DeleteModal from '../components/pageComponents/Appointment/DeleteModal'; // Ensure this is correctly exported
import DateTimePicker from '@react-native-community/datetimepicker';
import ActionMenu from '../components/pageComponents/Appointment/ActionModal';
import { useDebounce } from 'use-debounce';
import ExpandableDetails from '../components/Reuseable/Expandable';
import { colors } from '../utils/color'
import { useTheme } from '../utils/ThemeContext';
import ThemeToggleButton from '../components/Reuseable/ThemeToggleButton';
import { logout } from '../Auth/authService';

const { width } = Dimensions.get('window');


const AppointmentScreen = () => {
  const { currentColors } = useTheme(); // Get the current theme mode

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPatientScreen, setShowPatientScreen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [VitalModalVisible, setVitalModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // This will be your count parameter
  const [totalAppointments, setTotalAppointments] = useState(0); // Add this to track total count
  const [patientNames, setPatientNames] = useState({});
  const [patientDOBs, setPatientDOBs] = useState({});
  const [showTokenScreen, setShowTokenScreen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [searchMRN, setSearchMRN] = useState(''); // Add state for search MRN
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [UncheckModal, setUncheckModal] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true); // Add this new state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [menuPositions, setMenuPositions] = useState({});
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [debouncedSearchTerm] = useDebounce(searchMRN, 800);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null); // To track which appointment is expanded
  const [emergencyMessage, setEmergencyMessage] = useState('');
  useEffect(() => {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Login Successful',
    });

    // Return a cleanup function or nothing
    return () => { };
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await getDoctors({});
        const doctorsList = response.data;
        setDoctors(doctorsList);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };

    fetchDoctors();

    // Return a cleanup function or nothing
    return () => { };
  }, []);

  const formatDateForAPI = (date) => {
    // Format as YYYY-MM-DD for API
    return date.toISOString().split('T')[0];
  };

  // const formatDateForDisplay = (date) => {
  //   return date.toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: '2-digit',
  //     day: '2-digit'
  //   });
  // };

  const handleDateChange = async (event, selectedDate) => {
    if (event.type === "set" && selectedDate) {
      setShowDatePicker(false);
      setSelectedDate(selectedDate);
      // Fetch appointments with the new date
      // setCurrentPage(1); 
      await fetchAppointments(); // Fetch new data
    } else {
      setShowDatePicker(false);
    }
  };


  const fetchAppointments = async (pageNo = currentPage, tab = activeTab) => {
    setIsLoading(true);
    try {
      const params = {
        count: itemsPerPage,
        pageNo,
        sort: "accending",
        checkStatus: tab,
        doctorIds: selectedDoctor ? [selectedDoctor] : [],
        appointmentDate: formatDateForAPI(selectedDate),
        search: searchMRN || undefined,
      };
      const response = await getAllAppointments(params);
      if (response && Array.isArray(response.data)) {
        const { data, totalCount } = response;
        if (data.length === 0 && pageNo === 1) {
          setAppointments([]);
          setHasMoreData(false);
        } else if (data.length === 0) {
          setHasMoreData(false);
        } else {
          setAppointments(data);
          const totalPages = Math.ceil(totalCount / itemsPerPage);
          setHasMoreData(pageNo < totalPages);
        }
        setTotalAppointments(totalCount);
      } else {
        console.error("Invalid appointments data:", response);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load appointments',
        });
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load appointments',
      });
      setAppointments([]);
      setHasMoreData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointmentsByDoctor = async (doctorId, pageNo = currentPage, checkStatus = activeTab) => {
    setIsLoading(true);
    try {
      const response = await getAppointmentsByDoctorId(
        doctorId,
        itemsPerPage,  // count
        pageNo,        // pageNo
        "accending",   // sort
        "",            // search
        selectedDate,  // appointmentDate
        checkStatus,   // checkStatus
        "all"          // feeStatus
      );

      if (response && Array.isArray(response.data)) {
        const { data, totalCount } = response;
        if (data.length === 0 && pageNo === 1) {
          setAppointments([]);
          setHasMoreData(false);
        } else if (data.length === 0) {
          setHasMoreData(false);
        } else {
          setAppointments(data);
          const totalPages = Math.ceil(totalCount / itemsPerPage);
          setHasMoreData(pageNo < totalPages);
        }
        setTotalAppointments(totalCount);
      } else {
        console.error("Invalid appointments data:", response);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load appointments',
        });
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load appointments',
      });
      setAppointments([]);
      setHasMoreData(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleSearch = async () => {
      if (searchMRN.trim() === '') {
        await fetchAppointments();
        return;

      }
      if (debouncedSearchTerm.trim()) {
        setIsLoading(true);
        try {
          await fetchAppointments();
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleSearch();

    // Return a cleanup function or nothing
    return () => { };
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchAppointmentsByDoctor(selectedDoctorId, currentPage, activeTab);
    } else {
      fetchAppointments(currentPage, activeTab);
    }

    // Return a cleanup function or nothing
    return () => { };
  }, [currentPage, activeTab, selectedDoctorId]); // Refetch when page, activeTab, or selectedDoctorId changes

  useEffect(() => {
    fetchAppointments(currentPage, activeTab);

    // Return a cleanup function or nothing
    return () => { };
  }, [currentPage, activeTab]); // Refetch when page or activeTab changes

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Return a cleanup function or nothing
    return () => { };
  }, [opacity]);

  const backgroundColor = opacity.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 0, 0, 0.315)', '#e65050'], // Adjust the opacity values as needed
  });

  const PaginationControls = () => {
    // const totalPages = Math.ceil(totalAppointments / itemsPerPage);

    return (
      <View style={styles(currentColors).paginationContainer}>
        {/* <View>
         <Text>Total Entries {itemsPerPage}</Text>
        </View> */}
        <TouchableOpacity
          onPress={() => {
            if (currentPage > 1) {
              setCurrentPage(prev => prev - 1);
            }
          }}
          disabled={currentPage === 1}
          style={[styles(currentColors).paginationButton, currentPage === 1 && styles(currentColors).paginationButtonDisabled]}
        >
          <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? "#999" : "#0066FF"} />
        </TouchableOpacity>

        <Text style={styles(currentColors).paginationText}>
          Page {currentPage}
        </Text>

        <TouchableOpacity
          onPress={() => {
            if (hasMoreData) {
              setCurrentPage(prev => prev + 1);
            }
          }}
          disabled={!hasMoreData}
          style={[styles(currentColors).paginationButton, !hasMoreData && styles(currentColors).paginationButtonDisabled]}
        >
          <Ionicons
            name="chevron-forward"
            size={14}
            color={!hasMoreData ? "#999" : "#0066FF"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderTableHeader = () => (
    !isLoading && (
      <View style={styles(currentColors).tableHeader}>
        <View style={styles(currentColors).tokenColumn}><Text style={styles(currentColors).headerText}>Token</Text></View>
        <View style={styles(currentColors).mrnColumn}><Text style={styles(currentColors).headerText}>MRN</Text></View>
        <View style={styles(currentColors).nameColumn}><Text style={styles(currentColors).headerText}>Name</Text></View>
        <View style={styles(currentColors).actionColumn}><Text style={styles(currentColors).headerText}>Action</Text></View>
      </View>
    )
  );

  // Toggle expanded state for an appointment
  const toggleExpand = (index) => {
    if (expandedRowIndex === index) {
      setExpandedRowIndex(null); // Collapse if the same row is clicked again
    } else {
      setExpandedRowIndex(index); // Expand the clicked row
    }
  };

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(50)).current;
  const itemAnimatedValues = useRef([]);

  // Create animated values for each list item when appointments change
  useEffect(() => {
    itemAnimatedValues.current = appointments.map((_, i) => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20)
    }));

    // Animate list appearance when data loads
    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(listTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();

    // Staggered animation for each item
    appointments.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(itemAnimatedValues.current[i].opacity, {
          toValue: 1,
          duration: 500,
          delay: i * 100,
          useNativeDriver: true
        }),
        Animated.timing(itemAnimatedValues.current[i].translateY, {
          toValue: 0,
          duration: 500,
          delay: i * 100,
          useNativeDriver: true
        })
      ]).start();
    });
  }, [appointments]);

  const renderTableRow = ({ item, index }) => {
    const appointment = item;
    const isEmergency = appointment?.vitals && (
      appointment.vitals.temperature > 100 ||
      appointment.vitals.temperature < 92 ||
      appointment.vitals.RR > 20 ||
      appointment.vitals.RR < 12 ||
      appointment.vitals.HR > 180 ||
      appointment.vitals.HR < 30
    );

    if (isEmergency) {
      let message = '';
      if (appointment.vitals.temperature > 100) {
        message += "High temperature detected. ";
      }
      if (appointment.vitals.temperature < 92) {
        message += "Low temperature detected. ";
      }
      if (appointment.vitals.RR > 20) {
        message += "High respiratory rate detected. ";
      }
      if (appointment.vitals.RR < 12) {
        message += "Low respiratory rate detected. ";
      }
      if (appointment.vitals.HR > 180) {
        message += "High heart rate detected. ";
      }
      if (appointment.vitals.HR < 30) {
        message += "Low heart rate detected. ";
      }
      setEmergencyMessage(message);
    }

    const isExpanded = expandedRowIndex === index;

    // Use the pre-created animated values for this item
    const animatedStyle = {
      opacity: itemAnimatedValues.current[index]?.opacity || new Animated.Value(1),
      transform: [{ translateY: itemAnimatedValues.current[index]?.translateY || new Animated.Value(0) }]
    };

    return (
      <Animated.View style={animatedStyle}>
        <View>
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <Animated.View
              style={[
                styles(currentColors).tableRow,
                isEmergency && styles(currentColors).emergencyRow,
                isEmergency && { backgroundColor },
              ]}
            >
              <View style={styles(currentColors).tokenColumn}>
                <Text style={[styles(currentColors).cellText, isEmergency && { color: 'white' }]}>{appointment?.tokenId}</Text>
              </View>
              <View style={styles(currentColors).mrnColumn}>
                <Text style={[styles(currentColors).cellText, isEmergency && { color: 'white' }]}>{appointment?.mrn}</Text>
              </View>
              <View style={styles(currentColors).nameColumn}>
                <Text style={[styles(currentColors).cellText, isEmergency && { color: 'white' }]}>
                  {appointment?.patientId?.patientName || appointment?.patientName}
                </Text>
              </View>
              <View style={styles(currentColors).actionColumn}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAppointment(appointment);
                    setIsActionModalOpen(true);
                  }}
                  style={{
                    borderColor: '#0066FF',
                    borderWidth: moderateScale(1),
                    borderRadius: moderateScale(50),
                    padding: moderateScale(5),
                    paddingHorizontal: moderateScale(10),
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={moderateScale(15)}
                    color="#0066FF"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {isExpanded && (
            <ExpandableDetails data={appointment} type="appointment" />
          )}
        </View>
      </Animated.View>
    );
  };

  // Scroll animation - apply scale effect based on scroll position
  const getItemScale = (index) => {
    const itemSize = 60; // Approximate height of each row
    const scale = scrollY.interpolate({
      inputRange: [
        (index - 2) * itemSize,
        (index - 1) * itemSize,
        index * itemSize,
        (index + 1) * itemSize,
        (index + 2) * itemSize
      ],
      outputRange: [0.97, 0.98, 1, 0.98, 0.97],
      extrapolate: 'clamp'
    });
    return { transform: [{ scale }] };
  };

  const handleAppointmentUpdate = async (appointmentData) => {
    setIsLoading(true);
    try {
      await UpdateAppointments(appointmentData);
      await fetchAppointments();
    } catch (error) {
      console.error("Failed to update appointment:", error);
    } finally {
      setIsLoading(false);
      setModalVisible(false);
      setSelectedAppointment(null);
    }
  };

  const handleVitals = async (appointmentData) => {
    setIsLoading(true);
    try {
      await addVitals({
        ...appointmentData,
        appointmentId: selectedAppointment._id,
        patientId: selectedAppointment.patientId._id,
      });

      await fetchAppointments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add vitals',
      });
    }
    finally {
      setIsLoading(false);
      setVitalModalVisible(false);
      setSelectedAppointment(null);
    }

  }

  const handleDelete = async (appointmentId, reason) => {
    setIsLoading(true);
    try {
      await deleteAppointment(appointmentId, reason);
      fetchAppointments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete appointment',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when tab changes
    setHasMoreData(true); // Reset hasMoreData when changing tabs
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments(); // Fetch new data
    setRefreshing(false);
  };


  const handleDoctorChange = async (doctorId) => {
    setIsDoctorDropdownOpen(false);
    setSelectedDoctor(doctorId);
    await fetchAppointments(); // Fetch new data
  };

  // const handleDateChange = (selectedDate) => {
  //   setShowDatePicker(false);
  //   if (selectedDate) {
  //       setSelectedDate(selectedDate);
  // Fetch appointments with the new date
  //       setCurrentPage(1); // Reset to first page
  //       fetchAppointments(currentPage, activeTab);
  //     }
  //};

  const formatDateForDisplay = (date) => {
    const validDate = new Date(date);
    if (isNaN(validDate)) {
      return '';
    }
    return validDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  const checkHandle = async () => {
    setIsLoading(true);
    try {
      await uncheckAppointment(selectedAppointment._id);
      fetchAppointments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update appointment status',
      });
    }
    finally {
      setIsLoading(false);
      setUncheckModal(false)
    }
  }


  const { themeMode } = useTheme(); // Get the current theme mode

  return (
    <SafeAreaView style={styles(currentColors).container}>
      <>
        {showPatientScreen ? (
          <PatientRegistrationForm
            onClose={() => setShowPatientScreen(false)}
            fetchAppointments={fetchAppointments}
            setLoading={setIsLoading}
          />
        ) : showTokenScreen ? (
          <PDFGenerator tokenData={selectedAppointment} onClose={() => setShowTokenScreen(false)} />
        ) : (
          <>
            <View style={styles(currentColors).header}>
              <TouchableOpacity onPress={() => logout()}
              >
                <Ionicons name="log-in-outline" size={moderateScale(24)} color="white" />
              </TouchableOpacity>
              <Text style={styles(currentColors).headerTitle}>Appointment</Text>
              <ThemeToggleButton themeMode={themeMode} />
            </View>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} activeTab={activeTab} />

            <View style={styles(currentColors).searchContainer}>
              <View style={styles(currentColors).searchBar}>
                <TextInput
                  placeholder="Search Mrn Here"
                  placeholderTextColor="#ffffff"
                  style={styles(currentColors).searchInput}
                  value={searchMRN}
                  onChangeText={(text) => { setSearchMRN(text) }} // Add onChangeText handler
                />
                <Ionicons name="search" size={moderateScale(20)} color="#ffffff" />
              </View>
              <TouchableOpacity onPress={() => setShowPatientScreen(true)} style={styles(currentColors).addButton}>
                <Ionicons name="add" size={moderateScale(24)} color="white" />
              </TouchableOpacity>
            </View>


            <View style={styles(currentColors).filterContainer}>
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
                    color="#0066FF"
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
              <TouchableOpacity
                style={styles(currentColors).filterButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles(currentColors).filterButtonText}>{formatDateForDisplay(selectedDate)}</Text>
                <Ionicons name="calendar" size={moderateScale(20)} color="#0066FF" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  mode="date"
                  display="default"
                  value={selectedDate}
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={styles(currentColors).tabContainerMain}>
              <View style={styles(currentColors).tabContainer}>
                <TouchableOpacity
                  style={[styles(currentColors).tab, activeTab === 'active' && styles(currentColors).activeTab]}
                  onPress={() => handleTabChange('active')}
                >
                  <Text style={[styles(currentColors).tabText, activeTab === 'active' && styles(currentColors).activeTabText]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles(currentColors).tab, activeTab === 'checked' && styles(currentColors).activeTab]}
                  onPress={() => handleTabChange('checked')}
                >
                  <Text style={[styles(currentColors).tabText, activeTab === 'checked' && styles(currentColors).activeTabText]}>Checked</Text>
                </TouchableOpacity>
              </View>
            </View>

            {renderTableHeader()}
            {isLoading ? (
              <View style={styles(currentColors).loaderContainer}>
                <ActivityIndicator size="large" color="#0066FF" />
              </View>
            ) : (
              <Animated.View
                style={[
                  { flex: 1 },
                  { opacity: listOpacity, transform: [{ translateY: listTranslateY }] }
                ]}
              >
                <Animated.FlatList
                  data={appointments}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderTableRow}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                  )}
                  scrollEventThrottle={16}
                  ListEmptyComponent={!isLoading ? (
                    <View style={styles(currentColors).noDataContainer}>
                      <Text style={styles(currentColors).noDataText}>No appointments found</Text>
                    </View>
                  ) : null}
                  ListFooterComponent={appointments.length > 0 ? <PaginationControls /> : null}
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  contentContainerStyle={appointments.length === 0 ? { flex: 1, justifyContent: "center" } : {}}
                  extraData={expandedRowIndex}
                />
              </Animated.View>
            )}

            <EditAppointmentModal
              visible={modalVisible}
              onClose={() => {
                setModalVisible(false);
                setSelectedAppointment(null);
              }}
              onSave={handleAppointmentUpdate}
              appointment={selectedAppointment}
              currentColors={currentColors}
            />

            <Vitals
              visible={VitalModalVisible}
              onClose={() => setVitalModalVisible(false)}
              onSave={handleVitals}
              appointment={selectedAppointment}
              setIsLoading={setIsLoading} // Pass setIsLoading to Vitals
              fetchAppointments={fetchAppointments} // Pass fetchAppointments to Vitals
              emergencyMsg={emergencyMessage}
              setemergencyMsg={setEmergencyMessage}
            />

            <StatusSelectionModal
              visible={statusModalVisible}
              onClose={() => setStatusModalVisible(false)}
              onSelect={async (status) => {
                setIsLoading(true);
                try {
                  await checkAppointment(selectedAppointment._id, status, 'Referred to specialist', []);
                  fetchAppointments();
                  Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Appointment status updated successfully',
                  });
                } catch (error) {
                  Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to update appointment status',
                  });
                } finally {
                  setIsLoading(false);
                  setStatusModalVisible(false);
                }
              }}
            />
            <UnCheckModal onConfirm={checkHandle}
              visible={UncheckModal} onClose={() => setUncheckModal(false)} />
            <DeleteModal
              visible={deleteModalVisible}
              onClose={() => setDeleteModalVisible(false)}
              onDelete={(reason) => {
                handleDelete(selectedAppointment._id, reason);
                setDeleteModalVisible(false);
              }}
            />
          </>
        )}
      </>
      <Toast style={{ zIndex: 1001 }} />
      <ActionMenu
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onAction={(actionType, appointment) => {
          switch (actionType) {
            case 'edit':
              setModalVisible(true);
              break;
            case 'delete':
              setDeleteModalVisible(true);
              break;
            case 'token':
              setShowTokenScreen(true);
              break;
            case 'check':
              if (activeTab === 'checked') {
                setUncheckModal(true);
              } else {
                setStatusModalVisible(true);
              }
              break;
            case 'vitals':
              setVitalModalVisible(true);
              break;
          }
        }}
        appointment={selectedAppointment}
        activeTab={activeTab}
        currentColors={currentColors}
      />
    </SafeAreaView>
  );
};

const styles = (currentColors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.background,
    },


    filterContainer: {
      backgroundColor: currentColors.filterBackground,
      flexDirection: 'row',
      paddingHorizontal: moderateScale(15),
      gap: moderateScale(10),
      paddingVertical: verticalScale(15),
    },
    dropdownButton: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      padding: moderateScale(6),

    },
    dropdownButtonText: {
      color: currentColors.dropdownText,
      fontSize: moderateScale(12),
    },
    dropdown: {
      position: 'absolute',
      top: '110%',
      left: 0,
      right: 0,
      backgroundColor: currentColors.dropdownBackground,
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
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
    filterButton: {
      flexDirection: 'row',
      width: width / 2 - moderateScale(20),
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      padding: moderateScale(6),
      borderRadius: moderateScale(10),
      borderWidth: moderateScale(1),
      borderColor: currentColors.dropdownBorder,
    },
    filterButtonText: {
      color: currentColors.dropdownText,
      fontSize: moderateScale(12),
    },






    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      backgroundColor: currentColors.headerBackground,
      elevation: 5,
    },
    headerTitle: {
      color: currentColors.headerText,
      fontSize: moderateScale(18),
      fontWeight: '600',
      textShadowColor: 'rgba(102, 178, 255, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      gap: moderateScale(10),
      backgroundColor: currentColors.headerBackground,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: moderateScale(12),
      paddingHorizontal: moderateScale(8),
      borderWidth: moderateScale(1),
      borderColor: currentColors.dropdownBorder,

    },
    searchInput: {
      flex: 1,
      paddingVertical: verticalScale(8),
      marginLeft: moderateScale(10),
      fontSize: moderateScale(14),
      color: currentColors.headerText,
    },
    addButton: {
      backgroundColor: '#66B2FF',
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: moderateScale(8),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#0a3f75',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
      elevation: 5,
    },
    tabContainerMain: {
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    tabContainer: {
      borderTopRightRadius: moderateScale(20),
      borderTopLeftRadius: moderateScale(20),
      flexDirection: 'row',
      padding: moderateScale(10),
      paddingVertical: verticalScale(15),
      gap: moderateScale(10),
      backgroundColor: currentColors.tabBgColor,
    },
    tab: {
      width: scale(120),
      paddingVertical: verticalScale(8),
      alignItems: 'center',
      borderRadius: moderateScale(20),
      borderColor: '#0066ff89',
      borderWidth: moderateScale(1),
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
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      backgroundColor: currentColors.tableHeaderBackground,
      alignItems: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      backgroundColor: currentColors.tableRowBackground,
      alignItems: 'center',
    },
    headerText: {
      color: currentColors.headerText,
      fontSize: moderateScale(12),
      fontWeight: '600',
      textAlign: 'center',
      textShadowColor: 'rgba(102, 178, 255, 0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    cellText: {
      color: currentColors.AppointmentColor,
      fontSize: moderateScale(12),
      textAlign: 'center',
    },
    tokenColumn: {
      flex: 1,
      alignItems: 'center',
    },
    mrnColumn: {
      flex: 1,
      alignItems: 'center',
    },
    nameColumn: {
      flex: 1,
      alignItems: 'center',
    },
    actionColumn: {
      flex: 1,
      alignItems: 'center',
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingVertical: verticalScale(15),
      backgroundColor: currentColors.background,
      borderTopWidth: 1,
      borderTopColor: currentColors.dropdownBorder,
    },
    paginationButton: {
      padding: moderateScale(8),
      borderRadius: moderateScale(20),
      backgroundColor: currentColors.paginationButtonBackground,
      borderWidth: 1,
      borderColor: currentColors.paginationButtonBorder,
      marginHorizontal: moderateScale(10),
      shadowColor: currentColors.paginationButtonBorder,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    paginationButtonDisabled: {
      borderColor: currentColors.dropdownBorder,
      backgroundColor: currentColors.tabBackground,
    },
    paginationText: {
      fontSize: moderateScale(14),
      color: currentColors.AppointmentColor,
      marginHorizontal: moderateScale(3),
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      height: verticalScale(400),
      backgroundColor: currentColors.background,
    },
    noDataContainer: {
      padding: moderateScale(20),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: currentColors.background,
    },
    noDataText: {
      fontSize: moderateScale(14),
      color: currentColors.noDataText,
      textAlign: 'center',
    },
    emergencyRow: {
      flexDirection: 'row',
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      backgroundColor: currentColors.emergencyRowBackground,
      alignItems: 'center',
    }
  });
}
export default AppointmentScreen;
