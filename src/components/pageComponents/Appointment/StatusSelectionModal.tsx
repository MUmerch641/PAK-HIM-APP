import { Appointment, getStatusOptions } from '@/src/ApiHandler/Appointment';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    BackHandler
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/src/utils/ThemeContext';

const { width } = Dimensions.get('window');

interface StatusSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (status: string) => void;
}

const StatusSelectionModal: React.FC<StatusSelectionModalProps> = ({ 
    visible, 
    onClose, 
    onSelect 
}) => {
    const [selectedStatus, setSelectedStatus] = useState('opd');
    const [options, setOptions] = useState<Appointment[]>([]);
    const { currentColors } = useTheme();
    
    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(0.9))[0];

    const handleSubmit = () => {
        animateAndExecute(() => {
            onSelect(selectedStatus);
            onClose();
        });
    };

    const handleClose = () => {
        animateAndExecute(onClose);
    };

    const animateAndExecute = (callback: () => void) => {
        // Animate out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            callback();
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response = await getStatusOptions();
                setOptions(response);
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Error fetching status options',
                });
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        // Handle back button press
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (visible) {
                handleClose();
                return true;
            }
            return false;
        });

        if (visible) {
            // Animate in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset values when hidden
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }

        return () => backHandler.remove();
    }, [visible, fadeAnim, scaleAnim]);

    if (!visible) {
        return null;
    }

    return (
        <Animated.View 
            style={[
                styles(currentColors).overlay,
                { opacity: fadeAnim }
            ]}
        >
            <TouchableOpacity 
                style={styles(currentColors).backdrop} 
                activeOpacity={1} 
                onPress={handleClose}
            />
            
            <Animated.View 
                style={[
                    styles(currentColors).dialogContainer,
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: fadeAnim,
                    }
                ]}
            >
                <View style={styles(currentColors).dialogContent}>
                    <Text style={styles(currentColors).modalTitle}>
                        Change status from Active to Check?
                    </Text>

                    <Text style={styles(currentColors).selectLabel}>Select Status</Text>

                    <View style={styles(currentColors).radioGroup}>
                        {options && options.map((e, idx) => (
                            <TouchableOpacity
                                style={styles(currentColors).radioOption}
                                onPress={() => setSelectedStatus(e.optionName)}
                                key={idx}
                            >
                                <View style={styles(currentColors).radioButton}>
                                    <View style={[
                                        styles(currentColors).radioInner,
                                        selectedStatus === e.optionName && styles(currentColors).radioSelected
                                    ]} />
                                </View>
                                <Text style={styles(currentColors).radioLabel}>{e.optionName}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles(currentColors).noteText}>
                        Note: If you want to add more disposal options, please log in as admin and navigate to Settings → Disposal Options.
                    </Text>

                    <View style={styles(currentColors).buttonContainer}>
                        <TouchableOpacity
                            style={[styles(currentColors).button, styles(currentColors).cancelButton]}
                            onPress={handleClose}
                        >
                            <Text style={styles(currentColors).cancelButtonText}>CANCEL</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles(currentColors).button, styles(currentColors).submitButton]}
                            onPress={handleSubmit}
                        >
                            <Text style={styles(currentColors).submitButtonText}>YES</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

const styles = (currentColors: { [key: string]: string }) => StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    dialogContainer: {
        width: width * 0.9,
        maxWidth: moderateScale(500),
        zIndex: 1001,
    },
    dialogContent: {
        backgroundColor: currentColors.background,
        borderRadius: moderateScale(8),
        padding: moderateScale(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: currentColors.actionMenuTextColor,
        marginBottom: verticalScale(15),
    },
    selectLabel: {
        fontSize: moderateScale(14),
        color: currentColors.actionMenuTextColor,
        marginBottom: verticalScale(10),
    },
    radioGroup: {
        marginBottom: verticalScale(15),
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: verticalScale(5),
    },
    radioButton: {
        width: moderateScale(20),
        height: moderateScale(20),
        borderRadius: moderateScale(10),
        borderWidth: moderateScale(2),
        borderColor: currentColors.dropdownBorder,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(10),
    },
    radioInner: {
        width: moderateScale(12),
        height: moderateScale(12),
        borderRadius: moderateScale(6),
        backgroundColor: 'transparent',
    },
    radioSelected: {
        backgroundColor: currentColors.dropdownText,
    },
    radioLabel: {
        fontSize: moderateScale(14),
        color: currentColors.actionMenuTextColor,
    },
    noteText: {
        fontSize: moderateScale(12),
        color: currentColors.actionMenuTextColor,
        marginBottom: verticalScale(20),
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: moderateScale(10),
    },
    button: {
        paddingHorizontal: moderateScale(20),
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(4),
    },
    cancelButton: {
        backgroundColor: currentColors.background,
        borderWidth: moderateScale(1),
        borderColor: currentColors.dropdownText,
    },
    submitButton: {
        backgroundColor: currentColors.dropdownText,
    },
    cancelButtonText: {
        color: currentColors.dropdownText,
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
    submitButtonText: {
        color: currentColors.background,
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
});

export default StatusSelectionModal;