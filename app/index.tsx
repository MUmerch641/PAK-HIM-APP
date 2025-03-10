import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.replace('/Login');
    }, 2000);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Pak Hims</Text>
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
  },
});
