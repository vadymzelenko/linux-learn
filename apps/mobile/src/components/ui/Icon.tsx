import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Content uses neutral icon ids; map them to the bundled icon set. */
const MAP: Record<string, MciName> = {
  compass: 'compass-outline',
  folder: 'folder-outline',
  'file-text': 'file-document-outline',
  search: 'magnify',
  lock: 'lock-outline',
  zap: 'lightning-bolt-outline',
  terminal: 'console',
  'book-open': 'book-open-variant',
  'git-merge': 'source-merge',
  'eye-off': 'eye-off-outline',
  award: 'medal-outline',
  crown: 'crown-outline',
  flag: 'flag-outline',
  shield: 'shield-check-outline',
  flame: 'fire',
  calendar: 'calendar-check-outline',
  target: 'target',
  hash: 'pound',
  key: 'key-variant',
  map: 'map-outline',
  moon: 'weather-night',
  'alert-triangle': 'alert-outline',
  bomb: 'bomb',
  'graduation-cap': 'school-outline',
  check: 'check',
  'check-circle': 'check-circle',
  circle: 'circle-outline',
  'chevron-right': 'chevron-right',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  'chevron-left': 'chevron-left',
  x: 'close',
  play: 'play',
  refresh: 'refresh',
  settings: 'cog-outline',
  plus: 'plus',
  trash: 'trash-can-outline',
  edit: 'pencil-outline',
  bulb: 'lightbulb-on-outline',
  star: 'star',
  learn: 'school-outline',
  sandbox: 'console-line',
  practice: 'dumbbell',
  profile: 'account-circle-outline',
  share: 'share-variant',
  info: 'information-outline',
  lockClosed: 'lock',
  explain: 'text-search',
  reference: 'book-alphabet',
  repeat: 'repeat',
};

export function Icon({ name, size = 22, color }: { name: string; size?: number; color: string }) {
  return <MaterialCommunityIcons name={MAP[name] ?? (name as MciName)} size={size} color={color} />;
}
