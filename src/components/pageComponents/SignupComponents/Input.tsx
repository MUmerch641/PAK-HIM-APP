import { useState } from "react";
import {
    Dimensions, StyleSheet, Text, TextInput, View,
    ViewStyle,
    StyleProp,
} from "react-native";


const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;


interface InputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    optional?: boolean;
    secureTextEntry?: boolean;
    keyboardType?: 'email-address' | 'default' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    containerStyle?: StyleProp<ViewStyle>;
    showRequired?: boolean;
    error?: boolean;
}

const scale = (size: number): number => width / guidelineBaseWidth * size;
const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;


const Input: React.FC<InputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    optional,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    containerStyle,
    showRequired,
    error,
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.inputContainer, containerStyle]}>
            <Text style={styles.label}>
                {label} {optional && <Text style={styles.optional}>(Optional)</Text>}
            </Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: error ? 'red' : isFocused ? '#055FFC' : '#E0E0E0' },
                        { fontSize: moderateScale(12) }
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor="#aaa"
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
            </View>
            {error && !optional && <Text style={styles.requiredText}>Required</Text>}
        </View>
    );
};


const styles = StyleSheet.create({
    inputContainer: {
        marginBottom: verticalScale(16),
    },
    label: {
        fontSize: moderateScale(12),
        color: '#333',
        marginBottom: verticalScale(6),
        fontWeight: '500',
    },
    optional: {
        color: '#666',
        fontWeight: 'normal',
        fontSize: moderateScale(10),
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        height: verticalScale(40),
        width: scale(40),
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: moderateScale(5),
        paddingHorizontal: scale(12),
        fontSize: moderateScale(14),
        backgroundColor: '#fff',
        flex: 1,
    },
    requiredText: {
        color: 'red',
        fontSize: moderateScale(10),
        marginTop: verticalScale(4),
    },
});

export default Input;