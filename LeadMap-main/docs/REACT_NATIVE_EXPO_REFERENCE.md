# React Native & Expo Development Reference Index

This document serves as a comprehensive reference index for React Native and Expo development, including TypeScript best practices, mobile UI guidelines, and common patterns. Use this when debugging or developing React Native/Expo applications.

## Table of Contents

1. [TypeScript Best Practices](#typescript-best-practices)
2. [Expo Configuration](#expo-configuration)
3. [React Navigation](#react-navigation)
4. [Performance Optimization](#performance-optimization)
5. [Safe Area Management](#safe-area-management)
6. [State Management](#state-management)
7. [Error Handling & Validation](#error-handling--validation)
8. [Testing](#testing)
9. [Security](#security)
10. [Internationalization (i18n)](#internationalization-i18n)
11. [Animations & Gestures](#animations--gestures)
12. [UI & Styling](#ui--styling)

---

## TypeScript Best Practices

### Strict Mode

**Enable Strict Mode**:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This enables:
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

### Interfaces for Props and State

**Define Explicit Interfaces**:
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface UserProfileProps {
  user: User;
  onEdit: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onEdit }) => {
  return (
    <View>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
      <Button onPress={() => onEdit(user)} title="Edit" />
    </View>
  );
};
```

### Functional Components with Hooks

**Prefer Functional Components**:
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';

interface CounterProps {
  initialCount: number;
}

const Counter: React.FC<CounterProps> = ({ initialCount }) => {
  const [count, setCount] = useState<number>(initialCount);

  useEffect(() => {
    // Side effects here
    console.log('Count changed:', count);
  }, [count]);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button onPress={() => setCount(count + 1)} title="Increment" />
    </View>
  );
};
```

### Avoid `any` Type

**Use Specific Types or `unknown`**:
```typescript
// Bad
function processData(data: any) {
  return data.value;
}

// Good
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data structure');
}
```

### TypeScript Utility Types

**Leverage Utility Types**:
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Partial - all properties optional
type PartialUser = Partial<User>;

// Readonly - all properties readonly
type ReadonlyUser = Readonly<User>;

// Record - key-value mapping
type UserRecord = Record<number, User>;

// Pick - select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit - exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;
```

### Keep Type Definitions Updated

- Regularly update type definitions to align with React Native and library versions
- Use DefinitelyTyped (`@types/`) for type definitions of popular libraries
- Maintain compatibility and type safety

**Resources**:
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- React TypeScript Cheatsheet: https://react-typescript-cheatsheet.netlify.app/

---

## Expo Configuration

### App Configuration Files

**Supported Formats**:
- `app.json` - Static configuration
- `app.config.js` - Dynamic JavaScript configuration
- `app.config.ts` - Dynamic TypeScript configuration

**Key Properties**:
```typescript
// app.config.ts
export default {
  name: 'My App',
  slug: 'my-app',
  version: '1.0.0',
  extra: {
    apiUrl: process.env.API_URL,
    fact: 'kittens are cool',
  },
};
```

**Access in App**:
```typescript
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

### Environment Variables

**Setting Environment Variables**:
```bash
# In shell
MY_ENVIRONMENT=production eas update

# Or in .env file
API_URL=https://api.example.com
```

**Using in Config**:
```typescript
export default {
  name: process.env.APP_NAME || 'My App',
  version: process.env.APP_VERSION || '1.0.0',
};
```

### EAS Metadata

**Store Configuration** (`store.config.json`):
```json
{
  "ios": {
    "config": {
      "usesNonExemptEncryption": false
    }
  },
  "android": {
    "config": {
      "versionCode": 1
    }
  }
}
```

### Managed Credentials

- Expo can automatically manage app signing credentials
- Simplifies build and submission process
- Documentation: https://docs.expo.dev/app-signing/managed-credentials/

**Official Documentation**:
- Configuration: https://docs.expo.dev/workflow/configuration/
- Environment Variables: https://docs.expo.dev/eas/using-environment-variables/
- EAS Metadata: https://docs.expo.dev/eas/metadata/config/

---

## React Navigation

### Best Practices

1. **Minimize Navigator Nesting**: Keep navigation hierarchy flat
2. **Manage Headers**: Hide parent headers when nesting navigators
3. **Consistent Structure**: Maintain consistent navigation patterns
4. **Optimize Performance**: Avoid deeply nested navigators
5. **Handle Deep Linking**: Configure deep linking for better UX
6. **Customize Drawer Content**: Keep drawer options focused and logical

### Stack Navigator

```typescript
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}
```

### Tab Navigator

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
```

### Navigation Hooks

```typescript
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

function MyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  useFocusEffect(
    useCallback(() => {
      // Screen focused
      return () => {
        // Screen unfocused
      };
    }, [])
  );
  
  return (
    <Button
      onPress={() => navigation.navigate('Details', { id: 123 })}
      title="Go to Details"
    />
  );
}
```

### Deep Linking

```typescript
// app.json
{
  "expo": {
    "scheme": "myapp",
    "ios": {
      "associatedDomains": ["applinks:myapp.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "myapp.com"
            }
          ]
        }
      ]
    }
  }
}
```

**Official Documentation**:
- React Navigation: https://reactnavigation.org/
- Nesting Navigators: https://reactnavigation.org/docs/nesting-navigators/
- Deep Linking: https://reactnavigation.org/docs/deep-linking/

---

## Performance Optimization

### useMemo

**Memoize Expensive Computations**:
```typescript
import { useMemo } from 'react';

function ExpensiveComponent({ data }: { data: Data[] }) {
  const processedData = useMemo(() => {
    // Expensive computation
    return data.map(item => ({
      ...item,
      processed: expensiveOperation(item),
    }));
  }, [data]);

  return <DisplayComponent data={processedData} />;
}
```

### useCallback

**Memoize Function References**:
```typescript
import { useCallback } from 'react';

function ParentComponent() {
  const handlePress = useCallback(() => {
    console.log('Button pressed');
  }, []);

  return <ChildComponent onPress={handlePress} />;
}

const ChildComponent = React.memo(({ onPress }: { onPress: () => void }) => {
  return <Button onPress={onPress} title="Click me" />;
});
```

### React.memo

**Memoize Components**:
```typescript
import React from 'react';

const ChildComponent = React.memo(({ value }: { value: string }) => {
  return <Text>{value}</Text>;
}, (prevProps, nextProps) => {
  // Custom comparison function (optional)
  return prevProps.value === nextProps.value;
});
```

### Image Optimization

**Using expo-image**:
```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  transition={200}
/>
```

### Code Splitting

**Lazy Loading Components**:
```typescript
import { Suspense, lazy } from 'react';
import { View, ActivityIndicator } from 'react-native';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <LazyComponent />
    </Suspense>
  );
}
```

### Performance Monitoring

- Use React Native's built-in performance tools
- Use Expo's debugging features
- Monitor bundle size
- Profile with React DevTools Profiler

**Resources**:
- React Performance: https://react.dev/learn/render-and-commit
- React Native Performance: https://reactnative.dev/docs/performance

---

## Safe Area Management

### SafeAreaProvider

**Wrap App Root**:
```typescript
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* Your app */}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

### useSafeAreaInsets Hook

**Precise Control**:
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

function MyComponent() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        flex: 1,
      }}
    >
      {/* Content */}
    </View>
  );
}
```

### SafeAreaView

**Simple Wrapper**:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

function MyScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Content */}
    </SafeAreaView>
  );
}
```

