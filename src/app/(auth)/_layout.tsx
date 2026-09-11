import { stackNavigation } from '@/constants/navigationAnimations'
import { Stack } from 'expo-router'

const AuthLayout = () => {
    return (
        <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="account-type" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
        </Stack>
    )
}

export default AuthLayout
