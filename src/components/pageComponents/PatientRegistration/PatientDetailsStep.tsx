import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioButton } from 'react-native-paper';
import { getStyles } from './styles';
import { useTheme } from '../../../utils/ThemeContext';

export default function PatientDetailsStep({
    formData,
    errors,
    touched,
    focusedInput,
    existingPatient,
    isSubmitting,
    updateFormData,
    handleFocus,
    handleBlur,
    showDatePickerModal,
    handleNext,
    handleUpdate,
    handleBackNavigation,
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
            <Text style={styles.sectionTitle}>Patient Information</Text>

            <Text style={styles.label}>
                Patient Name<Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
                style={getInputStyle("patientName")}
                placeholder="Enter Patient Name"
                value={formData.patientName}
                onChangeText={(text) => updateFormData("patientName", text)}
                onFocus={() => handleFocus("patientName")}
                onBlur={() => handleBlur("patientName")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />
            {errors.patientName && touched.patientName && (
                <Text style={styles.errorText}>{errors.patientName}</Text>
            )}

            <Text style={styles.label}>Guardian Name</Text>
            <TextInput
                style={getInputStyle("guardianName")}
                placeholder="Enter Guardian Name"
                value={formData.guardianName}
                onChangeText={(text) => updateFormData("guardianName", text)}
                onFocus={() => handleFocus("guardianName")}
                onBlur={() => handleBlur("guardianName")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />

            <Text style={styles.label}>
                Phone No<Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
                style={getInputStyle("phoneNo")}
                placeholder="Enter Patient Phone No"
                value={formData.phoneNo}
                onChangeText={(text) => updateFormData("phoneNo", text)}
                keyboardType="phone-pad"
                onFocus={() => handleFocus("phoneNo")}
                onBlur={() => handleBlur("phoneNo")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />
            {errors.phoneNo && touched.phoneNo && <Text style={styles.errorText}>{errors.phoneNo}</Text>}

            <Text style={styles.label}>
                Gender<Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.radioGroup}>
                <RadioButton.Group onValueChange={(value) => updateFormData("gender", value)} value={formData.gender}>
                    <View style={styles.radioButtonRow}>
                        <View style={styles.radioButton}>
                            <RadioButton value="Male" color={currentColors.activeTabBackground} />
                            <Text style={styles.radioLabel}>Male</Text>
                        </View>
                        <View style={styles.radioButton}>
                            <RadioButton value="Female" color={currentColors.activeTabBackground} />
                            <Text style={styles.radioLabel}>Female</Text>
                        </View>
                        <View style={styles.radioButton}>
                            <RadioButton value="other" color={currentColors.activeTabBackground} />
                            <Text style={styles.radioLabel}>Other</Text>
                        </View>
                    </View>
                </RadioButton.Group>
            </View>

            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
                style={getInputStyle("dateOfBirth")}
                onPress={() => !existingPatient && showDatePickerModal("dob")}
                disabled={!!existingPatient}
            >
                <View style={styles.datePickerButton}>
                    <Text style={styles.dateText}>{formData.dateOfBirth.toLocaleDateString()}</Text>
                    <Ionicons name="calendar-outline" size={20} color={currentColors.AppointmentColor} />
                </View>
            </TouchableOpacity>

            <Text style={styles.label}>CNIC (Optional)</Text>
            <TextInput
                style={getInputStyle("cnic")}
                placeholder="Enter Patient's CNIC"
                value={formData.cnic}
                onChangeText={(text) => updateFormData("cnic", text)}
                onFocus={() => handleFocus("cnic")}
                onBlur={() => handleBlur("cnic")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />

            <Text style={styles.label}>Health Id (Optional)</Text>
            <TextInput
                style={getInputStyle("healthId")}
                placeholder="Enter Patient's Health ID"
                value={formData.healthId}
                onChangeText={(text) => updateFormData("healthId", text)}
                onFocus={() => handleFocus("healthId")}
                onBlur={() => handleBlur("healthId")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />

            <Text style={styles.label}>
                City<Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
                style={getInputStyle("city")}
                placeholder="Enter Your City Name"
                value={formData.city}
                onChangeText={(text) => updateFormData("city", text)}
                onFocus={() => handleFocus("city")}
                onBlur={() => handleBlur("city")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />
            {errors.city && touched.city && <Text style={styles.errorText}>{errors.city}</Text>}

            <Text style={styles.label}>Reference (Optional)</Text>
            <TextInput
                style={getInputStyle("reference")}
                placeholder="Enter Patient's Reference"
                value={formData.reference}
                onChangeText={(text) => updateFormData("reference", text)}
                onFocus={() => handleFocus("reference")}
                onBlur={() => handleBlur("reference")}
                placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            />

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleBackNavigation}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                {existingPatient ? (
                    <>
                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={() => handleUpdate(false)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleUpdate(true)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Next</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                        <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
