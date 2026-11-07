import { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DirNode, FsNode, Session } from '@linux-learn/engine';
import { useTheme, MONO, space } from '../theme';
import { Icon } from './ui/Icon';
import { Text } from '../theme/Text';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

function nodeAt(root: DirNode, path: string): FsNode | null {
  let n: FsNode = root;
  for (const part of path.split('/').filter(Boolean)) {
    if (n.type !== 'dir') return null;
    const next: FsNode | undefined = n.children[part];
    if (!next) return null;
    n = next;
  }
  return n;
}

function human(n: FsNode): string {
  if (n.type !== 'file') return '';
  const b = n.fakeSize ?? new TextEncoder().encode(n.content).length;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(0)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}

function iconFor(name: string, n: FsNode): { icon: string; tint: 'dir' | 'link' | 'exec' | 'file' } {
  if (n.type === 'dir') return { icon: 'folder', tint: 'dir' };
  if (n.type === 'symlink') return { icon: 'link-variant', tint: 'link' };
  if (n.mode & 0o111) return { icon: 'console', tint: 'exec' };
  if (/\.(png|jpe?g|gif|svg)$/i.test(name)) return { icon: 'image-outline', tint: 'file' };
  if (/\.(mp4|mkv|mov)$/i.test(name)) return { icon: 'movie-outline', tint: 'file' };
  if (/\.(gz|zip|tar)$/i.test(name)) return { icon: 'zip-box-outline', tint: 'file' };
  if (/\.log(\.\d+)?$/i.test(name)) return { icon: 'text-box-search-outline', tint: 'file' };
  return { icon: 'file-document-outline', tint: 'file' };
}

/**
 * A friendly file-manager view of the machine instead of `tree` output:
 * where you are, then folders (tap to open) and files with sizes. Hidden
 * files are behind a switch so beginners are not overwhelmed.
 */
export function MachineView({ session, compact }: { session: Session; compact?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const home = session.machine.users.find((u) => u.name === session.user)?.home ?? '/home/student';
  const cwd = session.cwd;
  const where = cwd === home ? '~' : cwd.startsWith(home + '/') ? '~' + cwd.slice(home.length) : cwd;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState(false);
  const dir = useMemo(() => nodeAt(session.machine.fs, cwd), [session, cwd]);

  if (!dir || dir.type !== 'dir') return null;
  const all = Object.entries(dir.children).sort(([a, x], [b, y]) => (x.type === 'dir' ? 0 : 1) - (y.type === 'dir' ? 0 : 1) || a.localeCompare(b));
  const hiddenCount = all.filter(([n]) => n.startsWith('.')).length;
  const items = all.filter(([n]) => hidden || !n.startsWith('.'));
  const tint = { dir: theme.term.path, link: theme.term.ansi[6]!, exec: theme.success, file: theme.textDim };

  const toggle = (path: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setOpen((o) => ({ ...o, [path]: !o[path] }));
  };

  const row = (name: string, n: FsNode, path: string, depth: number) => {
    const ic = iconFor(name, n);
    const isDir = n.type === 'dir';
    const kids = isDir ? Object.entries((n as DirNode).children).filter(([k]) => hidden || !k.startsWith('.')).sort(([a], [b]) => a.localeCompare(b)) : [];
    return (
      <View key={path}>
        <Pressable
          onPress={isDir ? () => toggle(path) : undefined}
          disabled={!isDir}
          accessibilityRole={isDir ? 'button' : 'text'}
          accessibilityLabel={`${isDir ? t('machine.folder') : t('machine.file')} ${name}`}
          accessibilityState={isDir ? { expanded: !!open[path] } : undefined}
          style={({ pressed }) => [styles.row, { paddingLeft: 8 + depth * 22, backgroundColor: pressed ? theme.surface2 : 'transparent' }]}
        >
          <Icon name={ic.icon === 'folder' && open[path] ? 'folder-open-outline' : ic.icon} size={18} color={tint[ic.tint]} />
          <Text style={[styles.name, { color: isDir ? theme.term.path : theme.text }]} numberOfLines={1}>
            {name}
            {isDir ? '/' : ''}
          </Text>
          {n.type === 'symlink' ? <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>→ {n.target}</Text> : null}
          <Text style={{ color: theme.textDim, fontSize: 12, marginLeft: 'auto' }}>{isDir ? t('machine.items', { count: kids.length }) : human(n)}</Text>
          {isDir && kids.length ? <Icon name={open[path] ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} /> : null}
        </Pressable>
        {isDir && open[path] ? (kids.length ? kids.map(([k, c]) => row(k, c, `${path}/${k}`, depth + 1)) : <Text style={{ color: theme.textDim, paddingLeft: 38 + depth * 22, paddingVertical: 4, fontSize: 13 }}>{t('machine.empty')}</Text>) : null}
      </View>
    );
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.here, { backgroundColor: theme.surface2 }]}>
        <Icon name="map-marker-outline" size={18} color={theme.accent} />
        <Text style={{ color: theme.text, flex: 1 }}>
          {t('machine.youAreIn')} <Text style={{ fontFamily: MONO, color: theme.term.path }}>{where}</Text>
          {where === '~' ? <Text style={{ color: theme.textDim }}> · {t('machine.home')}</Text> : null}
        </Text>
      </View>
      <View style={[styles.list, { borderColor: theme.border }]}>
        {items.length ? items.slice(0, compact ? 12 : 60).map(([n, c]) => row(n, c, `${cwd === '/' ? '' : cwd}/${n}`, 0)) : <Text style={{ color: theme.textDim, padding: 10 }}>{t('machine.empty')}</Text>}
      </View>
      {hiddenCount ? (
        <Pressable onPress={() => setHidden(!hidden)} accessibilityRole="switch" accessibilityState={{ checked: hidden }} hitSlop={6} style={styles.hiddenBtn}>
          <Icon name={hidden ? 'eye-off' : 'eye-outline'} size={16} color={theme.textDim} />
          <Text style={{ color: theme.textDim, fontSize: 13 }}>{hidden ? t('machine.hideHidden') : t('machine.showHidden', { count: hiddenCount })}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  here: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingRight: 10, minHeight: 36 },
  name: { fontFamily: MONO, fontSize: 14, flexShrink: 1 },
  hiddenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
});
