import { Redirect } from 'expo-router'

const index = () => {
  return<Redirect href={"/(auth)/welcome"} />
}

export default index