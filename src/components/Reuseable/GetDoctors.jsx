import { View, Text, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getDoctors } from '@/src/ApiHandler/Patient';
import { Picker } from '@react-native-picker/picker';

const GetDoctors = ({ onDoctorChange }) => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await getDoctors({});
        const doctorsList = response.data;
        setDoctors(doctorsList);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };

    fetchDoctors();
  }, []);

  const handleDoctorChange = (value) => {
    setSelectedDoctor(value);
    onDoctorChange(value); // Call the passed callback with the selected doctor ID
  };

  return (
    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={selectedDoctor}
        onValueChange={(value) => handleDoctorChange(value)}
        style={styles.picker}
      >
        <Picker.Item label="Select Doctor" value="" />
        {doctors.map((doctor) => (
          <Picker.Item key={doctor._id} label={doctor.fullName} value={doctor._id} />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  picker: {
    height: 50,
  },
});

export default GetDoctors; 