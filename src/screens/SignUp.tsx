import React, { useState } from 'react';
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
  Dimensions,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { signUp } from '../Firebase/SignUp'; // Import signUp function
import { getErrorMessage } from '../utils/ErrorHandling'; // Import getErrorMessage
import { useRouter } from 'expo-router';
import Input from '../components/pageComponents/SignupComponents/Input'; // Import Input component

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number): number => width / guidelineBaseWidth * size;
const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

interface SignupFormData {
  hospitalName: string;
  officialEmail: string;
  phoneNo: string;
  hospitalLicense: string;
  address: string;
  password: string;
  confirmPassword: string;
}

interface SignupScreenProps {
  onSignup?: (data: SignupFormData) => void;
  style?: StyleProp<ViewStyle>;
}


const SignupScreen: React.FC<SignupScreenProps> = ({ style }) => {
  const [formData, setFormData] = useState<SignupFormData>({
    hospitalName: '',
    officialEmail: '',
    phoneNo: '',
    hospitalLicense: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    hospitalName: false,
    officialEmail: false,
    phoneNo: false,
    address: false,
    password: false,
    confirmPassword: false,
  });

  const router = useRouter(); // Initialize router

  const clearAllFields = () => {
    setFormData({
      hospitalName: '',
      officialEmail: '',
      phoneNo: '',
      hospitalLicense: '',
      address: '',
      password: '',
      confirmPassword: '',
    });
    setErrors({
      hospitalName: false,
      officialEmail: false,
      phoneNo: false,
      address: false,
      password: false,
      confirmPassword: false,
    });
  };
const handleSignup = async () => {
  const newErrors = {
    hospitalName: !formData.hospitalName,
    officialEmail: !formData.officialEmail,
    phoneNo: !formData.phoneNo,
    address: !formData.address,
    password: !formData.password,
    confirmPassword: !formData.confirmPassword,
  };

  setErrors(newErrors);

  if (Object.values(newErrors).some((value) => value)) {
    Toast.show({
      type: 'error',
      text1: 'Required Fields Missing',
      text2: 'Please fill all required fields',
      position: 'top',
      visibilityTime: 3000,
    });
    return;
  }

  try {
    await signUp(
      formData.officialEmail,
      formData.password,
      formData.confirmPassword,
      formData.hospitalName,
      formData.phoneNo,
      formData.address,
      formData.hospitalLicense
    );

    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Sign up successful!',
      position: 'top',
      visibilityTime: 3000,
      onHide: () => {
        clearAllFields();
      }
    });
  } catch (error: any) {
    // Inspecting error structure to handle different error types
    const errorMessage = error.response?.data?.message
      || error.message
      || 'An unknown error occurred';

    Toast.show({
      type: 'error',
      text1: 'Sign Up Failed',
      text2: errorMessage,
      position: 'top',
      visibilityTime: 4000,
    });
  }
};

  const handleChangeText = (field: keyof SignupFormData, text: string) => {
    setFormData({ ...formData, [field]: text });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  const SignIn = () => {
    router.navigate('/Login'); // Replace navigation.navigate with router.navigate
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/login.png')}
            style={styles.topImage}
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.loginText}>Sign Up</Text>

          <View style={styles.row}>
            <Input
              label="Hospital Name"
              value={formData.hospitalName}
              onChangeText={(text) => handleChangeText('hospitalName', text)}
              placeholder="Hospital Name"
              containerStyle={styles.halfWidth}
              error={errors.hospitalName}
            />
            <Input
              label="Email"
              value={formData.officialEmail}
              onChangeText={(text) => handleChangeText('officialEmail', text)}
              placeholder="Enter Email"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.halfWidth}
              error={errors.officialEmail}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Phone Number"
              value={formData.phoneNo}
              onChangeText={(text) => handleChangeText('phoneNo', text)}
              placeholder="Enter Phone Number"
              keyboardType="phone-pad"
              containerStyle={styles.halfWidth}
              error={errors.phoneNo}
            />
            <Input
              label="Hospital License"
              value={formData.hospitalLicense}
              onChangeText={(text) => handleChangeText('hospitalLicense', text)}
              placeholder="Enter Hospital License"
              optional
              containerStyle={styles.halfWidth}
            />
          </View>

          <Input
            label="Address"
            value={formData.address}
            onChangeText={(text) => handleChangeText('address', text)}
            placeholder="Enter Your Address"
            error={errors.address}
          />

          <View style={styles.row}>
            <Input
              label="Password"
              value={formData.password}
              onChangeText={(text) => handleChangeText('password', text)}
              placeholder="Enter password"
              secureTextEntry
              containerStyle={styles.halfWidth}
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => handleChangeText('confirmPassword', text)}
              placeholder="Confirm password"
              secureTextEntry
              containerStyle={styles.halfWidth}
              error={errors.confirmPassword}
            />
          </View>

          <TouchableOpacity onPress={SignIn}>
            <Text style={styles.signIn}>Already have an Account? SignIn</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleSignup}>
            <Text style={styles.loginButtonText}>Submit →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  formContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
  },
  loginText: {
    textAlign: 'center',
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#055FFC',
    marginBottom: verticalScale(24),
  },
 
  loginButton: {
    backgroundColor: '#055FFC',
    height: verticalScale(45),
    borderRadius: moderateScale(5),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(5),
    marginBottom: verticalScale(20),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(10),
    marginBottom: verticalScale(5),
  },
  halfWidth: {
    width: '48%',
  },
  signIn: {
    alignSelf: 'flex-start',
    marginBottom: verticalScale(16),
    color: '#055FFC',
    fontSize: moderateScale(15),
    fontWeight: '500',
  },

});

export default SignupScreen;