### SafeAreaScrollView

**Scrollable Content**:
```typescript
import { SafeAreaScrollView } from 'react-native-safe-area-context';

function ScrollableScreen() {
  return (
    <SafeAreaScrollView>
      {/* Scrollable content */}
    </SafeAreaScrollView>
  );
}
```

### Best Practices

1. **Avoid Nesting**: Don't nest multiple `SafeAreaView` components
2. **Use Hook for Flexibility**: Prefer `useSafeAreaInsets` for animations
3. **Handle Modals Separately**: Wrap modal content with `SafeAreaProvider`
4. **Test Across Devices**: Test on devices with notches and different orientations

**Official Documentation**:
- react-native-safe-area-context: https://github.com/th3rdwave/react-native-safe-area-context

---

## State Management

### React Context and useReducer

**Simple Global State**:
```typescript
import React, { createContext, useContext, useReducer } from 'react';

interface AppState {
  theme: 'light' | 'dark';
  user: User | null;
}

type AppAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_USER'; payload: User | null };

const initialState: AppState = {
  theme: 'light',
  user: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

### Zustand

**Lightweight State Management**:
```typescript
import create from 'zustand';

interface BearState {
  bears: number;
  increase: () => void;
  decrease: () => void;
}

const useBearStore = create<BearState>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  decrease: () => set((state) => ({ bears: state.bears - 1 })),
}));

