"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  Easing,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Dimensions } from "react-native"
import { scale, verticalScale, moderateScale } from "react-native-size-matters"
import { FlatList } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useDebounce } from "use-debounce"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Toast from "react-native-toast-message"

// Import components
import PatientRegistrationForm from "./PatientRegistration"
import EditAppointmentModal from "../components/pageComponents/Appointment/EditModal"
import Vitals from "../components/pageComponents/Appointment/Vitals"
import { UpdateAppointments } from "../components/pageComponents/Appointment/UpdateAppoint"
import PDFGenerator from "../components/pageComponents/Appointment/PDFGenerator"
import StatusSelectionModal from "../components/pageComponents/Appointment/StatusSelectionModal"
import UnCheckModal from "../components/pageComponents/Appointment/unCheckModal"
import DeleteModal from "../components/pageComponents/Appointment/DeleteModal"
import ActionMenu from "../components/pageComponents/Appointment/ActionModal"
import ExpandableDetails from "../components/Reuseable/Expandable"
import ThemeToggleButton from "../components/Reuseable/ThemeToggleButton"

// Import services and utilities
import {
  deleteAppointment,
  getAllAppointments,
  checkAppointment,
  uncheckAppointment,
  addVitals,
  getAssignedDoctors,
} from "../ApiHandler/Appointment"
import { useTheme } from "../utils/ThemeContext"
import { logout } from "../Auth/authService"
import socketService from "../socket"
import { useFocusEffect } from "expo-router"

const { width } = Dimensions.get("window")

// Create a request queue to manage API calls
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentAbortController = null;
  }

  async add(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        priority,
        resolve,
        reject
      });

      // Sort queue by priority (higher numbers = higher priority)
      this.queue.sort((a, b) => b.priority - a.priority);

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      // Cancel any existing request
      if (this.currentAbortController) {
        this.currentAbortController.abort();
      }

      // Create new abort controller for this request
      this.currentAbortController = new AbortController();

      // Execute the request with the abort signal
      const result = await requestFn(this.currentAbortController.signal);
      resolve(result);
    } catch (error) {
      if (error.name !== 'AbortError') {
        reject(error);
      }
    } finally {
      this.currentAbortController = null;
      // Process next request in queue
      this.processQueue();
    }
  }

  cancelAll() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.queue = [];
    this.processing = false;
  }
}

