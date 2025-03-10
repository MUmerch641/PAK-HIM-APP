import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const BASE_URL = "https://pakhims.com/stg_user-api";

interface DeletedAppointmentsParams {
  count: number;
  pageNo: number;
  sort: "accending" | "descending";
  search?: string;
  doctorId?: string;
  appointmentDate?: string;
}

interface DeletedAppointmentsResponse {
  data: any[];
  totalCount: number;
  currentPage: number;
}

const getAuthToken = async (): Promise<string | null> => {
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

export const getAllDeletedAppointments = async (
  params: DeletedAppointmentsParams
): Promise<DeletedAppointmentsResponse> => {
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

    const url = `${BASE_URL}/appointments/getAllDeletedAppointments`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      params,
    });

    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching deleted appointments:", error.response?.data || error.message);
    throw error;
  }
};
export const restoreDeletedAppointment = async (id: string): Promise<void> => {
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

    const url = `${BASE_URL}/appointments/restoreDeletedAppointment/${id}`;
    
    // Fixed: Moved headers object as second parameter instead of third
    const response = await axios.put(url, {}, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Added: Check response status
    if (response.status !== 200) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

  } catch (error: any) {
    // Enhanced error logging
    const errorMessage = error.response?.data?.message || error.message;
    console.error("Error restoring deleted appointment:", {
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
    
    // More specific error messages based on status
    let userMessage = "Error restoring deleted appointment";
    if (error.response?.status === 401) {
      userMessage = "Your session has expired. Please log in again.";
    }
    
    Toast.show({
      type: "error",
      text1: "Error",
      text2: userMessage,
    });
    throw error;
  }
};
