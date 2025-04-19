import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import UrgentCaseAlert from './UrgentAlert';
import Toast from 'react-native-toast-message';
import { getAuthToken } from '@/src/ApiHandler/Appointment';
import { api } from '@/api';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/utils/ThemeContext';
import socketService from '@/src/socket';

interface VitalField {
    id: string;
    title: string;
    measure: string;
}

interface Appointment {
    weight?: string;
    temperature?: string;
    BP?: string;
    HR?: string;
    RR?: string;
    extra?: VitalField[];
    vitals?: {
        BP?: string;
        HR?: string;
        RR?: string;
        weight?: string;
        temperature?: string;
        extra?: VitalField[];
        emergencyMessage?: string;
        message?: string;
        isActive?: boolean;
        _id?: string;
        isEmergencyIn1Hr?: boolean;
        isEmergencyIn10Mint?: boolean;
    };
    patientId?: string;
    _id?: string;
}

interface VitalsProps {
    visible: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    appointment: Appointment;
    setIsLoading: (loading: boolean) => void;
    fetchAppointments: () => void;
    emergencyMsg?: string;
    setemergencyMsg?: (msg: string) => void;
}

interface ValidationErrors {
    weight?: string;
    temperature?: string;
    BP?: string;
    HR?: string;
    RR?: string;
}

