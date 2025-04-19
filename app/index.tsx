import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { checkRememberedUser } from '../src/Auth/authService'; // Adjust path if needed

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if there's a remembered user
        const userData = await checkRememberedUser();
        
        // Wait a bit to show the splash screen
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (userData) {
          // User was remembered, go directly to the main app
          router.replace('/(tab)/Appointment');
        } else {
          // No remembered user, go to login
          
          router.replace('/Login');
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        router.replace('/Login');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Pak Hims</Text>
      <ActivityIndicator color="white" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'blue',
  },
  text: {
    color: 'white',
    fontSize: 24,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  }
});