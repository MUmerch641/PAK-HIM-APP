import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { getStyles } from './styles';
import { useTheme } from '../../../utils/ThemeContext';
import FeeSummary from './FeeSummary';

export default function AppointmentDetailsStep({
    formData,
    errors,
    touched,
    focusedInput,
    updateFormData,
    handleFocus,
    handleBlur,
    doctors,
    isDoctorLocked,
    insuranceCompanies,
    services,
    isLoadingServices,
    selectedServicesDetails,
    handleDoctorChange,
    handleServiceChange,
    handleRemoveService,
    showDatePickerModal,
    setShowTimePicker,
    setCurrentStep,
    handleSubmit,
    isSubmitting,
}: any) {
    const { currentColors } = useTheme();
    const styles = useMemo(() => getStyles(currentColors), [currentColors]);

    const getInputStyle = (field: string) => {
        if (focusedInput === field)
            return { ...styles.input, borderColor: currentColors.activeTabBackground, borderWidth: 1.5 };
        if (errors[field] && touched[field])
            return { ...styles.input, borderColor: "#FF3B30", borderWidth: 1.5 };
        return styles.input;
    };

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>

            {formData.status !== "insurance" && (
                <>
                    <Text style={styles.label}>
                        Doctor Name<Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View
                        style={[
                            styles.pickerContainer,
                            focusedInput === "doctorName" && { borderColor: currentColors.activeTabBackground, borderWidth: 1.5 },
                            errors.doctorName && touched.doctorName && { borderColor: "#FF3B30", borderWidth: 1.5 },
                            isDoctorLocked && { backgroundColor: currentColors.dropdownBorder + "40" },
                        ]}
                    >
                        <Picker
                            selectedValue={formData.appointment?.doctorId || ""}
                            onValueChange={handleDoctorChange}
                            style={styles.picker}
                            onFocus={() => handleFocus("doctorName")}
                            onBlur={() => handleBlur("doctorName")}
                            dropdownIconColor={currentColors.AppointmentColor}
                            enabled={!isDoctorLocked}
                        >
                            <Picker.Item label="Select Doctor" value="" />
                            {doctors.map((doctor: any) => (
                                <Picker.Item key={doctor._id} label={doctor.fullName} value={doctor._id} />
                            ))}
                        </Picker>
                    </View>
                    {isDoctorLocked && (
                        <Text style={styles.lockedText}>Doctor selection is locked to your profile</Text>
                    )}
                    {errors.doctorName && touched.doctorName && (
                        <Text style={styles.errorText}>{errors.doctorName}</Text>
                    )}
                </>
            )}

            {formData.status === "insurance" && (
                <>
                    <Text style={styles.label}>
                        Select Company<Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View
                        style={[
                            styles.pickerContainer,
                            focusedInput === "insuranceCompanyId" && {
                                borderColor: currentColors.activeTabBackground,
                                borderWidth: 1.5,
                            },
                            errors.insuranceCompanyId && touched.insuranceCompanyId && { borderColor: "#FF3B30", borderWidth: 1.5 },
                        ]}
                    >
                        <Picker
                            selectedValue={formData.appointment?.insuranceDetails?.insuranceCompanyId || ""}
                            onValueChange={(value) => {
                                updateFormData("appointment", {
                                    ...formData.appointment,
                                    services: [],
                                    insuranceDetails: { ...formData.appointment.insuranceDetails, insuranceCompanyId: value },
                                });
                            }}
                            style={styles.picker}
                            onFocus={() => handleFocus("insuranceCompanyId")}
                            dropdownIconColor={currentColors.AppointmentColor}
                        >
                            <Picker.Item label="Select Insurance Company" value="" />
                            {insuranceCompanies.map((company: any) => (
                                <Picker.Item key={company._id} label={company.companyName} value={company._id} />
                            ))}
                        </Picker>
                    </View>
                    {errors.insuranceCompanyId && touched.insuranceCompanyId && (
                        <Text style={styles.errorText}>{errors.insuranceCompanyId}</Text>
                    )}

                    <Text style={styles.label}>
                        Insurance ID<Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        style={getInputStyle("insuranceId")}
                        placeholder="Enter Insurance ID"
                        value={formData.appointment?.insuranceDetails?.insuranceId || ""}
                        onChangeText={(text) =>
                            updateFormData("appointment", {
                                ...formData.appointment,
                                insuranceDetails: { ...formData.appointment.insuranceDetails, insuranceId: text },
                            })
                        }
                        onFocus={() => handleFocus("insuranceId")}
                        onBlur={() => handleBlur("insuranceId")}
                        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
                    />
                    {errors.insuranceId && touched.insuranceId && (
                        <Text style={styles.errorText}>{errors.insuranceId}</Text>
                    )}
                </>
            )}

            <Text style={styles.label}>
                {formData.status === "insurance" ? "Insurance Services" : "Services"}
                <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View
                style={[
                    styles.pickerContainer,
                    focusedInput === "services" && { borderColor: currentColors.activeTabBackground, borderWidth: 1.5 },
                    errors.services && touched.services && { borderColor: "#FF3B30", borderWidth: 1.5 },
                ]}
            >
                {isLoadingServices ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={currentColors.activeTabBackground} />
                        <Text style={styles.loadingText}>Loading services...</Text>
                    </View>
                ) : (
                    <Picker
                        selectedValue=""
                        onValueChange={handleServiceChange}
                        style={styles.picker}
                        onFocus={() => handleFocus("services")}
                        dropdownIconColor={currentColors.AppointmentColor}
                    >
                        <Picker.Item
                            label={formData.status === "insurance" ? "Select Insurance Service" : "Select Service"}
                            value=""
                        />
                        {services.map((service: any) => (
                            <Picker.Item key={service._id} label={service.serviceName} value={service._id} />
                        ))}
                    </Picker>
                )}
            </View>
            {errors.services && touched.services && <Text style={styles.errorText}>{errors.services}</Text>}

            {selectedServicesDetails && selectedServicesDetails.length > 0 && (
                <View style={styles.selectedServicesContainer}>
                    <Text style={styles.selectedServicesTitle}>
                        Selected {formData.status === "insurance" ? "Insurance Services" : "Services"}:
                    </Text>
                    <View style={styles.chipContainer}>
                        {selectedServicesDetails.map((service: any) => (
                            <View key={service._id} style={styles.chip}>
                                <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                                    {service.serviceName}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleRemoveService(service._id)}
                                    style={styles.chipRemoveButton}
                                >
                                    <Ionicons name="close-circle" size={16} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <Text style={styles.label}>Appointment Date</Text>
            <TouchableOpacity style={getInputStyle("appointmentDate")} onPress={() => showDatePickerModal("appointment")}>
                <View style={styles.datePickerButton}>
                    <Text style={styles.dateText}>{formData.appointmentDate.toLocaleDateString()}</Text>
                    <Ionicons name="calendar-outline" size={20} color={currentColors.AppointmentColor} />
                </View>
            </TouchableOpacity>

            <Text style={styles.label}>Time</Text>
            <TouchableOpacity style={getInputStyle("time")} onPress={() => setShowTimePicker(true)}>
                <View style={styles.datePickerButton}>
                    <Text style={styles.dateText}>
                        {formData.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={currentColors.AppointmentColor} />
                </View>
            </TouchableOpacity>

            <FeeSummary
                formData={formData}
                errors={errors}
                touched={touched}
                focusedInput={focusedInput}
                updateFormData={updateFormData}
                handleFocus={handleFocus}
                handleBlur={handleBlur}
            />

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(1)}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Submit</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
