import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import ChatScreen from './src/screens/ChatScreen';
import RequestDetailScreen from './src/screens/RequestDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ServiceDetailScreen from './src/screens/ServiceDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
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
