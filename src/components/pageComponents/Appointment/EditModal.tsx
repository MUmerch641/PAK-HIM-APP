import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { getDoctors } from '@/src/ApiHandler/Patient';
import { useColorScheme } from 'react-native';
import { colors } from '@/src/utils/color';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';

interface Patient {
    _id: string;
    city: string;
    cnic: string;
    createdAt: string;
    dob: string;
    gender: string;
    guardiansName: string;
    healthId: string;
    isActive: boolean;
    isDeleted: boolean;
    mrn: number;
    patientName: string;
    phonNumber: string;
    projectId: string;
    reference: string;
    updatedAt: string;
    userId: string;
}

interface Service {
    _id: string;
    fee: number;
    hospitalChargesInPercentage: number;
    serviceName: string;
    turnaround_time?: number; // Optional property
}

interface Appointment {
    _id?: string;
    appointmentCheckedStatus?: string;
    appointmentDate?: string;
    appointmentTime?: {
        from: string;
        to: string;
    };
    checkedDateAndTime?: string;
    createdAt?: string;
    createdBy?: string;
    discount?: number;
    doctor?: {
        _id: string;
        fullName: string;
    };
    doctorId?: string;
    doctorName?: string;
    fee?: number;
    feeStatus?: string;
    insuranceDetails?: {
        claimStatus: string;
        insuranceCompanyId: string;
        insuranceId: string;
    };
    isActive?: boolean;
    isApmtCanceled?: boolean;
    isChecked?: boolean;
    isDeleted?: boolean;
    isPrescriptionCreated?: boolean;
    mrn?: number;
    patientId?: Patient;
    projectId?: string;
    returnableAmount?: number;
    services?: Service[];
    tokenId?: number;
    updatedAt?: string;
    userId?: string;
}

interface EditAppointmentModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    appointment: Appointment;
    currentColors:any
}

interface Doctor {
    _id: string;
    fullName: string;
    services: Service[];
}

interface Colors {
    background: string;
    dropdownBackground: string;
    dropdownBorder: string;
    actionMenuTextColor: string;
    activeTabBackground: string;
    activeTabText: string;
    emergencyRowBackground: string;
}

