import React, { useMemo } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getStyles } from './styles';
import { useTheme } from '../../../utils/ThemeContext';

export default function FeeSummary({
    formData,
    errors,
    touched,
    focusedInput,
    updateFormData,
    handleFocus,
    handleBlur,
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
        <>
            <View style={styles.feeContainer}>
                <View style={styles.feeItem}>
                    <Text style={styles.label}>
                        Total Fee<Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        style={[getInputStyle("totalFee"), styles.readOnlyInput]}
                        placeholder="0000"
                        value={formData.totalFee}
                        editable={false}
                        keyboardType="numeric"
                    />
                    {errors.totalFee && touched.totalFee && (
                        <Text style={styles.errorText}>{errors.totalFee}</Text>
                    )}
                </View>

                <View style={styles.feeItem}>
                    <Text style={styles.label}>Discount %</Text>
                    <TextInput
                        style={[
                            getInputStyle("discountPercentage"),
                            formData.status === "insurance" && styles.readOnlyInput,
                        ]}
                        placeholder="0"
                        value={formData.discountPercentage}
                        onChangeText={(text) => updateFormData("discountPercentage", text)}
                        keyboardType="numeric"
                        onFocus={() => handleFocus("discountPercentage")}
                        onBlur={() => handleBlur("discountPercentage")}
                        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
                        editable={formData.status !== "insurance"}
                    />
                </View>
            </View>

            <View style={styles.feeContainer}>
                <View style={styles.feeItem}>
                    <Text style={styles.label}>Discount Rs</Text>
                    <TextInput
                        style={[
                            getInputStyle("discountAmount"),
                            formData.status === "insurance" && styles.readOnlyInput,
                        ]}
                        placeholder="0000"
                        value={formData.discountAmount}
                        onChangeText={(text) => updateFormData("discountAmount", text)}
                        keyboardType="numeric"
                        onFocus={() => handleFocus("discountAmount")}
                        onBlur={() => handleBlur("discountAmount")}
                        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
                        editable={formData.status !== "insurance"}
                    />
                </View>

                <View style={styles.feeItem}>
                    <Text style={styles.label}>
                        Payable Fee<Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                        style={[getInputStyle("payableFee"), styles.readOnlyInput]}
                        placeholder="0000"
                        value={formData.payableFee}
                        editable={false}
                        keyboardType="numeric"
                    />
                    {errors.payableFee && touched.payableFee && (
                        <Text style={styles.errorText}>{errors.payableFee}</Text>
                    )}
                </View>
            </View>

            <Text style={styles.label}>Status</Text>
            <View
                style={[
                    styles.pickerContainer,
                    focusedInput === "status" && { borderColor: currentColors.activeTabBackground, borderWidth: 1.5 },
                ]}
            >
                <Picker
                    selectedValue={formData.status}
                    onValueChange={(value) => updateFormData("status", value)}
                    style={styles.picker}
                    onFocus={() => handleFocus("status")}
                    dropdownIconColor={currentColors.AppointmentColor}
                >
                    <Picker.Item label="Paid" value="paid" />
                    <Picker.Item label="Unpaid" value="unpaid" />
                    <Picker.Item label="Insurance" value="insurance" />
                </Picker>
            </View>

            {formData.status === "paid" && (
                <>
                    <Text style={styles.label}>Return Amount</Text>
                    <TextInput
                        style={getInputStyle("returnableAmount")}
                        placeholder="0000"
                        value={formData.appointment?.returnableAmount?.toString() || ""}
                        onChangeText={(text) =>
                            updateFormData("appointment", {
                                ...formData.appointment,
                                returnableAmount: Number.parseFloat(text) || 0,
                            })
                        }
                        keyboardType="numeric"
                        onFocus={() => handleFocus("returnableAmount")}
                        onBlur={() => handleBlur("returnableAmount")}
                        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
                    />
                </>
            )}
        </>
    );
}
