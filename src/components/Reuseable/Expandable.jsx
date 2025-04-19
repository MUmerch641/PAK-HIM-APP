import React from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Easing } from "react-native";
import { moderateScale } from "react-native-size-matters";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "@/src/utils/ThemeContext";
import socketService from "../../socket"; // Adjust path as needed
import { api } from "../../../api"; // Import your API instance
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

// Function to get auth token - similar to your existing getAuthToken
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Error getting auth token",
    });
    return null;
  }
};

// Function to handle returnAmount API call
const processReturnAmount = async (id) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.get(`/appointments/returnAmmount/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data && response.data.isSuccess) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Amount returned successfully",
      });
      return true;
    } else {
      throw new Error(`Failed to process return amount: ${response.statusText}`);
    }
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error processing return amount",
    });
    throw error;
  }
};

const ExpandableDetails = ({ data, type = 'appointment', onUpdateData }) => {

  const { currentColors } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-50)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const [localData, setLocalData] = React.useState(data);

  // Function to handle API call and socket emission when tick is clicked
  const handleReturnAmount = async (id) => {
    try {
      // Use the API function instead of fetch
      const success = await processReturnAmount(id);
      
      if (success) {
        // Update local state
        const updatedData = { ...localData, returnableAmount: 0 };
        setLocalData(updatedData);
        if (onUpdateData) onUpdateData(updatedData);

        // Emit socket event to notify other clients
        const emitted = socketService.emitHimsEvent("appointments", "update", {
          appointmentId: id,
          returnableAmount: 0,
        });

        if (emitted) {
          console.log("Socket event emitted successfully for returnableAmount update");
        } else {
          console.warn("Socket event emission failed - socket not connected");
        }

      }
    } catch (error) {
      console.error("Error processing return amount:", error);
    }
  };

  const formatDOBtoYearsMonthsDays = (dob) => {
    const dobDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - dobDate.getFullYear();
    let months = today.getMonth() - dobDate.getMonth();
    let days = today.getDate() - dobDate.getDate();

    if (days < 0) {
      months -= 1;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return `${years} Y, ${months} M, ${days} D`;
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

  // Determine the name to display
  const getDisplayName = () => {
    return localData?.name || localData?.DrName || localData?.patientId?.patientName || 'Unknown';
  };

  const renderContent = () => {
    return (
      <>
      {/* Display the user's name at the top */}
      <View style={styles(currentColors).infoItem}>
      <Icon name="person-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
      <Text style={styles(currentColors).expandedText}>
      Name: {getDisplayName()}
      </Text>
      </View>

      {/* Existing content based on type */}
      {type === 'appointment' && (
      <>
      <View style={styles(currentColors).infoItem}>
        <Icon name="calendar-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Age: {formatDOBtoYearsMonthsDays(localData?.patientId?.dob || localData?.dob)}
        </Text>
      </View>
      <View style={styles(currentColors).infoItem}>
        <Icon name="time-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Time: {localData?.appointmentTime?.to || '-'}
        </Text>
      </View>
      <View style={styles(currentColors).infoItem}>
        <Icon name="cash-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Status: {localData?.feeStatus || '-'}
        </Text>
      </View>
      {localData?.returnableAmount !== undefined && Number(localData?.returnableAmount) > 0 && (
        <View style={styles(currentColors).infoItem}>
        <TouchableOpacity onPress={() => handleReturnAmount(localData?._id)}>
          <Icon name="checkmark-circle" size={moderateScale(16)} color="green" />
        </TouchableOpacity>
        <Text style={styles(currentColors).expandedText}>
          Returnable Amount: Rs {localData?.returnableAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
        </Text>
        </View>
      )}
      </>
      )}
      {type === 'report' && (
      <>
      <View style={styles(currentColors).infoItem}>
        <Icon name="pricetag-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Discount Charges: Rs: {localData?.DiscountCharges?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
        </Text>
      </View>
      <View style={styles(currentColors).infoItem}>
        <Icon name="medkit-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Doctor Charges: Rs: {localData?.DoctorCharges?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
        </Text>
      </View>
      </>
      )}
      {type === 'financial' && (
      <>
      <View style={styles(currentColors).infoItem}>
        <Icon name="pricetag-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Discount: {localData?.discount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}
        </Text>
      </View>
      <View style={styles(currentColors).infoItem}>
        <Icon name="person-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Discountent: {localData?.discountentName || '-'}
        </Text>
      </View>
      {localData?.returnableAmount !== undefined && Number(localData?.returnableAmount) > 0 && (
        <View style={styles(currentColors).infoItem}>
        <TouchableOpacity onPress={() => handleReturnAmount(localData?._id)}>
          <Icon name="checkmark-circle" size={moderateScale(16)} color="green" />
        </TouchableOpacity>
        <Text style={styles(currentColors).expandedText}>
          Returnable Amount: Rs: {localData?.returnableAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
        </Text>
        </View>
      )}
      </>
      )}
      {type === 'delete' && (
      <>
      <View style={styles(currentColors).infoItem}>
        <Icon name="cash-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Status: {localData?.feeStatus || '-'}
        </Text>
      </View>
      <View style={styles(currentColors).infoItem}>
        <Icon name="checkmark-circle-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Checked: {localData?.isChecked ? 'Yes' : 'No'}
        </Text>
      </View>
      <View style={styles(currentColors).infoItem}>
        <Icon name="person-outline" size={moderateScale(16)} color={currentColors.AppointmentColor} />
        <Text style={styles(currentColors).expandedText}>
        Deleted By: {localData?.deletedBy || '-'}
        </Text>
      </View>
      </>
      )}
      </>
    );
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