interface ValidationState {
    status: { valid: boolean; message: string };
    date: { valid: boolean; message: string };
    time: { valid: boolean; message: string };
    totalFee: { valid: boolean; message: string };
    discountPercent: { valid: boolean; message: string };
    discount: { valid: boolean; message: string };
    services: { valid: boolean; message: string };
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
    visible,
    onClose,
    onSave,
    appointment,
    currentColors
}) => {

    const [status, setStatus] = useState<string>(appointment?.feeStatus || '');
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServicesDetails, setSelectedServicesDetails] = useState<Service[]>(appointment?.services || []);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isEnable, setisEnable] = useState(true);
    const [isFirstInteraction, setIsFirstInteraction] = useState(true);
    const pickerRef = useRef(null);

    const [date, setDate] = useState<Date>(
        appointment?.appointmentDate ? new Date(appointment.appointmentDate) : new Date()
    );
    const [time, setTime] = useState<string>(
        appointment?.appointmentTime?.from || ''
    );
    const [totalFee, setTotalFee] = useState<string>(
        appointment?.fee?.toString() || '1000'
    );
    const [discountPercent, setDiscountPercent] = useState<string>('0');
    const [discount, setDiscount] = useState<string>(
        appointment?.discount?.toString() || '0'
    );
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [ServiceLength, setServiceLength] = useState(0);
    const [allServices, setAllServices] = useState<Service[]>([]);

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationState>({
        status: { valid: true, message: '' },
        date: { valid: true, message: '' },
        time: { valid: true, message: '' },
        totalFee: { valid: true, message: '' },
        discountPercent: { valid: true, message: '' },
        discount: { valid: true, message: '' },
        services: { valid: true, message: '' },
    });
    const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);

    useEffect(() => {
        if (appointment) {
            setStatus(appointment.feeStatus || '');
            setDate(appointment.appointmentDate ? new Date(appointment.appointmentDate) : new Date());
            setTime(appointment.appointmentTime?.from || '');
            setTotalFee(appointment.fee?.toString() || '1000');
            setDiscount(appointment.discount?.toString() || '0');
            setServices(appointment.services || []);
            setServiceLength(appointment.services?.length || 0)
            setSelectedServicesDetails(appointment.services || []);
            // Calculate discount percentage
            if (appointment.fee && appointment.discount) {
                const percent = ((appointment.discount / appointment.fee) * 100).toFixed(2);
                setDiscountPercent(percent);
            }
        }
    }, [appointment]);

    useEffect(() => {
        if (visible) {
            setFormSubmitAttempted(false);
            setValidationErrors({
                status: { valid: true, message: '' },
                date: { valid: true, message: '' },
                time: { valid: true, message: '' },
                totalFee: { valid: true, message: '' },
                discountPercent: { valid: true, message: '' },
                discount: { valid: true, message: '' },
                services: { valid: true, message: '' },
            });
        }
    }, [visible]);

    const fetchDoctors = async () => {
        try {
            const response = await getDoctors({});
            const doctorsList: Doctor[] = response.data.map((doctor: any) => ({
                ...doctor,
                services: doctor.services.map((service: any) => ({
                    ...service,
                    turnaround_time: service.turnaround_time || 0, // Ensure turnaround_time is present
                })),
            }));
            setDoctors(doctorsList);

            // Collect all services from all doctors
            const allServicesList: Service[] = [];
            doctorsList.forEach(doctor => {
                doctor.services.forEach(service => {
                    if (!allServicesList.some(s => s.serviceName === service.serviceName)) {
                        allServicesList.push(service);
                    }
                });
            });
            setAllServices(allServicesList);

            if (doctorsList.length > 0) {
                setSelectedDoctor(doctorsList[0]);
                // Only set services initially, don't override on subsequent fetches
                if (services.length === 0) {
                    setServices(allServicesList);
                }
            }
        } catch (error) {
            console.error("Error fetching doctors:", error);
        }
    };

    // Calculate payable fee based on total fee and discount
    const calculatePayableFee = () => {
        const total = parseFloat(totalFee) || 0;
        const disc = parseFloat(discount) || 0;
        return (total - disc).toString();
    };

    const handleRemoveService = (serviceName: string) => {
        const updatedServices = selectedServicesDetails.filter(service => service.serviceName !== serviceName);
        setSelectedServicesDetails(updatedServices);
        if (updatedServices.length === 0) {
            setValidationErrors(prev => ({
                ...prev,
                services: { valid: false, message: 'At least one service is required' }
            }));
        } else {
            setValidationErrors(prev => ({
                ...prev,
                services: { valid: true, message: '' }
            }));
        }
    };

    const handleServiceChange = (serviceName: string) => {
        if (serviceName === '') return;

        // If this is the first interaction with the dropdown after modal opens
        if (isFirstInteraction && selectedServicesDetails.length > 0) {
            // Clear all previously selected services
            setSelectedServicesDetails([]);
            setIsFirstInteraction(false);

            // After clearing, add the newly selected service
            const selectedService = allServices.find(service => service.serviceName === serviceName);
            if (selectedService) {
                setSelectedServicesDetails([selectedService]);
                setValidationErrors(prev => ({
                    ...prev,
                    services: { valid: true, message: '' }
                }));
            }
        } else {
            // For subsequent selections, check for duplicates
            const isDuplicate = selectedServicesDetails.some(service => service.serviceName === serviceName);
            if (!isDuplicate) {
                const selectedService = allServices.find(service => service.serviceName === serviceName);
                if (selectedService) {
                    setSelectedServicesDetails(prev => {
                        const newServices = [...prev, selectedService];
                        setValidationErrors(errors => ({
                            ...errors,
                            services: { valid: true, message: '' }
                        }));
                        return newServices;
                    });
                }
            }
        }
    };

    // Reset first interaction flag when modal closes or reopens
    useEffect(() => {
        if (visible) {
            setIsFirstInteraction(true);
        }
    }, [visible]);

    // Update discount when discount percentage changes
    const handleDiscountPercentChange = (value: string) => {
        const percentValue = parseFloat(value) || 0;
        if (percentValue >= 0 && percentValue <= 100) {
            setDiscountPercent(value);
            const total = parseFloat(totalFee) || 0;
            const discountAmount = (total * percentValue / 100).toString();
            setDiscount(discountAmount);
            setValidationErrors(prev => ({
                ...prev,
                discountPercent: { valid: true, message: '' }
            }));
        } else {
            setDiscountPercent(value);
            setValidationErrors(prev => ({
                ...prev,
                discountPercent: {
                    valid: false,
                    message: 'Discount percent must be between 0 and 100'
                }
            }));
        }
    };

    // Update discount percentage when discount amount changes
    const handleDiscountChange = (value: string) => {
        setDiscount(value);
        const total = parseFloat(totalFee) || 0;
        const discAmount = parseFloat(value) || 0;
        if (discAmount > total) {
            setValidationErrors(prev => ({
                ...prev,
                discount: {
                    valid: false,
                    message: 'Discount cannot exceed total fee'
                }
            }));
        } else {
            setValidationErrors(prev => ({
                ...prev,
                discount: { valid: true, message: '' }
            }));
        }
        if (total > 0) {
            const percentValue = ((discAmount / total) * 100).toFixed(2);
            setDiscountPercent(percentValue);
        }
    };

    const validateTime = (timeValue: string) => {
        const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        return timeRegex.test(timeValue);
    };
    const validateTotalFee = (fee: string) => {
        const feeValue = parseFloat(fee);
        return !isNaN(feeValue) && feeValue > 0;
    };
    const validateForm = (): boolean => {
        const newValidationState = {
            status: { valid: !!status, message: status ? '' : 'Status is required' },
            date: { valid: true, message: '' },
            time: {
                valid: validateTime(time),
                message: validateTime(time) ? '' : 'Enter time in format HH:MM AM/PM'
            },
            totalFee: {
                valid: validateTotalFee(totalFee),
                message: validateTotalFee(totalFee) ? '' : 'Fee must be greater than 0'
            },
            discountPercent: {
                valid: parseFloat(discountPercent) >= 0 && parseFloat(discountPercent) <= 100,
                message: 'Discount percent must be between 0 and 100'
            },
            discount: {
                valid: parseFloat(discount) >= 0 && parseFloat(discount) <= parseFloat(totalFee),
                message: 'Discount cannot exceed total fee'
            },
            services: {
                valid: selectedServicesDetails.length > 0,
                message: 'At least one service is required'
            },
        };
        setValidationErrors(newValidationState);
        return Object.values(newValidationState).every(field => field.valid);
    };

    const handleTimeChange = (value: string) => {
        setTime(value);
        if (formSubmitAttempted) {
            setValidationErrors(prev => ({
                ...prev,
                time: {
                    valid: validateTime(value),
                    message: validateTime(value) ? '' : 'Enter time in format HH:MM AM/PM'
                }
            }));
        }
    };
    const handleTotalFeeChange = (value: string) => {
        setTotalFee(value);
        if (formSubmitAttempted) {
            const feeValid = validateTotalFee(value);
            setValidationErrors(prev => ({
                ...prev,
                totalFee: {
                    valid: feeValid,
                    message: feeValid ? '' : 'Fee must be greater than 0'
                }
            }));
            const discAmount = parseFloat(discount) || 0;
            const totalAmount = parseFloat(value) || 0;
            if (discAmount > totalAmount) {
                setValidationErrors(prev => ({
                    ...prev,
                    discount: {
                        valid: false,
                        message: 'Discount cannot exceed total fee'
                    }
                }));
            } else {
                setValidationErrors(prev => ({
                    ...prev,
                    discount: { valid: true, message: '' }
                }));
            }
        }
    };

    const handleSave = async () => {
        setFormSubmitAttempted(true);
    
        if (!validateForm()) {
            return;
        }
    
        try {
            const response = await getDoctors({});
    
            const updatedServices = selectedServicesDetails.map((selectedService) => {
                let matchedService: any = null; // Temporarily use any
                for (const doctor of response.data) {
                    matchedService = doctor.services.find(
                        (service: any) => service.serviceName === selectedService.serviceName
                    );
                    if (matchedService) {
                        break;
                    }
                }
                return matchedService
                    ? {
                          ...matchedService,
                          turnaround_time: matchedService.turnaround_time ?? 0,
                      }
                    : {
                          ...selectedService,
                          turnaround_time: selectedService.turnaround_time ?? 0,
                      };
            });
    
    
            const updatedAppointment: Appointment = {
                ...appointment,
                feeStatus: status,
                appointmentDate: date.toISOString().split("T")[0],
                appointmentTime: {
                    from: time,
                    to: time,
                },
                fee: Number(totalFee),
                discount: Number(discount),
                patientId: appointment.patientId,
                projectId: appointment.projectId,
                userId: appointment.userId,
                services: updatedServices,
                doctorId: appointment.doctorId,
                doctorName: appointment.doctor?.fullName,
            };
    
    
            onSave(updatedAppointment);
            onClose();
        } catch (error) {
            console.error("Error fetching doctors in handleSave:", error);
        }
    };


    // Populate services in the dropdown
    const getAvailableServices = () => {
        return allServices;
    };

    const getInputStyle = (fieldName: keyof ValidationState) => {
        const isFocused = focusedField === fieldName;
        const isInvalid = formSubmitAttempted && !validationErrors[fieldName].valid;
        return [
            styles(currentColors).input,
            isFocused && styles(currentColors).inputFocused,
            isInvalid && styles(currentColors).inputError
        ];
    };
    return (
        visible && (
            <View style={styles(currentColors).container}>
                <View style={styles(currentColors).card}>
                    <View style={styles(currentColors).header}>
                        <Text style={styles(currentColors).title}>Edit Appointment</Text>
                        <TouchableOpacity onPress={onClose} style={styles(currentColors).closeButton}>
                            <Ionicons name="close" size={24} color={currentColors.actionMenuTextColor} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles(currentColors).scrollView}>
                        {/* Status & Date Row */}
                        <View style={styles(currentColors).row}>
                            <View style={styles(currentColors).column}>
                                <Text style={styles(currentColors).label}>Status</Text>
                                <View style={[
                                    styles(currentColors).selectContainer,
                                    focusedField === 'status' && styles(currentColors).inputFocused,
                                    formSubmitAttempted && !validationErrors.status.valid && styles(currentColors).inputError
                                ]}>
                                    <Picker
                                        selectedValue={status}
                                        onValueChange={(itemValue) => {
                                            setStatus(itemValue);
                                            setValidationErrors(prev => ({
                                                ...prev,
                                                status: { valid: !!itemValue, message: '' }
                                            }));
                                        }}
                                        style={styles(currentColors).picker}
                                        onFocus={() => setFocusedField('status')}
                                        onBlur={() => setFocusedField(null)}
                                    >
                                        <Picker.Item label="Paid" value="paid" />
                                        <Picker.Item label="Unpaid" value="unpaid" />
                                    </Picker>
                                </View>
                                {formSubmitAttempted && !validationErrors.status.valid && (
                                    <Text style={styles(currentColors).errorText}>{validationErrors.status.message}</Text>
                                )}
                            </View>

                            <View style={styles(currentColors).column}>
                                <Text style={styles(currentColors).label}>Date</Text>
                                <Pressable
                                    style={[
                                        styles(currentColors).dateInput,
                                        focusedField === 'date' && styles(currentColors).inputFocused,
                                        formSubmitAttempted && !validationErrors.date.valid && styles(currentColors).inputError
                                    ]}
                                    onPress={() => {
                                        setShowDatePicker(true);
                                        setFocusedField('date');
                                    }}
                                >
                                    <Text style={styles(currentColors).dateText}>{date.toLocaleDateString()}</Text>
                                    <Ionicons name="calendar" size={20} color={currentColors.actionMenuTextColor} />
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(false);
                                            setFocusedField(null);
                                            if (selectedDate) {
                                                setDate(selectedDate);
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Time & Fee Row */}
                        <View style={styles(currentColors).row}>
                            <View style={styles(currentColors).column}>
                                <Text style={styles(currentColors).label}>Time</Text>
                                <View style={[
                                    styles(currentColors).inputContainer,
                                    focusedField === 'time' && styles(currentColors).inputFocused,
                                    formSubmitAttempted && !validationErrors.time.valid && styles(currentColors).inputError
                                ]}>
                                    <TextInput
                                        style={styles(currentColors).input}
                                        value={time}
                                        onChangeText={handleTimeChange}
                                        placeholder="HH:MM:SS"
                                        onFocus={() => setFocusedField('time')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    <Ionicons name="time-outline" size={20} color={currentColors.actionMenuTextColor} style={styles(currentColors).inputIcon} />
                                </View>
                                {formSubmitAttempted && !validationErrors.time.valid && (
                                    <Text style={styles(currentColors).errorText}>{validationErrors.time.message}</Text>
                                )}
                            </View>

                            <View style={styles(currentColors).column}>
                                <Text style={styles(currentColors).label}>Total Fee</Text>
                                <View style={[
                                    styles(currentColors).inputContainer,
                                    focusedField === 'totalFee' && styles(currentColors).inputFocused,
                                    formSubmitAttempted && !validationErrors.totalFee.valid && styles(currentColors).inputError
                                ]}>
                                    <TextInput
                                        style={styles(currentColors).input}
                                        value={totalFee}
                                        onChangeText={handleTotalFeeChange}
                                        keyboardType="numeric"
                                        placeholder="1000"
                                        onFocus={() => setFocusedField('totalFee')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    <Text style={styles(currentColors).currencySymbol}>Rs</Text>
                                </View>
                                {formSubmitAttempted && !validationErrors.totalFee.valid && (
                                    <Text style={styles(currentColors).errorText}>{validationErrors.totalFee.message}</Text>
                                )}
                            </View>
                        </View>

                        {/* Discount Row */}
                        <View style={styles(currentColors).row}>
                            <View style={styles(currentColors).column}>
                                <Text style={styles(currentColors).label}>Discount %</Text>
                                <View style={[
                                    styles(currentColors).inputContainer,
                                    focusedField === 'discountPercent' && styles(currentColors).inputFocused,
                                    formSubmitAttempted && !validationErrors.discountPercent.valid && styles(currentColors).inputError
                                ]}>
                                    <TextInput
                                        style={styles(currentColors).input}
                                        value={discountPercent}
                                        onChangeText={handleDiscountPercentChange}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        onFocus={() => setFocusedField('discountPercent')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    <Text style={styles(currentColors).percentSymbol}>%</Text>
                                </View>
                                {formSubmitAttempted && !validationErrors.discountPercent.valid && (
                                    <Text style={styles(currentColors).errorText}>{validationErrors.discountPercent.message}</Text>
                                )}
                            </View>

                            <View style={styles(currentColors).column}>
                                <Text style={styles(currentColors).label}>Discount Amount</Text>
                                <View style={[
                                    styles(currentColors).inputContainer,
                                    focusedField === 'discount' && styles(currentColors).inputFocused,
                                    formSubmitAttempted && !validationErrors.discount.valid && styles(currentColors).inputError
                                ]}>
                                    <TextInput
                                        style={styles(currentColors).input}
                                        value={discount}
                                        onChangeText={handleDiscountChange}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        onFocus={() => setFocusedField('discount')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    <Text style={styles(currentColors).currencySymbol}>Rs</Text>
                                </View>
                                {formSubmitAttempted && !validationErrors.discount.valid && (
                                    <Text style={styles(currentColors).errorText}>{validationErrors.discount.message}</Text>
                                )}
                            </View>
                        </View>

                        {/* Services Section */}
                        <View style={styles(currentColors).section}>
                            <Text style={styles(currentColors).sectionTitle}>Services</Text>
                            <View style={[
                                styles(currentColors).selectContainer,
                                focusedField === 'services' && styles(currentColors).inputFocused,
                                formSubmitAttempted && !validationErrors.services.valid && styles(currentColors).inputError
                            ]}>
                                <Picker
                                    ref={pickerRef}
                                    selectedValue=""
                                    onValueChange={handleServiceChange}
                                    onFocus={() => {
                                        fetchDoctors();
                                        setFocusedField('services');
                                    }}
                                    onBlur={() => setFocusedField(null)}
                                    style={styles(currentColors).picker}
                                >
                                    <Picker.Item label="Select Service" value="" />
                                    {getAvailableServices().map((service) => (
                                        <Picker.Item
                                            key={service.serviceName}
                                            label={service.serviceName}
                                            value={service.serviceName}
                                        />
                                    ))}
                                </Picker>
                            </View>
                            {formSubmitAttempted && !validationErrors.services.valid && (
                                <Text style={styles(currentColors).errorText}>{validationErrors.services.message}</Text>
                            )}
                        </View>

                        {/* Selected Services */}
                        {selectedServicesDetails.length > 0 && (
                            <View style={styles(currentColors).selectedServices}>
                                <Text style={styles(currentColors).sectionTitle}>Selected Services</Text>
                                {selectedServicesDetails.map((service) => (
                                    <View key={service.serviceName} style={styles(currentColors).serviceItem}>
                                        <View style={styles(currentColors).serviceInfo}>
                                            <Text style={styles(currentColors).serviceName}>{service.serviceName}</Text>
                                            <Text style={styles(currentColors).serviceFee}>${service.fee}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveService(service.serviceName)}
                                            style={styles(currentColors).removeBtn}
                                        >
                                            <Ionicons name="close-circle" size={22} color="crimson" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Payable Fee */}
                        <View style={styles(currentColors).summarySection}>
                            <View style={styles(currentColors).summaryRow}>
                                <Text style={styles(currentColors).summaryLabel}>Payable Fee:</Text>
                                <View style={styles(currentColors).payableContainer}>
                                    <Text style={styles(currentColors).payableAmount}>${calculatePayableFee()}</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles(currentColors).footer}>
                        <TouchableOpacity
                            style={styles(currentColors).cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles(currentColors).cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles(currentColors).saveButton}
                            onPress={handleSave}
                        >
                            <Text style={styles(currentColors).saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    );
};

const styles = (currentColors:any) => StyleSheet.create({
    container: {
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
    card: {
        backgroundColor: currentColors.background,
        borderRadius: moderateScale(16),
        width: '95%',
        maxWidth: moderateScale(550),
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        padding: moderateScale(16),
    },
    title: {
        fontSize: moderateScale(18),
        fontWeight: 'bold',
        color: currentColors.actionMenuTextColor,
    },
    closeButton: {
        padding: moderateScale(4),
    },
    scrollView: {
        padding: moderateScale(16),
        maxHeight: '75%',
    },
    row: {
        flexDirection: 'row',
        marginBottom: moderateScale(16),
    },
    column: {
        flex: 1,
        marginHorizontal: moderateScale(6),
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: currentColors.actionMenuTextColor,
        marginBottom: moderateScale(6),
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        borderRadius: moderateScale(10),
        backgroundColor: currentColors.dropdownBackground,
        paddingHorizontal: moderateScale(12),
        height: moderateScale(48),
    },
    input: {
        flex: 1,
        height: '100%',
        color: currentColors.actionMenuTextColor,
        fontSize: moderateScale(14),
    },
    inputIcon: {
        marginLeft: moderateScale(8),
    },
    currencySymbol: {
        fontSize: moderateScale(16),
        color: currentColors.actionMenuTextColor,
        opacity: 0.7,
        marginLeft: moderateScale(4),
    },
    percentSymbol: {
        fontSize: moderateScale(16),
        color: currentColors.actionMenuTextColor,
        opacity: 0.7,
        marginLeft: moderateScale(4),
    },
    selectContainer: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        borderRadius: moderateScale(10),
        backgroundColor: currentColors.dropdownBackground,
        height: moderateScale(48),
        justifyContent: 'center',
    },
    picker: {
        height: moderateScale(48),
        color: currentColors.actionMenuTextColor,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        borderRadius: moderateScale(10),
        backgroundColor: currentColors.dropdownBackground,
        paddingHorizontal: moderateScale(12),
        height: moderateScale(48),
    },
    dateText: {
        color: currentColors.actionMenuTextColor,
        fontSize: moderateScale(14),
    },
    section: {
        marginBottom: moderateScale(20),
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: currentColors.actionMenuTextColor,
        marginBottom: moderateScale(8),
    },
    selectedServices: {
        marginBottom: moderateScale(20),
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: moderateScale(8),
        padding: moderateScale(12),
        marginBottom: moderateScale(8),
        borderLeftWidth: 3,
        borderLeftColor: currentColors.activeTabBackground,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: currentColors.actionMenuTextColor,
    },
    serviceFee: {
        fontSize: moderateScale(12),
        color: 'gray',
        marginTop: moderateScale(2),
    },
    removeBtn: {
        padding: moderateScale(4),
    },
    summarySection: {
        marginBottom: moderateScale(20),
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: moderateScale(10),
        padding: moderateScale(12),
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: currentColors.actionMenuTextColor,
    },
    payableContainer: {
        backgroundColor: currentColors.activeTabBackground,
        paddingVertical: moderateScale(6),
        paddingHorizontal: moderateScale(12),
        borderRadius: moderateScale(16),
    },
    payableAmount: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: moderateScale(16),
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: moderateScale(16),
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    cancelButton: {
        paddingVertical: moderateScale(10),
        paddingHorizontal: moderateScale(16),
        borderRadius: moderateScale(8),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        marginRight: moderateScale(12),
    },
    cancelButtonText: {
        color: currentColors.actionMenuTextColor,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: currentColors.activeTabBackground,
        paddingVertical: moderateScale(10),
        paddingHorizontal: moderateScale(20),
        borderRadius: moderateScale(8),
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    inputFocused: {
        borderColor: currentColors.activeTabBackground,
        borderWidth: 1,
    },
    inputError: {
        borderColor: 'crimson',
        borderWidth: 1,
    },
    errorText: {
        color: 'crimson',
        fontSize: moderateScale(12),
        marginTop: moderateScale(4),
    },
});

export default EditAppointmentModal;