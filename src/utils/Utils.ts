import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

export const scale = (size: number): number => width / guidelineBaseWidth * size;
export const verticalScale = (size: number): number => height / guidelineBaseHeight * size;
export const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;