// Usage
function BearCounter() {
  const bears = useBearStore((state) => state.bears);
  const increase = useBearStore((state) => state.increase);
  
  return (
    <View>
      <Text>{bears} bears</Text>
      <Button onPress={increase} title="Add bear" />
    </View>
  );
}
```

### React Query

**Data Fetching and Caching**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error loading user</Text>;

  return <Text>{data.name}</Text>;
}
```

### Best Practices

1. **Start Simple**: Use local state, then Context, then external libraries
2. **Colocate State**: Keep state close to components that use it
3. **Separate Business Logic**: Keep business logic separate from UI
4. **Normalize Large Data**: Normalize datasets for better performance
5. **Avoid Mutations**: Always return new state objects

**Resources**:
- Zustand: https://github.com/pmndrs/zustand
- React Query: https://tanstack.com/query/latest
- Redux Toolkit: https://redux-toolkit.js.org/

---

## Error Handling & Validation

### Zod Runtime Validation

**Schema Definition**:
```typescript
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be 18 or older'),
});

// Parse and validate
try {
  const validated = userSchema.parse(userData);
  // Use validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`${err.path}: ${err.message}`);
    });
  }
}
```

### Sentry Integration

**Setup**:
```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: true,
  debug: true,
  integrations: [
    new Sentry.ReactNativeTracing(),
  ],
});
```

**Capture Errors**:
```typescript
try {
  // Risky operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { section: 'user-profile' },
    extra: { userId: user.id },
  });
}
```

### Error Boundaries

**Global Error Boundary**:
```typescript
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View>
      <Text>Something went wrong:</Text>
      <Text>{error.message}</Text>
      <Button onPress={resetErrorBoundary} title="Try again" />
    </View>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Error Handling Patterns

**Early Returns**:
```typescript
function processUser(user: User | null) {
  if (!user) {
    return null;
  }
  
  if (!user.email) {
    throw new Error('User email is required');
  }
  
  // Process user
  return process(user);
}
```

**Resources**:
- Zod: https://zod.dev/
- Sentry Expo: https://docs.sentry.io/platforms/javascript/guides/react-native/
- Expo Error Reporter: https://docs.expo.dev/versions/latest/sdk/error-reporter/

---

## Testing

### Jest and React Native Testing Library

**Unit Test Example**:
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import Counter from './Counter';

describe('Counter', () => {
  it('increments count on button press', () => {
    const { getByText } = render(<Counter initialCount={0} />);
    
    const button = getByText('Increment');
    fireEvent.press(button);
    
    expect(getByText('Count: 1')).toBeTruthy();
  });
});
```

### Detox E2E Testing

**Detox Test Example**:
```typescript
describe('User Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

### Best Practices

1. **Test Behavior, Not Implementation**: Focus on what users see and do
2. **Keep Tests Fast**: Fast tests encourage frequent runs
3. **Mock External Dependencies**: Mock APIs, AsyncStorage, native modules
4. **Use Descriptive Names**: Clear test names improve maintainability
5. **Use Unique Test IDs**: Assign `testID` properties for reliable identification
6. **Keep Tests Isolated**: Each test should start from a known state

**Resources**:
- React Native Testing Library: https://callstack.github.io/react-native-testing-library/
- Detox: https://wix.github.io/Detox/
- Expo Testing: https://docs.expo.dev/develop/unit-testing/

---

## Security

### Secure Storage

**expo-secure-store**:
```typescript
import * as SecureStore from 'expo-secure-store';

// Save
await SecureStore.setItemAsync('token', 'secret-token');

// Retrieve
const token = await SecureStore.getItemAsync('token');

// Delete
await SecureStore.deleteItemAsync('token');
```

### Network Security

**HTTPS Only**:
```typescript
// Always use HTTPS
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

### Authentication

**OAuth2/OpenID Connect**:
```typescript
import * as AuthSession from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: 'https://auth.example.com/authorize',
  tokenEndpoint: 'https://auth.example.com/token',
};

const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: 'your-client-id',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri(),
  },
  discovery
);
```

### Code Obfuscation

- Use Metro bundler to minify code
- Use JavaScript obfuscators for production builds
- Remove debug code in production

**Resources**:
- Expo Security: https://docs.expo.dev/guides/security/
- expo-secure-store: https://docs.expo.dev/versions/latest/sdk/securestore/
- React Native Security: https://reactnative.dev/docs/security

---

## Internationalization (i18n)

### Setup with expo-localization

**Install Dependencies**:
```bash
npx expo install expo-localization
npm install i18n-js
```

