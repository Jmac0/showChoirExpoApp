import { View, Text } from "react-native";
import React from "react";
import { useAuth } from "@/contexts/authContext";

const Resources = () => {
  const { name } = useAuth();
  return (
    <View>
      <Text>Resources for {name}</Text>
    </View>
  );
};

export default Resources;
