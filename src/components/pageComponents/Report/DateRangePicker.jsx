import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { moderateScale, verticalScale } from 'react-native-size-matters';

const DateRangePicker = ({ onDateRangeChange, currentColors }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Today');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('fromDate');
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(),
    toDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const options = [
    'Today',
    'Last 7 Days',
    'This Month',
    'Last 1 Month',
    'Last 3 Months',
    'Custom'
  ];

  // Initialize with Today's date range
  useEffect(() => {
    const todayRange = calculateDateRange('Today');
    setDateRange(todayRange);
    onDateRangeChange({
      fromDate: todayRange.fromDate.toISOString().split('T')[0],
      toDate: todayRange.toDate.toISOString().split('T')[0]
    });
  }, []);

  const calculateDateRange = (option) => {
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date(today);

    switch (option) {
      case 'Today':
        fromDate = new Date(today);
        break;
      case 'Last 7 Days':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 6);
        break;
      case 'This Month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'Last 1 Month':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case 'Last 3 Months':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 3);
        break;
      default:
        return { fromDate, toDate };
    }

    return {
      fromDate,
      toDate
    };
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setIsDropdownOpen(false);

    if (option === 'Custom') {
      setShowCustomPicker(true);
      return;
    }

    const newDateRange = calculateDateRange(option);
    setDateRange(newDateRange);
    onDateRangeChange({
      fromDate: newDateRange.fromDate.toISOString().split('T')[0],
      toDate: newDateRange.toDate.toISOString().split('T')[0]
    });
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dateRange[datePickerMode];
    setShowDatePicker(false);

    setDateRange(prev => ({
      ...prev,
      [datePickerMode]: currentDate
    }));
  };

  const handleCustomDateSubmit = () => {
    onDateRangeChange({
      fromDate: dateRange.fromDate.toISOString().split('T')[0],
      toDate: dateRange.toDate.toISOString().split('T')[0]
    });
    setShowCustomPicker(false);
  };

  const openDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  // Function to close dropdown when clicking outside
  const closeDropdown = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  return (
    <View style={{ position: 'relative', width: '50%', zIndex: 1000 }}>
      <TouchableOpacity 
        style={styles(currentColors).dropdownButton} 
        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <Text style={styles(currentColors).dropdownButtonText}>{selectedOption}</Text>
        <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={moderateScale(20)} color={currentColors.dropdownText} />
      </TouchableOpacity>

      {isDropdownOpen && (
        <>
          <View style={styles(currentColors).dropdown}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles(currentColors).dropdownItem}
                onPress={() => handleOptionSelect(option)}
              >
                <Text style={styles(currentColors).dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Add overlay to detect outside clicks when dropdown is open */}
          <TouchableWithoutFeedback onPress={closeDropdown}>
            <View style={styles(currentColors).dropdownOverlay} />
          </TouchableWithoutFeedback>
        </>
      )}

      <Modal
        visible={showCustomPicker}
        transparent
        animationType="slide"
      >
        <View style={styles(currentColors).modalContainer}>
          <View style={styles(currentColors).modalContent}>
            <Text style={styles(currentColors).modalTitle}>Select Custom Date Range</Text>
            
            <View style={styles(currentColors).dateInputContainer}>
              <TouchableOpacity 
                style={styles(currentColors).dateButton}
                onPress={() => openDatePicker('fromDate')}
              >
                <Text>From Date: {dateRange.fromDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles(currentColors).dateInputContainer}>
              <TouchableOpacity 
                style={styles(currentColors).dateButton}
                onPress={() => openDatePicker('toDate')}
              >
                <Text>To Date: {dateRange.toDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={dateRange[datePickerMode]}
                mode="date"
                is24Hour={true}
                display="default"
                onChange={handleDateChange}
              />
            )}

            <View style={styles(currentColors).modalButtons}>
              <TouchableOpacity 
                style={[styles(currentColors).modalButton, styles(currentColors).cancelButton]}
                onPress={() => setShowCustomPicker(false)}
              >
                <Text style={styles(currentColors).modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles(currentColors).modalButton, styles(currentColors).applyButton]}
                onPress={handleCustomDateSubmit}
              >
                <Text style={styles(currentColors).modalButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = (currentColors) => ({
  dropdownButton: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: moderateScale(6),
    borderRadius: moderateScale(10),
    borderWidth: moderateScale(1),
    borderColor: currentColors.dropdownBorder,
  },
  dropdownButtonText: {
    color: currentColors.dropdownText,
    fontSize: moderateScale(12),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: currentColors.dropdownBackground,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
  },
  dropdownItemText: {
    fontSize: moderateScale(14),
    color: currentColors.dropdownText,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: currentColors.dropdownBackground,
    padding: moderateScale(20),
    borderRadius: moderateScale(12),
    width: '80%',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    marginBottom: verticalScale(20),
    textAlign: 'center',
  },
  dateInputContainer: {
    marginBottom: verticalScale(15),
  },
  dateButton: {
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginTop: verticalScale(5),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(20),
  },
  modalButton: {
    padding: moderateScale(10),
    borderRadius: moderateScale(8),
    width: '45%',
  },
  cancelButton: {
    backgroundColor: currentColors.dropdownBorder,
  },
  applyButton: {
    backgroundColor: currentColors.dropdownText,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: moderateScale(14),
  },
  // Add overlay style for detecting outside clicks
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '200%',  // Make overlay wider to cover whole screen
    height: '200%', // Make overlay taller to cover whole screen
    backgroundColor: 'transparent',
    zIndex: 999, // Below the dropdown (1000) but above other elements
  },
});

export default DateRangePicker;