export const updateVitalById = async (
    BP: string,
    HR: string,
    RR: string,
    appointmentId: string,
    symptoms: string,
    temperature: string,
    weight: string,
    extra?: { [key: string]: any },
    isEmergencyIn1Hr?: boolean,
    isEmergencyIn10Mint?: boolean,
    message?: string,
): Promise<void> => {
    try {
        const token = await getAuthToken();
        if (!token) throw new Error("No auth token found");

        const response = await api.put(
            `/vitals/updateVitalById/${appointmentId}`,
            {
                BP,
                HR,
                RR,
                symptoms,
                temperature,
                weight,
                extra,
                isEmergencyIn1Hr,
                isEmergencyIn10Mint,
                message,
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 200) {
            Toast.show({
                type: "success",
                text1: "Success",
                text2: "Vitals updated successfully",
            });
            socketService.emitHimsEvent('vitals', 'update');

        } else {
            throw new Error(`Failed to update vitals: ${response.statusText}`);
        }
    } catch (error: any) {
        Toast.show({
            type: "error",
            text1: "Error",
            text2: error.response?.data?.message || "Error updating vitals",
        });
        throw error;
    }
};

const Vitals: React.FC<VitalsProps> = ({
    visible,
    onClose,
    onSave,
    appointment,
    setIsLoading,
    fetchAppointments,
    emergencyMsg,
    setemergencyMsg,
}) => {
    const [weight, setWeight] = useState('');
    const [temperature, setTemperature] = useState('');
    const [BP, setBP] = useState('');
    const [HR, setHR] = useState('');
    const [RR, setRR] = useState('');
    const [extraVitals, setExtraVitals] = useState<VitalField[]>([]);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [alertVisible, setAlertVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [emergencyMsgState, setEmergencyMsg] = useState('');
    const [globalError, setGlobalError] = useState('');
    const [rangeError, setRangeError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const { currentColors } = useTheme();
    const hasExistingVitals = Boolean(appointment?.vitals?._id);

    const showRangeError = () => {
        setRangeError('Enter values in the selected range');
        setTimeout(() => setRangeError(''), 1500);
    };

    useEffect(() => {
        resetFields();
        if (appointment?.vitals) {
            setWeight(appointment.vitals.weight === "N/A" ? "" : appointment.vitals.weight || "");
            setTemperature(appointment.vitals.temperature === "N/A" ? "" : appointment.vitals.temperature || "");
            setBP(appointment.vitals.BP === "N/A" ? "" : appointment.vitals.BP || "");
            setHR(appointment.vitals.HR === "N/A" ? "" : appointment.vitals.HR || "");
            setRR(appointment.vitals.RR === "N/A" ? "" : appointment.vitals.RR || "");

            let updatedExtraVitals: VitalField[] = [];
            if (Array.isArray(appointment.vitals.extra)) {
                updatedExtraVitals = appointment.vitals.extra.map(vital => ({
                    ...vital,
                    measure: vital.measure === "N/A" ? "" : vital.measure || "",
                }));
            } else if (appointment.vitals.extra && typeof appointment.vitals.extra === "object") {
                updatedExtraVitals = Object.entries(appointment.vitals.extra).map(([title, measure]) => ({
                    id: Date.now().toString() + Math.random(),
                    title,
                    measure: measure === "N/A" ? "" : String(measure) || "",
                }));
            }
            setExtraVitals(updatedExtraVitals);

            if (appointment.vitals.message) {
                setEmergencyMsg(appointment.vitals.message);
                setAlertVisible(true);
            }
        }

        if (emergencyMsg && emergencyMsg.trim() !== '') {
            setEmergencyMsg(emergencyMsg);
            setAlertVisible(true);
        }
    }, [appointment, emergencyMsg]);

    const resetFields = () => {
        setWeight('');
        setTemperature('');
        setBP('');
        setHR('');
        setRR('');
        setEmergencyMsg('');
        setExtraVitals([]);
        setAlertVisible(false);
        setErrors({});
        setGlobalError('');
    };

    const validateAndSetWeight = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        if (numericText === '') {
            setWeight('');
            if (errors.weight) setErrors({ ...errors, weight: undefined });
            return;
        }
        const numValue = parseInt(numericText, 10);
        if (numericText.length <= 3) {
            if (numValue <= 999) {
                setWeight(numericText);
                if (errors.weight) setErrors({ ...errors, weight: undefined });
            } else {
                setWeight(numericText.slice(0, 3));
            }
        }
    };

    const validateAndSetTemperature = (text: string) => {
        const numericText = text.replace(/[^0-9.]/g, '');

        if (numericText === '') {
            setTemperature('');
            if (errors.temperature) setErrors({ ...errors, temperature: undefined });
            return;
        }

        if ((numericText.match(/\./g) || []).length > 1) return;

        if (numericText.length <= 6) {
            setTemperature(numericText);

            if (!numericText.endsWith('.')) {
                const numValue = parseFloat(numericText);

                if (numValue > 110) {
                    setTemperature('110');
                    showRangeError();
                } else if (numValue < 92) {
                    showRangeError();
                } else {
                    if (errors.temperature) setErrors({ ...errors, temperature: undefined });
                }
            }
        }
    };

    const validateAndSetHeartRate = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        if (numericText === '') {
            setHR('');
            if (errors.HR) setErrors({ ...errors, HR: undefined });
            return;
        }
        const numValue = parseInt(numericText, 10);
        if (numericText.length <= 3) {
            if (numValue > 250) {
                setHR('250');
            } else {
                setHR(numericText);
                if (errors.HR) setErrors({ ...errors, HR: undefined });
            }
        }
    };

    const validateAndSetBloodPressure = (text: string) => {
        const cleanText = text.replace(/[^0-9/]/g, '');
        if (cleanText === '') {
            setBP('');
            if (errors.BP) setErrors({ ...errors, BP: undefined });
            return;
        }
        if (cleanText.length <= 7) {
            const bpParts = cleanText.split('/');
            if (bpParts.length === 1) {
                const systolic = parseInt(bpParts[0], 10);
                if (bpParts[0] === '' || (systolic >= 70 && systolic <= 220) || bpParts[0].length < 2) {
                    setBP(cleanText);
                } else if (systolic < 70) {
                    setBP('70');
                    showRangeError();
                } else if (systolic > 220) {
                    setBP('220');
                }
            } else if (bpParts.length === 2) {
                const systolic = parseInt(bpParts[0], 10);
                const diastolic = parseInt(bpParts[1], 10);
                if (systolic < 70) {
                    setBP('70/' + bpParts[1]);
                    showRangeError();
                } else if (systolic > 220) {
                    setBP('220/' + bpParts[1]);
                } else if (diastolic < 40 && bpParts[1] !== '') {
                    setBP(bpParts[0] + '/40');
                    showRangeError();
                } else if (diastolic > 130) {
                    setBP(bpParts[0] + '/130');
                } else {
                    setBP(cleanText);
                    if (errors.BP) setErrors({ ...errors, BP: undefined });
                }
            }
        }
    };

    const validateAndSetRespiratoryRate = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        if (numericText === '') {
            setRR('');
            if (errors.RR) setErrors({ ...errors, RR: undefined });
            return;
        }
        const numValue = parseInt(numericText, 10);
        if (numericText.length <= 2) {
            if (numValue <= 80) {
                setRR(numericText);
                if (errors.RR) setErrors({ ...errors, RR: undefined });
            } else {
                setRR('80');
            }
        }
    };

    const updateVitalField = (id: string, field: 'title' | 'measure', value: string) => {
        setExtraVitals(extraVitals.map(vital =>
            vital.id === id ? { ...vital, [field]: value } : vital
        ));
        setGlobalError('');
    };

    const addVitalField = () => {
        const newField: VitalField = { id: Date.now().toString(), title: '', measure: '' };
        setExtraVitals([...extraVitals, newField]);
        setGlobalError('');
    };

    const deleteVitalField = (id: string) => {
        setExtraVitals(extraVitals.filter(vital => vital.id !== id));
    };

    const validateFields = (): boolean => {
        let newErrors: ValidationErrors = {};
        let isValid = true;

        if (!weight && !temperature && !BP && !HR && !RR && extraVitals.length === 0) {
            setGlobalError('At least one vital is required');
            isValid = false;
        } else {
            setGlobalError('');
        }

        if (weight && (!/^\d{1,3}$/.test(weight) || parseInt(weight) <= 0)) {
            newErrors.weight = 'Weight must be a positive number (1-999 kg)';
            isValid = false;
        }

        if (temperature) {
            const temp = parseFloat(temperature);
            if (isNaN(temp) || temp < 92 || temp > 110) {
                newErrors.temperature = 'Temperature must be between 92 and 110°F';
                isValid = false;
            }
        }

        if (HR) {
            const heartRate = parseInt(HR);
            if (isNaN(heartRate) || heartRate < 50 || heartRate > 250) {
                newErrors.HR = 'Heart Rate must be between 50 and 250/min';
                isValid = false;
            }
        }

        if (BP) {
            if (!/^\d{2,3}\/\d{2,3}$/.test(BP)) {
                newErrors.BP = 'Format: systolic/diastolic (e.g., 120/80)';
                isValid = false;
            } else {
                const [systolic, diastolic] = BP.split('/').map(val => parseInt(val));
                if (systolic < 70 || systolic > 220) {
                    newErrors.BP = 'Systolic pressure should be between 70-220';
                    isValid = false;
                } else if (diastolic < 40 || diastolic > 130) {
                    newErrors.BP = 'Diastolic pressure should be between 40-130';
                    isValid = false;
                }
            }
        }

        if (RR) {
            const respRate = parseInt(RR);
            if (isNaN(respRate) || respRate < 0 || respRate > 80) {
                newErrors.RR = 'Respiratory Rate must be between 0-80/min';
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async (): Promise<void> => {
        if (!validateFields()) return;

        const tempValue = temperature ? parseFloat(temperature) : null;
        const rrValue = RR ? parseInt(RR) : null;
        const hrValue = HR ? parseInt(HR) : null;

        let isEmergencyIn10Mint = false;
        let isEmergencyIn1Hr = false;
        let emergencyMessage = "";

        if (tempValue !== null) {
            if (tempValue > 105 || tempValue < 94) {
                isEmergencyIn10Mint = true;
                if (tempValue > 105) emergencyMessage += "Critical high temperature detected. ";
                if (tempValue < 94) emergencyMessage += "Critical low temperature detected. ";
            } else if (tempValue > 100 && tempValue <= 105) {
                isEmergencyIn1Hr = true;
                emergencyMessage += "Elevated temperature requires monitoring. ";
            }
        }

        if (rrValue !== null) {
            if (rrValue > 60) {
                isEmergencyIn10Mint = true;
                emergencyMessage += "High respiratory rate detected. ";
            } else if (rrValue < 25) {
                isEmergencyIn10Mint = true;
                emergencyMessage += "Low respiratory rate detected. ";
            }
        }

        if (hrValue !== null) {
            if (hrValue > 180) {
                isEmergencyIn10Mint = true;
                emergencyMessage += "High heart rate detected. ";
            } else if (hrValue < 30) {
                isEmergencyIn10Mint = true;
                emergencyMessage += "Low heart rate detected. ";
            }
        }

        setEmergencyMsg(emergencyMessage);
        if (emergencyMessage) setAlertVisible(true);

        if (!weight && !temperature && !BP && !HR && !RR && extraVitals.length === 0) return;

        try {
            setIsLoading(true);
            setIsSaving(true);
            
            // Determine appointment ID - Get the vitals ID if it exists, otherwise use the appointment ID
            const appointmentId = appointment.vitals?._id || appointment._id;

            if (!appointmentId) {
                Toast.show({ type: "error", text1: "Error", text2: "Missing appointment ID" });
                setIsLoading(false);
                setIsSaving(false);
                return;
            }

            const extraObject = extraVitals.reduce((acc, vital) => {
                if (vital.title.trim()) {
                    acc[vital.title.trim()] = vital.measure || "";
                }
                return acc;
            }, {} as Record<string, string>);

            // Create the updated vitals object that will be used for both API updates and local state
            const updatedVitals = {
                weight: weight || undefined,
                temperature: temperature || undefined,
                BP: BP || undefined,
                HR: HR || undefined,
                RR: RR || undefined,
                extra: extraObject as unknown as VitalField[],
                isActive: true,
                message: emergencyMessage || undefined,
                isEmergencyIn1Hr,
                isEmergencyIn10Mint,
                _id: appointment.vitals?._id
            };

            // Call the API to update or save vitals
            // if (hasExistingVitals) {
            //     await updateVitalById(
            //         BP || "",
            //         HR || "",
            //         RR || "",
            //         appointmentId,
            //         "",
            //         temperature || "",
            //         weight || "",
            //         extraObject,
            //         isEmergencyIn1Hr,
            //         isEmergencyIn10Mint,
            //         emergencyMessage || ""
            //     );
            // }
            
            if (setemergencyMsg) setemergencyMsg(emergencyMessage);

            // Update local appointment data with new vitals
            const updatedAppointment = {
                ...appointment,
                vitals: updatedVitals
            };

            // Call onSave to update parent component - call for both new AND updated vitals
// if (!hasExistingVitals) {
    onSave(updatedAppointment);

// }            
            resetFields();

            // Close the modal
            onClose();
            
            // Optionally fetch appointments (though the parent should handle this)
            await fetchAppointments();
        } catch (error) {
            console.error("Error updating vitals:", error);
            Toast.show({ type: "error", text1: "Error", text2: "Failed to save vitals" });
        } finally {
            setIsLoading(false);
            setIsSaving(false);
        }
    };

    if (!visible) return null;

    return (
        <View style={styles(currentColors).container}>

            {alertVisible && (
                <UrgentCaseAlert visible={alertVisible} message={emergencyMsgState} onClose={() => setAlertVisible(false)} />
            )}
            <View style={styles(currentColors).card}>
                {rangeError ? (
                    <View style={styles(currentColors).rangeErrorContainer}>
                        <Text style={styles(currentColors).rangeErrorText}>{rangeError}</Text>
                    </View>
                ) : null}
                <View style={styles(currentColors).header}>
                    <Text style={styles(currentColors).title}>Vitals</Text>
                    <TouchableOpacity onPress={onClose} style={styles(currentColors).closeButton}>
                        <Ionicons name="close" size={24} color={currentColors.actionMenuTextColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles(currentColors).scrollView}>
                    {globalError ? (
                        <View style={styles(currentColors).globalErrorContainer}>
                            <Text style={styles(currentColors).globalErrorText}>{globalError}</Text>
                        </View>
                    ) : null}

                    <View style={styles(currentColors).row}>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Weight (kg)</Text>
                            <TextInput
                                style={[
                                    styles(currentColors).input,
                                    errors.weight && styles(currentColors).inputError,
                                    focusedField === 'weight' && styles(currentColors).focusedInput
                                ]}
                                value={weight}
                                onChangeText={validateAndSetWeight}
                                placeholder="0-999 kg"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                maxLength={3}
                                editable={!isSaving}
                                onFocus={() => setFocusedField('weight')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.weight && <Text style={styles(currentColors).errorText}>{errors.weight}</Text>}
                        </View>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Temperature (°F)</Text>
                            <TextInput
                                style={[
                                    styles(currentColors).input,
                                    errors.temperature && styles(currentColors).inputError,
                                    focusedField === 'temperature' && styles(currentColors).focusedInput
                                ]}
                                value={temperature}
                                onChangeText={validateAndSetTemperature}
                                placeholder="92-110°F"
                                placeholderTextColor="grey"
                                keyboardType="decimal-pad"
                                maxLength={6}
                                editable={!isSaving}
                                onFocus={() => setFocusedField('temperature')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.temperature && <Text style={styles(currentColors).errorText}>{errors.temperature}</Text>}
                        </View>
                    </View>

                    <View style={styles(currentColors).row}>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Heart Rate (bpm)</Text>
                            <TextInput
                                style={[
                                    styles(currentColors).input,
                                    errors.HR && styles(currentColors).inputError,
                                    focusedField === 'HR' && styles(currentColors).focusedInput
                                ]}
                                value={HR}
                                onChangeText={validateAndSetHeartRate}
                                placeholder="50-250/min"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                maxLength={3}
                                editable={!isSaving}
                                onFocus={() => setFocusedField('HR')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.HR && <Text style={styles(currentColors).errorText}>{errors.HR}</Text>}
                        </View>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Blood Pressure</Text>
                            <TextInput
                                style={[
                                    styles(currentColors).input,
                                    errors.BP && styles(currentColors).inputError,
                                    focusedField === 'BP' && styles(currentColors).focusedInput
                                ]}
                                value={BP}
                                onChangeText={validateAndSetBloodPressure}
                                placeholder="70-220/40-130"
                                placeholderTextColor="grey"
                                maxLength={7}
                                editable={!isSaving}
                                onFocus={() => setFocusedField('BP')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.BP && <Text style={styles(currentColors).errorText}>{errors.BP}</Text>}
                        </View>
                    </View>

                    <View style={styles(currentColors).row}>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Respiratory Rate (/min)</Text>
                            <TextInput
                                style={[
                                    styles(currentColors).input,
                                    errors.RR && styles(currentColors).inputError,
                                    focusedField === 'RR' && styles(currentColors).focusedInput
                                ]}
                                value={RR}
                                onChangeText={validateAndSetRespiratoryRate}
                                placeholder="0-80/min"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                maxLength={2}
                                editable={!isSaving}
                                onFocus={() => setFocusedField('RR')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.RR && <Text style={styles(currentColors).errorText}>{errors.RR}</Text>}
                        </View>
                    </View>

                    {extraVitals.length > 0 && (
                        <View style={styles(currentColors).section}>
                            <Text style={styles(currentColors).sectionTitle}>Additional Vitals</Text>
                            {extraVitals.map((vital) => (
                                <View key={vital.id} style={styles(currentColors).extraVitalRow}>
                                    <View style={styles(currentColors).extraVitalInputContainer}>
                                        <TextInput
                                            style={[
                                                styles(currentColors).extraVitalInput,
                                                focusedField === `title-${vital.id}` && styles(currentColors).focusedInput
                                            ]}
                                            value={vital.title}
                                            onChangeText={(text) => updateVitalField(vital.id, 'title', text)}
                                            placeholder="Title"
                                            placeholderTextColor="grey"
                                            editable={!isSaving}
                                            onFocus={() => setFocusedField(`title-${vital.id}`)}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                    <View style={styles(currentColors).extraVitalInputContainer}>
                                        <TextInput
                                            style={[
                                                styles(currentColors).extraVitalInput,
                                                focusedField === `measure-${vital.id}` && styles(currentColors).focusedInput
                                            ]}
                                            value={vital.measure}
                                            onChangeText={(text) => updateVitalField(vital.id, 'measure', text)}
                                            placeholder="Measurement"
                                            placeholderTextColor="grey"
                                            editable={!isSaving}
                                            onFocus={() => setFocusedField(`measure-${vital.id}`)}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => deleteVitalField(vital.id)}
                                        style={styles(currentColors).deleteButton}
                                        disabled={isSaving}
                                    >
                                        <Ionicons name="trash" size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={addVitalField}
                        style={styles(currentColors).addButton}
                        disabled={isSaving}
                    >
                        <Text style={styles(currentColors).addButtonText}>+ Add Vital</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles(currentColors).footer}>
                    <TouchableOpacity onPress={onClose} style={styles(currentColors).cancelButton}>
                        <Text style={styles(currentColors).cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={currentColors.activeTabBackground} />
                    ) : (
                        <TouchableOpacity
                            onPress={handleSave}
                            style={styles(currentColors).saveButton}
                            disabled={isSaving}
                        >
                            <Text style={styles(currentColors).saveButtonText}>
                                {hasExistingVitals ? 'Update' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};
const styles = (currentColors: { [key: string]: string }) => StyleSheet.create({
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
    input: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        borderRadius: moderateScale(10),
        backgroundColor: currentColors.dropdownBackground,
        paddingHorizontal: moderateScale(12),
        height: moderateScale(48),
        color: currentColors.actionMenuTextColor,
        fontSize: moderateScale(14),
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
    section: {
        marginBottom: moderateScale(20),
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: currentColors.actionMenuTextColor,
        marginBottom: moderateScale(8),
    },
    extraVitalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(10),
    },
    extraVitalInputContainer: {
        flex: 1,
        marginHorizontal: moderateScale(5),
    },
    extraVitalInput: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        backgroundColor: currentColors.dropdownBackground,
        color: currentColors.actionMenuTextColor,
        fontSize: moderateScale(14),
    },
    deleteButton: {
        width: moderateScale(30),
        height: moderateScale(30),
        backgroundColor: '#ff6b6b',
        borderRadius: moderateScale(15),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: moderateScale(5),
    },
    addButton: {
        backgroundColor: currentColors.activeTabBackground,
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        alignItems: 'center',
        marginTop: moderateScale(10),
    },
    addButtonText: {
        color: currentColors.activeTabText,
        fontSize: moderateScale(14),
        fontWeight: '600',
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
        color: currentColors.activeTabText,
        fontWeight: '600',
        fontSize: moderateScale(15),
    },
    focusedInput: {
        borderColor: currentColors.activeTabBackground,
        borderWidth: 1,
    },
    globalErrorContainer: {
        backgroundColor: 'rgba(255,0,0,0.1)',
        padding: moderateScale(10),
        borderRadius: moderateScale(5),
        marginBottom: moderateScale(10),
        marginHorizontal: moderateScale(6),
    },
    globalErrorText: {
        color: 'crimson',
        textAlign: 'center',
        fontSize: moderateScale(14),
    },
    rangeErrorContainer: {
        backgroundColor: 'rgba(255,0,0,0.1)',
        padding: moderateScale(8),
        borderRadius: moderateScale(5),
        marginTop: moderateScale(10),
        alignItems: 'center',
    },
    rangeErrorText: {
        color: 'crimson',
        fontSize: moderateScale(12),
    },
});

export default Vitals;