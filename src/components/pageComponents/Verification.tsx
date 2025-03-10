// VerificationScreen.tsx
import { verifyToken } from '@/src/Auth/authService';
import React, { useRef, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../utils/ThemeContext'; // Import useTheme

interface VerificationScreenProps {
    email?: string;
    onSubmit?: (token: string) => void;
    onResend?: () => void;
    onBackToEmail?: () => void;
    onVerificationSuccess?: (token: string) => void;
}

const VERIFICATION_CODE_LENGTH = 6;

const width = 375;
const height = 812;
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const scale = (size: number): number => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number): number => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor: number = 0.5): number =>
    size + (scale(size) - size) * factor;

const VerificationScreen: React.FC<VerificationScreenProps> = ({
    email = "example@Gmail.Com",
    onSubmit,
    onResend,
    onBackToEmail,
    onVerificationSuccess,
}) => {
    const { currentColors } = useTheme(); // Get current theme colors
    const [code, setCode] = useState<string[]>(Array(VERIFICATION_CODE_LENGTH).fill(''));
    const inputRefs = useRef<Array<TextInput | null>>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [showError, setShowError] = useState<boolean[]>(Array(VERIFICATION_CODE_LENGTH).fill(false));
    const [isLoading, setIsLoading] = useState(false);

    const handleCodeChange = (text: string, index: number) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < VERIFICATION_CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (text) {
            const newShowError = [...showError];
            newShowError[index] = false;
            setShowError(newShowError);
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
        }
    };

    const handleSubmit = async () => {
        const completeCode = code.join('');

        const newShowError = code.map((value) => !value);
        setShowError(newShowError);

        if (newShowError.some((value) => value)) {
            Toast.show({
                type: 'error',
                text1: 'Verification Failed',
                text2: 'Please fill all fields',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await verifyToken(email, completeCode);

            if (response.isSuccess && response.data.isTokenVerified) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: response.message || 'Verification code confirmed',
                    position: 'top',
                    visibilityTime: 3000,
                });

                onVerificationSuccess?.(completeCode);
                onSubmit?.(completeCode);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Verification Failed',
                    text2: response.message || 'Invalid verification code',
                    position: 'top',
                    visibilityTime: 3000,
                });

                setCode(Array(VERIFICATION_CODE_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            }
        } catch (error: any) {
            console.error('Verification error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Failed to verify code. Please try again.',
                position: 'top',
                visibilityTime: 3000,
            });

            setCode(Array(VERIFICATION_CODE_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles(currentColors).container}
        >
            <ScrollView contentContainerStyle={styles(currentColors).scrollContainer}>
                <View style={styles(currentColors).content}>
                    <Text numberOfLines={1} style={styles(currentColors).title}>Second Step Verifications!</Text>
                    <Text style={styles(currentColors).subtitle}>
                        Enter The Verification Code We Sent To {email}
                    </Text>
                    <Text style={styles(currentColors).inputLabel}>Type Your Code Here</Text>
                    <View style={styles(currentColors).codeContainer}>
                        {Array(VERIFICATION_CODE_LENGTH).fill(0).map((_, index) => (
                            <View key={index} style={{ flexDirection: 'row' }}>
                                <TextInput
                                    ref={(ref) => inputRefs.current[index] = ref}
                                    value={code[index]}
                                    onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    onFocus={() => setFocusedIndex(index)}
                                    onBlur={() => setFocusedIndex(null)}
                                    style={[
                                        styles(currentColors).codeInput,
                                        focusedIndex === index && styles(currentColors).codeInputFocused,
                                        showError[index] && styles(currentColors).codeInputError,
                                    ]}
                                    placeholderTextColor={currentColors.actionMenuTextColor}
                                    onSubmitEditing={handleSubmit}
                                />
                                {index === 2 && <View style={styles(currentColors).spaceBetweenInputs} />}
                            </View>
                        ))}
                    </View>

                    <View style={{ paddingHorizontal: scale(10) }}></View>
                    {onBackToEmail && (
                        <TouchableOpacity onPress={onBackToEmail}>
                            <Text style={styles(currentColors).backToLoginText}>Back to Email</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles(currentColors).submitButton} onPress={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles(currentColors).submitButtonText}>Submit →</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles(currentColors).resendContainer}>
                    <Text style={styles(currentColors).resendText}>{"Didn't Get The Code? "}</Text>
                    <TouchableOpacity onPress={onResend}>
                        <Text style={styles(currentColors).resendLink}>Resend</Text>
                    </TouchableOpacity>
                </View>

                <Toast />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = (currentColors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: currentColors.background,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
    },
    title: {
        textAlign: 'center',
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: currentColors.dropdownText,
        marginBottom: verticalScale(10),
    },
    subtitle: {
        fontSize: moderateScale(12),
        color: currentColors.actionMenuTextColor,
        marginBottom: verticalScale(15),
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: moderateScale(14),
        color: currentColors.dropdownText,
        marginBottom: verticalScale(16),
        alignSelf: 'center',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(6),
        marginBottom: verticalScale(22),
    },
    codeInput: {
        width: scale(40),
        borderWidth: 1,
        borderColor: currentColors.dropdownBorder,
        borderRadius: moderateScale(5),
        textAlign: 'center',
        fontSize: moderateScale(20),
        color: currentColors.dropdownText,
        backgroundColor: currentColors.dropdownBackground,
    },
    codeInputFocused: {
        borderColor: currentColors.activeTabBackground,
    },
    codeInputError: {
        borderColor: 'red',
    },
    spaceBetweenInputs: {
        width: scale(15),
    },
    submitButton: {
        backgroundColor: currentColors.activeTabBackground,
        height: verticalScale(45),
        borderRadius: moderateScale(5),
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(32),
        width: '100%',
        marginBottom: verticalScale(16),
    },
    submitButtonText: {
        color: '#fff',
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resendText: {
        fontSize: moderateScale(14),
        color: currentColors.actionMenuTextColor,
    },
    resendLink: {
        fontSize: moderateScale(14),
        color: currentColors.activeTabBackground,
        fontWeight: '500',
    },
    backToLoginText: {
        marginBottom: verticalScale(16),
        color: currentColors.activeTabBackground,
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
});

export default VerificationScreen;