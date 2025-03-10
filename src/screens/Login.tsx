// Scale.ts
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number): number => width / guidelineBaseWidth * size;
const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

// types.ts
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ResetPasswordScreen, { ResetPasswordFormData } from '../components/pageComponents/ResetPassword';
import Toast from 'react-native-toast-message';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Input from '../components/pageComponents/LoginComponents/Input';
import { loginUser } from '../Auth/authService';
import { useTheme } from '../utils/ThemeContext';

interface LoginScreenProps {
  onLogin?: (data: LoginFormData) => void;
  style?: StyleProp<ViewStyle>;
  navigation?: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, style }) => {
  const { currentColors } = useTheme();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: false,
    password: false,
  });
  const [showErrors, setShowErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.message) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: params.message as string,
      });
    }
  }, [params]);

 

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const userData = await loginUser(formData.email, formData.password);

      if (!userData) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Login failed. Invalid credentials.',
        });
        setIsLoading(false);
        return;
      }

      router.replace("/(tab)/Appointment");
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: (error instanceof Error ? error.message : 'An unknown error occurred'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = (data: ResetPasswordFormData) => {
    setShowResetPassword(false);
  };

  const handleInputChange = (field: keyof LoginFormData) => (text: string) => {
    setFormData(prev => ({ ...prev, [field]: text }));
    if (showErrors) {
      setErrors(prev => ({ ...prev, [field]: !text }));
    }
  };

  if (showResetPassword) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles(currentColors).container, style]}>
        <ScrollView contentContainerStyle={styles(currentColors).scrollContainer}>
          <ResetPasswordScreen
            onResetPassword={handleResetPassword}
            onBackToLogin={() => setShowResetPassword(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles(currentColors).container, style]}>
      <ScrollView contentContainerStyle={styles(currentColors).scrollContainer}>
        <View style={styles(currentColors).imageContainer}>
          <Image
            source={require('../../assets/images/login.png')}
            style={styles(currentColors).topImage}
          />
        </View>
        <Text style={styles(currentColors).welcomeText}>Hello Admin!</Text>
        <View style={styles(currentColors).formContainer}>
          <Text style={styles(currentColors).loginText}>Login Account</Text>
          <Text style={styles(currentColors).subText}>Enter email & password to login HMS</Text>
          <Input
            label="Email"
            value={formData.email}
            onChangeText={handleInputChange('email')}
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            showError={showErrors}
            currentColors={currentColors}
          />
          <Input
            label="Password"
            value={formData.password}
            onChangeText={handleInputChange('password')}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
            showError={showErrors}
            currentColors={currentColors}
          />

          <View style={styles(currentColors).optionsContainer}>
            <TouchableOpacity
              style={styles(currentColors).rememberContainer}
              onPress={() => setFormData({ ...formData, rememberMe: !formData.rememberMe })}>
              <View style={[styles(currentColors).checkbox, { backgroundColor: formData.rememberMe ? currentColors.activeTabBackground : 'transparent' }]}>
                {formData.rememberMe && <Text style={styles(currentColors).checked}>✓</Text>}
              </View>
              <Text style={styles(currentColors).rememberText}>Remember Me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowResetPassword(true)}>
              <Text style={styles(currentColors).forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles(currentColors).loginButton, isLoading && { opacity: 0.8 }]}
            onPress={handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles(currentColors).loginButtonText}>Login →</Text>
            )}
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
  imageContainer: {
    height: verticalScale(240),
    position: 'relative',
  },
  topImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: currentColors.background === '#1A1A2E' ? 0.8 : 1, // Slightly dim in dark mode
  },
  blueMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 95, 252, 0.7)',
  },
  blueShade: {
    position: 'absolute',
    width: '100%',
    height: '60%',
    backgroundColor: 'rgba(173, 216, 230, 0.5)',
  },
  formContainer: {
    paddingLeft: scale(30),
    paddingRight: scale(30),
    paddingTop: verticalScale(20),
  },
  welcomeText: {
    fontWeight: 'bold',
    padding: moderateScale(12),
    marginTop: verticalScale(13),
    textAlign: 'center',
    fontSize: moderateScale(16),
    color: currentColors.dropdownText,
    backgroundColor: currentColors.background === '#1A1A2E' ? 'rgba(45, 45, 90, 0.3)' : 'rgba(217, 217, 217, 0.15)',
  },
  loginText: {
    textAlign: 'center',
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: currentColors.dropdownText,
    marginBottom: verticalScale(10),
  },
  subText: {
    textAlign: 'center',
    fontSize: moderateScale(12),
    color: currentColors.actionMenuTextColor,
    marginBottom: verticalScale(24),
  },
  inputContainer: {
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: moderateScale(14),
    color: currentColors.dropdownText,
    marginBottom: verticalScale(8),
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: verticalScale(40),
    width: scale(40),
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    borderRadius: moderateScale(5),
    paddingHorizontal: scale(12),
    fontSize: moderateScale(14),
    backgroundColor: currentColors.dropdownBackground,
    color: currentColors.dropdownText,
    flex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: scale(16),
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(18),
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: moderateScale(15),
    height: moderateScale(15),
    borderWidth: 1,
    borderColor: currentColors.activeTabBackground,
    borderRadius: moderateScale(4),
    marginRight: scale(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    color: '#fff',
    fontSize: moderateScale(8),
  },
  rememberText: {
    fontSize: moderateScale(12),
    color: currentColors.actionMenuTextColor,
  },
  forgotText: {
    fontSize: moderateScale(12),
    color: currentColors.dropdownText,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: currentColors.activeTabBackground,
    height: verticalScale(35),
    borderRadius: moderateScale(5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  signUp: {
    alignSelf: 'flex-start',
    marginBottom: verticalScale(16),
    color: currentColors.activeTabBackground,
    fontSize: moderateScale(15),
    fontWeight: '500',
  },
  requiredText: {
    color: 'red',
    fontSize: moderateScale(10),
    marginTop: verticalScale(4),
  },
});

export default LoginScreen;