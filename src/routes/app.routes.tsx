import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Home } from '../views/Home';
import { FaceRegistrationScreen } from '../views/FaceRegistrationScreen';
import { FaceValidationScreen } from '../views/FaceValidationScreen';


const Screen = createNativeStackNavigator();

export function AppRoutes() {
  return (
    <Screen.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Screen.Screen name="home" component={Home} />
      <Screen.Screen name="faceRegistrationScreen" component={FaceRegistrationScreen} />
      <Screen.Screen name="faceValidationScreen" component={FaceValidationScreen} />
    </Screen.Navigator>
  );
}