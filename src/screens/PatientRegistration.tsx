import { useState, useEffect } from "react"
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { ActivityIndicator, RadioButton } from "react-native-paper"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Picker } from "@react-native-picker/picker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  registerPatient,
  getPatientByMRN,
  getPatientByCNIC,
  getPatientByPhonNo,
  getPatientByName,
  addAppointment,
  updatePatient,
  getInsuranceServicesByCompanyId,
} from "../ApiHandler/Patient"
import { getInsuranceCompanies } from "../ApiHandler/Patient"
import { getAssignedDoctors, Service } from "../ApiHandler/Appointment"
import Toast from "react-native-toast-message"
import SearchResultsModal from "../components/SearchResultsModal"
import socketService from "../socket"
import { useTheme } from "../utils/ThemeContext"

// Update the interface for insurance companies to match the API response
interface InsuranceCompany {
  _id: string
  companyName: string
  phoneNumber: string
  email: string
  isActive: boolean
  projectId: string
  userId: string
  insuranceServices: InsuranceService[]
}

// Update interface for insurance services with fee properties
interface InsuranceService {
  _id: string
  companyId: string
  serviceName: string
  fees: number
  doctorCharges: number
  comment: string
  isActive: boolean
}

interface InsuranceCompaniesResponse {
  isSuccess?: boolean
  data: InsuranceCompany[]
  message: string
  totalCount: number
}

