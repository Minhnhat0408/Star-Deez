import { Stack } from "expo-router";

const TabRankingLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Detail statistic",
          headerTransparent: false,
          contentStyle: {
            backgroundColor: "white",
          },
          headerTitleAlign: "center",
        }}
        name="(tabs)"
      />
    </Stack>
  );
};

export default TabRankingLayout;
