import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';

import { registerPatient, updatePatient, addAppointment } from '../ApiHandler/Patient';
import SearchResultsModal from '../components/SearchResultsModal';
import socketService from '../socket';
import { useTheme } from '../utils/ThemeContext';
import DoctorSelectionScreen from './DoctorSelectionScreen';
import SlotSelectionScreen from './SlotSelectionScreen';

import { getStyles } from '../components/pageComponents/PatientRegistration/styles';
import PatientDetailsStep from '../components/pageComponents/PatientRegistration/PatientDetailsStep';
import AppointmentDetailsStep from '../components/pageComponents/PatientRegistration/AppointmentDetailsStep';
import SearchPatientBar from '../components/pageComponents/PatientRegistration/SearchPatientBar';
import { useDoctors } from '../components/pageComponents/PatientRegistration/hooks/useDoctors';
import { useInsurance } from '../components/pageComponents/PatientRegistration/hooks/useInsurance';
import { usePatientSearch } from '../components/pageComponents/PatientRegistration/hooks/usePatientSearch';
import { Service } from '../ApiHandler/Appointment';
import { InsuranceService } from '../types/PatientRegistration';

export default function MedicalForm({
  onClose,
  fetchAppointments,
  setLoading,
  appointmentMode,
}: { onClose: () => void; fetchAppointments: () => void; setLoading: (loading: boolean) => void; appointmentMode?: "manual" | "slot" }) {
  const { currentColors } = useTheme();
  const styles = useMemo(() => getStyles(currentColors), [currentColors]);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Load last selected doctor from AsyncStorage on mount
  useEffect(() => {
    if (appointmentMode === "slot") {
      AsyncStorage.getItem("lastSelectedDoctor")
        .then((data) => {
          if (data) setSelectedDoctor(JSON.parse(data));
        })
        .catch(() => { });
    }
  }, [appointmentMode]);

  const saveSelectedDoctor = useCallback(async (doctor: any) => {
    setSelectedDoctor(doctor);
    try {
      await AsyncStorage.setItem("lastSelectedDoctor", JSON.stringify(doctor));
    } catch { }
  }, []);
  const [formData, setFormData] = useState({
    patientName: "",
    guardianName: "",
    phoneNo: "",
    gender: "female",
    dateOfBirth: new Date(),
    cnic: "",
    healthId: "",
    city: "",
    reference: "",
    doctorName: "",
    services: "",
    appointmentDate: new Date(),
    time: new Date(),
    totalFee: "",
    payableFee: "",
    discountPercentage: "",
    discountAmount: "",
    status: "paid",
    extra: {},
    appointment: {
      doctorId: "",
      patientId: "",
      services: [] as string[],
      feeStatus: "",
      appointmentDate: new Date().toISOString().split("T")[0],
      appointmentTime: { from: "", to: "" },
      extra: {},
      discount: 0,
      discountInPercentage: 0,
      insuranceDetails: { insuranceCompanyId: "", insuranceId: "" },
      returnableAmount: 0,
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateType, setDateType] = useState("dob");
  const [socketConnected, setSocketConnected] = useState(socketService.isConnected());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState<(Service | InsuranceService)[]>([]);
  const [selectedServicesDetails, setSelectedServicesDetails] = useState<(Service | InsuranceService)[]>([]);

  // Custom Hooks
  const { doctors, isDoctorLocked } = useDoctors(formData, setFormData, setServices);
  const { insuranceCompanies, isLoadingServices } = useInsurance(formData, setServices);

  const resetPatientData = () => {
    setFormData((prev) => ({
      ...prev,
      patientName: "",
      guardianName: "",
      phoneNo: "",
      gender: "female",
      dateOfBirth: new Date(),
      cnic: "",
      healthId: "",
      city: "",
      reference: "",
      appointment: { ...prev.appointment, patientId: "" },
    }));
  };

  const updateFormWithPatientData = (patientData: any) => {
    setFormData((prev) => ({
      ...prev,
      patientName: patientData.patientName,
      guardianName: patientData.guardiansName || "",
      phoneNo: patientData.phoneNumber || patientData.phonNumber || "",
      gender: patientData.gender || "female",
      dateOfBirth: patientData.dob ? new Date(patientData.dob) : new Date(),
      cnic: patientData.cnic || "",
      healthId: patientData.healthId || "",
      city: patientData.city || "",
      reference: patientData.reference || "",
      extra: patientData.extra || {},
      appointment: {
        ...prev.appointment,
        patientId: patientData._id || "",
        ...(patientData.appointment && {
          doctorId: patientData.appointment.doctorId || prev.appointment.doctorId,
          services: patientData.appointment.services || [],
          feeStatus: patientData.appointment.feeStatus || prev.status,
          appointmentTime: patientData.appointment.appointmentTime || prev.appointment.appointmentTime,
          discount: patientData.appointment.discount || 0,
          discountInPercentage: patientData.appointment.discountInPercentage || 0,
          insuranceDetails: patientData.appointment.insuranceDetails || prev.appointment.insuranceDetails,
          returnableAmount: patientData.appointment.returnableAmount || 0,
        }),
      },
    }));
  };

  const {
    searchType,
    setSearchType,
    searchQuery,
    setSearchQuery,
    handleSearchInputChange,
    handleSearchSubmit,
    showSearchResults,
    setShowSearchResults,
    searchResults,
    existingPatient,
    setExistingPatient,
  } = usePatientSearch(updateFormWithPatientData, resetPatientData, (step: number) => {
    if (step === 2 && appointmentMode === "slot") {
      if (selectedDoctor) {
        setCurrentStep(3); // Doctor already saved, skip to slot
      } else {
        setCurrentStep(2);
      }
    } else if (step === 1) {
      setCurrentStep(1);
    } else {
      setCurrentStep(step);
    }
  });

  const requiredFieldsStep1 = ["patientName", "phoneNo", "gender", "city"];
  const requiredFieldsStep2 = ["totalFee", "payableFee", "appointment", "services", "doctorName"];

  const handleFocus = (field: string) => {
    setFocusedInput(field);
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: string) => {
    setFocusedInput(null);
    validateField(field, formData[field as keyof typeof formData]);
  };

  const validateField = (field: string, value: any) => {
    let errorMessage = "";
    if (!requiredFieldsStep1.includes(field) && !requiredFieldsStep2.includes(field)) return true;

    if (!value || (typeof value === "string" && value.trim() === "")) {
      errorMessage = "This field is required";
    } else if (field === "phoneNo" && !/^03\d{9}$/.test(value)) {
      errorMessage = "Enter a valid phone number starting with 03 and 11 digits long";
    }

    setErrors((prev) => ({ ...prev, [field]: errorMessage }));
    return errorMessage === "";
  };

  const validateStep = (step: number) => {
    const fieldsToValidate = step === 1 ? requiredFieldsStep1 : requiredFieldsStep2;
    let isValid = true;
    const newErrors = { ...errors };
    const newTouched = { ...touched };

    fieldsToValidate.forEach((field) => {
      newTouched[field] = true;
      if (field === "services" && step === 2) {
        if (formData.appointment.services.length === 0) {
          newErrors[field] = "Please select at least one service";
          isValid = false;
        } else {
          newErrors[field] = "";
        }
        return;
      }
      const value = formData[field as keyof typeof formData];
      if (!validateField(field, value)) isValid = false;
    });

    if (step === 2 && formData.status === "insurance") {
      newTouched.insuranceCompanyId = true;
      if (!formData.appointment.insuranceDetails.insuranceCompanyId) {
        newErrors.insuranceCompanyId = "Please select an insurance company";
        isValid = false;
      } else {
        newErrors.insuranceCompanyId = "";
      }

      newTouched.insuranceId = true;
      if (!formData.appointment.insuranceDetails.insuranceId) {
        newErrors.insuranceId = "Please enter an insurance ID";
        isValid = false;
      } else {
        newErrors.insuranceId = "";
      }
    }

    setTouched(newTouched);
    setErrors(newErrors);
    return isValid;
  };

  const updateFormData = (field: string, value: any, callback?: () => void) => {
    setFormData((prev: any) => {
      let updatedFormData = { ...prev };

      // Handle nested appointment state separately if passed a specific path later, but default top-level
      if (field === "appointment") {
        updatedFormData.appointment = { ...prev.appointment, ...value };
      } else {
        updatedFormData[field] = value;
      }

      return updatedFormData;
    });

    if (touched[field]) validateField(field, value);
    if (callback) callback();
  };

  const handleNext = () => {
    if (validateStep(1)) {
      if (appointmentMode === "slot" && selectedDoctor) {
        // Doctor already selected previously — skip to Step 3
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    } else {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields correctly" });
    }
  };

  const formatTimeTo12Hour = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields correctly" });
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      let response;
      const formattedTime = formatTimeTo12Hour(formData.time);

      const appointmentData = {
        doctorId: formData.appointment.doctorId,
        patientId: formData.appointment.patientId,
        services: formData.appointment.services,
        feeStatus: formData.status,
        appointmentDate: formData.appointmentDate.toISOString().split("T")[0],
        appointmentTime: {
          from: formattedTime,
          to: formattedTime,
        },
        extra: formData.appointment.extra,
        discount: Number.parseFloat(formData.discountAmount) || 0,
        discountInPercentage: Number.parseFloat(formData.discountPercentage) || 0,
        insuranceDetails: {
          ...formData.appointment.insuranceDetails,
          claimStatus: formData.status === "insurance" ? "pending" : "",
        },
        returnableAmount: formData.status === "paid" ? formData.appointment.returnableAmount || 0 : 0,
        doctorName: formData.doctorName || "",
      };

      if (existingPatient && formData.appointment.patientId) {
        response = await addAppointment(appointmentData);
      } else {
        const requestBody = {
          mrn: 0,
          patientName: formData.patientName,
          guardiansName: formData.guardianName,
          gender: formData.gender,
          dob: formData.dateOfBirth.toISOString().split("T")[0],
          phoneNumber: formData.phoneNo,
          cnic: formData.cnic,
          helthId: formData.healthId,
          city: formData.city,
          reference: formData.reference,
          extra: formData.extra,
          appointment: appointmentData,
        };
        response = await registerPatient(requestBody);
      }

      if (response?.isSuccess) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: existingPatient ? "Appointment created successfully" : "Patient registered successfully",
        });

        socketService.emitHimsEvent("appointments", "insert", { appointmentId: response.data?._id });

        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchAppointments();

        onClose();
      } else {
        Toast.show({ type: "error", text1: "Error", text2: response?.message || "Failed to process request" });
      }
    } catch (error) {
      console.error("API Error:", error);
      Toast.show({ type: "error", text1: "Error", text2: "Failed to process request" });
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleUpdate = async (proceedToNext = false) => {
    if (!validateStep(1)) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields correctly" });
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const patientData = {
        patientName: formData.patientName,
        guardiansName: formData.guardianName,
        gender: formData.gender,
        dob: formData.dateOfBirth.toISOString().split("T")[0],
        phoneNumber: formData.phoneNo,
        cnic: formData.cnic,
        healthId: formData.healthId,
        city: formData.city,
        reference: formData.reference,
        extra: formData.extra,
      };

      await updatePatient(formData.appointment.patientId, patientData);
      if (proceedToNext) {
        setCurrentStep(2);
      } else {
        socketService.emitHimsEvent("appointments", "insert", { patientId: formData.appointment.patientId });
        await fetchAppointments();
        onClose();
      }
    } catch (error: any) {
      console.error("Update Error:", error);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const showDatePickerModal = (type: "dob" | "appointment") => {
    setDateType(type);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (dateType === "dob") updateFormData("dateOfBirth", selectedDate);
      else updateFormData("appointmentDate", selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) updateFormData("time", selectedTime);
  };

  const handleBackNavigation = async () => {
    // In slot mode, handle step-based back navigation
    if (appointmentMode === "slot" && currentStep > 1) {
      setCurrentStep(currentStep - 1);
      return;
    }
    try {
      await fetchAppointments();
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    } finally {
      onClose();
    }
  };

  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socketService.on("connect", onConnect);
    socketService.on("disconnect", onDisconnect);

    return () => {
      socketService.off("connect", onConnect);
      socketService.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (formData.status === "insurance") {
      setServices([]);
      setSelectedServicesDetails([]);
      updateFormData("appointment", { ...formData.appointment, services: [] });
    } else if (formData.appointment.doctorId) {
      const selectedDoctor = doctors.find((doctor) => doctor._id === formData.appointment.doctorId);
      if (selectedDoctor) setServices(selectedDoctor.services);
      else setServices([]);
      setSelectedServicesDetails([]);
      updateFormData("appointment", { ...formData.appointment, services: [] });
    } else {
      setServices([]);
    }
  }, [formData.status, formData.appointment.doctorId, doctors]);

  const handleDoctorChange = (doctorId: string) => {
    if (doctorId === "") {
      updateFormData("appointment", { ...formData.appointment, doctorId: "" });
      setServices([]);
      return;
    }
    const selectedDoctor = doctors.find((doctor) => doctor._id === doctorId);
    if (selectedDoctor && formData.status !== "insurance") {
      setServices(selectedDoctor.services);
      updateFormData("doctorName", selectedDoctor.fullName);
      updateFormData("appointment", { ...formData.appointment, doctorId: selectedDoctor._id });
    }
  };

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === "") return;
    const selectedService = services.find((service) => service._id === serviceId);
    if (selectedService && !formData.appointment.services.includes(serviceId)) {
      updateFormData("appointment", { ...formData.appointment, services: [...formData.appointment.services, serviceId] });
      setSelectedServicesDetails([...selectedServicesDetails, selectedService]);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    updateFormData("appointment", {
      ...formData.appointment,
      services: formData.appointment.services.filter((id) => id !== serviceId),
    });
    setSelectedServicesDetails(selectedServicesDetails.filter((service) => service._id !== serviceId));
  };

  // Fees calculations
  useEffect(() => {
    const total = selectedServicesDetails.reduce((sum, service: any) => {
      if ("fee" in service) return sum + service.fee;
      else if ("fees" in service) return sum + service.fees + service.doctorCharges;
      return sum;
    }, 0);
    updateFormData("totalFee", total.toString());
  }, [selectedServicesDetails]);

  useEffect(() => {
    const total = Number.parseFloat(formData.totalFee) || 0;
    const discountPercent = Number.parseFloat(formData.discountPercentage) || 0;
    const discountAmount = Number.parseFloat(formData.discountAmount) || 0;
    let discount = discountAmount;
    if (discountPercent > 0) {
      discount = (total * discountPercent) / 100;
      updateFormData("discountAmount", discount.toString());
    }
    const payable = Math.max(0, total - discount);
    updateFormData("payableFee", payable.toString());
  }, [formData.totalFee, formData.discountPercentage, formData.discountAmount]);

  // Determine total steps and header title based on mode
  const isSlotMode = appointmentMode === "slot";
  const totalSteps = isSlotMode ? 3 : 2;

  const getHeaderTitle = () => {
    if (isSlotMode) {
      switch (currentStep) {
        case 1: return "Patient Registration";
        case 2: return "Select Doctor";
        case 3: return "Select Slot";
        default: return "Patient Registration";
      }
    }
    return "Patient Registration";
  };

  return (
    <View style={styles.container}>
      {!socketConnected && (
        <View style={styles.connectionStatusBar}>
          <Ionicons name="cloud-offline-outline" size={20} color="white" />
          <Text style={styles.connectionStatusText}>Offline - Real-time updates unavailable</Text>
        </View>
      )}

      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={currentColors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </View>
        <TouchableOpacity style={styles.heartButton}>
          <Ionicons name="heart-outline" size={24} color={currentColors.headerText} />
        </TouchableOpacity>
      </View>

      {/* Only show search bar on Step 1 */}
      {currentStep === 1 && (
        <SearchPatientBar
          searchType={searchType}
          setSearchType={setSearchType}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearchInputChange={handleSearchInputChange}
          handleSearchSubmit={handleSearchSubmit}
        />
      )}

      {/* Fixed Step Indicator */}
      <View style={styles.stepIndicator}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 && <View style={styles.stepLine} />}
            <View style={[styles.step, currentStep >= step && styles.activeStep]}>
              <Text style={[styles.stepText, currentStep >= step && styles.activeStepText]}>{step}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Scrollable Content Area */}
      {isSlotMode && currentStep === 2 ? (
        // Doctor Selection - renders its own FlatList, no outer ScrollView needed
        <View style={{ flex: 1 }}>
          <DoctorSelectionScreen
            onBack={() => setCurrentStep(1)}
            onDoctorSelect={(doctor) => {
              saveSelectedDoctor(doctor);
              setCurrentStep(3);
            }}
            patientData={formData}
          />
        </View>
      ) : isSlotMode && currentStep === 3 ? (
        <View style={{ flex: 1 }}>
          <SlotSelectionScreen
            doctor={selectedDoctor}
            patientData={formData}
            existingPatient={existingPatient}
            onBack={() => setCurrentStep(2)}
            onBookingComplete={async () => {
              try {
                await fetchAppointments();
              } catch (error) {
                console.error('Error refreshing appointments:', error);
              } finally {
                onClose();
              }
            }}
          />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {currentStep === 1 ? (
            <PatientDetailsStep
              formData={formData}
              errors={errors}
              touched={touched}
              focusedInput={focusedInput}
              existingPatient={existingPatient}
              isSubmitting={isSubmitting}
              updateFormData={updateFormData}
              handleFocus={handleFocus}
              handleBlur={handleBlur}
              showDatePickerModal={showDatePickerModal}
              handleNext={handleNext}
              handleUpdate={handleUpdate}
              handleBackNavigation={handleBackNavigation}
            />
          ) : (
            <AppointmentDetailsStep
              formData={formData}
              errors={errors}
              touched={touched}
              focusedInput={focusedInput}
              updateFormData={updateFormData}
              handleFocus={handleFocus}
              handleBlur={handleBlur}
              doctors={doctors}
              isDoctorLocked={isDoctorLocked}
              insuranceCompanies={insuranceCompanies}
              services={services}
              isLoadingServices={isLoadingServices}
              selectedServicesDetails={selectedServicesDetails}
              handleDoctorChange={handleDoctorChange}
              handleServiceChange={handleServiceChange}
              handleRemoveService={handleRemoveService}
              showDatePickerModal={showDatePickerModal}
              setShowTimePicker={setShowTimePicker}
              setCurrentStep={setCurrentStep}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </ScrollView>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dateType === "dob" ? formData.dateOfBirth : formData.appointmentDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker value={formData.time} mode="time" display="default" onChange={handleTimeChange} />
      )}

      <SearchResultsModal
        visible={showSearchResults}
        results={searchResults}
        onClose={() => setShowSearchResults(false)}
        onSelect={(selectedPatient) => {
          setExistingPatient(selectedPatient as any);
          updateFormWithPatientData(selectedPatient);
          if (appointmentMode === "slot" && selectedDoctor) {
            setCurrentStep(3); // Doctor saved, skip to slot
          } else {
            setCurrentStep(2);
          }
        }}
      />
    </View>
  );
}
