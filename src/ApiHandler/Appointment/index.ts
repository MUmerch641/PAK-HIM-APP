import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../api"; // Adjust the import path as necessary
import Toast from "react-native-toast-message"; // Import Toast
import { router } from "expo-router";

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

export interface Appointment {
  id?: string;
  name: string;
  age: number;
  status: string;
  time: string;
  optionName: string;
  search: string;
}

export const getAllAppointments = async (
  { count = 100, pageNo = 1, sort = "accending", checkStatus = "all", appointmentDate = "", search = "", doctorId = "", feeStatus = "" }: { count?: number, pageNo?: number, sort?: string, checkStatus?: string, appointmentDate?: string, search?: string, doctorId?: string, feeStatus?: string } = {}
): Promise<Appointment[]> => {
  try {
    const token = await getAuthToken();

    if (!token) {
      router.replace('/Login');
      throw new Error("No auth token found");
    }

    const params: any = {};
    if (count) params.count = count;
    if (pageNo) params.pageNo = pageNo;
    if (sort) params.sort = sort;
    if (checkStatus) params.checkStatus = checkStatus;
    if (appointmentDate) params.appointmentDate = appointmentDate;
    if (search) params.search = search.trim();
    if (doctorId) params.doctorId = doctorId;
    if (feeStatus) params.feeStatus = feeStatus;

    const response = await api.get<{ data: Appointment[] }>(
      `/appointments/getAllAppointments`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params,
      }
    );
    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error("Unexpected response format");
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      router.replace('/Login');
    }
    throw error; // Instead of returning [], throw an error for better handling
  }
};

export const deleteAppointment = async (
  id: string,
  deleteReason: string
): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.delete(`/appointments/deleteAppointment/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { deleteReason },
    });

    if (response.status === 200) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Appointment deleted successfully",
      });
    } else {
      throw new Error("Failed to delete appointment");
    }
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Error deleting appointment",
    });
    throw error;
  }
};

export const updateAppointment = async (
  id: string,
  updatedData: {
    doctorId: string;
    services: string[];
    feeStatus: string;
    appointmentDate: string;
    appointmentTime?: { from: string; to: string };
    discount: number;
    discountInPercentage: number;
  }
): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.put<{ data: any }>(
      `/appointments/updateAppointment/${id}`,
      updatedData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Appointment Update successfully",
      });
    } else {
      throw new Error(`Failed to check appointment`);
    }
  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error checking appointment",
    });
    throw error;
  }
};

export const checkAppointment = async (
  id: string,
  appointmentCheckedStatus: string,
  commentOnReffered: string,
  scheduleNotation: any[]
): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.post(
      `/appointments/checkAppointment/${id}`,
      {
        appointmentCheckedStatus,
        commentOnReffered,
        scheduleNotation,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data.isSuccess) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Appointment checked successfully",
      });
    } else {
      throw new Error(`Failed to check appointment: ${response.statusText}`);
    }
  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error checking appointment",
    });
    throw error;
  }
};

export const uncheckAppointment = async (
  id: string,
): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.get(
      `/appointments/unCheckAppointment/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (response.data.isSuccess) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Appointment Unchecked successfully",
      });
    } else {
      throw new Error(`Failed to check appointment: ${response.statusText}`);
    }
  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error unchecking appointment",
    });
    throw error;
  }
};