**Translation Files**:
```json
// translations/en.json
{
  "welcome": "Welcome",
  "login": "Login",
  "signup": "Sign Up"
}

// translations/ar.json
{
  "welcome": "مرحباً",
  "login": "تسجيل الدخول",
  "signup": "إنشاء حساب"
}
```

**i18n Configuration**:
```typescript
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './translations/en.json';
import ar from './translations/ar.json';

const i18n = new I18n({
  en,
  ar,
});

i18n.locale = Localization.locale;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
```

### RTL Support

**Enable RTL**:
```typescript
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

if (Localization.isRTL) {
  I18nManager.forceRTL(true);
} else {
  I18nManager.forceRTL(false);
}

// Note: May require app restart for full effect
```

**Usage in Components**:
```typescript
import i18n from './i18n';

function WelcomeScreen() {
  return (
    <View>
      <Text>{i18n.t('welcome')}</Text>
      <Button title={i18n.t('login')} onPress={handleLogin} />
    </View>
  );
}
```

**Resources**:
- expo-localization: https://docs.expo.dev/versions/latest/sdk/localization/
- i18n-js: https://github.com/fnando/i18n-js

---

## Animations & Gestures

### React Native Reanimated

**Basic Animation**:
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function AnimatedBox() {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <Button
        onPress={() => {
          translateX.value = withSpring(100);
        }}
        title="Animate"
      />
    </Animated.View>
  );
}
```

### React Native Gesture Handler

**Pan Gesture**:
```typescript
import { GestureHandlerRootView, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

function DraggableBox() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.box, animatedStyle]} />
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
```

### Best Practices

1. **Run on UI Thread**: Reanimated runs on native UI thread for smooth performance
2. **Use Shared Values**: Use `useSharedValue` for animated values
3. **Combine with Gestures**: Use Gesture Handler with Reanimated for interactive animations
4. **Avoid JavaScript Thread**: Keep animations off the JavaScript thread

**Resources**:
- React Native Reanimated: https://docs.swmansion.com/react-native-reanimated/
- React Native Gesture Handler: https://docs.swmansion.com/react-native-gesture-handler/

---

## UI & Styling

### Responsive Design

**useWindowDimensions**:
```typescript
import { useWindowDimensions } from 'react-native';

function ResponsiveComponent() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={{
      flexDirection: isTablet ? 'row' : 'column',
      padding: isTablet ? 20 : 10,
    }}>
      {/* Content */}
    </View>
  );
}
```

### Dark Mode

**useColorScheme**:
```typescript
import { useColorScheme } from 'react-native';

function ThemedComponent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{
      backgroundColor: isDark ? '#000' : '#fff',
    }}>
      <Text style={{ color: isDark ? '#fff' : '#000' }}>
        Hello
      </Text>
    </View>
  );
}
```

### Styled Components

**Using styled-components**:
```typescript
import styled from 'styled-components/native';

const Container = styled.View`
  flex: 1;
  padding: 20px;
  background-color: ${props => props.theme.background};
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.theme.text};
`;

function MyScreen() {
  return (
    <Container>
      <Title>Hello World</Title>
    </Container>
  );
}
```

### Accessibility

**Native Accessibility Props**:
```typescript
<Button
  accessible={true}
  accessibilityLabel="Login button"
  accessibilityHint="Double tap to log in"
  accessibilityRole="button"
  onPress={handleLogin}
  title="Login"
/>

<Text
  accessible={true}
  accessibilityLabel="User name"
  accessibilityRole="text"
>
  {userName}
</Text>
```

**Resources**:
- React Native Styling: https://reactnative.dev/docs/style
- Styled Components: https://styled-components.com/
- React Native Accessibility: https://reactnative.dev/docs/accessibility

---

## Quick Reference Links

### Expo
- Official Documentation: https://docs.expo.dev/
- Configuration: https://docs.expo.dev/workflow/configuration/
- Security: https://docs.expo.dev/guides/security/
- Distribution: https://docs.expo.dev/distribution/introduction/
- Updates: https://docs.expo.dev/versions/latest/sdk/updates/

### React Native
- Official Documentation: https://reactnative.dev/
- React Navigation: https://reactnavigation.org/
- Performance: https://reactnative.dev/docs/performance

### TypeScript
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- React TypeScript Cheatsheet: https://react-typescript-cheatsheet.netlify.app/

---

*Last Updated: 2024*
*This reference index is maintained for React Native and Expo development best practices and troubleshooting.*
