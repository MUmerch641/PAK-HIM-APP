import Toast from "react-native-toast-message";
import { api, setAuthToken } from "../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router"; // Ensure you have the router set up correctly
// types.ts

// Type for the sign-up form payload
export interface SignUpPayload {
  officialEmail: string;
  password: string;
  hospitalName: string;
  phoneNo: string;
  address: string;
  hospitalLicense?: string;
}

// Type for the user data returned from the API after a successful login or sign-up
export interface UserData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string[]; // An array of user types (e.g., ["admin", "user"])
  projectId: string;
  userId: string;
  extra: Record<string, any>; // Any extra information related to the user
  phonNumber: string;
  emailVerificationToken: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  roles: number[]; // Array of role IDs assigned to the user
  photoUrl: string; // URL to the user's photo
  token: string; // JWT token for authentication
}

// Type for the API response structure when logging in or signing up
export interface ApiResponse {
  isSuccess: boolean; // Whether the API call was successful
  data: UserData; // The user data returned upon success
  message: string; // Message indicating success or failure
}

// Function to log in the user
export const loginUser = async (
  email: string,
  password: string
): Promise<UserData | null> => {
  try {
    const response = await api.post<ApiResponse>("/auth/login", {
      email,
      password,
    });

    // Check if the response indicates success
    if (!response.data.isSuccess || !response.data.data) {
      throw new Error(response.data.message || "Login failed");
    }

    const userData = response.data.data;

    // Store token and set axios header
    await AsyncStorage.setItem("authToken", userData.token);
    setAuthToken(userData.token);

    // Store user data for future use
    await AsyncStorage.setItem("userData", JSON.stringify(userData));
    return userData;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "An unknown error occurred";
    Toast.show({
      type: "error",
      text1: "Login Error",
      text2: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// Function to sign up the user
export const signUpUser = async (
  signUpData: SignUpPayload
): Promise<UserData | null> => {
  try {
    const response = await api.post<ApiResponse>(
      "/auth/registerNewProject",
      signUpData
    ); // Replace with your actual signup endpoint
    // Check if the response indicates success
    if (!response.data.isSuccess || !response.data.data) {
      throw new Error(response.data.message || "Sign up failed");
    }

    const userData = response.data.data;

    // Store token and set axios header
    await AsyncStorage.setItem("authToken", userData.token);
    setAuthToken(userData.token);

    // Store user data for future use
    await AsyncStorage.setItem("userData", JSON.stringify(userData));

    // Show success message using Toast
    Toast.show({
      type: "success",
      position: "bottom",
      text1: "Success",
      text2: "Sign-up successful!",
    });

    return userData;
  } catch (error: any) {

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "An unknown error occurred";
    console.error("Sign up error:", errorMessage);

    // Show error message using Toast
    Toast.show({
      type: "error",
      position: "bottom",
      text1: "Error",
      text2: errorMessage,
    });

    throw new Error(errorMessage);
  }
};

// Optional: Helper function to check if the user is logged in
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    const userDataString = await AsyncStorage.getItem("userData");

    if (token && userDataString) {
      const userData = JSON.parse(userDataString);
      setAuthToken(token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Auth status check failed:", error);
    return false;
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("userData");
    setAuthToken(null);
    router.replace("/Login"); // Redirect to login page or anywhere you want
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Logout Error",
      text2: "Logout failed",
    });
  }
};

// Function to handle password reset requests
export const forgetPassword = async (email: string): Promise<any> => {
  try {
    const response = await api.post<ApiResponse>("/auth/forgetPassword", {
      email,
    });
    return response.data;
  } catch (error: any) {
    // console.error("Error sending reset password link: ", error.response?.data || error.message);
    throw error;
  }
};


export const verifyToken = async (
  email: string,
  token: string
): Promise<any> => {
  try {

    const response = await api.post<ApiResponse>("/auth/verifyToken", {
      email,
      token,
    });

    return response.data;
  } catch (error: any) {
    console.error("Full error object:", error); // Log full error
    console.error("Error response data:", error.response?.data);
    console.error("Error message:", error.message);
    throw error;
  }
};


export const resetPassword = async (email: string, token: string, newPassword: string): Promise<any> => {
  try {
    const response = await api.post<ApiResponse>("/auth/resetPassword", {
      email,
      token,
      newPassword
    });
    return response.data;
  } catch (error: any) {
    console.error("Error resetting password: ", error.response?.data || error.message);
    throw error;
  }
};