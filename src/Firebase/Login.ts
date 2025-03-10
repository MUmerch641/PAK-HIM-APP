import Toast from 'react-native-toast-message';
import { loginUser } from "../Auth/authService";
import { router } from "expo-router";

export const login = async (email: string, password: string) => {
  try {
    const userData = await loginUser(email, password);

    if (userData) {
      router.replace("/(tab)/Appointment");
    }
  } catch (error) {
    if (error instanceof Error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unknown error occurred',
      });
    }
  }
};
