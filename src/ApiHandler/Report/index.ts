import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const BASE_URL = "https://pakhims.com/stg_admin-api";

interface ReportParams {
  userIds: string[];
  doctorIds: string[];
  fromDate: string;
  toDate: string;
}

interface ReportResponse {
  data: any[];
  totalCount: number;
  currentPage: number;
  sumReports: number;
}

interface FinancialReportParams {
  userIds: string[];
  doctorIds: string[];
  fromDate: string;
  toDate: string;
  insuranceCompanyId: string;
  feeStatus: string;
}

interface FinancialReportResponse {
  data: any[];
  totalCount: number;
  currentPage: number;
  sumReports: number;
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

export const getHospitalReport = async (params: ReportParams): Promise<ReportResponse> => {
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

    const url = `${BASE_URL}/reporting/hospitalReporting`;

    const response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.data.data || !response.data.data.report) {
      return { data: [], totalCount: 0, currentPage: 1, sumReports: 0 };
    }

    return { data: response.data.data.report, totalCount: response.data.totalCount, currentPage: 1, sumReports: response.data.data.sumOfReport };
  } catch (error: any) {
    console.error("Error fetching hospital report:", error.response?.data || error.message);
    throw error;
  }
};

export const getFinancialReport = async (params: FinancialReportParams): Promise<FinancialReportResponse> => {
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

    const url = `${BASE_URL}/reporting/financialReportingDetails`;

    const response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data
  } catch (error: any) {
    console.error("Error fetching financial report:", error.response?.data || error.message);
    throw error;
  }
};
