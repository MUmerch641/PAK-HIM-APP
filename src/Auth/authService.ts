import Toast from "react-native-toast-message";
import { api, setAuthToken } from "../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

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
  userType: string[];
  projectId: string;
  userId: string;
  extra: Record<string, any>;
  phonNumber: string;
  emailVerificationToken: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  roles: number[];
  photoUrl: string;
  token: string;
}

// Type for the API response structure when logging in or signing up
export interface ApiResponse {
  isSuccess: boolean;
  data: UserData;
  message: string;
}

// Type for the user profile data returned from the API
export interface UserProfileResponse {
  isSuccess: boolean;
  data: UserProfileData;
  message: string;
}

export interface UserProfileData {
  _id: string;
  fullName: string;
  dob?: string;
  gender?: string;
  phonNumber: string;
  nationality?: string;
  city?: string;
  cnic?: string;
  email: string;
  userCategoryId?: string;
  canLogin: boolean;
  haveOpd?: boolean;
  userType: string[];
  projectId: string;
  userId: string;
  extra: Record<string, any>;
  assingDoctors?: string[];
  assingReceiptionest?: string[];
  jobType?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  userCategory?: string;
  doctorDetails?: DoctorDetail[];
  dr_details?: DoctorDetail;
  accessConfigurations?: AccessConfigurations;
  photoUrl?: string;
}

interface DoctorDetail {
  _id: string;
  specialization: string;
  photoUrl?: string;
  weeklySchedule?: WeeklySchedule[];
  doctorId: string;
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  slotIntervalTime?: number;
}

interface WeeklySchedule {
  day: string;
  timingScheedules: TimeSchedule[];
}

interface TimeSchedule {
  timeFrom: string;
  timeTo: string;
}

interface AccessConfigurations {
  appointment?: ModulePermissions;
  employee?: ModulePermissions;
  reports?: ModulePermissions;
  insurance?: ModulePermissions;
  counter?: ModulePermissions;
  deleteHistory?: ModulePermissions;
}

interface ModulePermissions {
  view_module?: boolean;
  [key: string]: boolean | undefined;
}

// Type for the project profile API response
export interface ProjectProfileResponse {
  isSuccess: boolean;
  data: ProjectProfileData;
  message: string;
}

export interface ProjectProfileData {
  projectId: string;
  departmentsAccess: {
    online_appointment?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

// Function to log in the user
export const loginUser = async (
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<UserData | null> => {
  try {
    const response = await api.post<ApiResponse>("/auth/login", {
      email,
      password,
    });

    if (!response.data.isSuccess || !response.data.data) {
      throw new Error(response.data.message || "Login failed");
    }

    const userData = response.data.data;

    await AsyncStorage.setItem("authToken", userData.token);
    setAuthToken(userData.token);

    await AsyncStorage.setItem("userData", JSON.stringify(userData));

    if (rememberMe) {
      await AsyncStorage.setItem("rememberMe", "true");
      await AsyncStorage.setItem("rememberedEmail", email);
    } else {
      await AsyncStorage.removeItem("rememberMe");
      await AsyncStorage.removeItem("rememberedEmail");
    }

    return userData;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
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
    );

    if (!response.data.isSuccess || !response.data.data) {
      throw new Error(response.data.message || "Sign up failed");
    }

    const userData = response.data.data;

    await AsyncStorage.setItem("authToken", userData.token);
    setAuthToken(userData.token);

    await AsyncStorage.setItem("userData", JSON.stringify(userData));

    Toast.show({
      type: "success",
      position: "bottom",
      text1: "Success",
      text2: "Sign-up successful!",
    });

    return userData;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
    Toast.show({
      type: "error",
      position: "bottom",
      text1: "Error",
      text2: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// Function to check if a user has "Remember Me" enabled
export const checkRememberedUser = async (): Promise<UserData | null> => {
  try {
    const isRemembered = await AsyncStorage.getItem("rememberMe");
    if (isRemembered === "true") {
      const token = await AsyncStorage.getItem("authToken");
      const userDataString = await AsyncStorage.getItem("userData");
      
      if (token && userDataString) {
        const userData = JSON.parse(userDataString);
        setAuthToken(token);
        return userData;
      }
    }
    return null;
  } catch (error) {
    console.error("Error checking remembered user:", error);
    return null;
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
    await AsyncStorage.removeItem("rememberMe");
    await AsyncStorage.removeItem("rememberedEmail");
    setAuthToken(null);
    router.replace("/Login");
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
    console.error("Full error object:", error);
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

// Function to get the user profile
export const getUserProfile = async (): Promise<UserProfileData | null> => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      throw new Error("No authentication token found");
    }

    setAuthToken(token);
    const response = await api.get<UserProfileResponse>("/users/getUserProfile");

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to fetch user profile");
    }

    await AsyncStorage.setItem("userProfileData", JSON.stringify(response.data.data));
    
    return response.data.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to fetch user profile";
    Toast.show({
      type: "error",
      text1: "Error",
      text2: errorMessage,
    });
    console.error("Error fetching user profile:", error);
    return null;
  }
};

// Function to get the project profile
export const getProjectProfile = async (): Promise<ProjectProfileData | null> => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      throw new Error("No authentication token found");
    }

    setAuthToken(token);
    const response = await fetch("https://pakhims.com/admin-api/projects/getProjectProfile", {
      method: "GET",
      headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await AsyncStorage.getItem("authToken")}`
      }
    }).then(res => res.json());
    if (!response.isSuccess) {
      throw new Error(response.data.message || "Failed to fetch project profile");
    }

    // await AsyncStorage.setItem("projectProfileData", JSON.stringify(response.data.data));
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to fetch project profile";
    Toast.show({
      type: "error",
      text1: "Error",
      text2: errorMessage,
    });
    console.error("Error fetching project profile:", error);
    return null;
  }
};