import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '@/contexts/authContext';
const IndexComponent: React.FC = () => {
  const { signOut } = useAuth();

  return (
    <View>
      <Text>index</Text>
      <Button title="Logout" onPress={() => signOut()} />
    </View>
  );
};

export default IndexComponent;
