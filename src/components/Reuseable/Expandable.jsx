import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Easing } from "react-native";
import { moderateScale } from "react-native-size-matters";
import Icon from "react-native-vector-icons/Ionicons";

import { useTheme } from "@/src/utils/ThemeContext";

const ExpandableDetails = ({ data, type = 'appointment' }) => {

  const { currentColors } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-50)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const formatDOBtoMonthsAndDays = (dob) => {
    // Parse the DOB string
    const dobDate = new Date(dob);
    const today = new Date();

    // Calculate the time difference in milliseconds
    const diffTime = Math.abs(today - dobDate);

    // Convert to days
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate months and remaining days
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;

    return `${months} M, ${days} D`;
  };

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.back(1.5)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };
  }, [slideAnim, opacityAnim]);

  const renderContent = () => {
    if (type === 'appointment') {
      return (
        <>
          <View style={styles(currentColors).infoItem}>
            <Icon name="calendar-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Age: {formatDOBtoMonthsAndDays(data?.patientId?.dob || data?.dob)}
            </Text>
          </View>
          <View style={styles(currentColors).infoItem}>
            <Icon name="time-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Time: {data?.appointmentTime?.to}
            </Text>
          </View>
          <View style={styles(currentColors).infoItem}>
            <Icon name="cash-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Status: {data?.feeStatus}
            </Text>
          </View>
        </>
      );
    } else if (type === 'report') {
      return (
        <>
          <View style={styles(currentColors).infoItem}>
            <Icon name="pricetag-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Discount Charges: ${data?.DiscountCharges?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles(currentColors).infoItem}>
            <Icon name="medkit-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Doctor Charges: ${data?.DoctorCharges?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </>
      );
    } else if (type === 'financial') {
      return (
        <>
          <View style={styles(currentColors).infoItem}>
            <Icon name="pricetag-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Discount: {data?.discount || '-'}
            </Text>
          </View>
          <View style={styles(currentColors).infoItem}>
            <Icon name="person-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Discountent: {data?.discountentName || '-'}
            </Text>
          </View>
        </>
      );
    } else if (type === 'delete') {
      return (
        <>
          <View style={styles(currentColors).infoItem}>
            <Icon name="cash-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Status: {data?.feeStatus || '-'}
            </Text>
          </View>
          <View style={styles(currentColors).infoItem}>
            <Icon name="checkmark-circle-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Checked: {data?.isChecked ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles(currentColors).infoItem}>
            <Icon name="person-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
            <Text style={styles(currentColors).expandedText}>
              Deleted By: {data?.deletedBy || '-'}
            </Text>
          </View>
        </>
      );
    }
  };

  return (
    <Animated.View 
      style={[
        styles(currentColors).expandedRow,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
};

const styles = (currentColors) => StyleSheet.create({
  expandedRow: {
    padding: moderateScale(15),
    backgroundColor: currentColors.backgroundColorExpanded,
    borderRadius: moderateScale(10),
    marginVertical: moderateScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: moderateScale(10),
    zIndex: 900,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: moderateScale(10),
  },
  expandedText: {
    fontSize: moderateScale(14),
    color: currentColors.AppointmentColor,
    marginLeft: moderateScale(10),
    fontWeight: "500",
  },
});

export default ExpandableDetails;