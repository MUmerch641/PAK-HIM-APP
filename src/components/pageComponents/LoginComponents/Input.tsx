import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: boolean;
  showError?: boolean;
  currentColors?: any; // Add currentColors prop
}

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;
const scale = (size: number): number => width / guidelineBaseWidth * size;
const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  showError,
  currentColors, // Use the theme colors
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);
  };

  return (
    <View style={styles(currentColors).inputContainer}>
      <Text style={styles(currentColors).label}>{label}</Text>
      <View style={styles(currentColors).inputWrapper}>
        <TextInput
          style={[
            styles(currentColors).input,
            { borderColor: error ? 'red' : isFocused ? currentColors?.activeTabBackground || '#055FFC' : currentColors?.dropdownBorder || '#E0E0E0' },
          ]}
          placeholder={placeholder}
          placeholderTextColor={currentColors?.actionMenuTextColor || "#aaa"}
          value={value}
          onChangeText={handleChangeText}
          secureTextEntry={isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles(currentColors).eyeIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={24}
              color={currentColors?.actionMenuTextColor || "#aaa9a94e"}
            />
          </TouchableOpacity>
        )}
      </View>
      {showError && error && <Text style={styles(currentColors).requiredText}>Required</Text>}
    </View>
  );
};

const styles = (currentColors?: any) => StyleSheet.create({
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
    width: scale(40),
    borderWidth: 1,
    borderColor: currentColors?.dropdownBorder || '#E0E0E0',
    borderRadius: moderateScale(5),
    paddingHorizontal: scale(12),
    fontSize: moderateScale(14),
    backgroundColor: currentColors?.dropdownBackground || '#fff',
    color: currentColors?.dropdownText || '#333',
    flex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: scale(16),
  },
  requiredText: {
    color: 'red',
    fontSize: moderateScale(10),
    marginTop: verticalScale(4),
  },
});

export default Input;