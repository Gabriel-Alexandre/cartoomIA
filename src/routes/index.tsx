import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { AppRoutes } from './app.routes';
import { SafeAreaView } from 'react-native';

export function Routes() {

  return (
    <SafeAreaView style={{flex: 1}}>
      <NavigationContainer>
          {<AppRoutes />}
      </NavigationContainer>
    </SafeAreaView>
  )
}