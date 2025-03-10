import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import { getAllDeletedAppointments, restoreDeletedAppointment } from '../ApiHandler/DeletedAppointment';
import { RestoreModal } from '../components/pageComponents/DeleteScreen/RestoreModal';
import { getDoctors } from '../ApiHandler/Patient';
import DateTimePicker from '@react-native-community/datetimepicker';
import ExpandableDetails from '../components/Reuseable/Expandable';

import { useDebounce } from 'use-debounce';
import { useTheme } from '../utils/ThemeContext';
import ThemeToggleButton from '../components/Reuseable/ThemeToggleButton';
import { logout } from '../Auth/authService';

const { width } = Dimensions.get('window');

interface Appointment {
    mrn: string;
    doctorName: string;
    deleteReason: string;
    feeStatus: string;
    isChecked: boolean;
    _id: string;
    deletedBy: string;
    patientId: {
        patientName: string;
    };
}

interface Doctor {
    _id: string;
    fullName: string;
}

const DeleteHistoryScreen = () => {

    const { currentColors } = useTheme();
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10);
    const [totalAppointments, setTotalAppointments] = useState<number>(0);
    const [hasMoreData, setHasMoreData] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState<boolean>(false);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [tableData, setTableData] = useState<Appointment[]>([]);
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
    const [searchMRN, setSearchMRN] = useState<string>(''); // Add state for search MRN
    const [debouncedSearchTerm] = useDebounce(searchMRN, 800);

    const RestoreHandle = async (item: Appointment) => {
        try {
            await restoreDeletedAppointment(item._id);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Appointment restored successfully',
            });
            // Refresh the list after restoring
            await fetchDeletedAppointments(1);
            onRefresh();
        } catch (error) {
            // Error is already handled in restoreDeletedAppointment
            // No need for additional toast here to avoid duplicate messages
            console.error("Error in RestoreHandle:", error);
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

    const formatDateForAPI = (date: Date): string => {
        // Format as YYYY-MM-DD for API
        return date.toISOString().split('T')[0];
    };

    const formatDateForDisplay = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const fetchDeletedAppointments = async (pageNo = currentPage) => {
        setIsLoading(true);
        try {
            const params = {
                count: itemsPerPage,
                pageNo,
                sort: "accending",
                doctorIds: selectedDoctor ? [selectedDoctor] : [], // Add doctorIds parameter
                appointmentDate: formatDateForAPI(selectedDate), // Add date parameter
                search: searchMRN || undefined, // Add search parameter
            };
            const response = await getAllDeletedAppointments(params);

            if (Array.isArray(response)) {
                if (response.length === 0 && pageNo === 1) {
                    setTableData([]);
                    setHasMoreData(false);
                } else if (response.length === 0) {
                    setHasMoreData(false);
                } else {
                    setTableData(response);
                    setHasMoreData(response.length >= itemsPerPage);
                }
                setTotalAppointments(response.length);
            } else {
                console.error("Invalid appointments data:", response);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Invalid appointments data format',
                });
                setTableData([]); // Add this line to clear the table data
                setHasMoreData(false); // Add this line to indicate no more data
            }
        } catch (error) {
            console.error("Error fetching deleted appointments:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load deleted appointments',
            });
            setTableData([]);
            setHasMoreData(false);
        } finally {
            setIsLoading(false);
        }
    };


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
    }, []);

    useEffect(() => {
        fetchDeletedAppointments(currentPage);
    }, [currentPage, selectedDoctor, selectedDate]);

    useEffect(() => {
        const handleSearch = async () => {
            if (searchMRN.trim() === '') {
                await fetchDeletedAppointments();
                return;
            }
            if (debouncedSearchTerm.trim()) {
                setIsLoading(true);
                try {
                    await fetchDeletedAppointments();
                } finally {
                    setIsLoading(false);
                }
            }
        };

        handleSearch();
    }, [debouncedSearchTerm]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDeletedAppointments(1);
        setRefreshing(false);
    };

    const PaginationControls = () => (
        <View style={styles(currentColors).paginationContainer}>
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
                    <TouchableOpacity
                        onPress={() => handleRestorePress(item)}
                        style={styles(currentColors).actionColumn}
                    >
                        <Ionicons name="refresh-outline" size={moderateScale(20)} color={currentColors.actionMenuTextColor} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
            {expandedRowIndex === index && (
                <ExpandableDetails
                    data={{
                        feeStatus: item.feeStatus,
                        isChecked: item.isChecked,
                        deletedBy: item.deletedBy
                    }}
                    type="delete"
                />
            )}
        </View>
    );

    const handleDoctorChange = (doctorId: string) => {
        setIsDoctorDropdownOpen(false);
        setSelectedDoctor(doctorId);
        fetchDeletedAppointments(1); // Fetch appointments when doctor changes
    };

    const handleDateChange = (event: any, selectedDate: Date | undefined) => {
        if (event.type === "set" && selectedDate) {
            setShowDatePicker(false);
            setSelectedDate(selectedDate);
            // Fetch appointments with the new date
            setCurrentPage(1); // Reset to first page
            fetchDeletedAppointments(1);
        } else {
            setShowDatePicker(false);
        }
    };
    const { themeMode } = useTheme(); // Get the current theme mode


    return (
        <SafeAreaView style={styles(currentColors).container}>
            <View style={styles(currentColors).header}>
                <TouchableOpacity onPress={() => logout()}
                >
                    <Ionicons name="log-in-outline" size={moderateScale(24)} color="white" />
                </TouchableOpacity>
                <Text style={styles(currentColors).headerTitle}>Delete History</Text>
                <ThemeToggleButton themeMode={themeMode} />

            </View>

            <View style={styles(currentColors).searchContainer}>
                <View style={styles(currentColors).searchBar}>
                    <TextInput
                        placeholder="Search MRN Here"
                        placeholderTextColor={currentColors.headerText}
                        style={styles(currentColors).searchInput}
                        value={searchMRN}
                        onChangeText={(text) => setSearchMRN(text)} // Add onChangeText handler
                    />
                    <Ionicons name="search" size={moderateScale(20)} color={currentColors.headerText} />
                </View>
            </View>


            {/* Filters */}
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
                <TouchableOpacity
                    style={styles(currentColors).filterButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles(currentColors).filterButtonText}>{formatDateForDisplay(selectedDate)}</Text>
                    <Ionicons name="calendar" size={moderateScale(20)} color={currentColors.dropdownText} />
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

            <>
                {renderTableHeader()}
                {isLoading ? (
                    <View style={styles(currentColors).loaderContainer}>
                        <ActivityIndicator size="large" color={currentColors.paginationButtonBorder} />
                    </View>
                ) : (
                    <FlatList
                        data={tableData}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, index }) => renderTableRow(item, index)}
                        ListEmptyComponent={() => (
                            <View style={styles(currentColors).noDataContainer}>
                                <Text style={styles(currentColors).noDataText}>No deleted appointments found</Text>
                            </View>
                        )}
                        ListFooterComponent={tableData.length > 0 ? <PaginationControls /> : null}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        contentContainerStyle={tableData.length === 0 ? { flex: 1, justifyContent: "center" } : {}}
                    />
                )}
                <Toast />
                <RestoreModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onRestore={confirmRestore}
                />
            </>
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
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(8),
        backgroundColor: 'transparent',
        borderColor: currentColors.dropdownBorder,
        borderWidth: moderateScale(1),
    },
    searchInput: {
        flex: 1,
        paddingVertical: verticalScale(8),
        marginLeft: moderateScale(10),
        fontSize: moderateScale(14),
        color: currentColors.headerText,
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

export default DeleteHistoryScreen;