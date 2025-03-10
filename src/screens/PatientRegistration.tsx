import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons
import { ActivityIndicator, RadioButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { registerPatient, getDoctors, getPatientByMRN, getPatientByCNIC, getPatientByPhonNo, getPatientByName } from '../ApiHandler/Patient';
import Toast from 'react-native-toast-message';
import SearchResultsModal from '../components/SearchResultsModal';

import { useTheme } from '../utils/ThemeContext';

export default function MedicalForm({ onClose, fetchAppointments, setLoading }: { onClose: () => void, fetchAppointments: () => void, setLoading: (loading: boolean) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    patientName: '',
    guardianName: '',
    phoneNo: '',
    gender: 'female',
    dateOfBirth: new Date(),
    cnic: '',
    healthId: '',
    city: '',
    reference: '',
    doctorName: '',
    services: '',
    appointmentDate: new Date(),
    time: new Date(),
    totalFee: '',
    payableFee: '',
    discountPercentage: '',
    discountAmount: '',
    status: 'paid',
    extra: {},
    appointment: {
      doctorId: '', // Set initial state to empty string
      services: [] as string[], // Changed to array for multiple services
      feeStatus: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: {
        from: '',
        to: ''
      },
      extra: {},
      discount: 0,
      discountInPercentage: 0,
      insuranceDetails: {
        insuranceCompanyId: '',
        insuranceId: '',
        claimStatus: 'pending'
      },
      returnableAmount: 0
    }
  });

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateType, setDateType] = useState('dob'); // 'dob' or 'appointment'
  const [showSearchResults, setShowSearchResults] = useState(false);
  interface Patient {
    mrn: number;
    patientName: string;
    guardiansName: string;
    gender: string;
    dob: string;
    phoneNumber: string;
    cnic: string;
    healthId: string;
    city: string;
    reference: string;
    extra: Record<string, unknown>;
    appointment: {
      doctorId: string;
      services: string[];
      feeStatus: string;
      appointmentDate: string;
      appointmentTime: {
        from: string;
        to: string;
      };
      extra: Record<string, unknown>;
      discount: number;
      discountInPercentage: number;
      insuranceDetails: {
        insuranceCompanyId: string;
        insuranceId: string;
        claimStatus: string;
      };
      returnableAmount: number;
    };
  }

  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  type Service = {
    _id: string;
    serviceName: string;
    fee: number;
    hospitalChargesInPercentage: number;
  };

  type Doctor = {
    _id: string;
    fullName: string;
    services: Service[];
  };

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServicesDetails, setSelectedServicesDetails] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('MRN');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Required fields for each step
  const requiredFieldsStep1 = ['patientName', 'phoneNo', 'gender', 'cnic', 'city'];
  const requiredFieldsStep2 = ['totalFee', 'payableFee', 'appointment', 'services'];

  // Handle input focus
  const handleFocus = (field: string) => {
    setFocusedInput(field);
    // Mark as touched when focused
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Handle input blur
  const handleBlur = (field: string) => {
    setFocusedInput(null);
    // Validate on blur
    validateField(field, formData[field as keyof typeof formData]);
  };

  // Validate a single field
  const validateField = (field: string, value: any) => {
    let errorMessage = '';

    // Skip validation for optional fields
    if (!requiredFieldsStep1.includes(field) && !requiredFieldsStep2.includes(field)) {
      return;
    }

    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errorMessage = 'This field is required';
    } else if (field === 'phoneNo' && !/^03\d{9}$/.test(value)) {
      errorMessage = 'Enter a valid phone number starting with 03 and 11 digits long';
    } else if (field === 'cnic' && !/^\d{13}$/.test(value.replace(/[^0-9]/g, ''))) {
      errorMessage = 'Enter a valid 13 digit CNIC';
    }

    setErrors(prev => ({ ...prev, [field]: errorMessage }));
    return errorMessage === '';
  };

  // Validate all fields for current step
  const validateStep = (step: number) => {
    const fieldsToValidate = step === 1 ? requiredFieldsStep1 : requiredFieldsStep2;
    let isValid = true;
    const newErrors = { ...errors };
    const newTouched = { ...touched };

    fieldsToValidate.forEach(field => {
      newTouched[field] = true;

      // Handle special case for formData.appointment.services
      if (field === 'services' && step === 2) {
        if (formData.appointment.services.length === 0) {
          newErrors[field] = 'Please select at least one service';
          isValid = false;
        } else {
          newErrors[field] = '';
        }
        return;
      }

      const value = formData[field as keyof typeof formData];
      if (!validateField(field, value)) {
        isValid = false;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);
    return isValid;
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await getDoctors({});
        const doctorsList: Doctor[] = response.data;
        setDoctors(doctorsList);
        if (doctorsList.length > 0) {
          setServices(doctorsList[0].services);
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    if (doctors.length > 0) {
      const initialDoctor = doctors[0];
      setServices(initialDoctor.services);
      updateFormData('doctorName', initialDoctor.fullName);
      updateFormData('appointment', {
        ...formData.appointment,
        doctorId: initialDoctor._id,
      });
    }
  }, [doctors]);

  interface PatientResponse {
    isSuccess: boolean;
    data: {
      mrn: string;
      patientName: string;
      guardiansName: string;
      gender: string;
      dob: string;
      phoneNumber: string;
      cnic: string;
      healthId: string;
      city: string;
      reference: string;
      extra: Record<string, unknown>;
      appointment: {
        doctorId: string;
        services: string[];
        feeStatus: string;
        appointmentDate: string;
        appointmentTime: {
          from: string;
          to: string;
        };
        extra: Record<string, unknown>;
        discount: number;
        discountInPercentage: number;
        insuranceDetails: {
          insuranceCompanyId: string;
          insuranceId: string;
          claimStatus: string;
        };
        returnableAmount: number;
      };
    };
    message?: string;
  }

  const handleSearchInputChange = (value: string) => {
    if (value.trim() === '') {
      setSearchQuery('');
      setShowSearchResults(false);
      setSearchResults([]);
      setFormData({
        ...formData,
        patientName: '',
        guardianName: '',
        phoneNo: '',
        gender: '',
        dateOfBirth: new Date(),
        cnic: '',
        healthId: '',
        city: '',
        reference: '',
        doctorName: '',
        services: '',
        appointmentDate: new Date(),
        time: new Date(),
        totalFee: '',
        payableFee: '',
        discountPercentage: '',
        discountAmount: '',
        status: 'paid',
        extra: {},
        appointment: {
          doctorId: '',
          services: [],
          feeStatus: '',
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: {
            from: '',
            to: ''
          },
          extra: {},
          discount: 0,
          discountInPercentage: 0,
          insuranceDetails: {
            insuranceCompanyId: '',
            insuranceId: '',
            claimStatus: 'pending'
          },
          returnableAmount: 0
        }
      })
      return;
    }
    setSearchQuery(value);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    if (value.trim().length > 0) {
      const timeout = setTimeout(() => {
        performSearch(value);
      }, 800);
      setSearchTimeout(timeout);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length > 0) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
      performSearch(searchQuery);
    }
  };

  const performSearch = async (value: string) => {
    if (value.trim().length === 0 || isSearching) return;
    setIsSearching(true);
    try {
      let response: PatientResponse | null = null;
      switch (searchType) {
        case 'MRN':
          response = await getPatientByMRN(value);
          break;
        case 'CNIC':
          response = await getPatientByCNIC(value);
          break;
        case 'Mobile No':
          response = await getPatientByPhonNo(value);
          break;
        case 'Name':
          response = await getPatientByName(value);
          break;
        default:
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Invalid search type',
          });
          setIsSearching(false);
          return;
      }

      if (response?.isSuccess && response.data) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          setSearchResults(response.data);
          setShowSearchResults(true);
        } else {
          // Single result
          updateFormWithPatientData(response.data);
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Patient details found',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response?.message || 'No patient details found',
        });
      }
    } catch (error: any) {
      console.error("Error fetching patient details:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to load patient details',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const updateFormWithPatientData = (patientData: any) => {
    setFormData({
      ...formData,
      patientName: patientData.patientName,
      guardianName: patientData.guardiansName,
      phoneNo: patientData.phoneNumber,
      gender: patientData.gender,
      dateOfBirth: new Date(patientData.dob),
      cnic: patientData.cnic,
      healthId: patientData.healthId,
      city: patientData.city,
      reference: patientData.reference,
      extra: patientData.extra || {},
      appointment: {
        ...formData.appointment,
        ...(patientData.appointment && {
          doctorId: patientData.appointment.doctorId,
          services: patientData.appointment.services,
          feeStatus: patientData.appointment.feeStatus,
          appointmentTime: patientData.appointment.appointmentTime,
          discount: patientData.appointment.discount,
          discountInPercentage: patientData.appointment.discountInPercentage,
          insuranceDetails: patientData.appointment.insuranceDetails,
          returnableAmount: patientData.appointment.returnableAmount,
        }),
      },
    });
  };

  const updateFormData = (field: string, value: any, callback?: () => void) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, [field]: value };
      if (callback) callback();
      return updatedFormData;
    });

    // Validate field if it's already been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (dateType === 'dob') {
        updateFormData('dateOfBirth', selectedDate);
      } else {
        updateFormData('appointmentDate', selectedDate);
      }
    }
  };

  const handleTimeChange: (event: any, selectedTime?: Date) => void = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      updateFormData('time', selectedTime);
    }
  };

  const showDatePickerModal = (type: 'dob' | 'appointment') => {
    setDateType(type);
    setShowDatePicker(true);
  };

  const handleNext = () => {
    const isValid = validateStep(1);

    if (isValid) {
      setCurrentStep(2);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill all required fields correctly',
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate step 2
    const isValid = validateStep(2);

    if (!isValid) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill all required fields correctly',
      });
      return;
    }

    setIsSubmitting(true);

    const requestBody = {
      mrn: 0,
      patientName: formData.patientName,
      guardiansName: formData.guardianName,
      gender: formData.gender,
      dob: formData.dateOfBirth.toISOString().split('T')[0],
      phoneNumber: formData.phoneNo, // Fixed Typo
      cnic: formData.cnic,
      helthId: formData.healthId,
      city: formData.city,
      reference: formData.reference,
      extra: formData.extra,
      appointment: {
        doctorId: formData.appointment.doctorId,
        services: formData.appointment.services, // Now sending array of services
        feeStatus: formData.status,
        appointmentDate: formData.appointmentDate.toISOString().split('T')[0],
        appointmentTime: {
          from: formData.time.toISOString().split('T')[1].split('.')[0],
          to: formData.time.toISOString().split('T')[1].split('.')[0], // Assuming 'to' time is set elsewhere
        },
        extra: formData.appointment.extra,
        discount: parseFloat(formData.discountAmount) || 0,
        discountInPercentage: parseFloat(formData.discountPercentage) || 0,
        insuranceDetails: formData.appointment.insuranceDetails,
        returnableAmount: formData.status === 'paid' ? 
          (formData.appointment.returnableAmount || 0) : 0
      }
    };

    try {
      setLoading(true);
      const response = await registerPatient(requestBody);
      if (response.isSuccess) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Patient registered successfully',
        });
        fetchAppointments();
        onClose();
      }

    }
    catch (error) {
      console.error('API Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to register patient',
      });
    } finally {
      setIsSubmitting(false);
      setLoading(false)

    }
  };

  const handleDoctorChange = (doctorId: string) => {
    if (doctorId === '') {
      updateFormData('appointment', {
        ...formData.appointment,
        doctorId: '',
      });
      setServices([]);
      return;
    }

    const selectedDoctor = doctors.find((doctor) => doctor._id === doctorId);
    if (selectedDoctor) {
      setServices(selectedDoctor.services);
      updateFormData('doctorName', selectedDoctor.fullName, () => {
        updateFormData('appointment', {
          ...formData.appointment,
          doctorId: selectedDoctor._id,
        }, () => {
        });
      });
    }
  };

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === '') return;

    const selectedService = services.find(service => service._id === serviceId);
    if (!selectedService) return;

    // Check if service is already selected
    if (!formData.appointment.services.includes(serviceId)) {
      updateFormData('appointment', {
        ...formData.appointment,
        services: [...formData.appointment.services, serviceId],
      });
      setSelectedServicesDetails([...selectedServicesDetails, selectedService]);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    updateFormData('appointment', {
      ...formData.appointment,
      services: formData.appointment.services.filter(id => id !== serviceId),
    });
    setSelectedServicesDetails(selectedServicesDetails.filter(service => service._id !== serviceId));
  };


  const { currentColors } = useTheme();
  // Get border color based on field state
  const getInputStyle = (field: string) => {
    if (focusedInput === field) {
      return { ...styles(currentColors).input, borderColor: '#66B2FF', borderWidth: 1 };
    } else if (errors[field] && touched[field]) {
      return { ...styles(currentColors).input, borderColor: '#FF3B30', borderWidth: 1 };
    }
    return styles(currentColors).input;
  };

  const renderPatientDetails = () => (
    <View style={styles(currentColors).section}>
      <Text style={styles(currentColors).label}>Patient Name<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <TextInput
        style={getInputStyle('patientName')}
        placeholder="Enter Patient Name"
        value={formData.patientName}
        onChangeText={(text) => updateFormData('patientName', text)}
        onFocus={() => handleFocus('patientName')}
        onBlur={() => handleBlur('patientName')}
      />
      {errors.patientName && touched.patientName && (
        <Text style={styles(currentColors).errorText}>{errors.patientName}</Text>
      )}

      <Text style={styles(currentColors).label}>Guardian Name</Text>
      <TextInput
        style={getInputStyle('guardianName')}
        placeholder="Enter Guardian Name"
        value={formData.guardianName}
        onChangeText={(text) => updateFormData('guardianName', text)}
        onFocus={() => handleFocus('guardianName')}
        onBlur={() => handleBlur('guardianName')}
      />

      <Text style={styles(currentColors).label}>Phone No<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <TextInput
        style={getInputStyle('phoneNo')}
        placeholder="Enter Patient Phone No"
        value={formData.phoneNo}
        onChangeText={(text) => updateFormData('phoneNo', text)}
        keyboardType="phone-pad"
        onFocus={() => handleFocus('phoneNo')}
        onBlur={() => handleBlur('phoneNo')}
      />
      {errors.phoneNo && touched.phoneNo && (
        <Text style={styles(currentColors).errorText}>{errors.phoneNo}</Text>
      )}

      <Text style={styles(currentColors).label}>Gender<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <View style={styles(currentColors).radioGroup}>
        <RadioButton.Group
          onValueChange={(value) => updateFormData('gender', value)}
          value={formData.gender}
        >
          <View style={styles(currentColors).radioButton}>
            <RadioButton value="Male" />
            <Text style={styles(currentColors).label}>Male</Text>
          </View>
          <View style={styles(currentColors).radioButton}>
            <RadioButton value="Female" />
            <Text style={styles(currentColors).label}>Female</Text>
          </View>
          <View style={styles(currentColors).radioButton}>
            <RadioButton value="other" />
            <Text style={styles(currentColors).label}>Other</Text>
          </View>
        </RadioButton.Group>
      </View>

      <Text style={styles(currentColors).label}>Date of Birth</Text>
      <TouchableOpacity
        style={getInputStyle('dateOfBirth')}
        onPress={() => showDatePickerModal('dob')}
        onBlur={() => handleBlur('dateOfBirth')}
      >
        <Text style={styles(currentColors).label}>{formData.dateOfBirth.toLocaleDateString()}</Text>
      </TouchableOpacity>

      <Text style={styles(currentColors).label}>CNIC<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <TextInput
        style={getInputStyle('cnic')}
        placeholder="Enter Patient's CNIC"
        value={formData.cnic}
        onChangeText={(text) => updateFormData('cnic', text)}
        onFocus={() => handleFocus('cnic')}
        onBlur={() => handleBlur('cnic')}
      />
      {errors.cnic && touched.cnic && (
        <Text style={styles(currentColors).errorText}>{errors.cnic}</Text>
      )}

      <Text style={styles(currentColors).label}>Health Id (Optional)</Text>
      <TextInput
        style={getInputStyle('healthId')}
        placeholder="Enter Patient's Health ID"
        value={formData.healthId}
        onChangeText={(text) => updateFormData('healthId', text)}
        onFocus={() => handleFocus('healthId')}
        onBlur={() => handleBlur('healthId')}
      />

      <Text style={styles(currentColors).label}>City<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <TextInput
        style={getInputStyle('city')}
        placeholder="Enter Your City Name"
        value={formData.city}
        onChangeText={(text) => updateFormData('city', text)}
        onFocus={() => handleFocus('city')}
        onBlur={() => handleBlur('city')}
      />
      {errors.city && touched.city && (
        <Text style={styles(currentColors).errorText}>{errors.city}</Text>
      )}

      <Text style={styles(currentColors).label}>Reference (Optional)</Text>
      <TextInput
        style={getInputStyle('reference')}
        placeholder="Enter Patient's Reference"
        value={formData.reference}
        onChangeText={(text) => updateFormData('reference', text)}
        onFocus={() => handleFocus('reference')}
        onBlur={() => handleBlur('reference')}
      />

      <View style={styles(currentColors).buttonContainer}>
        <TouchableOpacity style={styles(currentColors).closeButton} onPress={onClose}>
          <Text style={styles(currentColors).buttonText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles(currentColors).button} onPress={handleNext}>
          <Text style={styles(currentColors).buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAppointmentDetails = () => (
    <View style={styles(currentColors).section}>
      <Text style={styles(currentColors).label}>Doctor Name</Text>
      <View style={focusedInput === 'doctorName'
        ? { ...styles(currentColors).pickerContainer, borderColor: currentColors.dropdownBorder, borderWidth: 1 }
        : styles(currentColors).pickerContainer}>
        <Picker
          selectedValue={formData.appointment.doctorId}
          onValueChange={(value) => handleDoctorChange(value)}
          style={styles(currentColors).picker}
          onFocus={() => setFocusedInput('doctorName')}
        >
          <Picker.Item label="Select Doctor" value="" />
          {doctors.map((doctor) => (
            <Picker.Item key={doctor._id} label={doctor.fullName} value={doctor._id} />
          ))}
        </Picker>
      </View>

      <Text style={styles(currentColors).label}>Services<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <View style={focusedInput === 'services'
        ? { ...styles(currentColors).pickerContainer, borderColor: currentColors.dropdownBorder, borderWidth: 1 }
        : errors.services && touched.services
          ? { ...styles(currentColors).pickerContainer, borderColor: '#FF3B30', borderWidth: 1 }
          : styles(currentColors).pickerContainer}>
        <Picker
          selectedValue=""
          onValueChange={handleServiceChange}
          style={styles(currentColors).picker}
          onFocus={() => {
            setFocusedInput('services');
            setTouched({ ...touched, services: true });
          }}
        >
          <Picker.Item label="Select Service" value="" />
          {services.map((service) => (
            <Picker.Item key={service._id} label={service.serviceName} value={service._id} />
          ))}
        </Picker>
      </View>
      {errors.services && touched.services && (
        <Text style={styles(currentColors).errorText}>{errors.services}</Text>
      )}

      {/* Selected Services List */}
      {selectedServicesDetails.length > 0 && (
        <View style={styles(currentColors).selectedServicesContainer}>
          <Text style={styles(currentColors).selectedServicesTitle}>Selected Services:</Text>
          {selectedServicesDetails.map((service) => (
            <View key={service._id} style={styles(currentColors).selectedServiceItem}>
              <Text style={styles(currentColors).selectedServiceText}>{service.serviceName}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveService(service._id)}
                style={styles(currentColors).removeServiceButton}
              >
                <Text style={styles(currentColors).removeServiceText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles(currentColors).label}>Appointment Date</Text>
      <TouchableOpacity
        style={getInputStyle('appointmentDate')}
        onPress={() => showDatePickerModal('appointment')}
      >
        <Text style={styles(currentColors).label}>{formData.appointmentDate.toLocaleDateString()}</Text>
      </TouchableOpacity>

      <Text style={styles(currentColors).label}>Time</Text>
      <TouchableOpacity
        style={getInputStyle('time')}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles(currentColors).label}>{formData.time.toLocaleTimeString()}</Text>
      </TouchableOpacity>

      <Text style={styles(currentColors).label}>Total Fee<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <TextInput
        style={{...getInputStyle('totalFee'), backgroundColor: currentColors.dropdownBorder + '40'}}
        placeholder="0000"
        value={formData.totalFee}
        editable={false}
        keyboardType="numeric"
      />
      {errors.totalFee && touched.totalFee && (
        <Text style={styles(currentColors).errorText}>{errors.totalFee}</Text>
      )}

      <Text style={styles(currentColors).label}>Discount %</Text>
      <TextInput
        style={getInputStyle('discountPercentage')}
        placeholder="0"
        value={formData.discountPercentage}
        onChangeText={(text) => updateFormData('discountPercentage', text)}
        keyboardType="numeric"
        onFocus={() => handleFocus('discountPercentage')}
        onBlur={() => handleBlur('discountPercentage')}
      />

      <Text style={styles(currentColors).label}>Discount Rs</Text>
      <TextInput
        style={getInputStyle('discountAmount')}
        placeholder="0000"
        value={formData.discountAmount}
        onChangeText={(text) => updateFormData('discountAmount', text)}
        keyboardType="numeric"
        onFocus={() => handleFocus('discountAmount')}
        onBlur={() => handleBlur('discountAmount')}
      />

      <Text style={styles(currentColors).label}>Payable Fee<Text style={styles(currentColors).requiredStar}>*</Text></Text>
      <TextInput
        style={{...getInputStyle('payableFee'), backgroundColor: currentColors.dropdownBorder + '40'}}
        placeholder="0000"
        value={formData.payableFee}
        editable={false}
        keyboardType="numeric"
      />
      {errors.payableFee && touched.payableFee && (
        <Text style={styles(currentColors).errorText}>{errors.payableFee}</Text>
      )}

      <Text style={styles(currentColors).label}>Status</Text>
      <View style={focusedInput === 'status'
        ? { ...styles(currentColors).pickerContainer, borderColor: currentColors.dropdownBorder, borderWidth: 1 }
        : styles(currentColors).pickerContainer}>
        <Picker
          selectedValue={formData.status}
          onValueChange={(value) => updateFormData('status', value)}
          style={styles(currentColors).picker}
          onFocus={() => setFocusedInput('status')}
        >
          <Picker.Item label="paid" value="paid" />
          <Picker.Item label="unpaid" value="unpaid" />
          <Picker.Item label="Pending" value="Pending" />
        </Picker>
      </View>

      {/* Show Return Amount field when status is 'paid' */}
      {formData.status === 'paid' && (
        <>
          <Text style={styles(currentColors).label}>Return Amount</Text>
          <TextInput
            style={getInputStyle('returnableAmount')}
            placeholder="0000"
            value={formData.appointment.returnableAmount.toString()}
            onChangeText={(text) => updateFormData('appointment', {
              ...formData.appointment,
              returnableAmount: parseFloat(text) || 0
            })}
            keyboardType="numeric"
            onFocus={() => handleFocus('returnableAmount')}
            onBlur={() => handleBlur('returnableAmount')}
          />
        </>
      )}

      <View style={styles(currentColors).buttonContainer}>
        <TouchableOpacity style={styles(currentColors).backButton} onPress={handleBack}>
          <Text style={styles(currentColors).buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles(currentColors).button} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles(currentColors).buttonText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const total = selectedServicesDetails.reduce((sum, service) => sum + service.fee, 0);
    updateFormData('totalFee', total.toString());
  }, [selectedServicesDetails]);

  useEffect(() => {
    const total = parseFloat(formData.totalFee) || 0;
    const discountPercent = parseFloat(formData.discountPercentage) || 0;
    const discountAmount = parseFloat(formData.discountAmount) || 0;
    
    let discount = discountAmount;
    if (discountPercent > 0) {
      discount = (total * discountPercent) / 100;
      updateFormData('discountAmount', discount.toString());
    }
    
    const payable = Math.max(0, total - discount);
    updateFormData('payableFee', payable.toString());
  }, [formData.totalFee, formData.discountPercentage, formData.discountAmount]);

  return (
    <ScrollView style={styles(currentColors).container}>
      <View style={styles(currentColors).header}>
        <View style={{
           flexDirection: 'row',
           justifyContent: 'center',
           alignItems: 'center',
           gap: 10,
          //  width: '100%',
        }}>

        <TouchableOpacity
          onPress={() => onClose()}
        >
          <Ionicons name="arrow-back" size={24} color={currentColors.headerText} />
        </TouchableOpacity>
        <Text style={styles(currentColors).headerTitle}>Patient Registration</Text>
            </View>

        <TouchableOpacity>
          <Ionicons name="heart-outline" size={24} color={currentColors.headerText} />
        </TouchableOpacity>
      </View>

      <View style={styles(currentColors).searchContainer}>
        <View style={styles(currentColors).searchTypeContainer}>
          <Picker
            selectedValue={searchType}
            onValueChange={(itemValue) => setSearchType(itemValue)}
            style={styles(currentColors).searchPicker}
          >
            <Picker.Item label="MRN" value="MRN" />
            <Picker.Item label="Name" value="Name" />
            <Picker.Item label="CNIC" value="CNIC" />
            <Picker.Item label="Mobile No" value="Mobile No" />
          </Picker>
        </View>
        <View style={styles(currentColors).searchInputContainer}>
          <Ionicons name="search" size={20} color={currentColors.AppointmentColor} />
          <TextInput
            placeholder="Search patient records..."
            placeholderTextColor={currentColors.AppointmentColor}
            style={styles(currentColors).searchInput}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles(currentColors).clearButton}
            >
              <Ionicons name="close-circle" size={18} color={currentColors.dropdownText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {currentStep === 1 ? renderPatientDetails() : renderAppointmentDetails()}

      {showDatePicker && (
        <DateTimePicker
          value={dateType === 'dob' ? formData.dateOfBirth : formData.appointmentDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={formData.time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      <SearchResultsModal
        visible={showSearchResults}
        results={searchResults}
        onClose={() => setShowSearchResults(false)}
        onSelect={(selectedPatient) => {
          updateFormWithPatientData(selectedPatient);
        }}
      />
    </ScrollView>
  );
}

const styles = (currentColors: {
  background: string;
  headerBackground: string;
  headerText: string;
  filterBackground: string;
  dropdownBorder: string;
  dropdownBackground: string;
  dropdownText: string;
  AppointmentColor: string;
  activeTabBackground: string;
  activeTabText: string;
  tableHeaderBackground: string;
}) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: currentColors.headerBackground,
    position: 'sticky',
    top: 0,
    zIndex: 10000,
    width: '100%'
  },
  headerTitle: {
    color: currentColors.headerText,
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: currentColors.filterBackground,
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
    alignItems: 'center',
  },
  searchTypeContainer: {
    width: 110,
    height: 42,
    backgroundColor: currentColors.dropdownBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: currentColors.dropdownBackground,
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    height: 42,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 14,
    color: currentColors.AppointmentColor,
  },
  clearButton: {
    padding: 4,
  },
  section: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: currentColors.AppointmentColor,
  },
  input: {
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: currentColors.dropdownBackground,
    color: currentColors.AppointmentColor,
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: currentColors.dropdownBackground,
  },
  picker: {
    height: 50,
    color: currentColors.AppointmentColor,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    backgroundColor: currentColors.activeTabBackground,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: currentColors.activeTabBackground,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  buttonText: {
    color: currentColors.activeTabText,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedServicesContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 8,
    backgroundColor: currentColors.dropdownBackground,
    borderRadius: 8,
  },
  selectedServicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: currentColors.AppointmentColor,
  },
  selectedServiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: currentColors.dropdownBackground,
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
  },
  selectedServiceText: {
    flex: 1,
    fontSize: 14,
    color: currentColors.dropdownText,
  },
  removeServiceButton: {
    padding: 4,
    marginLeft: 8,
  },
  removeServiceText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  searchPicker: {
    width: 120,
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
    borderStyle: 'solid',
    color: currentColors.AppointmentColor,
  },
  requiredStar: {
    color: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
  },
});