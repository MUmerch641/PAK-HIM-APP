import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useDebounce } from 'use-debounce';
import { useTheme } from '../utils/ThemeContext';
import { getAssignedDoctors, Doctor } from '../ApiHandler/Appointment';

interface DoctorSelectionScreenProps {
    onBack: () => void;
    onDoctorSelect: (doctor: Doctor) => void;
    patientData?: any;
}

const getShortDayName = (day: string): string => {
    const dayMap: { [key: string]: string } = {
        monday: 'Mon',
        tuesday: 'Tue',
        wednesday: 'Wed',
        thursday: 'Thu',
        friday: 'Fri',
        saturday: 'Sat',
        sunday: 'Sun',
    };
    return dayMap[day.toLowerCase()] || day;
};

const getAvailableDays = (doctor: Doctor): string[] => {
    if (!doctor.doctorDetails?.weeklySchedule) return [];
    return doctor.doctorDetails.weeklySchedule
        .filter(
            (schedule) =>
                schedule.timingScheedules && schedule.timingScheedules.length > 0
        )
        .map((schedule) => schedule.day);
};

const DoctorCard = React.memo(
    ({
        doctor,
        onSelect,
        currentColors,
    }: {
        doctor: Doctor;
        onSelect: (doctor: Doctor) => void;
        currentColors: any;
    }) => {
        const availableDays = getAvailableDays(doctor);
        const specialization =
            doctor.doctorDetails?.specialization ||
            doctor.specialization ||
            'General';

        return (
            <TouchableOpacity
                onPress={() => onSelect(doctor)}
                activeOpacity={0.7}
                style={dynamicStyles(currentColors).doctorCard}
            >
                <View style={dynamicStyles(currentColors).cardTopSection}>
                    <View style={dynamicStyles(currentColors).doctorImageContainer}>
                        {doctor.doctorDetails?.photoUrl ? (
                            <Image
                                source={{ uri: doctor.doctorDetails.photoUrl }}
                                style={dynamicStyles(currentColors).doctorImage}
                            />
                        ) : (
                            <View style={dynamicStyles(currentColors).doctorImagePlaceholder}>
                                <Ionicons
                                    name="person"
                                    size={moderateScale(28)}
                                    color="#0066FF"
                                />
                            </View>
                        )}
                    </View>
                    <View style={dynamicStyles(currentColors).doctorInfo}>
                        <Text
                            style={dynamicStyles(currentColors).doctorName}
                            numberOfLines={1}
                        >
                            {doctor.fullName}
                        </Text>
                        <Text
                            style={dynamicStyles(currentColors).doctorSpecialty}
                            numberOfLines={1}
                        >
                            {specialization}
                        </Text>
                        {doctor.department && (
                            <Text
                                style={dynamicStyles(currentColors).doctorDepartment}
                                numberOfLines={1}
                            >
                                {doctor.department}
                            </Text>
                        )}
                    </View>
                    <View style={dynamicStyles(currentColors).arrowContainer}>
                        <Ionicons
                            name="chevron-forward"
                            size={moderateScale(20)}
                            color={currentColors.dropdownText}
                        />
                    </View>
                </View>

                <View style={dynamicStyles(currentColors).availabilityFooter}>
                    <Text style={dynamicStyles(currentColors).availabilityLabel}>
                        Available:{' '}
                    </Text>
                    <Text
                        style={[
                            dynamicStyles(currentColors).availabilityDays,
                            !availableDays.length && { color: '#FF4444' },
                        ]}
                        numberOfLines={1}
                    >
                        {availableDays.length
                            ? availableDays.map(getShortDayName).join(', ')
                            : 'No schedule available'}
                    </Text>
                </View>

                {doctor.services && doctor.services.length > 0 && (
                    <View style={dynamicStyles(currentColors).servicesContainer}>
                        {doctor.services.slice(0, 3).map((service) => (
                            <View
                                key={service._id}
                                style={dynamicStyles(currentColors).serviceTag}
                            >
                                <Text style={dynamicStyles(currentColors).serviceTagText}>
                                    {service.serviceName}
                                </Text>
                            </View>
                        ))}
                        {doctor.services.length > 3 && (
                            <Text style={dynamicStyles(currentColors).moreServicesText}>
                                +{doctor.services.length - 3} more
                            </Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    }
);

export default function DoctorSelectionScreen({
    onBack,
    onDoctorSelect,
    patientData,
}: DoctorSelectionScreenProps) {
    const { currentColors } = useTheme();
    const styles = useMemo(() => dynamicStyles(currentColors), [currentColors]);

    const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDoctors = useCallback(async () => {
        try {
            setError(null);
            const doctors = await getAssignedDoctors();
            setAllDoctors(doctors);
            setFilteredDoctors(doctors);
        } catch (err) {
            setError('Failed to load doctors. Please try again.');
            setAllDoctors([]);
            setFilteredDoctors([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDoctors();
    }, [fetchDoctors]);

    // Filter doctors based on search query
    useEffect(() => {
        const query = debouncedSearchQuery.trim().toLowerCase();
        if (!query) {
            setFilteredDoctors(allDoctors);
            return;
        }
        const filtered = allDoctors.filter(
            (doctor) =>
                doctor.fullName.toLowerCase().includes(query) ||
                (doctor.specialization || '').toLowerCase().includes(query) ||
                (doctor.doctorDetails?.specialization || '').toLowerCase().includes(query) ||
                (doctor.department || '').toLowerCase().includes(query)
        );
        setFilteredDoctors(filtered);
    }, [debouncedSearchQuery, allDoctors]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDoctors();
    }, [fetchDoctors]);

    const renderDoctorItem = useCallback(
        ({ item }: { item: Doctor }) => (
            <DoctorCard
                doctor={item}
                onSelect={onDoctorSelect}
                currentColors={currentColors}
            />
        ),
        [onDoctorSelect, currentColors]
    );

    const keyExtractor = useCallback((item: Doctor) => item._id, []);

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons
                        name="search"
                        size={moderateScale(18)}
                        color="#0066FF"
                        style={{ marginRight: moderateScale(8) }}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or specialization"
                        placeholderTextColor={currentColors.dropdownText + '80'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {searchQuery ? (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={{ padding: moderateScale(4) }}
                        >
                            <Ionicons
                                name="close-circle"
                                size={moderateScale(18)}
                                color={currentColors.dropdownText}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Doctor List */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#0066FF" />
                        <Text style={styles.loadingText}>Loading doctors...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={moderateScale(48)}
                            color="#FF4444"
                        />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setLoading(true);
                                fetchDoctors();
                            }}
                            style={styles.retryButton}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredDoctors}
                        renderItem={renderDoctorItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={{ paddingBottom: verticalScale(20) }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#0066FF']}
                                tintColor="#0066FF"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.centerContainer}>
                                <Ionicons
                                    name="medical"
                                    size={moderateScale(40)}
                                    color={currentColors.noDataText}
                                />
                                <Text style={styles.emptyText}>
                                    No doctors found
                                    {searchQuery ? ` matching "${searchQuery}"` : ''}.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const dynamicStyles = (currentColors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: currentColors.background,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: moderateScale(15),
            paddingVertical: verticalScale(12),
            backgroundColor: currentColors.headerBackground,
        },
        backButton: {
            width: moderateScale(36),
            height: moderateScale(36),
            borderRadius: moderateScale(18),
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerTitle: {
            color: currentColors.headerText,
            fontSize: moderateScale(18),
            fontWeight: '600',
        },
        headerPlaceholder: {
            width: moderateScale(36),
        },
        searchContainer: {
            paddingHorizontal: moderateScale(15),
            paddingVertical: verticalScale(10),
            backgroundColor: currentColors.background,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: moderateScale(12),
            paddingHorizontal: moderateScale(12),
            borderWidth: 1,
            borderColor: currentColors.dropdownBorder,
            backgroundColor: currentColors.filterBackground,
        },
        searchInput: {
            flex: 1,
            paddingVertical: verticalScale(10),
            fontSize: moderateScale(14),
            color: currentColors.AppointmentColor,
        },
        content: {
            flex: 1,
            paddingHorizontal: moderateScale(15),
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: verticalScale(60),
        },
        loadingText: {
            marginTop: verticalScale(12),
            fontSize: moderateScale(14),
            color: currentColors.dropdownText,
        },
        errorText: {
            marginTop: verticalScale(12),
            fontSize: moderateScale(14),
            color: '#FF4444',
            textAlign: 'center',
        },
        retryButton: {
            marginTop: verticalScale(16),
            backgroundColor: '#0066FF',
            paddingHorizontal: moderateScale(24),
            paddingVertical: verticalScale(10),
            borderRadius: moderateScale(8),
        },
        retryButtonText: {
            color: '#ffffff',
            fontSize: moderateScale(14),
            fontWeight: '600',
        },
        emptyText: {
            marginTop: verticalScale(12),
            fontSize: moderateScale(14),
            color: currentColors.noDataText,
            textAlign: 'center',
        },

        // Doctor Card
        doctorCard: {
            backgroundColor: currentColors.bgColorCards,
            borderRadius: moderateScale(12),
            padding: moderateScale(14),
            marginBottom: verticalScale(12),
            borderWidth: 1,
            borderColor: currentColors.dropdownBorder,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        },
        cardTopSection: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        doctorImageContainer: {
            width: moderateScale(52),
            height: moderateScale(52),
            borderRadius: moderateScale(26),
            overflow: 'hidden',
            marginRight: moderateScale(12),
            backgroundColor: '#E8F0FE',
        },
        doctorImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        doctorImagePlaceholder: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#E8F0FE',
        },
        doctorInfo: {
            flex: 1,
        },
        doctorName: {
            fontSize: moderateScale(15),
            fontWeight: '600',
            color: currentColors.AppointmentColor,
            marginBottom: verticalScale(3),
        },
        doctorSpecialty: {
            fontSize: moderateScale(13),
            color: '#0066FF',
            fontWeight: '500',
            marginBottom: verticalScale(2),
        },
        doctorDepartment: {
            fontSize: moderateScale(11),
            color: currentColors.dropdownText,
        },
        arrowContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingLeft: moderateScale(8),
        },

        // Availability
        availabilityFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: verticalScale(10),
            marginTop: verticalScale(10),
            borderTopWidth: 1,
            borderTopColor: currentColors.dropdownBorder,
        },
        availabilityLabel: {
            fontSize: moderateScale(12),
            color: currentColors.dropdownText,
        },
        availabilityDays: {
            fontWeight: '500',
            color: '#22C55E',
            fontSize: moderateScale(12),
            flex: 1,
        },

        // Services
        servicesContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: verticalScale(8),
            gap: moderateScale(6),
            alignItems: 'center',
        },
        serviceTag: {
            backgroundColor: '#0066FF15',
            paddingHorizontal: moderateScale(8),
            paddingVertical: verticalScale(3),
            borderRadius: moderateScale(6),
            borderWidth: 1,
            borderColor: '#0066FF30',
        },
        serviceTagText: {
            fontSize: moderateScale(10),
            color: '#0066FF',
            fontWeight: '500',
        },
        moreServicesText: {
            fontSize: moderateScale(10),
            color: currentColors.dropdownText,
            fontStyle: 'italic',
        },
    });
