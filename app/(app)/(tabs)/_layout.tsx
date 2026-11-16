import { Tabs } from 'expo-router';
import { BookOpen, User } from 'lucide-react-native';

interface TailwindColors {
  brand: string;
  white: string;
  line: string;
  'fg-muted': string;
}

interface TailwindThemeConfig {
  theme: {
    colors: TailwindColors;
    fontFamily: {
      'body-medium': string[];
    };
  };
}

// Small theme helper reading token hex and fonts from tailwind.config.js (BR-1)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../../tailwind.config') as TailwindThemeConfig;
const { colors, fontFamily } = tailwindConfig.theme;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors['fg-muted'],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily['body-medium'][0],
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
