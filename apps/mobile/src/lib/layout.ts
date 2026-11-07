import { useWindowDimensions } from 'react-native';

/**
 * Screen classes for layout decisions (dp = density-independent pixels):
 * - phone S: 5" phones, ~320–360 wide, < 700 tall
 * - phone:   6–7" phones, 360–430 wide
 * - tablet:  shortest side ≥ 600
 */
export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const short = Math.min(width, height);
  const tablet = short >= 600;
  const landscape = width > height;
  return {
    width,
    height,
    tablet,
    landscape,
    /** Small phone or a phone in landscape: everything tighter. */
    compact: !tablet && (height < 700 || landscape),
    /** Two panes (task | terminal) side by side. */
    split: (tablet && landscape && width >= 900) || (landscape && width >= 600),
    /** Max width of readable content on big screens. */
    contentMax: tablet ? 760 : width,
    fontScale,
    pad: short < 360 ? 10 : tablet ? 20 : 14,
  };
}
