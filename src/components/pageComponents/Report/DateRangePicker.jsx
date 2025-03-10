import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, verticalScale } from 'react-native-size-matters';

const DateRangePicker = ({ onDateRangeChange, currentColors }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Last 7 Days');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: ''
  });
  const [customDates, setCustomDates] = useState({
    fromDate: '',
    toDate: ''
  });

  const options = [
    'Today',
    'Last 7 Days',
    'This Month',
    'Last 1 Month',
    'Last 3 Months',
    'Custom'
  ];

  const calculateDateRange = (option) => {
    const today = new Date();
    let fromDate = new Date();
    let toDate = today;

    switch (option) {
      case 'Today':
        fromDate = today;
        break;
      case 'Last 7 Days':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'This Month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'Last 1 Month':
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case 'Last 3 Months':
        fromDate.setMonth(today.getMonth() - 3);
        break;
      default:
        return;
    }

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0]
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
    onDateRangeChange(newDateRange);
  };

  const handleCustomDateSubmit = () => {
    setDateRange(customDates);
    onDateRangeChange(customDates);
    setShowCustomPicker(false);
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles(currentColors).dropdownButton} 
        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <Text style={styles(currentColors).dropdownButtonText}>{selectedOption}</Text>
        <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={moderateScale(20)} color={currentColors.dropdownText} />
      </TouchableOpacity>

      {isDropdownOpen && (
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
              <Text>From Date:</Text>
              <TextInput
                style={styles(currentColors).dateInput}
                value={customDates.fromDate}
                onChangeText={(text) => setCustomDates(prev => ({ ...prev, fromDate: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles(currentColors).dateInputContainer}>
              <Text>To Date:</Text>
              <TextInput
                style={styles(currentColors).dateInput}
                value={customDates.toDate}
                onChangeText={(text) => setCustomDates(prev => ({ ...prev, toDate: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>

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
    width: '70%',
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
  dateInput: {
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    borderRadius: moderateScale(8),
    padding: moderateScale(8),
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
});

export default DateRangePicker;