import React, { useState, useEffect, useCallback, useRef } from 'react';

// Extend the Window interface to include currentUserFullName
declare global {
  interface Window {
    currentUserFullName?: string;
  }
}
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  FlatList,
  AppState,
  AppStateStatus,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import { getAllDeletedAppointments, restoreDeletedAppointment } from '../ApiHandler/DeletedAppointment';
import { RestoreModal } from '../components/pageComponents/DeleteScreen/RestoreModal';
import { getAssignedDoctors } from '../ApiHandler/Appointment';
import DateTimePicker from '@react-native-community/datetimepicker';
import ExpandableDetails from '../components/Reuseable/Expandable';
import { useDebounce } from 'use-debounce';
import { useTheme } from '../utils/ThemeContext';
import ThemeToggleButton from '../components/Reuseable/ThemeToggleButton';
import { logout } from '../Auth/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import socketService from '../socket';

const { width } = Dimensions.get('window');

interface Appointment {
  mrn: string;
  doctorName: string;
  deleteReason: string;
  feeStatus: string;
  isChecked: boolean;
  _id: string;
  deletedBy: string;
  patientId: { patientName: string };
}

interface Doctor {
  _id: string;
  fullName: string;
}

interface PaginationData {
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

const DeleteHistoryScreen = () => {
  const { currentColors } = useTheme();
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPaginating, setIsPaginating] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(9);
  const [pagination, setPagination] = useState<PaginationData>({
    totalCount: 0,
    currentPage: 1,
    totalPages: 1
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState<boolean>(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tableData, setTableData] = useState<Appointment[]>([]);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
  const [searchMRN, setSearchMRN] = useState<string>('');
  const [debouncedSearchTerm] = useDebounce(searchMRN, 800);
  const appState = useRef(AppState.currentState);
  const [projectId, setProjectId] = useState<string>('');
  const [isCurrentUserDoctor, setIsCurrentUserDoctor] = useState<boolean>(false);
  const fetchRef = useRef<NodeJS.Timeout | null>(null);

  // Socket connection status monitoring
  useEffect(() => {
    console.log('Socket connected:', socketService.isConnected());
    const onConnect = () => {
      console.log('Socket connected with ID:', socketService.getSocketId());
    };
    const onConnectError = (err: any) => {
      console.log('Socket connection error:', err.message);
    };
    socketService.on('connect', onConnect);
    socketService.on('connect_error', onConnectError);
    return () => {
      socketService.off('connect');
      socketService.off('connect_error');
    };
  }, []);

  // Fetch projectId from AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const data = JSON.parse(userDataString);
          setProjectId(data.projectId || '');
          if (data.fullName) {
            window.currentUserFullName = data.fullName;
          }
          if (data.projectId) {
            socketService.updateProjectId(data.projectId);
          }
        }
      } catch (error) {
        console.error('Error fetching userData from AsyncStorage:', error);
      }
    };
    fetchUserData();
  }, []);

  // Listen for restore events using socketService
  useEffect(() => {
    if (projectId) {
      const onAppointmentDeleted = (data: any) => {
        console.log('Appointment deleted event received:', data);
        fetchDeletedAppointments(currentPage, selectedDoctor);
      };
      socketService.on('appointment_deleted', onAppointmentDeleted);
      const unsubscribe = socketService.listenToProjectEvents((data: any) => {
        console.log(`Received event for ${projectId}:`, data);
        if (data.module === 'appointments' && 
           (data.operation === 'update' || data.operation === 'delete')) {
          fetchDeletedAppointments(currentPage, selectedDoctor);
        }
      });
      return () => {
        socketService.off('appointment_deleted', onAppointmentDeleted);
        if (unsubscribe) unsubscribe();
      };
    }
  }, [projectId, currentPage, selectedDoctor]);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      socketService.connect();
    } else if (
      appState.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDeletedAppointments(1, selectedDoctor, selectedDate);
    }, [selectedDoctor, selectedDate])
  );

  // Main data fetching function with doctorId parameter and date parameter
  const fetchDeletedAppointments = useCallback(
    async (pageNo: number, doctorId: string = selectedDoctor, date: Date | null = selectedDate) => {
      if (fetchRef.current) {
        clearTimeout(fetchRef.current);
      }

      fetchRef.current = setTimeout(async () => {
        setIsLoading(pageNo === 1);
        setIsPaginating(pageNo !== 1);
        try {
          const params: any = {
            count: itemsPerPage,
            pageNo,
            sort: 'accending',
            doctorId: doctorId || undefined,
            search: debouncedSearchTerm || undefined,
          };

          if (date) {
            params.appointmentDate = formatDateForAPI(date);
          }

          const response = await getAllDeletedAppointments(params);
          if (response && response.data) {
            setTableData(response.data);
            setPagination({
              totalCount: response.totalCount || 0,
              currentPage: pageNo,
              totalPages: Math.ceil((response.totalCount || 0) / itemsPerPage),
            });
            setCurrentPage(pageNo);
          } else {
            setTableData([]);
            setPagination({
              totalCount: 0,
              currentPage: 1,
              totalPages: 1,
            });
            setCurrentPage(1);
          }
        } catch (error) {
          console.error('Error fetching deleted appointments:', error);
          setTableData([]);
          setPagination({
            totalCount: 0,
            currentPage: 1,
            totalPages: 1,
          });
          setCurrentPage(1);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to load deleted appointments',
          });
        } finally {
          setIsLoading(false);
          setIsPaginating(false);
        }
      }, 300);
    },
    [debouncedSearchTerm, selectedDoctor, selectedDate, itemsPerPage]
  );

  useEffect(() => {
    fetchDeletedAppointments(currentPage, selectedDoctor, selectedDate);
  }, [currentPage, debouncedSearchTerm, selectedDoctor, selectedDate, fetchDeletedAppointments]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await getAssignedDoctors();
        const doctorsList: Doctor[] = response.map(doctor => ({
          _id: doctor._id,
          fullName: doctor.fullName
        }));
        setDoctors(doctorsList);
        const currentUserFullName = window.currentUserFullName;
        if (currentUserFullName) {
          const matchingDoctor = doctorsList.find(
            doctor => doctor.fullName.toLowerCase() === currentUserFullName.toLowerCase()
          );
          if (matchingDoctor) {
            setSelectedDoctor(matchingDoctor._id);
            setIsCurrentUserDoctor(true);
            fetchDeletedAppointments(1, matchingDoctor._id);
          }
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    fetchDoctors();
  }, []);

  const RestoreHandle = async (item: Appointment) => {
    try {
      await restoreDeletedAppointment(item._id);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Appointment restored successfully',
      });
      socketService.emitHimsEvent('appointments', 'update');

      const newTotalCount = pagination.totalCount - 1;
      const newTotalPages = Math.ceil(newTotalCount / itemsPerPage);
      let newPage = currentPage;

      if (tableData.length === 1 && currentPage > 1) {
        newPage = currentPage - 1;
      } else if (currentPage > newTotalPages && newTotalPages > 0) {
        newPage = newTotalPages;
      }

      await fetchDeletedAppointments(newPage, selectedDoctor, selectedDate);
      setCurrentPage(newPage);
    } catch (error) {
      console.error('[Component] Error in RestoreHandle:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to restore appointment',
      });
    }
  };

  const handleRestorePress = (item: Appointment) => {
    setSelectedAppointment(item);
    setModalVisible(true);
  };

  const confirmRestore = async () => {
    if (selectedAppointment) {
      await RestoreHandle(selectedAppointment);
      setModalVisible(false);
      setSelectedAppointment(null);
    }
  };

  const formatDateForAPI = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return "All Dates";
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const clearDateSelection = async () => {
    setSelectedDate(null);
    setCurrentPage(1);
    fetchDeletedAppointments(1, selectedDoctor);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeletedAppointments(1, selectedDoctor, selectedDate);
    setCurrentPage(1);
    setRefreshing(false);
  };

  const handleDoctorChange = (doctorId: string) => {
    if (isCurrentUserDoctor) return;
    setIsDoctorDropdownOpen(false);
    setSelectedDoctor(doctorId);
    setCurrentPage(1);
    fetchDeletedAppointments(1, doctorId);
  };

  const handleDateChange = (event: any, newDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === 'set' && newDate) {
        const validDate = new Date(newDate);
        if (!isNaN(validDate.getTime())) {
          setSelectedDate(validDate);
          setCurrentPage(1);
          fetchDeletedAppointments(1, selectedDoctor);
        }
      }
    }
  };

  const renderDatePicker = () => {
    if (!showDatePicker) return null;

    if (Platform.OS === "ios") {
      return (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: currentColors.background,
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: moderateScale(10),
              borderBottomWidth: 1,
              borderBottomColor: currentColors.dropdownBorder,
            }}
          >
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text style={{ color: "#0066FF", fontSize: moderateScale(16) }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowDatePicker(false);
                setSelectedDate(selectedDate || new Date());
                fetchDeletedAppointments(1, selectedDoctor);
              }}
            >
              <Text style={{ color: "#0066FF", fontSize: moderateScale(16) }}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="spinner"
            onChange={(event, selected) => {
              if (selected) {
                setSelectedDate(selected);
              }
            }}
            style={{ height: 200 }}
          />
        </View>
      );
    } else {
      return (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      );
    }
  };

  const PaginationControls = () => (
    <View style={styles(currentColors).paginationContainer}>
      <View style={styles(currentColors).totalCountContainer}>
        <Ionicons 
          name="trash-outline" 
          size={moderateScale(18)} 
          color="#0066FF" 
          style={styles(currentColors).countIcon} 
        />
        <Text style={styles(currentColors).totalCountText}>
          Total:
        </Text>
        <Text style={styles(currentColors).totalCountValue}>
          {pagination.totalCount}
        </Text>
      </View>

      <View style={styles(currentColors).paginationControlsWrapper}>
        <TouchableOpacity
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPaginating}
          style={[
            styles(currentColors).paginationButton,
            (currentPage === 1 || isPaginating) && styles(currentColors).paginationButtonDisabled,
          ]}
        >
          {isPaginating && currentPage > 1 ? (
            <ActivityIndicator size="small" color="#0066FF" />
          ) : (
            <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? '#999' : '#0066FF'} />
          )}
        </TouchableOpacity>
        
        <Text style={styles(currentColors).paginationText}>
          Page {currentPage} of {pagination.totalPages || 1}
        </Text>
        
        <TouchableOpacity
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= pagination.totalPages || isPaginating}
          style={[
            styles(currentColors).paginationButton,
            (currentPage >= pagination.totalPages || isPaginating) &&
              styles(currentColors).paginationButtonDisabled,
          ]}
        >
          {isPaginating && currentPage < pagination.totalPages ? (
            <ActivityIndicator size="small" color="#0066FF" />
          ) : (
            <Ionicons name="chevron-forward" size={14} color={currentPage >= pagination.totalPages ? '#999' : '#0066FF'} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles(currentColors).tableHeader}>
      <Text style={[styles(currentColors).headerCell, styles(currentColors).mrnColumn]}>MRN</Text>
      <Text style={[styles(currentColors).headerCell, styles(currentColors).nameColumn]}>Name</Text>
      <Text style={[styles(currentColors).headerCell, styles(currentColors).reasonColumn]}>Reason</Text>
      <Text style={[styles(currentColors).headerCell, styles(currentColors).actionColumn]}>Action</Text>
    </View>
  );

  const toggleExpand = (index: number) => {
    setExpandedRowIndex(expandedRowIndex === index ? null : index);
  };

  const renderTableRow = (item: Appointment, index: number) => (
    <View>
      <TouchableOpacity onPress={() => toggleExpand(index)}>
        <View style={styles(currentColors).tableRow}>
          <Text style={[styles(currentColors).cell, styles(currentColors).mrnColumn]}>{item.mrn}</Text>
          <Text style={[styles(currentColors).cell, styles(currentColors).nameColumn]}>{item.patientId.patientName}</Text>
          <Text style={[styles(currentColors).cell, styles(currentColors).reasonColumn]}>{item.deleteReason}</Text>
          <TouchableOpacity onPress={() => handleRestorePress(item)} style={styles(currentColors).actionColumn}>
            <Ionicons name="refresh-outline" size={moderateScale(20)} color={currentColors.actionMenuTextColor} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      {expandedRowIndex === index && (
        <ExpandableDetails 
          data={{ 
            feeStatus: item.feeStatus, 
            isChecked: item.isChecked, 
            deletedBy: item.deletedBy,
            name: item.patientId.patientName
          }} 
          type="delete" 
          onUpdateData={() => {
          }}
        />
      )}
    </View>
  );

  const { themeMode } = useTheme();

  const closeDropdown = () => {
    if (isDoctorDropdownOpen) {
      setIsDoctorDropdownOpen(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchDeletedAppointments(newPage, selectedDoctor, selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles(currentColors).container}>
      {!socketService.isConnected() && (
        <View style={[styles(currentColors).connectionStatusBar, { backgroundColor: '#e53935' }]}>
          <Ionicons name="cloud-offline-outline" size={moderateScale(16)} color="white" />
          <Text style={styles(currentColors).connectionStatusText}>Offline</Text>
        </View>
      )}
      
      <View style={styles(currentColors).header}>
        <TouchableOpacity onPress={() => logout()}>
        <Ionicons name="log-out-outline" size={24} color="white" />        </TouchableOpacity>
        <Text style={styles(currentColors).headerTitle}>Delete History</Text>
        <View style={styles(currentColors).headerRightContainer}>
          <ThemeToggleButton themeMode={themeMode} />
        </View>
      </View>

      <View style={styles(currentColors).searchContainer}>
        <View style={styles(currentColors).searchBar}>
          <Ionicons name="search" size={moderateScale(20)} color={currentColors.headerText} style={styles(currentColors).searchIcon} />
          <TextInput
            placeholder="Search by Name..."
            placeholderTextColor={currentColors.headerText}
            style={styles(currentColors).searchInput}
            value={searchMRN}
            onChangeText={(text) => setSearchMRN(text)}
          />
          {searchMRN.length > 0 && (
            <TouchableOpacity onPress={() => setSearchMRN('')} style={styles(currentColors).clearButton}>
              <Ionicons name="close-circle" size={moderateScale(18)} color={currentColors.headerText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles(currentColors).filterContainer}>
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
                name={isDoctorDropdownOpen ? 'chevron-up' : 'chevron-down'}
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
                <TouchableOpacity style={styles(currentColors).dropdownItem} onPress={() => handleDoctorChange('')}>
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
        <TouchableOpacity 
          style={styles(currentColors).filterButton} 
          onPress={() => setShowDatePicker(true)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Ionicons
              name="calendar"
              size={moderateScale(18)}
              color={currentColors.dropdownText}
              style={{ marginRight: moderateScale(5) }}
            />
            <Text 
              style={[styles(currentColors).filterButtonText, { flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatDateForDisplay(selectedDate)}
            </Text>
          </View>
          {selectedDate && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                clearDateSelection();
              }}
              style={{ padding: moderateScale(4) }}
            >
              <Ionicons name="close-circle" size={moderateScale(18)} color={currentColors.dropdownText} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        
        {renderDatePicker()}
      </View>

      {renderTableHeader()}
      {isLoading ? (
        <View style={styles(currentColors).loaderContainer}>
          <ActivityIndicator size="large" color={currentColors.paginationButtonBorder} />
        </View>
      ) : (
        <FlatList
          data={tableData}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item, index }) => renderTableRow(item, index)}
          ListEmptyComponent={() => (
            <View style={styles(currentColors).noDataContainer}>
              <Text style={styles(currentColors).noDataText}>
                No deleted appointments found
              </Text>
            </View>
          )}
          ListFooterComponent={tableData.length > 0 ? <PaginationControls /> : null}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={tableData.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
        />
      )}

      {isDoctorDropdownOpen && (
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles(currentColors).dropdownOverlay} />
        </TouchableWithoutFeedback>
      )}
      <Toast />
      <RestoreModal visible={modalVisible} onClose={() => setModalVisible(false)} onRestore={confirmRestore} />
    </SafeAreaView>
  );
};

interface Colors {
  background: string;
  headerBackground: string;
  headerText: string;
  dropdownBorder: string;
  dropdownText: string;
  tableHeaderBackground: string;
  tableRowBackground: string;
  AppointmentColor: string;
  filterBackground: string;
  noDataText: string;
  paginationButtonBackground: string;
  paginationButtonBorder: string;
  tabBackground: string;
  dropdownBackground: string;
  actionMenuTextColor: string;
}

const styles = (currentColors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentColors.background,
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
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(15),
    paddingVertical: verticalScale(10),
    backgroundColor: currentColors.headerBackground,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(10),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: currentColors.dropdownBorder,
    borderWidth: moderateScale(1),
  },
  searchIcon: {
    marginRight: moderateScale(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(14),
    color: currentColors.headerText,
  },
  clearButton: {
    padding: moderateScale(6),
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
  tableContainer: {
    flex: 1,
    backgroundColor: currentColors.background,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(15),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
    backgroundColor: currentColors.tableHeaderBackground,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(15),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
    alignItems: 'center',
    backgroundColor: currentColors.tableRowBackground,
  },
  headerCell: {
    color: currentColors.headerText,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: moderateScale(12),
  },
  cell: {
    textAlign: 'center',
    color: currentColors.AppointmentColor,
    fontSize: moderateScale(12),
  },
  mrnColumn: { width: '20%' },
  nameColumn: { width: '30%' },
  reasonColumn: { width: '30%', },
  statusColumn: { width: '15%' },
  checkedColumn: { width: '19%' },
  delByColumn: { width: '15%' },
  actionColumn: { width: '20%', alignItems: 'center' },
  filterContainer: {
    backgroundColor: currentColors.filterBackground,
    flexDirection: 'row',
    paddingHorizontal: moderateScale(15),
    gap: moderateScale(10),
    paddingVertical: verticalScale(15),
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
    flex: 1,
    backgroundColor: currentColors.background,
  },
  noDataText: {
    fontSize: moderateScale(14),
    color: currentColors.noDataText,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(15),
    paddingHorizontal: moderateScale(15),
    backgroundColor: currentColors.background,
    borderTopWidth: 1,
    borderTopColor: currentColors.dropdownBorder,
  },
  totalCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066FF15',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: '#0066FF30',
  },
  countIcon: {
    marginRight: moderateScale(8),
  },
  totalCountText: {
    fontSize: moderateScale(13),
    color: currentColors.AppointmentColor,
    fontWeight: '500',
  },
  totalCountValue: {
    fontWeight: 'bold',
    color: '#0066FF',
    fontSize: moderateScale(15),
    marginLeft: moderateScale(5),
  },
  paginationControlsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationButton: {
    padding: moderateScale(6),
    borderRadius: moderateScale(20),
    backgroundColor: currentColors.paginationButtonBackground,
    borderWidth: 1,
    borderColor: currentColors.paginationButtonBorder,
    marginHorizontal: moderateScale(8),
    shadowColor: currentColors.paginationButtonBorder,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    borderColor: currentColors.dropdownBorder,
    backgroundColor: currentColors.tabBackground,
    opacity: 0.6,
  },
  paginationText: {
    fontSize: moderateScale(14),
    color: currentColors.AppointmentColor,
    marginHorizontal: moderateScale(5),
    fontWeight: '500',
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
  connectionStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: verticalScale(5),
    marginHorizontal: moderateScale(15),
    marginBottom: verticalScale(5),
    borderRadius: moderateScale(4),
  },
  connectionStatusText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '500',
    marginLeft: moderateScale(5),
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
  disabledDropdown: {
    opacity: 0.8,
    borderColor: currentColors.dropdownBorder,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

export default DeleteHistoryScreen;