import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../api"; // Adjust the import path as necessary
import Toast from "react-native-toast-message";

const BASE_URL = "https://pakhims.com/stg_user-api";

interface Service {
  _id: string;
  serviceName: string;
  fee: number;
  hospitalChargesInPercentage: number;
  // Add other service fields as needed
}

interface Doctor {
  _id: string;
  fullName: string;
  services: Service[];
  // Add other doctor fields as needed
}

interface DoctorsResponse {
  data: Doctor[];
  totalCount: number;
  currentPage: number;
}

interface GetDoctorsParams {
  count?: number;
  pageNo?: number;
  sort?: 'ascending' | 'descending';
  receptionistId?: string;
}

interface Appointment {
  doctorId: string;
  services: string[];
  feeStatus: string;
  appointmentDate: string;
  appointmentTime: {
    from: string;
    to: string;
  };
  extra?: Record<string, unknown>;  // Optional with default
  discount: number;
  discountInPercentage: number;
  insuranceDetails: {
    insuranceCompanyId: string;
    insuranceId: string;
    claimStatus: string;
  };
  returnableAmount: number;
}

interface PatientData {
  mrn: number;
  patientName: string;
  guardiansName: string;
  gender: string;
  dob: string;
  phoneNumber: string; // Fixed Typo
  cnic: string;
  helthId: string;
  city: string;
  reference: string;
  extra?: Record<string, unknown>; // Optional with default
  appointment: Appointment;
}

interface PatientResponse {
  isSuccess: boolean;
  data: any; // You might want to define a more specific type here
  message?: string;
}

export const getAuthToken = async (): Promise<string | null> => {
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

const validateHexId = (id: string): boolean => {
  const hexRegex = /^[0-9a-fA-F]{24}$/;
  return hexRegex.test(id);
};

export const registerPatient = async (patientData: PatientData): Promise<any> => {
  try {
    if (!validateHexId(patientData.appointment.doctorId)) {
      throw new Error("Invalid doctorId format");
    }
    for (const serviceId of patientData.appointment.services) {
      if (!validateHexId(serviceId)) {
        throw new Error("Invalid serviceId format");
      }
    }
    const token = await getAuthToken();
    if (!token) {
      Toast.show({
        type: "error",
        text1: "Authentication Error",
        text2: "No authentication token found",
      });
      throw new Error("No auth token found");
    }

    const response = await axios.post(`${BASE_URL}/patient-registration/registerPatient`, patientData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 201) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Patient registered successfully",
      });
      return response.data;
    }
  } catch (error: any) {
    console.error("Error registering patient:", error.response?.data || error.message);

    Toast.show({
      type: "error",
      text1: "Registration Failed",
      text2: error.response?.data?.message || "Something went wrong",
    });

    throw error;
  }
};

export const getDoctors = async (params: GetDoctorsParams): Promise<DoctorsResponse> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      Toast.show({
        type: "error",
        text1: "Authentication Error",
        text2: "No authentication token found",
      });
      throw new Error("No auth token found");
    }

    const url = `${BASE_URL}/users/getAllDoctors`;
    const queryParams: any = {
      count: params.count ?? 10,
      pageNo: params.pageNo ?? 1,
      sort: params.sort ?? 'accending', // Fix typo from API
    };

    if (params.receptionistId) {
      queryParams.receptionistId = params.receptionistId;
    }

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      params: queryParams,
    });

    const doctorsList: Doctor[] = response.data.data.map((doc: any) => ({
      _id: doc._id,
      fullName: doc.fullName,
      services: doc.services.map((service: any) => ({
        _id: service._id,
        serviceName: service.serviceName,
        fee: service.fee,
        hospitalChargesInPercentage: service.hospitalChargesInPercentage,
      })),
    }));

    return { data: doctorsList, totalCount: response.data.totalCount, currentPage: params.pageNo ?? 1 };
  } catch (error: any) {
    console.error("Error fetching doctors:", error.response?.data || error.message);
    throw error;
  }
};

const handlePatientRequest = async (endpoint: string): Promise<PatientResponse> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No auth token found");
  }

  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error fetching patient details",
    });
    throw error;
  }
};

export const getPatientByMRN = async (mrn: string): Promise<PatientResponse> => {
  return handlePatientRequest(`/patient-registration/getPatientByMRN/${encodeURIComponent(mrn)}`);
};

export const getPatientByCNIC = async (cnic: string): Promise<PatientResponse> => {
  return handlePatientRequest(`/patient-registration/getPatientByCNIC/${encodeURIComponent(cnic)}`);
};

export const getPatientByPhonNo = async (phonNo: string): Promise<PatientResponse> => {
  return handlePatientRequest(`/patient-registration/getPatientByPhonNo/${encodeURIComponent(phonNo)}`);
};

export const getPatientByName = async (name: string): Promise<PatientResponse> => {
  return handlePatientRequest(`/patient-registration/getPatientByName/${encodeURIComponent(name)}`);
};


