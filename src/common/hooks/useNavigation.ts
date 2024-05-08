import {
  NavigationProp,
  useNavigation as useNavigationNative,
} from '@react-navigation/native';
import { FileManagerNavigation } from '../types/navigation';

export const useNavigation: typeof useNavigationNative<
  NavigationProp<FileManagerNavigation>
> = useNavigationNative;
