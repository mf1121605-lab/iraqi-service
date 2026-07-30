import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import ConfigErrorScreen from './src/components/ConfigErrorScreen';
import SplashRouteScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import EmployeeDashboardScreen from './src/screens/EmployeeDashboardScreen';
import FounderDashboardScreen from './src/screens/FounderDashboardScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import AdminCategoriesScreen from './src/screens/AdminCategoriesScreen';
import ComingSoonScreen from './src/screens/ComingSoonScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import ChatScreen from './src/screens/ChatScreen';
import RequestDetailScreen from './src/screens/RequestDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ServiceDetailScreen from './src/screens/ServiceDetailScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();

const hasSupabaseConfig = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [updateMessage, setUpdateMessage] = useState('يُجرى البحث عن نسخة جديدة...');

  useEffect(() => {
    let isMounted = true;

    async function bootstrapApp() {
      try {
        if (!hasSupabaseConfig) {
          return;
        }

        if (__DEV__) {
          return;
        }

        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) {
          return;
        }

        if (isMounted) setUpdateMessage('يُجرى تحميل التحديث الجديد...');
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (error) {
        console.warn('App bootstrap failed', error);
      } finally {
        if (isMounted) setLoading(false);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    bootstrapApp();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!hasSupabaseConfig) {
    return <ConfigErrorScreen />;
  }

  if (loading) {
    return <LoadingScreen message={updateMessage} />;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashRouteScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} />
          <Stack.Screen name="FounderDashboard" component={FounderDashboardScreen} />
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
          <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
          <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
          <Stack.Screen name="Requests" component={RequestsScreen} />
          <Stack.Screen name="Services" component={ServicesScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
