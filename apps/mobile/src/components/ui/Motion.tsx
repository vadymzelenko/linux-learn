import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

/** Native driver where it exists (the web build animates with JS). */
export const ND = Platform.OS !== 'web';

/**
 * Appears with a short fade + rise. `index` staggers items of a list
 * (each one 45 ms later, capped so long lists do not wait).
 */
export function FadeIn({ children, index = 0, delay = 0, from = 14, style, scale }: { children: ReactNode; index?: number; delay?: number; from?: number; style?: StyleProp<ViewStyle>; scale?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 360, delay: delay + Math.min(index, 10) * 45, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [v, index, delay]);
  const transform = [
    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
    { scale: scale ? v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) : 1 },
  ];
  return <Animated.View style={[style, { opacity: v, transform }]}>{children}</Animated.View>;
}

/** A step of a lesson slides in from the right when it changes. */
export function SlideIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, damping: 18, stiffness: 160, mass: 0.9, useNativeDriver: ND }).start();
  }, [v]);
  return (
    <Animated.View style={[{ flex: 1 }, style, { opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Shake for a wrong answer, pop for a right one: call the returned triggers. */
export function useFeedbackMotion() {
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  return {
    style: { transform: [{ translateX: shake }, { scale: pop }] },
    shake: () => {
      shake.setValue(0);
      Animated.sequence([10, -9, 7, -5, 3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 45, useNativeDriver: ND }))).start();
    },
    pop: () => {
      pop.setValue(0.94);
      Animated.spring(pop, { toValue: 1, friction: 3, tension: 220, useNativeDriver: ND }).start();
    },
  };
}

/** Scale-down on press for tappable surfaces. */
export function usePressScale(to = 0.97) {
  const s = useRef(new Animated.Value(1)).current;
  return {
    style: { transform: [{ scale: s }] },
    onPressIn: () => Animated.spring(s, { toValue: to, speed: 40, bounciness: 0, useNativeDriver: ND }).start(),
    onPressOut: () => Animated.spring(s, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: ND }).start(),
  };
}