const AppointmentScreen = () => {
  const { currentColors, themeMode } = useTheme();

  // State for UI components
  const [activeTab, setActiveTab] = useState("active");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPatientScreen, setShowPatientScreen] = useState(false);
  const [showTokenScreen, setShowTokenScreen] = useState(false);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);
  const [searchMRN, setSearchMRN] = useState("");
  const [appointmentMode, setAppointmentMode] = useState("slot"); // "slot" (default) or "manual"
  const [debouncedSearchTerm] = useDebounce(searchMRN, 800);

  // State for modals
  const [modalVisible, setModalVisible] = useState(false);
  const [vitalModalVisible, setVitalModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [uncheckModal, setUncheckModal] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // State for dropdowns
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State for data
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Paid");
  const [emergencyMessage, setEmergencyMessage] = useState("");

  // State for loading and pagination
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isDropdownLocked, setIsDropdownLocked] = useState(false);

  // State for vitals updates
  const [vitalsUpdateKey, setVitalsUpdateKey] = useState(0);

  // Animation values for glow effects
  const blueGlowOpacity = useRef(new Animated.Value(0)).current;
  const redGlowOpacity = useRef(new Animated.Value(0)).current;
  const yellowGlowOpacity = useRef(new Animated.Value(0)).current;

  // Animation references
  const blueAnimationRef = useRef(null);
  const redAnimationRef = useRef(null);
  const yellowAnimationRef = useRef(null);

  // Refs for tracking state
  const activeTabRef = useRef(activeTab);
  const currentPageRef = useRef(currentPage);
  const selectedDoctorRef = useRef(selectedDoctor);
  const selectedDateRef = useRef(selectedDate);
  const statusFilterRef = useRef(selectedStatusFilter);
  const searchMRNRef = useRef(searchMRN);
  const requestQueueRef = useRef(new RequestQueue());

  // Keep all current filter state in one place for consistency
  const currentFiltersRef = useRef({
    tab: activeTab,
    page: currentPage,
    doctorId: selectedDoctor,
    date: selectedDate,
    statusFilter: selectedStatusFilter,
    search: searchMRN,
  });

  // Update refs when state changes
  useEffect(() => {
    activeTabRef.current = activeTab;
    currentFiltersRef.current.tab = activeTab;
  }, [activeTab]);

  useEffect(() => {
    currentPageRef.current = currentPage;
    currentFiltersRef.current.page = currentPage;
  }, [currentPage]);

  useEffect(() => {
    selectedDoctorRef.current = selectedDoctor;
    currentFiltersRef.current.doctorId = selectedDoctor;
  }, [selectedDoctor]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
    currentFiltersRef.current.date = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    statusFilterRef.current = selectedStatusFilter;
    currentFiltersRef.current.statusFilter = selectedStatusFilter;
  }, [selectedStatusFilter]);

  useEffect(() => {
    searchMRNRef.current = searchMRN;
    currentFiltersRef.current.search = searchMRN;
  }, [searchMRN]);

  // Start the infinite glow animations when component mounts
  useEffect(() => {
    // Only start animation when appointments are loaded
    if (appointments.length > 0 && !isLoading) {
      // Stop any existing animations
      if (blueAnimationRef.current) {
        blueAnimationRef.current.stop();
      }
      if (redAnimationRef.current) {
        redAnimationRef.current.stop();
      }
      if (yellowAnimationRef.current) {
        yellowAnimationRef.current.stop();
      }

      // Reset animations to starting point
      blueGlowOpacity.setValue(0);
      redGlowOpacity.setValue(0);
      yellowGlowOpacity.setValue(0);

      // Create infinite animations for each color
      const createInfiniteAnimation = (animatedValue) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 0.4,
              duration: 800,
              easing: Easing.ease,
              useNativeDriver: Platform.OS !== "web", // Use native driver except on web
            }),
            Animated.timing(animatedValue, {
              toValue: 0.6,
              duration: 800,
              easing: Easing.ease,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(animatedValue, {
              toValue: 0.9,
              duration: 800,
              easing: Easing.ease,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(animatedValue, {
              toValue: 0.6,
              duration: 800,
              easing: Easing.ease,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(animatedValue, {
              toValue: 0.4,
              duration: 800,
              easing: Easing.ease,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(animatedValue, {
              toValue: 0.3,
              duration: 800,
              easing: Easing.ease,
              useNativeDriver: Platform.OS !== "web",
            }),
          ]),
        );
      };

      // Start the infinite animations
      blueAnimationRef.current = createInfiniteAnimation(blueGlowOpacity);
      redAnimationRef.current = createInfiniteAnimation(redGlowOpacity);
      yellowAnimationRef.current = createInfiniteAnimation(yellowGlowOpacity);

      blueAnimationRef.current.start();

      // Start red animation with a slight delay
      setTimeout(() => {
        redAnimationRef.current.start();
      }, 300);

      // Start yellow animation with more delay
      setTimeout(() => {
        yellowAnimationRef.current.start();
      }, 600);
    }

    // Clean up animations when component unmounts
    return () => {
      if (blueAnimationRef.current) {
        blueAnimationRef.current.stop();
      }
      if (redAnimationRef.current) {
        redAnimationRef.current.stop();
      }
      if (yellowAnimationRef.current) {
        yellowAnimationRef.current.stop();
      }
    };
  }, [appointments, isLoading]);

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        const response = await getAssignedDoctors();
        setDoctors(response);
      } catch (error) {
        console.error("Error fetching doctors:", error);

      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Check if user is a doctor and lock dropdown
  useEffect(() => {
    const checkUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        if (userDataString) {
          const userData = JSON.parse(userDataString);

          if (userData && userData.fullName) {
            // Find if the user's name matches any doctor
            const matchingDoctor = doctors.find((doc) => doc.fullName === userData.fullName);

            if (matchingDoctor) {
              // Lock the dropdown and set the selected doctor
              setIsDropdownLocked(true);
              setSelectedDoctor(matchingDoctor._id);
              selectedDoctorRef.current = matchingDoctor._id;
              currentFiltersRef.current.doctorId = matchingDoctor._id;

              // Also fetch appointments for this doctor
              fetchAppointmentsWithFilters({
                doctorId: matchingDoctor._id,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error retrieving user data:", error);
      }
    };

    // Only check after doctors are loaded
    if (doctors.length > 0) {
      checkUserData();
    }
  }, [doctors]);

  // Set up socket connection
  useEffect(() => {
    socketService.connect();

    const cleanup = socketService.listenToProjectEvents((eventType) => {
      console.log("Socket event received:", eventType);

      // Increment vitals key to force re-render when socket events occur
      setVitalsUpdateKey((prev) => prev + 1);

      // Queue a fetch with high priority when socket events occur
      fetchAppointmentsWithFilters({}, 10); // 10 = high priority
    });

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, []);

  // Reset search and fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const fetchData = async () => {
        if (isMounted) {
          // Reset search when screen comes into focus
          setSearchMRN("");
          searchMRNRef.current = "";
          currentFiltersRef.current.search = "";

          // Fetch with current filters
          fetchAppointmentsWithFilters();
        }
      };

      fetchData();

      return () => {
        isMounted = false;
        // Cancel any pending requests
        requestQueueRef.current.cancelAll();
      };
    }, []),
  );

  // Fetch appointments when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      // Reset to page 1 when search changes
      const newPage = 1;
      setCurrentPage(newPage);
      currentPageRef.current = newPage;

      fetchAppointmentsWithFilters({
        search: debouncedSearchTerm,
        page: newPage,
      });
    }
  }, [debouncedSearchTerm]);

  // Format date for API
  const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Fetch appointments with filters
  const fetchAppointmentsWithFilters = (overrideFilters = {}, priority = 0) => {
    // Combine current filters with any overrides
    const filters = {
      tab: currentFiltersRef.current.tab,
      page: currentFiltersRef.current.page,
      doctorId: currentFiltersRef.current.doctorId,
      date: currentFiltersRef.current.date,
      statusFilter: currentFiltersRef.current.statusFilter,
      search: currentFiltersRef.current.search,
      ...overrideFilters,
    };

    // Add request to queue with priority
    requestQueueRef.current.add(
      (signal) => fetchAppointments(
        filters.page,
        filters.tab,
        filters.doctorId,
        filters.date,
        filters.statusFilter,
        filters.search,
        signal
      ),
      priority
    );
  };

  // Main function to fetch appointments
  const fetchAppointments = async (
    pageNo = currentPageRef.current,
    tab = activeTabRef.current,
    doctorId = selectedDoctorRef.current,
    date = selectedDateRef.current,
    statusFilter = statusFilterRef.current,
    search = searchMRNRef.current,
    signal
  ) => {
    // Show appropriate loading indicator
    if (!isLoading) {
      setIsFetchingData(true);
    }

    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Only include date parameter if it's not null
        const params = {
          count: itemsPerPage,
          pageNo,
          sort: "accending",
          checkStatus: tab,
          search: search || undefined,
          doctorId: doctorId || undefined,
        };

        // Only add the appointmentDate if date is provided
        if (date) {
          params.appointmentDate = formatDateForAPI(date);
        }

        if (statusFilter !== "All") {
          params.feeStatus = statusFilter.toLowerCase();
        }

        const response = await getAllAppointments(params, signal);

        if (response && Array.isArray(response.data)) {
          const { data, totalCount } = response;

          // Apply the state updates
          setAppointments(data);
          setTotalAppointments(totalCount);

          const calculatedTotalPages = Math.ceil(totalCount / itemsPerPage);
          setHasMoreData(pageNo < calculatedTotalPages);

          // Handle the case where we're on a page that no longer exists
          if (data.length === 0 && pageNo > 1 && totalCount > 0) {
            // This will trigger a new fetch for the previous page
            const newPage = pageNo - 1;
            setCurrentPage(newPage);
            currentPageRef.current = newPage;
            currentFiltersRef.current.page = newPage;

            // Re-fetch with the new page
            return fetchAppointments(newPage, tab, doctorId, date, statusFilter, search, signal);
          }

          // Successfully fetched data, break the retry loop
          break;
        } else {
          throw new Error("Invalid response data");
        }
      } catch (error) {
        // Don't retry or show error for aborted requests
        if (error.name === 'AbortError') {
          console.log('Request was aborted');
          return;
        }

        console.error("Failed to fetch appointments:", error);

        attempt++;
        if (attempt >= maxRetries) {
          setAppointments([]);
          setTotalAppointments(0);
          setHasMoreData(false);

          // If we're on a page that doesn't exist, go back
          if (pageNo > 1) {
            const newPage = pageNo - 1;
            setCurrentPage(newPage);
            currentPageRef.current = newPage;
            currentFiltersRef.current.page = newPage;
          }

        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } finally {
        setIsFetchingData(false);
      }
    }
  };

  // Handle date change
  const handleDateChange = (event, selected) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selected) {
        setShowDatePicker(false);
        setSelectedDate(selected);

        // Reset to page 1 when date changes
        const newPage = 1;
        setCurrentPage(newPage);

        // Update with new filters
        fetchAppointmentsWithFilters({
          date: selected,
          page: newPage,
        });
      } else {
        setShowDatePicker(false);
      }
    }
  };

  // Function to ensure reliable updates in the correct order
  const performActionWithStateUpdate = async (actionFn, newState = {}) => {
    setIsLoading(true);
    try {
      // Perform the action
      const overrideFilters = await actionFn();

      // Emit socket event if provided
      if (newState.socketEvent) {
        socketService.emitHimsEvent(newState.socketEvent.type, newState.socketEvent.action);
      }

      // Apply any page override returned from the action
      if (overrideFilters && overrideFilters.page !== undefined) {
        setCurrentPage(overrideFilters.page);
        currentPageRef.current = overrideFilters.page;
        currentFiltersRef.current.page = overrideFilters.page;
        // Update newState to ensure fetchAppointmentsWithFilters uses the correct page
        newState.page = overrideFilters.page;
      }
      // Otherwise, use any page from the newState object
      else if (newState.page !== undefined) {
        setCurrentPage(newState.page);
        currentPageRef.current = newState.page;
        currentFiltersRef.current.page = newState.page;
      }

      // Update tab if provided
      if (newState.tab) {
        setActiveTab(newState.tab);
        activeTabRef.current = newState.tab;
        currentFiltersRef.current.tab = newState.tab;
      }

      // Fetch with the new state and override filters
      fetchAppointmentsWithFilters({ ...newState, ...(overrideFilters || {}) }, 5); // Medium priority
    } catch (error) {
      console.error("Action failed:", error);


      // Refresh data with current state
      fetchAppointmentsWithFilters();
    } finally {
      // Close any modals that should be closed
      if (newState.closeModal) {
        switch (newState.closeModal) {
          case "edit":
            setModalVisible(false);
            break;
          case "vitals":
            setVitalModalVisible(false);
            break;
          case "uncheck":
            setUncheckModal(false);
            break;
          case "status":
            setStatusModalVisible(false);
            break;
          case "delete":
            setDeleteModalVisible(false);
            break;
          case "action":
            setIsActionModalOpen(false);
            break;
          default:
            break;
        }
      }

      // Clear selected appointment if needed
      if (newState.clearSelection) {
        setSelectedAppointment(null);
      }

      setIsLoading(false);
    }
  };

  // Handle appointment update
  const handleAppointmentUpdate = async (appointmentData) => {
    await performActionWithStateUpdate(async () => await UpdateAppointments(appointmentData), {
      socketEvent: { type: "appointments", action: "update" },
      closeModal: "edit",
      clearSelection: true,
      errorMessage: "Failed to update appointment",
    });
  };

  // Handle vitals update
  const handleVitals = async (appointmentData) => {
    await performActionWithStateUpdate(
      async () => {
        // Call API to add/update vitals
        await addVitals({
          ...appointmentData,
          appointmentId: selectedAppointment._id,
          patientId: selectedAppointment.patientId._id,
        });

        // Update appointments state locally to ensure UI reflects changes immediately
        setAppointments((prevAppointments) =>
          prevAppointments.map((appt) =>
            appt._id === selectedAppointment._id
              ? {
                ...appt,
                vitals: appointmentData.vitals,
              }
              : appt
          )
        );
      },
      {
        socketEvent: { type: "vitals", action: "insert" },
        closeModal: "vitals",
        clearSelection: true,
        errorMessage: "Failed to add vitals",
      }
    );

    // Force vitals component to update
    setVitalsUpdateKey((prev) => prev + 1);
  };

  // Handle appointment deletion
  const handleDelete = async (appointmentId, reason) => {
    await performActionWithStateUpdate(
      async () => {
        // Store current page and count for pagination handling
        const currentPageBefore = currentPage;
        const currentItemCount = appointments.length;

        // Call delete API
        await deleteAppointment(appointmentId, reason);

        // Handle edge case: if this is the last item on a page > 1
        if (currentItemCount === 1 && currentPageBefore > 1) {
          // Force navigation to previous page
          return { page: currentPageBefore - 1 };
        }
      },
      {
        socketEvent: { type: "appointments", action: "delete" },
        closeModal: "delete",
        errorMessage: "Failed to delete appointment",
      }
    );
  };

  // Handle uncheck appointment
  const checkHandle = async () => {
    await performActionWithStateUpdate(
      async () => {
        // Store current page and count for pagination handling
        const currentPageBefore = currentPage;
        const currentItemCount = appointments.length;

        // Call uncheck API
        await uncheckAppointment(selectedAppointment._id);

        // Handle edge case: if this is the last item on a page > 1
        if (currentItemCount === 1 && currentPageBefore > 1 && activeTab === "checked") {
          // Force navigation to previous page while switching to active tab
          return { tab: "active", page: currentPageBefore - 1 };
        }
      },
      {
        socketEvent: { type: "appointments", action: "statusChange" },
        tab: "active",
        page: 1,
        closeModal: "uncheck",
        errorMessage: "Failed to update appointment status",
      }
    );
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    if (tab === activeTabRef.current) return;

    // Update the state
    setActiveTab(tab);
    activeTabRef.current = tab;

    // Reset to page 1 when changing tabs
    const newPage = 1;
    setCurrentPage(newPage);
    currentPageRef.current = newPage;

    setHasMoreData(true);

    // Fetch with new tab and page 1
    fetchAppointmentsWithFilters({
      tab: tab,
      page: newPage,
    });
  };

  // Handle doctor change
  const handleDoctorChange = async (doctorId) => {
    if (isDropdownLocked) return;

    setIsDoctorDropdownOpen(false);
    setSelectedDoctor(doctorId);
    selectedDoctorRef.current = doctorId;

    // Reset to page 1 when changing doctor
    const newPage = 1;
    setCurrentPage(newPage);
    currentPageRef.current = newPage;

    // Fetch with new doctor and page 1
    fetchAppointmentsWithFilters({
      doctorId: doctorId,
      page: newPage,
    });
  };

  // Handle status filter change
  const handleStatusFilterChange = async (status) => {
    setIsStatusFilterOpen(false);
    setSelectedStatusFilter(status);
    statusFilterRef.current = status;

    // Reset to page 1 when changing status filter
    const newPage = 1;
    setCurrentPage(newPage);
    currentPageRef.current = newPage;

    // Fetch with new status filter and page 1
    fetchAppointmentsWithFilters({
      statusFilter: status,
      page: newPage,
    });
  };

  // Handle status selection
  const handleStatusSelection = async (status) => {
    await performActionWithStateUpdate(
      async () => {
        // Store current page and count for pagination handling
        const currentPageBefore = currentPage;
        const currentItemCount = appointments.length;

        // Call check appointment API
        await checkAppointment(selectedAppointment._id, status, "Referred to specialist", []);

        // Handle edge case: if this is the last item on a page > 1
        if (currentItemCount === 1 && currentPageBefore > 1 && activeTab === "active") {
          // Force navigation to previous page while switching to checked tab
          return { tab: "checked", page: currentPageBefore - 1 };
        }
      },
      {
        socketEvent: { type: "appointments", action: "statusChange" },
        tab: "checked",
        page: 1,
        closeModal: "status",
        errorMessage: "Failed to update appointment status",
      }
    );
  };

  // Clear date selection
  const clearDateSelection = async () => {
    setSelectedDate(null);
    selectedDateRef.current = null;

    // Reset to page 1 when clearing date
    const newPage = 1;
    setCurrentPage(newPage);
    currentPageRef.current = newPage;

    // Fetch with null date and page 1
    fetchAppointmentsWithFilters({
      date: null,
      page: newPage,
    });
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    if (!date) return "All Dates";
    const validDate = new Date(date);
    if (isNaN(validDate)) return "All Dates";
    return validDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  // Toggle row expansion
  const toggleExpand = (index) => {
    setExpandedRowIndex(expandedRowIndex === index ? null : index);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointmentsWithFilters();
    setRefreshing(false);
  };

  // Close dropdowns
  const closeDropdown = () => {
    setIsDoctorDropdownOpen(false);
    setIsStatusFilterOpen(false);
  };

  // Pagination controls component
  const PaginationControls = () => {
    const totalPages = Math.ceil(totalAppointments / itemsPerPage);
    return (
      <View style={styles(currentColors).paginationContainer}>
        <View style={styles(currentColors).totalAppointmentsContainer}>
          <Ionicons
            name="calendar"
            size={moderateScale(18)}
            color="#0066FF"
            style={styles(currentColors).appointmentIcon}
          />
          <Text style={styles(currentColors).totalAppointmentsText}>Total:</Text>
          <Text style={styles(currentColors).totalAppointmentsCount}>{totalAppointments}</Text>
        </View>
        <View style={styles(currentColors).paginationControlsWrapper}>
          <TouchableOpacity
            onPress={() => {
              if (currentPage > 1) {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                currentPageRef.current = newPage;
                fetchAppointmentsWithFilters({ page: newPage });
              }
            }}
            disabled={currentPage === 1}
            style={[
              styles(currentColors).paginationButton,
              currentPage === 1 && styles(currentColors).paginationButtonDisabled,
            ]}
          >
            <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? "#999" : "#0066FF"} />
          </TouchableOpacity>
          <Text style={styles(currentColors).paginationText}>
            Page {currentPage} of {totalPages || 1}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (currentPage < totalPages) {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                currentPageRef.current = newPage;
                fetchAppointmentsWithFilters({ page: newPage });
              }
            }}
            disabled={currentPage >= totalPages}
            style={[
              styles(currentColors).paginationButton,
              currentPage >= totalPages && styles(currentColors).paginationButtonDisabled,
            ]}
          >
            <Ionicons name="chevron-forward" size={14} color={currentPage >= totalPages ? "#999" : "#0066FF"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render table header
  const renderTableHeader = () =>
    !isFetchingData && (
      <View style={styles(currentColors).tableHeader}>
        <View style={styles(currentColors).tokenColumn}>
          <Text style={styles(currentColors).headerText}>Token</Text>
        </View>
        <View style={styles(currentColors).mrnColumn}>
          <Text style={styles(currentColors).headerText}>MRN</Text>
        </View>
        <View style={styles(currentColors).nameColumn}>
          <Text style={styles(currentColors).headerText}>Name</Text>
        </View>
        <View style={styles(currentColors).actionColumn}>
          <Text style={styles(currentColors).headerText}>Action</Text>
        </View>
      </View>
    );

  // Render date picker
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
                const newDate = selectedDate || new Date();
                setSelectedDate(newDate);
                selectedDateRef.current = newDate;

                // Reset to page 1 when setting date
                const newPage = 1;
                setCurrentPage(newPage);
                currentPageRef.current = newPage;

                fetchAppointmentsWithFilters({
                  date: newDate,
                  page: newPage,
                });
              }}
            >
              <Text style={{ color: "#0066FF", fontSize: moderateScale(16) }}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            testID="dateTimePicker"
            value={selectedDate || new Date()}
            mode="date"
            display="spinner"
            onChange={(event, selected) => {
              if (selected) {
                setSelectedDate(selected);
                // We don't update refs or fetch here since this is handled in Done button
              }
            }}
            style={{ height: 200 }}
          />
        </View>
      );
    } else {
      // For Android, we'll use the default modal approach
      return (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      );
    }
  };

  // Render table row
  const renderTableRow = ({ item, index }) => {
    const appointment = item;
    const isOnlinePatient =
      appointment?.isOnlinePatient || appointment?.feeStatus === "online patient" || appointment?.online === 1;

    const isHighEmergency =
      appointment?.vitals?.isEmergencyIn10Mint ||
      (appointment?.vitals &&
        ((appointment.vitals.temperature && Number.parseFloat(appointment.vitals.temperature) > 105) ||
          (appointment.vitals.temperature && Number.parseFloat(appointment.vitals.temperature) < 94) ||
          (appointment.vitals.RR && Number.parseInt(appointment.vitals.RR) > 60) ||
          (appointment.vitals.RR && Number.parseInt(appointment.vitals.RR) < 25) ||
          (appointment.vitals.HR && Number.parseInt(appointment.vitals.HR) > 180) ||
          (appointment.vitals.HR && Number.parseInt(appointment.vitals.HR) < 30)));

    const isModerateEmergency =
      !isHighEmergency &&
      (appointment?.vitals?.isEmergencyIn1Hr ||
        (appointment?.vitals &&
          appointment.vitals.temperature &&
          Number.parseFloat(appointment.vitals.temperature) > 100 &&
          Number.parseFloat(appointment.vitals.temperature) <= 105));

    // Create animated styles for each type of row
    const blueAnimatedStyle =
      Platform.OS === "web"
        ? {
          backgroundColor: blueGlowOpacity.interpolate({
            inputRange: [0.3, 0.4, 0.6, 0.9],
            outputRange: [
              "rgba(102, 204, 51, 0.3)",
              "rgba(102, 204, 51, 0.5)",
              "rgba(102, 204, 51, 0.7)",
              "rgba(102, 204, 51, 0.9)",
            ],
          }),
          shadowColor: "rgb(102, 204, 51)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: blueGlowOpacity,
          shadowRadius: 20,
          elevation: 15,
        }
        : {
          // For mobile, use a fixed background color
          backgroundColor: "rgba(102, 204, 51, 0.2)",
        };

    const redAnimatedStyle =
      Platform.OS === "web"
        ? {
          backgroundColor: redGlowOpacity.interpolate({
            inputRange: [0.3, 0.4, 0.6, 0.9],
            outputRange: [
              "rgba(204, 0, 0, 0.3)",
              "rgba(204, 0, 0, 0.4)",
              "rgba(204, 0, 0, 0.5)",
              "rgba(204, 0, 0, 0.6)",
            ],
          }),
          shadowColor: "rgb(255, 0, 0)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: redGlowOpacity,
          shadowRadius: 20,
          elevation: 15,
        }
        : {
          // For mobile, use a fixed background color
          backgroundColor: "rgba(204, 0, 0, 0.2)",
        };

    const yellowAnimatedStyle =
      Platform.OS === "web"
        ? {
          backgroundColor: yellowGlowOpacity.interpolate({
            inputRange: [0.3, 0.4, 0.6, 0.9],
            outputRange: [
              "rgba(204, 204, 0, 0.3)",
              "rgba(204, 204, 0, 0.35)",
              "rgba(204, 204, 0, 0.4)",
              "rgba(204, 204, 0, 0.5)",
            ],
          }),
          shadowColor: "rgb(255, 255, 0)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: yellowGlowOpacity,
          shadowRadius: 20,
          elevation: 15,
        }
        : {
          // For mobile, use a fixed background color
          backgroundColor: "rgba(204, 204, 0, 0.2)",
        };

    // Determine which animated style to use
    let animatedStyle = {};
    let animatedOpacity = null;

    if (activeTab === "active") {
      if (isOnlinePatient) {
        animatedStyle = blueAnimatedStyle;
        animatedOpacity = blueGlowOpacity;
      } else if (isHighEmergency) {
        animatedStyle = redAnimatedStyle;
        animatedOpacity = redGlowOpacity;
      } else if (isModerateEmergency) {
        animatedStyle = yellowAnimatedStyle;
        animatedOpacity = yellowGlowOpacity;
      }
    }

    const isExpanded = expandedRowIndex === index;

    // Function to create emergency message
    const createEmergencyMessage = (appointment) => {
      let message = "";

      if (isHighEmergency) {
        if (appointment.vitals.temperature && Number.parseFloat(appointment.vitals.temperature) > 105)
          message += "Critical high temperature detected. ";
        if (appointment.vitals.temperature && Number.parseFloat(appointment.vitals.temperature) < 94)
          message += "Critical low temperature detected. ";
        if (appointment.vitals.RR && Number.parseInt(appointment.vitals.RR) > 60)
          message += "High respiratory rate detected. ";
        if (appointment.vitals.RR && Number.parseInt(appointment.vitals.RR) < 25)
          message += "Low respiratory rate detected. ";
        if (appointment.vitals.HR && Number.parseInt(appointment.vitals.HR) > 180)
          message += "High heart rate detected. ";
        if (appointment.vitals.HR && Number.parseInt(appointment.vitals.HR) < 30)
          message += "Low heart rate detected. ";
      } else if (isModerateEmergency) {
        message += "Elevated temperature requires monitoring. ";
      }

      return message;
    };

    return (
      <View key={`${appointment._id}-${vitalsUpdateKey}`}>
        <TouchableOpacity onPress={() => toggleExpand(index)}>
          {Object.keys(animatedStyle).length > 0 ? (
            <View style={[styles(currentColors).tableRow, Platform.OS === "web" ? animatedStyle : null]}>
              {Platform.OS !== "web" && animatedOpacity && (
                <Animated.View
                  style={[StyleSheet.absoluteFill, animatedStyle, { opacity: animatedOpacity }]}
                />
              )}
              <View style={styles(currentColors).tokenColumn}>
                <Text style={styles(currentColors).cellText}>{appointment?.tokenId}</Text>
              </View>
              <View style={styles(currentColors).mrnColumn}>
                <Text style={styles(currentColors).cellText}>{appointment?.mrn}</Text>
              </View>
              <View style={styles(currentColors).nameColumn}>
                <Text style={styles(currentColors).cellText}>
                  {appointment?.patientId?.patientName || appointment?.patientName}
                </Text>
              </View>
              <View style={styles(currentColors).actionColumn}>
                <TouchableOpacity
                  onPress={() => {
                    const message = createEmergencyMessage(appointment);
                    setEmergencyMessage(message);
                    setSelectedAppointment(appointment);
                    setIsActionModalOpen(true);
                  }}
                  style={{
                    borderColor: "#0066FF",
                    borderWidth: moderateScale(1),
                    borderRadius: moderateScale(50),
                    padding: moderateScale(5),
                    paddingHorizontal: moderateScale(10),
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={moderateScale(15)} color="#0066FF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles(currentColors).tableRow}>
              <View style={styles(currentColors).tokenColumn}>
                <Text style={styles(currentColors).cellText}>{appointment?.tokenId}</Text>
              </View>
              <View style={styles(currentColors).mrnColumn}>
                <Text style={styles(currentColors).cellText}>{appointment?.mrn}</Text>
              </View>
              <View style={styles(currentColors).nameColumn}>
                <Text style={styles(currentColors).cellText}>
                  {appointment?.patientId?.patientName || appointment?.patientName}
                </Text>
              </View>
              <View style={styles(currentColors).actionColumn}>
                <TouchableOpacity
                  onPress={() => {
                    const message = createEmergencyMessage(appointment);
                    setEmergencyMessage(message);
                    setSelectedAppointment(appointment);
                    setIsActionModalOpen(true);
                  }}
                  style={{
                    borderColor: "#0066FF",
                    borderWidth: moderateScale(1),
                    borderRadius: moderateScale(50),
                    padding: moderateScale(5),
                    paddingHorizontal: moderateScale(10),
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={moderateScale(15)} color="#0066FF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
        {isExpanded && <ExpandableDetails data={appointment} type="appointment" />}
      </View>
    );
  };

  // Create animated styles for the add button
  const addButtonAnimatedStyle = {
    backgroundColor: "transparent",
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: currentColors.headerText || "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 0,
  };

  // Create animated styles for the active tab
  const activeTabAnimatedStyle = {
    backgroundColor:
      Platform.OS === "web"
        ? blueGlowOpacity.interpolate({
          inputRange: [0, 0.3, 0.5, 1],
          outputRange: [
            "rgba(0, 102, 255, 0.3)",
            "rgba(0, 102, 255, 0.5)",
            "rgba(0, 102, 255, 0.8)",
            "rgba(0, 102, 255, 1)",
          ],
        })
        : "#0066FF",
    shadowColor: "rgb(0, 102, 255)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === "web" ? blueGlowOpacity : blueGlowOpacity.__getValue(),
    shadowRadius: 8,
    elevation: 5,
    opacity: Platform.OS !== "web" ? blueGlowOpacity : 1,
  };

  return (
    <SafeAreaView style={styles(currentColors).container}>
      {isLoading && (
        <View style={styles(currentColors).fullScreenLoader}>
          <ActivityIndicator size="large" color="#0066FF" />
        </View>
      )}

      {showPatientScreen ? (
        <PatientRegistrationForm
          onClose={() => setShowPatientScreen(false)}
          fetchAppointments={fetchAppointments}
          setLoading={setIsLoading}
          appointmentMode={appointmentMode}
        />
      ) : showTokenScreen ? (
        <PDFGenerator tokenData={selectedAppointment} onClose={() => setShowTokenScreen(false)} />
      ) : (
        <>
          <View style={styles(currentColors).header}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Logout",
                  "Are you sure you want to logout?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Logout",
                      style: "destructive",
                      onPress: async () => {
                        Toast.show({ type: "info", text1: "Logout", text2: "Starting..." });
                        await logout();
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles(currentColors).headerTitle}>Appointment</Text>
            <ThemeToggleButton themeMode={themeMode} />
          </View>
          <View style={styles(currentColors).searchContainer}>
            <View style={styles(currentColors).searchBar}>
              <TextInput
                placeholder="Search MRN Here"
                placeholderTextColor="#ffffff"
                style={styles(currentColors).searchInput}
                value={searchMRN}
                onChangeText={setSearchMRN}
              />
              <Ionicons name="search" size={moderateScale(15)} color="#ffffff" />
            </View>
            <View style={styles(currentColors).modeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles(currentColors).modeToggleButton,
                  appointmentMode === "manual" && styles(currentColors).modeToggleButtonActive,
                ]}
                onPress={() => setAppointmentMode("manual")}
              >
                <Text
                  style={[
                    styles(currentColors).modeToggleText,
                    appointmentMode === "manual" && styles(currentColors).modeToggleTextActive,
                  ]}
                >
                  M
                </Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: currentColors.headerText || "#ffffff" }} />
              <TouchableOpacity
                style={[
                  styles(currentColors).modeToggleButton,
                  appointmentMode === "slot" && styles(currentColors).modeToggleButtonActive,
                ]}
                onPress={() => setAppointmentMode("slot")}
              >
                <Text
                  style={[
                    styles(currentColors).modeToggleText,
                    appointmentMode === "slot" && styles(currentColors).modeToggleTextActive,
                  ]}
                >
                  S
                </Text>
              </TouchableOpacity>
            </View>
            <Animated.View style={addButtonAnimatedStyle}>
              <TouchableOpacity onPress={() => setShowPatientScreen(true)}>
                <Ionicons name="add" size={moderateScale(24)} color={currentColors.headerText || "#ffffff"} />
              </TouchableOpacity>
            </Animated.View>
          </View>
          <View style={styles(currentColors).filterContainer}>
            <View
              style={[
                styles(currentColors).filterButton,
                activeTab === "active" ? { width: width / 2.6 - moderateScale(15) } : {},
                isDropdownLocked ? { opacity: 0.7 } : {},
              ]}
            >
              <TouchableOpacity
                style={styles(currentColors).dropdownButton}
                onPress={() => {
                  if (!isDropdownLocked) {
                    setIsDoctorDropdownOpen(!isDoctorDropdownOpen);
                    setIsStatusFilterOpen(false);
                  }
                }}
                disabled={isDropdownLocked}
              >
                <Text style={styles(currentColors).dropdownButtonText} numberOfLines={1} ellipsizeMode="tail">
                  {selectedDoctor ? doctors.find((doc) => doc._id === selectedDoctor)?.fullName : "ALL Doctor"}
                </Text>
                {!isDropdownLocked && (
                  <Ionicons
                    name={isDoctorDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={moderateScale(20)}
                    color="#0066FF"
                  />
                )}
                {isDropdownLocked && <Ionicons name="lock-closed" size={moderateScale(16)} color="#0066FF" />}
              </TouchableOpacity>
              {isDoctorDropdownOpen && !isDropdownLocked && (
                <View style={styles(currentColors).dropdown}>
                  <ScrollView
                    style={styles(currentColors).dropdownScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    <TouchableOpacity style={styles(currentColors).dropdownItem} onPress={() => handleDoctorChange("")}>
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
            {activeTab === "active" && (
              <View style={[styles(currentColors).filterButton, { width: width / 3.8 - moderateScale(15) }]}>
                <TouchableOpacity
                  style={styles(currentColors).dropdownButton}
                  onPress={() => {
                    setIsStatusFilterOpen(!isStatusFilterOpen);
                    setIsDoctorDropdownOpen(false);
                  }}
                >
                  <Text style={styles(currentColors).dropdownButtonText} numberOfLines={1} ellipsizeMode="tail">
                    {selectedStatusFilter}
                  </Text>
                  <Ionicons
                    name={isStatusFilterOpen ? "chevron-up" : "chevron-down"}
                    size={moderateScale(20)}
                    color="#0066FF"
                  />
                </TouchableOpacity>
                {isStatusFilterOpen && (
                  <View style={styles(currentColors).dropdown}>
                    <ScrollView
                      style={styles(currentColors).dropdownScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {["All", "Paid", "Unpaid", "Online Patient"].map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={styles(currentColors).dropdownItem}
                          onPress={() => handleStatusFilterChange(status)}
                        >
                          <Text style={styles(currentColors).dropdownItemText}>{status}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity
              style={[
                styles(currentColors).filterButton,
                { width: activeTab === "active" ? width / 3 - moderateScale(15) : width / 2 - moderateScale(20) },
                { backgroundColor: currentColors.dateButtonBackground || currentColors.background },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons
                  name="calendar"
                  size={moderateScale(18)}
                  color="#0066FF"
                  style={{ marginRight: moderateScale(5) }}
                />
                <Text
                  style={[styles(currentColors).filterButtonText, { color: "#0066FF", flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {formatDateForDisplay(selectedDate)}
                </Text>
              </View>
              {selectedDate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent triggering date picker
                    clearDateSelection();
                  }}
                  style={{ justifyContent: "center", alignItems: "center" }}
                >
                  <Ionicons name="close-circle" size={moderateScale(18)} color="#0066FF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {renderDatePicker()}
          </View>
          <View style={styles(currentColors).tabContainerMain}>
            <View style={styles(currentColors).tabContainer}>
              <TouchableOpacity
                style={[styles(currentColors).tab, activeTab === "active" && activeTabAnimatedStyle]}
                onPress={() => handleTabChange("active")}
              >
                <Text
                  style={[styles(currentColors).tabText, activeTab === "active" && styles(currentColors).activeTabText]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles(currentColors).tab, activeTab === "checked" && activeTabAnimatedStyle]}
                onPress={() => handleTabChange("checked")}
              >
                <Text
                  style={[
                    styles(currentColors).tabText,
                    activeTab === "checked" && styles(currentColors).activeTabText,
                  ]}
                >
                  Checked
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderTableHeader()}
          {!isLoading && isFetchingData ? (
            <View style={styles(currentColors).loaderContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                data={appointments}
                keyExtractor={(item) => `${item._id}-${vitalsUpdateKey}`}
                renderItem={renderTableRow}
                ListEmptyComponent={
                  !isLoading &&
                  !isFetchingData && (
                    <View style={styles(currentColors).noDataContainer}>
                      <Text style={styles(currentColors).noDataText}>No appointments found</Text>
                    </View>
                  )
                }
                ListFooterComponent={appointments.length > 0 && <PaginationControls />}
                refreshing={refreshing}
                onRefresh={onRefresh}
                contentContainerStyle={appointments.length === 0 ? { flex: 1, justifyContent: "center" } : {}}
                extraData={[expandedRowIndex, vitalsUpdateKey]} // Include vitals update key in extraData
              />
            </View>
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
            visible={vitalModalVisible}
            onClose={() => setVitalModalVisible(false)}
            onSave={handleVitals}
            appointment={selectedAppointment}
            setIsLoading={setIsLoading}
            fetchAppointments={fetchAppointments}
            emergencyMsg={emergencyMessage}
            setemergencyMsg={setEmergencyMessage}
          />
          <StatusSelectionModal
            visible={statusModalVisible}
            onClose={() => setStatusModalVisible(false)}
            onSelect={handleStatusSelection}
          />
          <UnCheckModal onConfirm={checkHandle} visible={uncheckModal} onClose={() => setUncheckModal(false)} />
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
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99999, elevation: 99999, pointerEvents: 'box-none' }}>
        <Toast />
      </View>
      <ActionMenu
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onAction={(actionType) => {
          switch (actionType) {
            case "edit":
              setModalVisible(true);
              break;
            case "delete":
              setDeleteModalVisible(true);
              break;
            case "token":
              setShowTokenScreen(true);
              break;
            case "check":
              Toast.show({ type: "info", text1: "Check", text2: "Starting..." });
              if (activeTab === "checked") setUncheckModal(true);
              else setStatusModalVisible(true);
              break;
            case "vitals":
              setVitalModalVisible(true);
              break;
          }
        }}
        appointment={selectedAppointment}
        activeTab={activeTab}
        currentColors={currentColors}
      />
      {(isDoctorDropdownOpen || isStatusFilterOpen) && (
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles(currentColors).dropdownOverlay} />
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
};

const styles = (currentColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: currentColors.background },
    fullScreenLoader: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      zIndex: 1000,
    },
    filterContainer: {
      backgroundColor: currentColors.filterBackground,
      flexDirection: "row",
      paddingHorizontal: moderateScale(15),
      gap: moderateScale(5),
      paddingVertical: verticalScale(15),
      justifyContent: "space-between",
    },
    dropdownButton: {
      flexDirection: "row",
      width: "100%",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "transparent",
      padding: moderateScale(6),
    },
    dropdownButtonText: { color: currentColors.dropdownText, fontSize: moderateScale(13), flex: 1, marginRight: 5 },
    dropdown: {
      position: "absolute",
      top: "110%",
      left: 0,
      right: 0,
      backgroundColor: currentColors.dropdownBackground,
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
      maxHeight: verticalScale(250),
    },
    dropdownScroll: { maxHeight: verticalScale(250) },
    dropdownItem: { padding: moderateScale(12), borderBottomWidth: 1, borderBottomColor: currentColors.dropdownBorder },
    dropdownItemText: { fontSize: moderateScale(14), color: currentColors.dropdownText },
    filterButton: {
      flexDirection: "row",
      width: width / 2 - moderateScale(20),
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "transparent",
      paddingHorizontal: moderateScale(10),
      height: moderateScale(40),
      borderRadius: moderateScale(10),
      borderWidth: moderateScale(1),
      borderColor: currentColors.dropdownBorder,
    },
    filterButtonText: { color: currentColors.dropdownText, fontSize: moderateScale(12) },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(10),
      backgroundColor: currentColors.headerBackground,
      elevation: 5,
    },
    headerTitle: {
      color: currentColors.headerText,
      fontSize: moderateScale(18),
      fontWeight: "600",
      textShadowColor: "rgba(102, 178, 255, 0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    searchContainer: {
      flexDirection: "row",
      paddingHorizontal: moderateScale(15),
      paddingVertical: verticalScale(15),
      gap: moderateScale(10),
      backgroundColor: currentColors.headerBackground,
      alignItems: "center",
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderRadius: moderateScale(12),
      paddingHorizontal: moderateScale(8),
      borderWidth: moderateScale(1),
      borderColor: currentColors.dropdownBorder,
      height: moderateScale(40),
    },
    searchInput: {
      flex: 1,
      paddingVertical: verticalScale(8),
      marginLeft: moderateScale(10),
      fontSize: moderateScale(14),
      color: currentColors.headerText,
    },
    modeToggleContainer: {
      flexDirection: "row",
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: currentColors.headerText || "#ffffff",
      overflow: "hidden",
      flexShrink: 0,
      height: moderateScale(35),
    },
    modeToggleButton: {
      paddingHorizontal: moderateScale(8),
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    modeToggleButtonActive: {
      backgroundColor: currentColors.headerText || "#ffffff",
    },
    modeToggleText: {
      fontSize: moderateScale(12),
      fontWeight: "600",
      color: currentColors.headerText || "#ffffff",
    },
    modeToggleTextActive: {
      color: currentColors.activeTabBackground || "#0066FF",
    },
    addButton: {
      backgroundColor: "transparent",
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: moderateScale(8),
      borderWidth: 1,
      borderColor: currentColors.headerText || "#ffffff",
      justifyContent: "center",
      alignItems: "center",
    },
    tabContainerMain: { backgroundColor: "transparent", overflow: "hidden" },
    tabContainer: {
      borderTopRightRadius: moderateScale(20),
      borderTopLeftRadius: moderateScale(20),
      flexDirection: "row",
      padding: moderateScale(10),
      paddingVertical: verticalScale(15),
      gap: moderateScale(10),
      backgroundColor: currentColors.tabBgColor,
    },
    tab: {
      width: scale(120),
      paddingVertical: verticalScale(8),
      alignItems: "center",
      borderRadius: moderateScale(20),
      borderColor: "#0066ff89",
      borderWidth: moderateScale(1),
    },
    activeTab: {
      backgroundColor: "#0066FF",
      color: "white",
    },
    tabText: { color: "#0066FF", fontSize: moderateScale(14), fontWeight: "800" },
    activeTabText: { color: "white" },
    tableHeader: {
      flexDirection: "row",
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      backgroundColor: currentColors.tableHeaderBackground,
      alignItems: "center",
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      backgroundColor: currentColors.tableRowBackground,
      alignItems: "center",
    },
    headerText: {
      color: currentColors.headerText,
      fontSize: moderateScale(12),
      fontWeight: "600",
      textAlign: "center",
      textShadowColor: "rgba(102, 178, 255, 0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    cellText: {
      color: currentColors.AppointmentColor,
      fontSize: moderateScale(12),
      textAlign: "center",
    },
    tokenColumn: { flex: 1, alignItems: "center" },
    mrnColumn: { flex: 1, alignItems: "center" },
    nameColumn: { flex: 1, alignItems: "center" },
    actionColumn: { flex: 1, alignItems: "center" },
    paginationContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: verticalScale(15),
      paddingHorizontal: moderateScale(15),
      backgroundColor: currentColors.background,
      borderTopWidth: 1,
      borderTopColor: currentColors.dropdownBorder,
    },
    totalAppointmentsContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#0066FF15",
      borderRadius: moderateScale(12),
      paddingHorizontal: moderateScale(12),
      paddingVertical: verticalScale(8),
      borderWidth: 1,
      borderColor: "#0066FF30",
    },
    appointmentIcon: { marginRight: moderateScale(8) },
    totalAppointmentsText: { fontSize: moderateScale(13), color: currentColors.AppointmentColor, fontWeight: "500" },
    totalAppointmentsCount: {
      fontWeight: "bold",
      color: "#0066FF",
      fontSize: moderateScale(15),
      marginLeft: moderateScale(5),
    },
    paginationControlsWrapper: { flexDirection: "row", alignItems: "center" },
    paginationButton: {
      padding: moderateScale(8),
      borderRadius: moderateScale(20),
      backgroundColor: currentColors.paginationButtonBackground,
      borderWidth: 1,
      borderColor: currentColors.paginationButtonBorder,
      marginHorizontal: moderateScale(10),
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
      justifyContent: "center",
      alignItems: "center",
      height: verticalScale(400),
      backgroundColor: currentColors.background,
    },
    noDataContainer: {
      padding: moderateScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: currentColors.background,
    },
    noDataText: { fontSize: moderateScale(14), color: currentColors.noDataText, textAlign: "center" },
    highEmergencyRow: {
      backgroundColor: "rgba(255, 0, 0, 0.315)",
    },
    moderateEmergencyRow: {
      backgroundColor: "rgba(255, 255, 0, 0.2)",
    },
    dropdownOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "transparent",
      zIndex: 999,
    },
  });

export default AppointmentScreen;