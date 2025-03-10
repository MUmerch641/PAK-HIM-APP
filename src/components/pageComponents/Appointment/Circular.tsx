import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

import { useTheme } from '@/src/utils/ThemeContext';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number): number => width / guidelineBaseWidth * size;
const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

interface SumOfReport {
    totalCharges?: number;
    totalDoctorCharges?: number;
    totalHospitalCharges?: number;
    totalDiscountCharges?: number;
    totalCompany_charges?: number;
}

const CircularProgressComponent = ({ sumOfReport }: { sumOfReport: SumOfReport }) => {
  const { currentColors } = useTheme();

    const chargesData = [
        { label: 'Total Charges', value: sumOfReport.totalCharges || 0, color: '#FF007F' },
        { label: 'Doctor Charges', value: sumOfReport.totalDoctorCharges || 0, color: '#007FFF' },
        { label: 'Hospital Charges', value: sumOfReport.totalHospitalCharges || 0, color: '#40C700' },
        { label: 'Discount Charges', value: sumOfReport.totalDiscountCharges || 0, color: '#FF5733' },
        { label: 'Company Charges', value: sumOfReport.totalCompany_charges || 0, color: '#FFC700' },
    ];

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles(currentColors).scrollContainer, { backgroundColor: currentColors.background }]}>
            <View style={styles(currentColors).container}>
                {chargesData.map((item, index) => (
                    <View key={index} style={[styles(currentColors).card, { backgroundColor: currentColors.dropdownBackground }]}>
                        <AnimatedCircularProgress
                            size={80}
                            width={4}
                            fill={(item.value / 700) * 100} // Adjust percentage
                            tintColor={item.color}
                            backgroundColor={currentColors.dropdownBorder}
                        >
                            {() => (
                                <View style={[styles(currentColors).valueContainer, { backgroundColor: item.color }]}>
                                    <Text style={styles(currentColors).value}>{item.value}</Text>
                                </View>
                            )}
                        </AnimatedCircularProgress>
                        <Text style={[styles(currentColors).label, { color: currentColors.dropdownText }]}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = (currentColors: any) => StyleSheet.create({
    scrollContainer: {
        backgroundColor: '#b9b3b3e6',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: moderateScale(10),
        paddingVertical: verticalScale(15),
        backgroundColor: currentColors.bgColorCards,
    },
    card: {
        alignItems: 'center',
        marginRight: moderateScale(5),
        padding: moderateScale(5),
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(15),
    },
    valueContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -moderateScale(20) }, { translateY: -moderateScale(20) }],
        borderRadius: moderateScale(20),
        padding: moderateScale(5),
        justifyContent: 'center',
        alignItems: 'center',
        height: moderateScale(40),
        width: moderateScale(40),
    },
    value: {
        fontSize: moderateScale(10),
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    label: {
        fontSize: moderateScale(12),
        textAlign: 'center',
        marginTop: moderateScale(5),
    },
});

export default CircularProgressComponent;
