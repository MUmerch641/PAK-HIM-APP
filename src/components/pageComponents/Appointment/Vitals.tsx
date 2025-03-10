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
    const [emergencyMsg, setEmergencyMsg] = useState('');

  const { currentColors } = useTheme();

    useEffect(() => {
        resetFields();
        if (appointment?.vitals) {
            setWeight(appointment.vitals.weight || '');
            setTemperature(appointment.vitals.temperature || '');
            setBP(appointment.vitals.BP || '');
            setHR(appointment.vitals.HR || '');
            setRR(appointment.vitals.RR || '');
            setExtraVitals(appointment.vitals.extra || []);
            if (appointment.vitals.message) {
                setEmergencyMsg(appointment.vitals.message);
                setAlertVisible(true);
            }
        }
    }, [appointment]);

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
    };

    const updateField = (setter: (value: string) => void, field: keyof ValidationErrors) => (text: string) => {
        setter(text);
        if (errors[field]) setErrors({ ...errors, [field]: undefined });
    };

    const addVitalField = () => {
        const newField: VitalField = { id: Date.now().toString(), title: '', measure: '' };
        setExtraVitals([...extraVitals, newField]);
    };

    const updateVitalField = (id: string, field: 'title' | 'measure', value: string) => {
        setExtraVitals(extraVitals.map(vital =>
            vital.id === id ? { ...vital, [field]: value } : vital
        ));
    };

    const deleteVitalField = (id: string) => {
        setExtraVitals(extraVitals.filter(vital => vital.id !== id));
    };

    const validateFields = (): boolean => {
        let newErrors: ValidationErrors = {};
        let isValid = true;

        if (!weight && !temperature && !BP && !HR && !RR && extraVitals.length === 0) {
            newErrors = {
                weight: 'At least one vital is required.',
                temperature: 'At least one vital is required.',
                BP: 'At least one vital is required.',
                HR: 'At least one vital is required.',
                RR: 'At least one vital is required.',
            };
            isValid = false;
        }

        if (weight && (!/^\d{1,3}$/.test(weight) || parseInt(weight) <= 0)) {
            newErrors.weight = 'Weight must be a positive number with a maximum of 3 digits.';
            isValid = false;
        }

        if (temperature) {
            const temp = parseFloat(temperature);
            if (isNaN(temp) || temp < 92 || temp > 110) {
                newErrors.temperature = 'Temperature must be between 92 and 110°F.';
                isValid = false;
            }
        }

        if (HR) {
            const heartRate = parseInt(HR);
            if (isNaN(heartRate) || heartRate < 50 || heartRate > 250) {
                newErrors.HR = 'Heart Rate must be between 50 and 250/min.';
                isValid = false;
            }
        }

        if (BP) {
            if (!/^\d{2,3}\/\d{2,3}$/.test(BP)) {
                newErrors.BP = 'Blood Pressure must be in format systolic/diastolic (e.g., 120/80).';
                isValid = false;
            } else {
                const [systolic, diastolic] = BP.split('/').map(val => parseInt(val));
                if (systolic < 70 || systolic > 220) {
                    newErrors.BP = 'Systolic pressure should be between 70 and 220.';
                    isValid = false;
                } else if (diastolic < 40 || diastolic > 130) {
                    newErrors.BP = 'Diastolic pressure should be between 40 and 130.';
                    isValid = false;
                }
            }
        }

        if (RR) {
            const respRate = parseInt(RR);
            if (isNaN(respRate) || respRate < 0 || respRate > 80) {
                newErrors.RR = 'Respiratory Rate must be between 0 and 80/min.';
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async (saveType: 'SAVE' | 'UPDATE'): Promise<void> => {
        if (!validateFields()) return;

        const tempValue = temperature ? parseFloat(temperature) : null;
        const rrValue = RR ? parseInt(RR) : null;
        const hrValue = HR ? parseInt(HR) : null;

        let emergencyMessage = "";
        if (tempValue && tempValue > 100) emergencyMessage += "High temperature detected. ";
        if (tempValue && tempValue < 92) emergencyMessage += "Low temperature detected. ";
        if (rrValue && rrValue > 20) emergencyMessage += "High respiratory rate detected. ";
        if (rrValue && rrValue < 12) emergencyMessage += "Low respiratory rate detected. ";
        if (hrValue && hrValue > 180) emergencyMessage += "High heart rate detected. ";
        if (hrValue && hrValue < 30) emergencyMessage += "Low heart rate detected. ";
        setEmergencyMsg(emergencyMessage);

        const isEmergency = emergencyMessage.length > 0;

        if (!weight && !temperature && !BP && !HR && !RR && extraVitals.length === 0) return;

        try {
            setIsLoading(true);
            setIsSaving(true);
            const appointmentId = appointment.vitals?._id || appointment._id;

            if (!appointmentId) {
                Toast.show({ type: "error", text1: "Error", text2: "Missing appointment ID" });
                setIsLoading(false);
                setIsSaving(false);
                return;
            }

            const extraObject = extraVitals.length > 0
                ? extraVitals.reduce((acc, vital) => ({ ...acc, [vital.title]: vital.measure }), {})
                : undefined;

            if (saveType === 'UPDATE') {
                await updateVitalById(
                    BP || "",
                    HR || "",
                    RR || "",
                    appointmentId,
                    "",
                    temperature || "",
                    weight || "",
                    extraObject,
                    false,
                    alertVisible,
                    emergencyMessage || ""
                );
                resetFields();
                await fetchAppointments();
                onClose();
            } else {
                onSave({
                    ...appointment,
                    vitals: {
                        ...appointment.vitals,
                        weight: weight || undefined,
                        temperature: temperature || undefined,
                        BP: BP || undefined,
                        HR: HR || undefined,
                        RR: RR || undefined,
                        extra: extraVitals.length > 0 ? extraVitals : undefined,
                        isActive: true,
                        message: emergencyMessage || undefined,
                    },
                });
                resetFields();
                fetchAppointments();
                onClose();
            }
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
                <UrgentCaseAlert message={emergencyMsg} onClose={() => setAlertVisible(false)} />
            )}
            <View style={styles(currentColors).card}>
                <View style={styles(currentColors).header}>
                    <Text style={styles(currentColors).title}>Vitals</Text>
                    <TouchableOpacity onPress={onClose} style={styles(currentColors).closeButton}>
                        <Ionicons name="close" size={24} color={currentColors.actionMenuTextColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles(currentColors).scrollView}>
                    {/* Core Vitals */}
                    <View style={styles(currentColors).row}>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Weight (kg)</Text>
                            <TextInput
                                style={[styles(currentColors).input, errors.weight && styles(currentColors).inputError]}
                                value={weight}
                                onChangeText={updateField(setWeight, 'weight')}
                                placeholder="Max 3 digits"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                editable={!isSaving}
                            />
                            {errors.weight && <Text style={styles(currentColors).errorText}>{errors.weight}</Text>}
                        </View>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Temperature (°F)</Text>
                            <TextInput
                                style={[styles(currentColors).input, errors.temperature && styles(currentColors).inputError]}
                                value={temperature}
                                onChangeText={updateField(setTemperature, 'temperature')}
                                placeholder="92-110°F"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                editable={!isSaving}
                            />
                            {errors.temperature && <Text style={styles(currentColors).errorText}>{errors.temperature}</Text>}
                        </View>
                    </View>

                    <View style={styles(currentColors).row}>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Heart Rate (bpm)</Text>
                            <TextInput
                                style={[styles(currentColors).input, errors.HR && styles(currentColors).inputError]}
                                value={HR}
                                onChangeText={updateField(setHR, 'HR')}
                                placeholder="50-250/min"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                editable={!isSaving}
                            />
                            {errors.HR && <Text style={styles(currentColors).errorText}>{errors.HR}</Text>}
                        </View>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Blood Pressure</Text>
                            <TextInput
                                style={[styles(currentColors).input, errors.BP && styles(currentColors).inputError]}
                                value={BP}
                                onChangeText={updateField(setBP, 'BP')}
                                placeholder="e.g., 120/80"
                                placeholderTextColor="grey"
                                editable={!isSaving}
                            />
                            {errors.BP && <Text style={styles(currentColors).errorText}>{errors.BP}</Text>}
                        </View>
                    </View>

                    <View style={styles(currentColors).row}>
                        <View style={styles(currentColors).column}>
                            <Text style={styles(currentColors).label}>Respiratory Rate (/min)</Text>
                            <TextInput
                                style={[styles(currentColors).input, errors.RR && styles(currentColors).inputError]}
                                value={RR}
                                onChangeText={updateField(setRR, 'RR')}
                                placeholder="0-80/min"
                                placeholderTextColor="grey"
                                keyboardType="numeric"
                                editable={!isSaving}
                            />
                            {errors.RR && <Text style={styles(currentColors).errorText}>{errors.RR}</Text>}
                        </View>
                    </View>

                    {/* Extra Vitals */}
                    {extraVitals.length > 0 && (
                        <View style={styles(currentColors).section}>
                            <Text style={styles(currentColors).sectionTitle}>Additional Vitals</Text>
                            {extraVitals.map((vital) => (
                                <View key={vital.id} style={styles(currentColors).extraVitalRow}>
                                    <View style={styles(currentColors).extraVitalInputContainer}>
                                        <TextInput
                                            style={styles(currentColors).extraVitalInput}
                                            value={vital.title}
                                            onChangeText={(text) => updateVitalField(vital.id, 'title', text)}
                                            placeholder="Title"
                                            placeholderTextColor="grey"
                                            editable={!isSaving}
                                        />
                                    </View>
                                    <View style={styles(currentColors).extraVitalInputContainer}>
                                        <TextInput
                                            style={styles(currentColors).extraVitalInput}
                                            value={vital.measure}
                                            onChangeText={(text) => updateVitalField(vital.id, 'measure', text)}
                                            placeholder="Measurement"
                                            placeholderTextColor="grey"
                                            editable={!isSaving}
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

                {/* Footer */}
                <View style={styles(currentColors).footer}>
                    <TouchableOpacity onPress={onClose} style={styles(currentColors).cancelButton}>
                        <Text style={styles(currentColors).cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={currentColors.activeTabBackground} />
                    ) : (
                        <TouchableOpacity
                            onPress={() => handleSave(appointment?.vitals?.message === undefined || appointment?.vitals?.message === '' ? 'SAVE' : 'UPDATE')}
                            style={styles(currentColors).saveButton}
                            disabled={isSaving}
                        >
                            <Text style={styles(currentColors).saveButtonText}>
                                {appointment?.vitals?.message === undefined || appointment?.vitals?.message === '' ? 'Save' : 'Update'}
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
});

export default Vitals;