import { stackNavigation } from '@/constants/navigationAnimations'
import { Stack } from 'expo-router'

const AuthLayout = () => {
    return (
        <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="login" />
        </Stack>
    )
}

export default AuthLayout