export const getAppointmentsByDoctorId = async (
  doctorId: string,
  count: number = 100,
  pageNo: number = 1,
  sort: string = "accending",
  search: string = "",
  appointmentDate: string = "",
  checkStatus: string = "all",
  feeStatus: string = "all"
): Promise<Appointment[]> => {
  try {
    const token = await getAuthToken();

    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.get<{ data: Appointment[] }>(
      `/appointments/getAllAppointmentsByDoctorId/${doctorId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { count, pageNo, sort, search, appointmentDate, checkStatus, feeStatus },
      }
    );

    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error("Unexpected response format");
    }

    return response.data;
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Error fetching appointments by doctor ID",
    });
    throw error;
  }
};

export const addVitals = async (vitalsData: {
  weight?: string;
  temperature?: string;
  BP?: string;
  HR?: string;
  RR?: string;
  extra?: { [key: string]: any };
  appointmentId: string;
  patientId: string;
  symptoms?: string;
  isEmergencyIn10Mint?: boolean;
  isEmergencyIn1Hr?: boolean;
  message?: string;
  vitals: any;
}): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const formattedVitalsData = {
      weight: vitalsData.vitals.weight ?? "N/A",
      temperature: vitalsData.vitals.temperature ?? "N/A",
      BP: vitalsData.vitals.BP ?? "N/A",
      HR: vitalsData.vitals.HR ?? "N/A",
      RR: vitalsData.vitals.RR ?? "N/A",
      extra: vitalsData.vitals.extra ?? {},
      appointmentId: vitalsData.appointmentId,
      patientId: vitalsData.patientId,
      symptoms: vitalsData.vitals.symptoms ?? "N/A",
      isEmergencyIn10Mint: vitalsData.vitals.isEmergencyIn10Mint ?? true,
      isEmergencyIn1Hr: vitalsData.vitals.isEmergencyIn1Hr ?? false,
      message: vitalsData.vitals.message ?? "",
    };

    const response = await api.post(`/vitals/addVitals`, formattedVitalsData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 201) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Vitals added successfully",
      });
    } else {
      throw new Error(`Failed to add vitals: ${response.statusText}`);
    }
  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error adding vitals",
    });
    throw error;
  }
};

export const getStatusOptions = async (): Promise<Appointment[]> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.get<{ data: Appointment[] }>(
      `/checked-status-options/getAllByPagination`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error("Unexpected response format");
    }

    return response.data.data;
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Error fetching appointments by doctor ID",
    });
    throw error;
  }
};

export const updateVitalById = async (
  BP: string,
  HR: string,
  RR: string,
  appointmentId: string,
  symptoms: string,
  temperature: string,
  weight: string,
  extra?: { [key: string]: any },
  isEmergencyIn1Hr?: boolean,
  isEmergencyIn10Mint?: boolean,
  message?: string,
): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await api.put(
      `/vitals/updateVitalById/${appointmentId}`,
      {
        BP,
        HR,
        RR,
        symptoms,
        temperature,
        weight,
        extra,
        isEmergencyIn1Hr,
        isEmergencyIn10Mint,
        message
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.status === 200) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Vitals updated successfully",
      });
    } else {
      throw new Error(`Failed to update vitals: ${response.statusText}`);
    }
  } catch (error: any) {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Error updating vitals",
    });
    throw error;
  }
};

export interface Service {
  _id: string;
  serviceName: string;
  fee: number;
  hospitalChargesInPercentage: number;
  extra?: Record<string, any>;
}

export interface DoctorDetails {
  _id: string;
  specialization: string;
  photoUrl: string;
  weeklySchedule: Array<{
    day: string;
    timingScheedules: Array<{
      timeFrom: string;
      timeTo: string;
    }>;
  }>;
  doctorId: string;
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  slotIntervalTime?: number;
}

export interface Doctor {
  _id: string;
  fullName: string;
  dob: string;
  gender: string;
  phonNumber: string;
  nationality: string;
  city: string;
  cnic: string;
  email: string;
  userCategoryId: string;
  canLogin: boolean;
  haveOpd: boolean;
  userType: string[];
  projectId: string;
  userId: string;
  extra: Record<string, any>;
  assingDoctors: string[];
  assingReceiptionest: string[];
  jobType: string;
  department: string;
  specialization?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  roles: number[];
  doctorDetails: DoctorDetails;
  services: Service[];
}

export interface DoctorsResponse {
  isSuccess: boolean;
  data: Doctor[];
  message: string;
  totalCount: number;
}

export const getAssignedDoctors = async (): Promise<Doctor[]> => {
  try {
    const token = await getAuthToken();

    if (!token) {
      router.replace('/Login');
      throw new Error("No auth token found");
    }

    const response = await api.get<DoctorsResponse>(
      `/users/getAssignedDoctores`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.data || !response.data.isSuccess || !Array.isArray(response.data.data)) {
      throw new Error("Unexpected response format");
    }

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      router.replace('/Login');
    }

    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Error fetching assigned doctors",
    });

    throw error;
  }
};