export default function MedicalForm({
  onClose,
  fetchAppointments,
  setLoading,
}: { onClose: () => void; fetchAppointments: () => void; setLoading: (loading: boolean) => void }) {
  const [currentStep, setCurrentStep] = useState(1)
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
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [dateType, setDateType] = useState("dob")
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [socketConnected, setSocketConnected] = useState(socketService.isConnected())
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([])
  const [insuranceServices, setInsuranceServices] = useState<InsuranceService[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [isDoctorLocked, setIsDoctorLocked] = useState(false)

  interface Patient {
    _id?: string
    mrn: number
    patientName: string
    guardiansName: string
    gender: string
    dob: string
    phoneNumber: string
    cnic: string
    healthId: string
    city: string
    reference: string
    extra: Record<string, unknown>
    appointment: {
      doctorId: string
      services: string[]
      feeStatus: string
      appointmentDate: string
      appointmentTime: { from: string; to: string }
      extra: Record<string, unknown>
      discount: number
      discountInPercentage: number
      insuranceDetails: { insuranceCompanyId: string; insuranceId: string; claimStatus: string }
      returnableAmount: number
    }
  }

  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null)

  type Doctor = {
    _id: string
    fullName: string
    services: Service[]
  }

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<(Service | InsuranceService)[]>([])
  const [selectedServicesDetails, setSelectedServicesDetails] = useState<(Service | InsuranceService)[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("MRN")
  const [isSearching, setIsSearching] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modified required fields - added 'doctorName'
  const requiredFieldsStep1 = ["patientName", "phoneNo", "gender", "city"]
  const requiredFieldsStep2 = ["totalFee", "payableFee", "appointment", "services", "doctorName"]

  const handleFocus = (field: string) => {
    setFocusedInput(field)
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleBlur = (field: string) => {
    setFocusedInput(null)
    validateField(field, formData[field as keyof typeof formData])
  }

  const validateField = (field: string, value: any) => {
    let errorMessage = ""
    if (!requiredFieldsStep1.includes(field) && !requiredFieldsStep2.includes(field)) return

    if (!value || (typeof value === "string" && value.trim() === "")) {
      errorMessage = "This field is required"
    } else if (field === "phoneNo" && !/^03\d{9}$/.test(value)) {
      errorMessage = "Enter a valid phone number starting with 03 and 11 digits long"
    }

    setErrors((prev) => ({ ...prev, [field]: errorMessage }))
    return errorMessage === ""
  }

  const validateStep = (step: number) => {
    const fieldsToValidate = step === 1 ? requiredFieldsStep1 : requiredFieldsStep2
    let isValid = true
    const newErrors = { ...errors }
    const newTouched = { ...touched }

    fieldsToValidate.forEach((field) => {
      newTouched[field] = true
      if (field === "services" && step === 2) {
        if (formData.appointment.services.length === 0) {
          newErrors[field] = "Please select at least one service"
          isValid = false
        } else {
          newErrors[field] = ""
        }
        return
      }
      const value = formData[field as keyof typeof formData]
      if (!validateField(field, value)) isValid = false
    })

    // Additional validation for insurance fields when status is insurance
    if (step === 2 && formData.status === "insurance") {
      // Validate insurance company
      newTouched.insuranceCompanyId = true
      if (!formData.appointment.insuranceDetails.insuranceCompanyId) {
        newErrors.insuranceCompanyId = "Please select an insurance company"
        isValid = false
      } else {
        newErrors.insuranceCompanyId = ""
      }

      // Validate insurance ID
      newTouched.insuranceId = true
      if (!formData.appointment.insuranceDetails.insuranceId) {
        newErrors.insuranceId = "Please enter an insurance ID"
        isValid = false
      } else {
        newErrors.insuranceId = ""
      }
    }

    setTouched(newTouched)
    setErrors(newErrors)
    return isValid
  }

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        // Get user data from AsyncStorage
        const userDataString = await AsyncStorage.getItem("userData")
        const userDataObj = userDataString ? JSON.parse(userDataString) : null
        setUserData(userDataObj)

        // Fetch doctors from API
        const response = await getAssignedDoctors()
        // Map API response to match the format expected by the component
        const doctorsList: Doctor[] = response.map((doctor) => ({
          _id: doctor._id,
          fullName: doctor.fullName,
          services: doctor.services || [],
        }))
        setDoctors(doctorsList)

        // Check if userData contains fullName and if it matches any doctor
        if (userDataObj && userDataObj.fullName && doctorsList.length > 0) {
          const matchedDoctor = doctorsList.find((doctor) => doctor.fullName === userDataObj.fullName)

          if (matchedDoctor) {
            // Lock the doctor selection and set that doctor as selected
            setIsDoctorLocked(true)
            setServices(matchedDoctor.services)
            setFormData((prev) => ({
              ...prev,
              doctorName: matchedDoctor.fullName,
              appointment: { ...prev.appointment, doctorId: matchedDoctor._id },
            }))
          } else if (doctorsList.length > 0 && formData.status !== "insurance") {
            // If no match but doctors exist, select the first one (default behavior)
            setServices(doctorsList[0].services)
            setFormData((prev) => ({
              ...prev,
              doctorName: doctorsList[0].fullName,
              appointment: { ...prev.appointment, doctorId: doctorsList[0]._id },
            }))
          }
        } else if (doctorsList.length > 0 && formData.status !== "insurance") {
          // Original behavior if no userData or no match
          setServices(doctorsList[0].services)
          setFormData((prev) => ({
            ...prev,
            doctorName: doctorsList[0].fullName,
            appointment: { ...prev.appointment, doctorId: doctorsList[0]._id },
          }))
        }
      } catch (error) {
        console.error("Error fetching doctors:", error)
      }
    }
    fetchDoctors()

    // Fetch insurance companies
    const fetchInsuranceCompanies = async () => {
      try {
        const response = await getInsuranceCompanies({ count: 100, pageNo: 1 })
        if (response.data && Array.isArray(response.data)) {
          setInsuranceCompanies(response.data as InsuranceCompany[])
        }
      } catch (error) {
        console.error("Error fetching insurance companies:", error)
      }
    }
    fetchInsuranceCompanies()

    // Socket setup
    const onConnect = () => {
      setSocketConnected(true)
    }
    const onDisconnect = () => {
      setSocketConnected(false)
    }
    socketService.on("connect", onConnect)
    socketService.on("disconnect", onDisconnect)

    return () => {
      socketService.off("connect", onConnect)
      socketService.off("disconnect", onDisconnect)
    }
  }, [])

  // Update services based on status and selected doctor/insurance company
  useEffect(() => {
    if (formData.status === "insurance") {
      setServices([])
      setSelectedServicesDetails([])
      updateFormData("appointment", { ...formData.appointment, services: [] })
    } else if (formData.appointment.doctorId) {
      const selectedDoctor = doctors.find((doctor) => doctor._id === formData.appointment.doctorId)
      if (selectedDoctor) {
        setServices(selectedDoctor.services)
      } else {
        setServices([])
      }
      setSelectedServicesDetails([])
      updateFormData("appointment", { ...formData.appointment, services: [] })
    } else {
      setServices([])
    }
  }, [formData.status, formData.appointment.doctorId, doctors])

  // Fetch insurance services when an insurance company is selected
  useEffect(() => {
    const fetchInsuranceServices = async () => {
      if (formData.status === "insurance" && formData.appointment.insuranceDetails.insuranceCompanyId) {
        setIsLoadingServices(true)
        try {
          const response = await getInsuranceServicesByCompanyId(
            formData.appointment.insuranceDetails.insuranceCompanyId,
          )
          if (response.data && Array.isArray(response.data)) {
            setInsuranceServices(response.data as InsuranceService[])
            setServices(response.data as InsuranceService[])
          }
        } catch (error) {
          console.error("Error fetching insurance services:", error)
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to load insurance services",
          })
        } finally {
          setIsLoadingServices(false)
        }
      }
    }

    fetchInsuranceServices()
  }, [formData.appointment.insuranceDetails.insuranceCompanyId, formData.status])

  const handleSearchInputChange = (value: string) => {
    if (value.trim() === "") {
      setSearchQuery("")
      setShowSearchResults(false)
      setSearchResults([])
      setExistingPatient(null)
      setCurrentStep(1)
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
      }))
      return
    }
    setSearchQuery(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    if (value.trim().length > 0) {
      const timeout = setTimeout(() => performSearch(value), 800)
      setSearchTimeout(timeout)
    }
  }

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length > 0) {
      if (searchTimeout) clearTimeout(searchTimeout)
      performSearch(searchQuery)
    }
  }

  const performSearch = async (value: string) => {
    if (value.trim().length === 0 || isSearching) return
    setIsSearching(true)
    try {
      let response: any = null
      switch (searchType) {
        case "MRN":
          response = await getPatientByMRN(value)
          break
        case "CNIC":
          response = await getPatientByCNIC(value)
          break
        case "Mobile No":
          response = await getPatientByPhonNo(value)
          break
        case "Name":
          response = await getPatientByName(value)
          break
        default:
          Toast.show({ type: "error", text1: "Error", text2: "Invalid search type" })
          setIsSearching(false)
          return
      }

      if (response?.isSuccess && response.data) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          setSearchResults(response.data)
          setShowSearchResults(true)
        } else {
          setExistingPatient(response.data)
          updateFormWithPatientData(response.data)
          setCurrentStep(2)
          Toast.show({ type: "success", text1: "Success", text2: "Patient details found" })
        }
      } else {
        Toast.show({ type: "error", text1: "Error", text2: response?.message || "No patient details found" })
      }
    } catch (error: any) {
      console.error("Error fetching patient details:", error)
      Toast.show({ type: "error", text1: "Error", text2: error.message || "Failed to load patient details" })
    } finally {
      setIsSearching(false)
    }
  }

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
        patientId: patientData._id || "",
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
    })
  }

  const updateFormData = (field: string, value: any, callback?: () => void) => {
    setFormData((prev) => {
      const updatedFormData = { ...prev, [field]: value }
      if (callback) callback()
      return updatedFormData
    })
    if (touched[field]) validateField(field, value)
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      if (dateType === "dob") updateFormData("dateOfBirth", selectedDate)
      else updateFormData("appointmentDate", selectedDate)
    }
  }

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime) updateFormData("time", selectedTime)
  }

  const showDatePickerModal = (type: "dob" | "appointment") => {
    setDateType(type)
    setShowDatePicker(true)
  }

  const handleNext = () => {
    if (validateStep(1)) setCurrentStep(2)
    else Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields correctly" })
  }

  const handleUpdate = async (proceedToNext = false) => {
    if (!validateStep(1)) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields correctly" })
      return
    }

    setIsSubmitting(true)
    setLoading(true)

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
      }

      await updatePatient(formData.appointment.patientId, patientData)
      if (proceedToNext) {
        setCurrentStep(2)
      } else {
        socketService.emitHimsEvent("appointments", "insert", { patientId: formData.appointment.patientId })
        fetchAppointments()
        onClose()
      }
    } catch (error: any) {
      console.error("Update Error:", error)
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  // Format time to 12-hour format for API compatibility
  const formatTimeTo12Hour = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields correctly" })
      return
    }

    setIsSubmitting(true)
    setLoading(true)

    try {
      let response
      const formattedTime = formatTimeTo12Hour(formData.time)

      if (existingPatient && formData.appointment.patientId) {
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
        }
        response = await addAppointment(appointmentData)
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
          appointment: {
            doctorId: formData.appointment.doctorId,
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
          },
        }
        response = await registerPatient(requestBody)
      }

      if (response?.isSuccess) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: existingPatient ? "Appointment created successfully" : "Patient registered successfully",
        })
        
        // Emit the socket event and wait for the response
        socketService.emitHimsEvent("appointments", "insert", { appointmentId: response.data?._id })
        
        // Wait a moment to ensure backend processes the request
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reset all filters to default and fetch fresh data
        try {
          await fetchAppointments();
          console.log("Appointments refreshed after creation");
        } catch (fetchError) {
          console.error("Error refreshing appointments after creation:", fetchError);
        }
        
        onClose()
      } else {
        Toast.show({ type: "error", text1: "Error", text2: response?.message || "Failed to process request" })
      }
    } catch (error) {
      console.error("API Error:", error)
      Toast.show({ type: "error", text1: "Error", text2: "Failed to process request" })
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  const handleDoctorChange = (doctorId: string) => {
    if (doctorId === "") {
      updateFormData("appointment", { ...formData.appointment, doctorId: "" })
      setServices([])
      return
    }
    const selectedDoctor = doctors.find((doctor) => doctor._id === doctorId)
    if (selectedDoctor && formData.status !== "insurance") {
      setServices(selectedDoctor.services)
      updateFormData("doctorName", selectedDoctor.fullName)
      updateFormData("appointment", { ...formData.appointment, doctorId: selectedDoctor._id })
    }
  }

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === "") return

    const selectedService = services.find((service) => service._id === serviceId)
    if (selectedService && !formData.appointment.services.includes(serviceId)) {
      updateFormData("appointment", {
        ...formData.appointment,
        services: [...formData.appointment.services, serviceId],
      })
      setSelectedServicesDetails([...selectedServicesDetails, selectedService])
    }
  }

  const handleRemoveService = (serviceId: string) => {
    updateFormData("appointment", {
      ...formData.appointment,
      services: formData.appointment.services.filter((id) => id !== serviceId),
    })
    setSelectedServicesDetails(selectedServicesDetails.filter((service) => service._id !== serviceId))
  }

  const handleBackNavigation = async () => {
    console.log('Navigating back to Appointment screen, refreshing data...');
    try {
      // Call fetchAppointments before closing the screen
      await fetchAppointments();
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    } finally {
      // Always call onClose at the end
      onClose();
    }
  };

  const { currentColors } = useTheme()
  const getInputStyle = (field: string) => {
    if (focusedInput === field)
      return { ...styles(currentColors).input, borderColor: currentColors.activeTabBackground, borderWidth: 1.5 }
    if (errors[field] && touched[field])
      return { ...styles(currentColors).input, borderColor: "#FF3B30", borderWidth: 1.5 }
    return styles(currentColors).input
  }

  const renderPatientDetails = () => (
    <View style={styles(currentColors).section}>
      <Text style={styles(currentColors).sectionTitle}>Patient Information</Text>

      <Text style={styles(currentColors).label}>
        Patient Name<Text style={styles(currentColors).requiredStar}>*</Text>
      </Text>
      <TextInput
        style={getInputStyle("patientName")}
        placeholder="Enter Patient Name"
        value={formData.patientName}
        onChangeText={(text) => updateFormData("patientName", text)}
        onFocus={() => handleFocus("patientName")}
        onBlur={() => handleBlur("patientName")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />
      {errors.patientName && touched.patientName && (
        <Text style={styles(currentColors).errorText}>{errors.patientName}</Text>
      )}

      <Text style={styles(currentColors).label}>Guardian Name</Text>
      <TextInput
        style={getInputStyle("guardianName")}
        placeholder="Enter Guardian Name"
        value={formData.guardianName}
        onChangeText={(text) => updateFormData("guardianName", text)}
        onFocus={() => handleFocus("guardianName")}
        onBlur={() => handleBlur("guardianName")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />

      <Text style={styles(currentColors).label}>
        Phone No<Text style={styles(currentColors).requiredStar}>*</Text>
      </Text>
      <TextInput
        style={getInputStyle("phoneNo")}
        placeholder="Enter Patient Phone No"
        value={formData.phoneNo}
        onChangeText={(text) => updateFormData("phoneNo", text)}
        keyboardType="phone-pad"
        onFocus={() => handleFocus("phoneNo")}
        onBlur={() => handleBlur("phoneNo")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />
      {errors.phoneNo && touched.phoneNo && <Text style={styles(currentColors).errorText}>{errors.phoneNo}</Text>}

      <Text style={styles(currentColors).label}>
        Gender<Text style={styles(currentColors).requiredStar}>*</Text>
      </Text>
      <View style={styles(currentColors).radioGroup}>
        <RadioButton.Group onValueChange={(value) => updateFormData("gender", value)} value={formData.gender}>
          <View style={styles(currentColors).radioButtonRow}>
            <View style={styles(currentColors).radioButton}>
              <RadioButton value="Male" color={currentColors.activeTabBackground} />
              <Text style={styles(currentColors).radioLabel}>Male</Text>
            </View>
            <View style={styles(currentColors).radioButton}>
              <RadioButton value="Female" color={currentColors.activeTabBackground} />
              <Text style={styles(currentColors).radioLabel}>Female</Text>
            </View>
            <View style={styles(currentColors).radioButton}>
              <RadioButton value="other" color={currentColors.activeTabBackground} />
              <Text style={styles(currentColors).radioLabel}>Other</Text>
            </View>
          </View>
        </RadioButton.Group>
      </View>

      <Text style={styles(currentColors).label}>Date of Birth</Text>
      <TouchableOpacity
        style={getInputStyle("dateOfBirth")}
        onPress={() => !existingPatient && showDatePickerModal("dob")}
        disabled={!!existingPatient}
      >
        <View style={styles(currentColors).datePickerButton}>
          <Text style={styles(currentColors).dateText}>{formData.dateOfBirth.toLocaleDateString()}</Text>
          <Ionicons name="calendar-outline" size={20} color={currentColors.AppointmentColor} />
        </View>
      </TouchableOpacity>

      <Text style={styles(currentColors).label}>CNIC (Optional)</Text>
      <TextInput
        style={getInputStyle("cnic")}
        placeholder="Enter Patient's CNIC"
        value={formData.cnic}
        onChangeText={(text) => updateFormData("cnic", text)}
        onFocus={() => handleFocus("cnic")}
        onBlur={() => handleBlur("cnic")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />

      <Text style={styles(currentColors).label}>Health Id (Optional)</Text>
      <TextInput
        style={getInputStyle("healthId")}
        placeholder="Enter Patient's Health ID"
        value={formData.healthId}
        onChangeText={(text) => updateFormData("healthId", text)}
        onFocus={() => handleFocus("healthId")}
        onBlur={() => handleBlur("healthId")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />

      <Text style={styles(currentColors).label}>
        City<Text style={styles(currentColors).requiredStar}>*</Text>
      </Text>
      <TextInput
        style={getInputStyle("city")}
        placeholder="Enter Your City Name"
        value={formData.city}
        onChangeText={(text) => updateFormData("city", text)}
        onFocus={() => handleFocus("city")}
        onBlur={() => handleBlur("city")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />
      {errors.city && touched.city && <Text style={styles(currentColors).errorText}>{errors.city}</Text>}

      <Text style={styles(currentColors).label}>Reference (Optional)</Text>
      <TextInput
        style={getInputStyle("reference")}
        placeholder="Enter Patient's Reference"
        value={formData.reference}
        onChangeText={(text) => updateFormData("reference", text)}
        onFocus={() => handleFocus("reference")}
        onBlur={() => handleBlur("reference")}
        placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
      />

      <View style={styles(currentColors).buttonContainer}>
        <TouchableOpacity style={styles(currentColors).secondaryButton} onPress={handleBackNavigation}>
          <Text style={styles(currentColors).secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        {existingPatient ? (
          <>
            <TouchableOpacity
              style={styles(currentColors).updateButton}
              onPress={() => handleUpdate(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles(currentColors).buttonText}>Update</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles(currentColors).primaryButton}
              onPress={() => handleUpdate(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles(currentColors).buttonText}>Next</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles(currentColors).primaryButton} onPress={handleNext}>
            <Text style={styles(currentColors).buttonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const renderAppointmentDetails = () => (
    <View style={styles(currentColors).section}>
      <Text style={styles(currentColors).sectionTitle}>Appointment Details</Text>

      {formData.status !== "insurance" && (
        <>
          <Text style={styles(currentColors).label}>
            Doctor Name<Text style={styles(currentColors).requiredStar}>*</Text>
          </Text>
          <View
            style={[
              styles(currentColors).pickerContainer,
              focusedInput === "doctorName" && { borderColor: currentColors.activeTabBackground, borderWidth: 1.5 },
              errors.doctorName && touched.doctorName && { borderColor: "#FF3B30", borderWidth: 1.5 },
              isDoctorLocked && { backgroundColor: currentColors.dropdownBorder + "40" },
            ]}
          >
            <Picker
              selectedValue={formData.appointment.doctorId}
              onValueChange={handleDoctorChange}
              style={styles(currentColors).picker}
              onFocus={() => {
                setFocusedInput("doctorName")
                setTouched({ ...touched, doctorName: true })
              }}
              onBlur={() => handleBlur("doctorName")}
              dropdownIconColor={currentColors.AppointmentColor}
              enabled={!isDoctorLocked}
            >
              <Picker.Item label="Select Doctor" value="" />
              {doctors.map((doctor) => (
                <Picker.Item key={doctor._id} label={doctor.fullName} value={doctor._id} />
              ))}
            </Picker>
          </View>
          {isDoctorLocked && (
            <Text style={styles(currentColors).lockedText}>Doctor selection is locked to your profile</Text>
          )}
          {errors.doctorName && touched.doctorName && (
            <Text style={styles(currentColors).errorText}>{errors.doctorName}</Text>
          )}
        </>
      )}

      {formData.status === "insurance" && (
        <>
          <Text style={styles(currentColors).label}>
            Select Company<Text style={styles(currentColors).requiredStar}>*</Text>
          </Text>
          <View
            style={[
              styles(currentColors).pickerContainer,
              focusedInput === "insuranceCompanyId" && {
                borderColor: currentColors.activeTabBackground,
                borderWidth: 1.5,
              },
              errors.insuranceCompanyId && touched.insuranceCompanyId && { borderColor: "#FF3B30", borderWidth: 1.5 },
            ]}
          >
            <Picker
              selectedValue={formData.appointment.insuranceDetails.insuranceCompanyId}
              onValueChange={(value) => {
                updateFormData("appointment", {
                  ...formData.appointment,
                  insuranceDetails: { ...formData.appointment.insuranceDetails, insuranceCompanyId: value },
                })
                // Reset services when changing company
                setSelectedServicesDetails([])
                updateFormData("appointment", {
                  ...formData.appointment,
                  services: [],
                  insuranceDetails: { ...formData.appointment.insuranceDetails, insuranceCompanyId: value },
                })
              }}
              style={styles(currentColors).picker}
              onFocus={() => {
                setFocusedInput("insuranceCompanyId")
                setTouched({ ...touched, insuranceCompanyId: true })
              }}
              dropdownIconColor={currentColors.AppointmentColor}
            >
              <Picker.Item label="Select Insurance Company" value="" />
              {insuranceCompanies.map((company) => (
                <Picker.Item key={company._id} label={company.companyName} value={company._id} />
              ))}
            </Picker>
          </View>
          {errors.insuranceCompanyId && touched.insuranceCompanyId && (
            <Text style={styles(currentColors).errorText}>{errors.insuranceCompanyId}</Text>
          )}
        </>
      )}

      {formData.status === "insurance" && (
        <>
          <Text style={styles(currentColors).label}>
            Insurance ID<Text style={styles(currentColors).requiredStar}>*</Text>
          </Text>
          <TextInput
            style={getInputStyle("insuranceId")}
            placeholder="Enter Insurance ID"
            value={formData.appointment.insuranceDetails.insuranceId}
            onChangeText={(text) =>
              updateFormData("appointment", {
                ...formData.appointment,
                insuranceDetails: { ...formData.appointment.insuranceDetails, insuranceId: text },
              })
            }
            onFocus={() => handleFocus("insuranceId")}
            onBlur={() => handleBlur("insuranceId")}
            placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
          />
          {errors.insuranceId && touched.insuranceId && (
            <Text style={styles(currentColors).errorText}>{errors.insuranceId}</Text>
          )}
        </>
      )}

      <Text style={styles(currentColors).label}>
        {formData.status === "insurance" ? "Insurance Services" : "Services"}
        <Text style={styles(currentColors).requiredStar}>*</Text>
      </Text>
      <View
        style={[
          styles(currentColors).pickerContainer,
          focusedInput === "services" && { borderColor: currentColors.activeTabBackground, borderWidth: 1.5 },
          errors.services && touched.services && { borderColor: "#FF3B30", borderWidth: 1.5 },
        ]}
      >
        {isLoadingServices ? (
          <View style={styles(currentColors).loadingContainer}>
            <ActivityIndicator size="small" color={currentColors.activeTabBackground} />
            <Text style={styles(currentColors).loadingText}>Loading services...</Text>
          </View>
        ) : (
          <Picker
            selectedValue=""
            onValueChange={handleServiceChange}
            style={styles(currentColors).picker}
            onFocus={() => {
              setFocusedInput("services")
              setTouched({ ...touched, services: true })
            }}
            dropdownIconColor={currentColors.AppointmentColor}
          >
            <Picker.Item
              label={formData.status === "insurance" ? "Select Insurance Service" : "Select Service"}
              value=""
            />
            {services.map((service) => (
              <Picker.Item key={service._id} label={service.serviceName} value={service._id} />
            ))}
          </Picker>
        )}
      </View>
      {errors.services && touched.services && <Text style={styles(currentColors).errorText}>{errors.services}</Text>}

      {selectedServicesDetails.length > 0 && (
        <View style={styles(currentColors).selectedServicesContainer}>
          <Text style={styles(currentColors).selectedServicesTitle}>
            Selected {formData.status === "insurance" ? "Insurance Services" : "Services"}:
          </Text>
          <View style={styles(currentColors).chipContainer}>
            {selectedServicesDetails.map((service) => (
              <View key={service._id} style={styles(currentColors).chip}>
                <Text style={styles(currentColors).chipText} numberOfLines={1} ellipsizeMode="tail">
                  {service.serviceName}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveService(service._id)}
                  style={styles(currentColors).chipRemoveButton}
                >
                  <Ionicons name="close-circle" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles(currentColors).label}>Appointment Date</Text>
      <TouchableOpacity style={getInputStyle("appointmentDate")} onPress={() => showDatePickerModal("appointment")}>
        <View style={styles(currentColors).datePickerButton}>
          <Text style={styles(currentColors).dateText}>{formData.appointmentDate.toLocaleDateString()}</Text>
          <Ionicons name="calendar-outline" size={20} color={currentColors.AppointmentColor} />
        </View>
      </TouchableOpacity>

      <Text style={styles(currentColors).label}>Time</Text>
      <TouchableOpacity style={getInputStyle("time")} onPress={() => setShowTimePicker(true)}>
        <View style={styles(currentColors).datePickerButton}>
          <Text style={styles(currentColors).dateText}>
            {formData.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          <Ionicons name="time-outline" size={20} color={currentColors.AppointmentColor} />
        </View>
      </TouchableOpacity>

      <View style={styles(currentColors).feeContainer}>
        <View style={styles(currentColors).feeItem}>
          <Text style={styles(currentColors).label}>
            Total Fee<Text style={styles(currentColors).requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[getInputStyle("totalFee"), styles(currentColors).readOnlyInput]}
            placeholder="0000"
            value={formData.totalFee}
            editable={false}
            keyboardType="numeric"
          />
          {errors.totalFee && touched.totalFee && (
            <Text style={styles(currentColors).errorText}>{errors.totalFee}</Text>
          )}
        </View>

        <View style={styles(currentColors).feeItem}>
          <Text style={styles(currentColors).label}>Discount %</Text>
          <TextInput
            style={[
              getInputStyle("discountPercentage"),
              formData.status == "insurance" && styles(currentColors).readOnlyInput,
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

      <View style={styles(currentColors).feeContainer}>
        <View style={styles(currentColors).feeItem}>
          <Text style={styles(currentColors).label}>Discount Rs</Text>
          <TextInput
            style={[
              getInputStyle("discountAmount"),
              formData.status == "insurance" && styles(currentColors).readOnlyInput,
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

        <View style={styles(currentColors).feeItem}>
          <Text style={styles(currentColors).label}>
            Payable Fee<Text style={styles(currentColors).requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[getInputStyle("payableFee"), styles(currentColors).readOnlyInput]}
            placeholder="0000"
            value={formData.payableFee}
            editable={false}
            keyboardType="numeric"
          />
          {errors.payableFee && touched.payableFee && (
            <Text style={styles(currentColors).errorText}>{errors.payableFee}</Text>
          )}
        </View>
      </View>

      <Text style={styles(currentColors).label}>Status</Text>
      <View
        style={[
          styles(currentColors).pickerContainer,
          focusedInput === "status" && { borderColor: currentColors.activeTabBackground, borderWidth: 1.5 },
        ]}
      >
        <Picker
          selectedValue={formData.status}
          onValueChange={(value) => updateFormData("status", value)}
          style={styles(currentColors).picker}
          onFocus={() => setFocusedInput("status")}
          dropdownIconColor={currentColors.AppointmentColor}
        >
          <Picker.Item label="Paid" value="paid" />
          <Picker.Item label="Unpaid" value="unpaid" />
          <Picker.Item label="Insurance" value="insurance" />
        </Picker>
      </View>

      {formData.status === "paid" && (
        <>
          <Text style={styles(currentColors).label}>Return Amount</Text>
          <TextInput
            style={getInputStyle("returnableAmount")}
            placeholder="0000"
            value={formData.appointment.returnableAmount.toString()}
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

      <View style={styles(currentColors).buttonContainer}>
        <TouchableOpacity style={styles(currentColors).secondaryButton} onPress={() => setCurrentStep(1)}>
          <Text style={styles(currentColors).secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles(currentColors).primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles(currentColors).buttonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  useEffect(() => {
    const total = selectedServicesDetails.reduce((sum, service) => {
      // Handle fee calculation for both regular services and insurance services
      if ("fee" in service) {
        return sum + service.fee
      } else if ("fees" in service) {
        // For insurance services, add fees and doctorCharges
        return sum + service.fees + service.doctorCharges
      }
      return sum
    }, 0)
    updateFormData("totalFee", total.toString())
  }, [selectedServicesDetails])

  useEffect(() => {
    const total = Number.parseFloat(formData.totalFee) || 0
    const discountPercent = Number.parseFloat(formData.discountPercentage) || 0
    const discountAmount = Number.parseFloat(formData.discountAmount) || 0
    let discount = discountAmount
    if (discountPercent > 0) {
      discount = (total * discountPercent) / 100
      updateFormData("discountAmount", discount.toString())
    }
    const payable = Math.max(0, total - discount)
    updateFormData("payableFee", payable.toString())
  }, [formData.totalFee, formData.discountPercentage, formData.discountAmount])

  return (
    <ScrollView style={styles(currentColors).container}>
      {!socketConnected && (
        <View style={styles(currentColors).connectionStatusBar}>
          <Ionicons name="cloud-offline-outline" size={20} color="white" />
          <Text style={styles(currentColors).connectionStatusText}>Offline - Real-time updates unavailable</Text>
        </View>
      )}

      <View style={styles(currentColors).header}>
        <View style={styles(currentColors).headerLeft}>
          <TouchableOpacity onPress={handleBackNavigation} style={styles(currentColors).backButton}>
            <Ionicons name="arrow-back" size={24} color={currentColors.headerText} />
          </TouchableOpacity>
          <Text style={styles(currentColors).headerTitle}>Patient Registration</Text>
        </View>
        <TouchableOpacity style={styles(currentColors).heartButton}>
          <Ionicons name="heart-outline" size={24} color={currentColors.headerText} />
        </TouchableOpacity>
      </View>

      <View style={styles(currentColors).searchContainer}>
        <View style={styles(currentColors).searchTypeContainer}>
          <Picker
            selectedValue={searchType}
            onValueChange={(itemValue) => setSearchType(itemValue)}
            style={styles(currentColors).searchPicker}
            dropdownIconColor={currentColors.AppointmentColor}
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
            placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
            style={styles(currentColors).searchInput}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles(currentColors).clearButton}>
              <Ionicons name="close-circle" size={18} color={currentColors.AppointmentColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles(currentColors).stepIndicator}>
        <View style={[styles(currentColors).step, currentStep >= 1 && styles(currentColors).activeStep]}>
          <Text style={[styles(currentColors).stepText, currentStep >= 1 && styles(currentColors).activeStepText]}>
            1
          </Text>
        </View>
        <View style={styles(currentColors).stepLine} />
        <View style={[styles(currentColors).step, currentStep >= 2 && styles(currentColors).activeStep]}>
          <Text style={[styles(currentColors).stepText, currentStep >= 2 && styles(currentColors).activeStepText]}>
            2
          </Text>
        </View>
      </View>

      {currentStep === 1 ? renderPatientDetails() : renderAppointmentDetails()}

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
          setExistingPatient(selectedPatient as any)
          updateFormWithPatientData(selectedPatient)
          setCurrentStep(2)
        }}
      />
    </ScrollView>
  )
}

const styles = (currentColors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 15,
      backgroundColor: currentColors.headerBackground,
      position: "sticky",
      top: 0,
      zIndex: 10000,
      width: "100%",
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerTitle: {
      color: currentColors.headerText,
      fontSize: 18,
      fontWeight: "600",
    },
    backButton: {
      padding: 5,
    },
    heartButton: {
      padding: 8,
    },
    searchContainer: {
      flexDirection: "row",
      paddingHorizontal: 15,
      paddingVertical: 12,
      gap: 10,
      backgroundColor: currentColors.filterBackground,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      alignItems: "center",
      marginBottom: 10,
    },
    searchTypeContainer: {
      width: 110,
      height: 42,
      backgroundColor: currentColors.dropdownBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
      justifyContent: "center",
      overflow: "hidden",
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: currentColors.dropdownBackground,
      borderRadius: 8,
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
      backgroundColor: currentColors.cardBackground || currentColors.background,
      borderRadius: 12,
      marginHorizontal: 12,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
      color: currentColors.AppointmentColor,
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      color: currentColors.AppointmentColor,
      fontWeight: "500",
    },
    input: {
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      backgroundColor: currentColors.dropdownBackground,
      color: currentColors.AppointmentColor,
      fontSize: 15,
    },
    readOnlyInput: {
      backgroundColor: currentColors.dropdownBorder + "40",
    },
    radioGroup: {
      marginBottom: 16,
    },
    radioButtonRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    radioButton: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 16,
    },
    radioLabel: {
      fontSize: 14,
      color: currentColors.AppointmentColor,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
      borderRadius: 8,
      marginBottom: 16,
      backgroundColor: currentColors.dropdownBackground,
      overflow: "hidden",
    },
    picker: {
      height: 50,
      color: currentColors.AppointmentColor,
    },
    datePickerButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    dateText: {
      color: currentColors.AppointmentColor,
      fontSize: 15,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 24,
      gap: 12,
    },
    primaryButton: {
      backgroundColor: currentColors.activeTabBackground,
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      flex: 1,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    updateButton: {
      backgroundColor: currentColors.updateButtonBackground || "#007AFF",
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      flex: 1,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    secondaryButton: {
      backgroundColor: currentColors.secondaryButtonBackground || "#FF3B30",
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      flex: 1,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    buttonText: {
      color: currentColors.activeTabText,
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButtonText: {
      color: currentColors.secondaryButtonText || "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    selectedServicesContainer: {
      marginTop: 8,
      marginBottom: 16,
      padding: 12,
      backgroundColor: currentColors.dropdownBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
    },
    selectedServicesTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 12,
      color: currentColors.AppointmentColor,
    },
    selectedServiceItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: currentColors.cardBackground || currentColors.background,
      padding: 12,
      marginBottom: 8,
      borderRadius: 6,
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
    searchPicker: {
      width: 120,
      color: currentColors.AppointmentColor,
    },
    requiredStar: {
      color: "#FF3B30",
      marginLeft: 2,
    },
    errorText: {
      color: "#FF3B30",
      fontSize: 12,
      marginTop: -12,
      marginBottom: 12,
    },
    connectionStatusBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
      margin: 10,
      borderRadius: 6,
      backgroundColor: "#FF3B30",
    },
    connectionStatusText: {
      color: "white",
      fontSize: 13,
      fontWeight: "500",
      marginLeft: 6,
    },
    loadingContainer: {
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    loadingText: {
      marginLeft: 8,
      color: currentColors.AppointmentColor,
      fontSize: 14,
    },
    feeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    feeItem: {
      flex: 1,
    },
    stepIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 16,
    },
    step: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: currentColors.dropdownBackground,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: currentColors.dropdownBorder,
    },
    activeStep: {
      backgroundColor: currentColors.activeTabBackground,
      borderColor: currentColors.activeTabBackground,
    },
    stepText: {
      color: currentColors.AppointmentColor,
      fontWeight: "600",
    },
    activeStepText: {
      color: currentColors.activeTabText,
    },
    stepLine: {
      flex: 0.2,
      height: 2,
      backgroundColor: currentColors.dropdownBorder,
      marginHorizontal: 8,
    },
    chipContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: currentColors.activeTabBackground + "20",
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: currentColors.activeTabBackground + "40",
      minWidth: 100,
      maxWidth: "100%",
      flexShrink: 1,
      flexGrow: 0,
    },
    chipText: {
      fontSize: 13,
      color: currentColors.AppointmentColor,
      flex: 1,
      marginRight: 4,
    },
    chipRemoveButton: {
      padding: 2,
      alignSelf: "flex-start",
    },
    lockedText: {
      color: currentColors.activeTabBackground,
      fontSize: 12,
      marginTop: -12,
      marginBottom: 12,
      fontStyle: "italic",
    },
  })
