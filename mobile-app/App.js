import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Updates from 'expo-updates';
import SplashScreen from './src/screens/SplashScreen';
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

const Stack = createNativeStackNavigator();

function UpdateSplash({ message }) {
  return (
    <SafeAreaView style={styles.updateContainer}>
      <View style={styles.updateCenter}>
        <ActivityIndicator size="large" color="#e6ab2c" />
        <Text style={styles.updateTitle}>جارٍ تحديث التطبيق</Text>
        <Text style={styles.updateMessage}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(true);
  const [updateMessage, setUpdateMessage] = useState('يُجرى البحث عن نسخة جديدة...');

  useEffect(() => {
    let isMounted = true;

    async function ensureLatestVersion() {
      try {
        if (__DEV__) {
          if (isMounted) setIsCheckingUpdate(false);
          return;
        }

        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) {
          if (isMounted) setIsCheckingUpdate(false);
          return;
        }

        setUpdateMessage('يُجرى تحميل التحديث الجديد...');
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (error) {
        console.warn('Auto-update failed', error);
        if (isMounted) setIsCheckingUpdate(false);
      }
    }

    ensureLatestVersion();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingUpdate) {
    return <UpdateSplash message={updateMessage} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
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
  );
}

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  updateCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  updateTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  updateMessage: {
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
