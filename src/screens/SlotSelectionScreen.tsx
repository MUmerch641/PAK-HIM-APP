import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, verticalScale } from 'react-native-size-matters';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import { useTheme } from '../utils/ThemeContext';
import { getStyles } from '../components/pageComponents/PatientRegistration/styles';
import {
    getTimeSlots,
    addAppointmentSlotWise,
    TimeSlot,
    Doctor,
    Service,
} from '../ApiHandler/Appointment';
import { registerPatient } from '../ApiHandler/Patient';
import socketService from '../socket';

interface SlotSelectionScreenProps {
    doctor: Doctor;
    patientData: any;
    existingPatient?: any;
    onBack: () => void;
    onBookingComplete: () => void;
}

export default function SlotSelectionScreen({
    doctor,
    patientData,
    existingPatient,
    onBack,
    onBookingComplete,
}: SlotSelectionScreenProps) {
    const { currentColors } = useTheme();
    const styles = useMemo(() => getStyles(currentColors), [currentColors]);
    const localStyles = useMemo(() => slotStyles(currentColors), [currentColors]);

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    // State
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Services state (same pattern as manual mode)
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedServicesDetails, setSelectedServicesDetails] = useState<Service[]>([]);

    // Fee state
    const [totalFee, setTotalFee] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');
    const [payableFee, setPayableFee] = useState('');
    const [feeStatus, setFeeStatus] = useState<string>('paid');

    // Available services from doctor
    const doctorServices = useMemo(() => doctor.services || [], [doctor.services]);

    // Generate next 14 days
    const availableDates = useMemo(() => {
        const dates: { dateString: string; dayName: string; dayNum: number; monthName: string; isToday: boolean }[] = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            dates.push({
                dateString: d.toISOString().split('T')[0],
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNum: d.getDate(),
                monthName: d.toLocaleDateString('en-US', { month: 'short' }),
                isToday: i === 0,
            });
        }
        return dates;
    }, []);

    // Fetch slots
    const fetchSlots = useCallback(async () => {
        if (!doctor?._id || !selectedDate) return;
        setLoading(true);
        setSelectedSlot(null);
        try {
            const slots = await getTimeSlots(doctor._id, selectedDate);
            setAllSlots(slots);
        } catch {
            setAllSlots([]);
        } finally {
            setLoading(false);
        }
    }, [doctor?._id, selectedDate]);

    useEffect(() => { fetchSlots(); }, [fetchSlots]);

    // Fee calculations (same as manual mode)
    useEffect(() => {
        const total = selectedServicesDetails.reduce((sum, service: any) => {
            if ('fee' in service) return sum + service.fee;
            return sum;
        }, 0);
        setTotalFee(total.toString());
    }, [selectedServicesDetails]);

    useEffect(() => {
        const total = parseFloat(totalFee) || 0;
        const discPercent = parseFloat(discountPercentage) || 0;
        const discAmount = parseFloat(discountAmount) || 0;
        let discount = discAmount;
        if (discPercent > 0) {
            discount = (total * discPercent) / 100;
            setDiscountAmount(discount.toString());
        }
        const payable = Math.max(total - discount, 0);
        setPayableFee(payable.toString());
    }, [totalFee, discountPercentage, discountAmount]);

    // Check if time slot has passed
    const isTimeSlotPassed = useCallback(
        (timeFrom: string): boolean => {
            if (selectedDate !== today) return false;
            const match = timeFrom.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return false;
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === 'PM' && hours < 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            return new Date() > slotTime;
        },
        [selectedDate, today]
    );

    // Slot counts
    const slotCounts = useMemo(() => {
        let available = 0, booked = 0, selected = 0, expired = 0;
        allSlots.forEach((slot) => {
            const [timeFrom] = slot.slot.split(' - ');
            const isPast = isTimeSlotPassed(timeFrom);
            const isBooked = slot.status === 1;
            const isExpired = slot.status !== 1 && (slot.status === 2 || isPast);
            if (selectedSlot?.slotId === slot.slotId) selected++;
            else if (isBooked) booked++;
            else if (isExpired) expired++;
            else if (slot.status === 0 && !isPast) available++;
        });
        return { available, booked, selected, expired };
    }, [allSlots, selectedSlot, isTimeSlotPassed]);

    // Service handlers (same as manual mode)
    const handleServiceChange = (serviceId: string) => {
        if (serviceId === '') return;
        const service = doctorServices.find((s) => s._id === serviceId);
        if (service && !selectedServiceIds.includes(serviceId)) {
            setSelectedServiceIds([...selectedServiceIds, serviceId]);
            setSelectedServicesDetails([...selectedServicesDetails, service]);
        }
    };

    const handleRemoveService = (serviceId: string) => {
        setSelectedServiceIds(selectedServiceIds.filter((id) => id !== serviceId));
        setSelectedServicesDetails(selectedServicesDetails.filter((s) => s._id !== serviceId));
    };

    // Submit — no confirm popup, direct booking
    const handleSubmit = useCallback(async () => {
        // Validation
        if (!selectedSlot) {
            Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Please select a time slot' });
            return;
        }
        if (selectedServiceIds.length === 0) {
            Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Please select at least one service' });
            return;
        }

        setIsSubmitting(true);
        try {
            const [timeFrom, timeTo] = selectedSlot.slot.split(' - ');
            let patientId = patientData?.appointment?.patientId || '';

            // Register new patient if needed
            if (!patientId && !existingPatient) {
                const requestBody = {
                    mrn: 0,
                    patientName: patientData?.patientName || '',
                    guardiansName: patientData?.guardianName || '',
                    gender: patientData?.gender || 'female',
                    dob: patientData?.dateOfBirth instanceof Date
                        ? patientData.dateOfBirth.toISOString().split('T')[0] : '',
                    phoneNumber: patientData?.phoneNo || '',
                    cnic: patientData?.cnic || '',
                    helthId: patientData?.healthId || '',
                    city: patientData?.city || '',
                    reference: patientData?.reference || '',
                    extra: patientData?.extra || {},
                };
                const regResponse = await registerPatient(requestBody as any);
                if (regResponse?.isSuccess && regResponse.data?._id) {
                    patientId = regResponse.data._id;
                } else {
                    Toast.show({ type: 'error', text1: 'Registration Failed', text2: 'Could not register patient. Please try again.' });
                    setIsSubmitting(false);
                    return;
                }
            }

            if (!patientId) {
                Toast.show({ type: 'error', text1: 'Oops!', text2: 'Patient information is missing. Please go back and try again.' });
                setIsSubmitting(false);
                return;
            }

            const payload = {
                doctorId: doctor._id,
                patientId,
                services: selectedServiceIds,
                feeStatus,
                appointmentDate: selectedDate,
                appointmentTime: { from: timeFrom.trim(), to: timeTo.trim() },
                slotId: selectedSlot.slotId,
                discount: parseFloat(discountAmount) || 0,
                extra: {},
            };

            await addAppointmentSlotWise(payload);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Appointment created successfully',
            });

            socketService.emitHimsEvent("appointments", "insert", {});
            onBookingComplete();
        } catch {
            // Error toast already shown by API function
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedSlot, selectedServiceIds, selectedDate, doctor, patientData, existingPatient, feeStatus, discountAmount, onBookingComplete]);

    // Render slot item
    const renderSlotItem = useCallback(
        ({ item }: { item: TimeSlot }) => {
            const [timeFrom, timeTo] = item.slot.split(' - ');
            const isSelected = selectedSlot?.slotId === item.slotId;
            const isPast = isTimeSlotPassed(timeFrom);
            const isBooked = item.status === 1;
            const isExpired = item.status !== 1 && (item.status === 2 || isPast);
            const isAvailable = item.status === 0 && !isPast;

            let slotStyle = localStyles.availableSlot;
            let textStyle = localStyles.availableSlotText;
            if (isSelected) { slotStyle = localStyles.selectedSlot; textStyle = localStyles.selectedSlotText; }
            else if (isExpired) { slotStyle = localStyles.expiredSlot; textStyle = localStyles.expiredSlotText; }
            else if (isBooked) { slotStyle = localStyles.bookedSlot; textStyle = localStyles.bookedSlotText; }

            return (
                <TouchableOpacity
                    onPress={() => isAvailable && setSelectedSlot(item)}
                    disabled={!isAvailable}
                    activeOpacity={0.7}
                    style={[localStyles.slotButton, slotStyle, { flex: 1, marginHorizontal: 5, marginBottom: 8 }]}
                >
                    <Text style={[localStyles.slotText, textStyle]}>
                        {`${timeFrom.trim()} - ${timeTo.trim()}`}
                    </Text>
                </TouchableOpacity>
            );
        },
        [selectedSlot, isTimeSlotPassed, localStyles]
    );

    return (
        <View style={{ flex: 1, backgroundColor: currentColors.background }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: moderateScale(12) }}>

                {/* Doctor Info Card */}
                <View style={localStyles.doctorCard}>
                    <View style={localStyles.doctorCardLeft}>
                        <View style={localStyles.doctorAvatar}>
                            {doctor.doctorDetails?.photoUrl ? (
                                <Image source={{ uri: doctor.doctorDetails.photoUrl }} style={{ width: moderateScale(36), height: moderateScale(36), borderRadius: moderateScale(18) }} />
                            ) : (
                                <Ionicons name="person" size={moderateScale(22)} color="#0066FF" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={localStyles.doctorName} numberOfLines={1}>{doctor.fullName}</Text>
                            <Text style={localStyles.doctorSpec} numberOfLines={1}>
                                {doctor.doctorDetails?.specialization || doctor.specialization || ''}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onBack} style={localStyles.changeDoctorBtn}>
                        <Text style={localStyles.changeDoctorText}>Change</Text>
                    </TouchableOpacity>
                </View>

                {/* Date Selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Date</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }}>
                        {availableDates.map((date) => {
                            const isSelected = selectedDate === date.dateString;
                            return (
                                <TouchableOpacity
                                    key={date.dateString}
                                    style={[localStyles.dateButton, isSelected && localStyles.selectedDateButton, date.isToday && localStyles.todayButton]}
                                    onPress={() => setSelectedDate(date.dateString)}
                                >
                                    <Text style={[localStyles.dateDayText, isSelected && localStyles.selectedDateText]}>{date.dayName}</Text>
                                    <Text style={[localStyles.dateNumText, isSelected && localStyles.selectedDateText]}>{date.dayNum}</Text>
                                    <Text style={[localStyles.dateMonthText, isSelected && localStyles.selectedDateText]}>{date.monthName}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Time Slots */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Time Slot</Text>

                    {/* Legend */}
                    <View style={localStyles.legendContainer}>
                        <View style={localStyles.legendItem}><View style={[localStyles.legendDot, { borderColor: '#0066FF' }]} /><Text style={localStyles.legendText}>{slotCounts.available} Available</Text></View>
                        <View style={localStyles.legendItem}><View style={[localStyles.legendDot, { borderColor: '#888', backgroundColor: '#F8F9FA' }]} /><Text style={localStyles.legendText}>{slotCounts.booked} Booked</Text></View>
                        <View style={localStyles.legendItem}><View style={[localStyles.legendDot, { borderColor: '#22C55E', backgroundColor: '#E6F7F0' }]} /><Text style={localStyles.legendText}>{slotCounts.selected} Selected</Text></View>
                        <View style={localStyles.legendItem}><View style={[localStyles.legendDot, { borderColor: '#EF4444', backgroundColor: '#FFF5F5' }]} /><Text style={localStyles.legendText}>{slotCounts.expired} Expired</Text></View>
                    </View>

                    {loading ? (
                        <View style={localStyles.centerContainer}>
                            <ActivityIndicator size="large" color="#0066FF" />
                        </View>
                    ) : allSlots.length === 0 ? (
                        <View style={localStyles.centerContainer}>
                            <Ionicons name="calendar-outline" size={moderateScale(40)} color={currentColors.dropdownText} />
                            <Text style={localStyles.emptyText}>No slots available for this date.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={allSlots}
                            renderItem={renderSlotItem}
                            keyExtractor={(item) => item.slotId}
                            numColumns={2}
                            scrollEnabled={false}
                            columnWrapperStyle={{ justifyContent: 'center' }}
                            contentContainerStyle={{ paddingVertical: 8 }}
                        />
                    )}
                </View>

                {/* Services Section (same as manual mode) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appointment Details</Text>

                    <Text style={styles.label}>
                        Services<Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue=""
                            onValueChange={handleServiceChange}
                            style={styles.picker}
                            dropdownIconColor={currentColors.AppointmentColor}
                        >
                            <Picker.Item label="Select Service" value="" />
                            {doctorServices.map((service) => (
                                <Picker.Item key={service._id} label={service.serviceName} value={service._id} />
                            ))}
                        </Picker>
                    </View>

                    {selectedServicesDetails.length > 0 && (
                        <View style={styles.selectedServicesContainer}>
                            <Text style={styles.selectedServicesTitle}>Selected Services:</Text>
                            <View style={styles.chipContainer}>
                                {selectedServicesDetails.map((service) => (
                                    <View key={service._id} style={styles.chip}>
                                        <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                                            {service.serviceName}
                                        </Text>
                                        <TouchableOpacity onPress={() => handleRemoveService(service._id)} style={styles.chipRemoveButton}>
                                            <Ionicons name="close-circle" size={16} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Fee Summary (same as manual mode) */}
                    <View style={styles.feeContainer}>
                        <View style={styles.feeItem}>
                            <Text style={styles.label}>Total Fee (Rs)<Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.input, styles.readOnlyInput]}
                                placeholder="0000"
                                value={totalFee}
                                editable={false}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.feeItem}>
                            <Text style={styles.label}>Discount %</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                value={discountPercentage}
                                onChangeText={setDiscountPercentage}
                                keyboardType="numeric"
                                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + '80'}
                            />
                        </View>
                    </View>

                    <View style={styles.feeContainer}>
                        <View style={styles.feeItem}>
                            <Text style={styles.label}>Discount Rs</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0000"
                                value={discountAmount}
                                onChangeText={setDiscountAmount}
                                keyboardType="numeric"
                                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + '80'}
                            />
                        </View>
                        <View style={styles.feeItem}>
                            <Text style={styles.label}>Payable Fee<Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                style={[styles.input, styles.readOnlyInput]}
                                placeholder="0000"
                                value={payableFee}
                                editable={false}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Status Picker */}
                    <Text style={styles.label}>Status</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={feeStatus}
                            onValueChange={setFeeStatus}
                            style={styles.picker}
                            dropdownIconColor={currentColors.AppointmentColor}
                        >
                            <Picker.Item label="Paid" value="paid" />
                            <Picker.Item label="Unpaid" value="unpaid" />
                        </Picker>
                    </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
                        <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Done</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const slotStyles = (currentColors: any) =>
    StyleSheet.create({
        // Doctor Card
        doctorCard: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: currentColors.bgColorCards, borderRadius: 12, padding: moderateScale(12),
            marginBottom: verticalScale(12), borderWidth: 1, borderColor: currentColors.dropdownBorder,
        },
        doctorCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
        doctorAvatar: {
            width: moderateScale(36), height: moderateScale(36), borderRadius: moderateScale(18),
            backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center', marginRight: moderateScale(10),
        },
        doctorName: { fontSize: moderateScale(14), fontWeight: '600', color: currentColors.AppointmentColor },
        doctorSpec: { fontSize: moderateScale(11), color: '#0066FF', marginTop: 1 },
        changeDoctorBtn: {
            paddingHorizontal: moderateScale(12), paddingVertical: verticalScale(5),
            borderRadius: 6, borderWidth: 1, borderColor: '#0066FF',
        },
        changeDoctorText: { color: '#0066FF', fontSize: moderateScale(12), fontWeight: '500' },

        // Date Selector
        dateButton: {
            alignItems: 'center', justifyContent: 'center', backgroundColor: currentColors.dropdownBackground,
            borderRadius: 10, paddingVertical: verticalScale(8), paddingHorizontal: moderateScale(12),
            marginRight: moderateScale(8), minWidth: moderateScale(56), borderWidth: 1, borderColor: currentColors.dropdownBorder,
        },
        selectedDateButton: { backgroundColor: '#0066FF15', borderColor: '#0066FF' },
        todayButton: { borderColor: '#0066FF' },
        dateDayText: { fontSize: moderateScale(11), color: currentColors.dropdownText, fontWeight: '500' },
        dateNumText: { fontSize: moderateScale(16), fontWeight: '700', color: currentColors.AppointmentColor, marginVertical: 2 },
        dateMonthText: { fontSize: moderateScale(10), color: currentColors.dropdownText },
        selectedDateText: { color: '#0066FF' },

        // Legend
        legendContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: verticalScale(8) },
        legendItem: { flexDirection: 'row', alignItems: 'center' },
        legendDot: { width: moderateScale(12), height: moderateScale(12), borderRadius: 3, borderWidth: 1.5, marginRight: moderateScale(4) },
        legendText: { fontSize: moderateScale(10), color: currentColors.dropdownText },

        // Slots
        slotButton: {
            borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' as any,
            paddingVertical: verticalScale(10), paddingHorizontal: moderateScale(4),
            alignItems: 'center', justifyContent: 'center',
        },
        slotText: { fontSize: moderateScale(11), fontWeight: '500', textAlign: 'center' as any },
        availableSlot: { borderColor: '#0066FF' },
        availableSlotText: { color: '#0066FF' },
        selectedSlot: { borderColor: '#22C55E', backgroundColor: '#E6F7F0', borderStyle: 'solid' as any },
        selectedSlotText: { color: '#22C55E', fontWeight: '600' as any },
        bookedSlot: { borderColor: '#888', backgroundColor: '#F8F9FA', borderStyle: 'solid' as any },
        bookedSlotText: { color: '#888' },
        expiredSlot: { borderColor: '#EF4444', backgroundColor: '#FFF5F5', borderStyle: 'solid' as any },
        expiredSlotText: { color: '#EF4444' },

        // Loading/Empty
        centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: verticalScale(30) },
        emptyText: { marginTop: verticalScale(10), fontSize: moderateScale(13), color: currentColors.dropdownText, textAlign: 'center' as any },
    });
