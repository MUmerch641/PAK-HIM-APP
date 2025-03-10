import { Pressable, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';

const DatePick = ({ onDateChange }) => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      onDateChange(selectedDate.toLocaleDateString()); // Pass the selected date to the parent component
    }
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Date</Text>
      <Pressable
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{date.toLocaleDateString()}</Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

export default DatePick;

const styles = StyleSheet.create({
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 40,
    justifyContent: 'center',
  },
});