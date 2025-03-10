// Scale.ts
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number): number => width / guidelineBaseWidth * size;
const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

// types.ts
export interface ResetPasswordFormData {
    newPassword: string;
    confirmPassword: string;
}

// ResetPasswordScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleProp,
    ViewStyle,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerificationScreen from './Verification';
import Toast from 'react-native-toast-message';
import { forgetPassword, resetPassword } from '@/src/Auth/authService';
import { useTheme } from '../../utils/ThemeContext'; // Import useTheme

interface ResetPasswordScreenProps {
    onResetPassword?: (data: ResetPasswordFormData) => void;
    onBackToLogin?: (message?: string) => void; // Update prop to accept a message
    style?: StyleProp<ViewStyle>;
}

interface InputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    secureTextEntry?: boolean;
    keyboardType?: 'email-address' | 'default';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    showError?: boolean;
}

// Update Input component to accept currentColors
const Input: React.FC<InputProps & { currentColors?: any }> = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    showError,
    currentColors,
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(secureTextEntry);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles(currentColors).inputContainer}>
            <Text style={styles(currentColors).label}>{label}</Text>
            <View style={styles(currentColors).inputWrapper}>
                <TextInput
                    style={[
                        styles(currentColors).input,
                        { borderColor: isFocused ? currentColors.activeTabBackground : showError ? 'red' : currentColors.dropdownBorder },
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={currentColors.actionMenuTextColor}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={isPasswordVisible}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    color={currentColors.dropdownText}
                />
                {secureTextEntry && (
                    <TouchableOpacity
                        style={styles(currentColors).eyeIcon}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off' : 'eye'}
                            size={24}
                            color={currentColors.actionMenuTextColor}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {showError && <Text style={styles(currentColors).requiredText}>Required</Text>}
        </View>
    );
};

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onResetPassword, onBackToLogin, style }) => {
    const { currentColors } = useTheme(); // Get current theme colors
    const [formData, setFormData] = useState<ResetPasswordFormData>({
        newPassword: '',
        confirmPassword: '',
    });
    const [email, setEmail] = useState('');
    const [emailSubmitted, setEmailSubmitted] = useState(false);
    const [verificationSubmitted, setVerificationSubmitted] = useState(false);
    const [showRequired, setShowRequired] = useState({
        email: false,
        newPassword: false,
        confirmPassword: false,
    });
    const [isLoading, setIsLoading] = useState(false); // Add loading state
    const [verificationToken, setVerificationToken] = useState<string>(''); // Add state for verification token

    useEffect(() => {
        return () => {
            // Cleanup function to reset state when component unmounts
            setEmailSubmitted(false);
            setVerificationSubmitted(false);
        };
    }, []);

    const onBackToEmail = () => {
        setEmailSubmitted(false);
        setVerificationSubmitted(false);
    };

    const onBackToVerification = () => {
        setVerificationSubmitted(false);
    };

    const handleEmailSubmit = async () => {
        if (!email) {
            setShowRequired({ ...showRequired, email: true });
            return;
        }

        setIsLoading(true); // Set loading state to true

        // Simulate email verification
        try {
            const response = await forgetPassword(email);


            if (response.message === 'User not found') {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'User not found. Please check your email and try again.',
                    position: 'top',
                    visibilityTime: 3000,
                });
            } else {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: response.message || 'Password reset link sent successfully',
                    position: 'top',
                    visibilityTime: 3000,
                });
                setEmailSubmitted(true);
            }
        } catch (error) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Toast.show({
                    type: 'error',
                    text1: 'Invalid Email',
                    text2: 'Please enter a valid email address',
                    position: 'top',
                    visibilityTime: 3000,
                });
                setIsLoading(false); // Set loading state to false
                return;
            }
            else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Something went wrong. Please try again.',
                    position: 'top',
                    visibilityTime: 3000,
                });
            }
        } finally {
            setIsLoading(false); // Set loading state to false
        }
    };

    const handleVerificationSubmit = (token: string) => {
        setVerificationToken(token); // Store the verification token
        setVerificationSubmitted(true);
        Toast.show({
            type: 'success',
            text1: 'OTP Verified',
            text2: 'You can now reset your password',
            position: 'top',
            visibilityTime: 3000,
        });
    };

    const handleResetPassword = async () => {
        const { newPassword, confirmPassword } = formData;

        // Validation checks
        if (!newPassword || !confirmPassword) {
            setShowRequired({
                ...showRequired,
                newPassword: !newPassword,
                confirmPassword: !confirmPassword
            });
            return;
        }

        // Password length check
        if (newPassword.length < 8) {
            Toast.show({
                type: 'error',
                text1: 'Weak Password',
                text2: 'Password must be at least 8 characters long',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        // Password complexity check (optional)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            Toast.show({
                type: 'error',
                text1: 'Weak Password',
                text2: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        // Password match check
        if (newPassword !== confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Passwords Do Not Match',
                text2: 'Make sure both passwords are the same',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        setIsLoading(true);

        try {
            // Make sure you have access to the verification token and email
            const response = await resetPassword(email, verificationToken, newPassword);

            if (response.isSuccess) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: response.message || 'Password has been successfully reset',
                    position: 'top',
                    visibilityTime: 3000,
                });

                // Call the callback if provided
                onResetPassword?.(formData);

                // Navigate to login screen or appropriate next screen
                onBackToLogin?.("Password Updated successfully");
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: response.message || 'Failed to reset password',
                    position: 'top',
                    visibilityTime: 3000,
                });
            }
        } catch (error: any) {
            console.error('Password reset error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Something went wrong. Please try again.',
                position: 'top',
                visibilityTime: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles(currentColors).container, style, { flex: 1 }]}
        >
            <ScrollView contentContainerStyle={[styles(currentColors).scrollContainer, { flexGrow: 1 }]}>
                <View style={styles(currentColors).imageContainer}>
                    <Image
                        source={require('../../../assets/images/login.png')} // Update image path
                        style={[styles(currentColors).topImage, 
                        { opacity: currentColors.background === '#1A1A2E' ? 0.8 : 1 }]} // Slightly dim in dark mode
                    />
                </View>
                <View style={styles(currentColors).formContainer}>
                    <Text style={styles(currentColors).resetPasswordText}>{emailSubmitted ? null : 'Reset Password'}</Text>

                    {!emailSubmitted ? (
                        <>
                            <Input
                                label="Email"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setShowRequired({ ...showRequired, email: false });
                                }}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                showError={showRequired.email}
                                currentColors={currentColors}
                            />
                            <TouchableOpacity onPress={() => onBackToLogin?.()}>
                                <Text style={styles(currentColors).backToLoginText}>Back to Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles(currentColors).resetPasswordButton} onPress={handleEmailSubmit} disabled={isLoading}>
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" /> // Show activity indicator while loading
                                ) : (
                                    <Text style={styles(currentColors).resetPasswordButtonText}>Submit →</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : !verificationSubmitted ? (
                        <VerificationScreen email={email} onSubmit={handleVerificationSubmit} onBackToEmail={onBackToEmail} onVerificationSuccess={handleVerificationSubmit} />
                    ) : (
                        <>
                            <Input
                                label="New Password"
                                value={formData.newPassword}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, newPassword: text });
                                    setShowRequired({ ...showRequired, newPassword: false });
                                }}
                                placeholder="New Password"
                                secureTextEntry
                                showError={showRequired.newPassword}
                                currentColors={currentColors}
                            />
                            <Input
                                label="Confirm Password"
                                value={formData.confirmPassword}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, confirmPassword: text });
                                    setShowRequired({ ...showRequired, confirmPassword: false });
                                }}
                                placeholder="Confirm Password"
                                secureTextEntry
                                showError={showRequired.confirmPassword}
                                currentColors={currentColors}
                            />
                            <TouchableOpacity onPress={onBackToVerification}>
                                <Text style={styles(currentColors).backToLoginText}>Back to Verification</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles(currentColors).resetPasswordButton} onPress={handleResetPassword} disabled={isLoading}>
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" /> // Show activity indicator while loading
                                ) : (
                                    <Text style={styles(currentColors).resetPasswordButtonText}>Submit →</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <Toast />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = (currentColors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: currentColors?.background || '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    formContainer: {
        paddingLeft: scale(30),
        paddingRight: scale(30),
        paddingTop: verticalScale(20),
    },
    resetPasswordText: {
        textAlign: 'center',
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: currentColors?.dropdownText || '#055FFC',
        marginBottom: verticalScale(10),
    },
    inputContainer: {
        marginBottom: verticalScale(16),
    },
    label: {
        fontSize: moderateScale(14),
        color: currentColors?.dropdownText || '#333',
        marginBottom: verticalScale(8),
        fontWeight: 'bold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        height: verticalScale(40),
        borderWidth: 1,
        borderColor: currentColors?.dropdownBorder || '#E0E0E0',
        borderRadius: moderateScale(5),
        paddingHorizontal: scale(16),
        fontSize: moderateScale(14),
        flex: 1,
        backgroundColor: currentColors?.dropdownBackground || '#fff',
        color: currentColors?.dropdownText || '#000',
    },
    eyeIcon: {
        position: 'absolute',
        right: scale(16),
    },
    resetPasswordButton: {
        backgroundColor: currentColors?.activeTabBackground || '#055FFC',
        height: verticalScale(35),
        borderRadius: moderateScale(5),
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetPasswordButtonText: {
        color: '#fff',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    backToLoginText: {
        alignSelf: 'flex-start',
        marginBottom: verticalScale(16),
        color: currentColors?.activeTabBackground || '#055FFC',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    requiredText: {
        color: 'red',
        fontSize: moderateScale(10),
        marginTop: verticalScale(4),
    },
    imageContainer: {
        height: verticalScale(240),
        position: 'relative',
    },
    topImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
});

export default ResetPasswordScreen;