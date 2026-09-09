import { Platform } from "react-native";


export const stackNavigation = () =>{
    switch(Platform.OS){
        case "ios":
            return "ios_from_right"
        case "android":
            return "slide_from_right"
        case "windows":
        case "macos":
        case "web":
    }
}