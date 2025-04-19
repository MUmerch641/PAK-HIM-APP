import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/utils/ThemeContext';

export default function TabLayout() {
  const { currentColors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Appointment: focused ? 'calendar' : 'calendar-outline',
            Report: focused ? 'stats-chart' : 'stats-chart-outline',
            DeletedHistory: focused ? 'trash' : 'trash-outline',
            User: focused ? 'person' : 'person-outline',
          };

          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: currentColors.activeTabBackground,
        tabBarInactiveTintColor: 'gray', // Changed to 'gray'
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
        },
        tabBarStyle: {
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
          backgroundColor: currentColors.tabBackground,
        },
      })}
    >
      <Tabs.Screen
        name="Appointment"
        options={{
          title: "Appointment",
        }}
      />
      <Tabs.Screen
        name="Report"
        options={{
          title: "Report",
        }}
      />
      <Tabs.Screen
        name="DeletedHistory"
        options={{
          title: "Delete History",
        }}
      />
      <Tabs.Screen
        name="User"
        options={{
          title: "User",
        }}
      />

    </Tabs>
  );
}