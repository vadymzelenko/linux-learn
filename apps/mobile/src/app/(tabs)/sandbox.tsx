import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createShell } from '@linux-learn/engine';
import { fixtures } from '@linux-learn/content';
import { MAX_MACHINES, useStore, type Machine } from '../../state/store';
import { useTheme, MONO, space } from '../../theme';
import { Button, Collapsible, FadeIn, H1, Icon, IconButton, Row, Screen } from '../../components/ui';
import { haptic } from '../../lib/haptics';
import { Terminal, useColumns } from '../../components/terminal/Terminal';
import { useShell } from '../../components/terminal/useShell';
import { Text } from '../../theme/Text';
import { confirmDialog, infoDialog } from '../../components/Dialog';

/** Machines to start from (git-fresh is a lesson-only copy of the website). */
const TEMPLATES = Object.keys(fixtures).filter((k) => k !== 'git-fresh');
const TPL_LOOK: Record<string, { icon: string; color: string }> = {
  'empty-home': { icon: 'terminal', color: '#3DDC84' },
  'home-basic': { icon: 'folder', color: '#5EA9FF' },
  'text-files': { icon: 'file-text', color: '#F5C451' },
  search: { icon: 'search', color: '#B48EF5' },
  permissions: { icon: 'lock', color: '#FF8A65' },
  system: { icon: 'activity', color: '#4DD0E1' },
  'noc-web01': { icon: 'server', color: '#7C9CFF' },
  'noc-busy': { icon: 'alert-octagon', color: '#FF6B6B' },
  'docker-lab': { icon: 'docker', color: '#4AA8FF' },
  'git-lab': { icon: 'git', color: '#F1502F' },
};
const look = (tpl: string) => TPL_LOOK[tpl] ?? { icon: 'terminal', color: '#3DDC84' };

/** Template tiles: filled colour blocks, two per row. */
function TemplateGrid({ onPick }: { onPick: (tpl: string) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.grid}>
      {TEMPLATES.map((tpl, i) => (
        <FadeIn key={tpl} index={i} from={8} style={styles.tileWrap}>
          <Pressable
            onPress={() => {
              haptic.tap();
              onPick(tpl);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.tile, { backgroundColor: look(tpl).color, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <Icon name={look(tpl).icon} size={24} color="#06240F" />
            <Text style={{ color: '#06240F', fontWeight: '800', fontSize: 15 }} numberOfLines={2}>
              {t(`sandbox.templates.${tpl}` as 'sandbox.templates.search')}
            </Text>
          </Pressable>
        </FadeIn>
      ))}
    </View>
  );
}

function confirm(title: string, onYes: () => void, yes: string, cancel: string, icon = 'alert-triangle') {
  confirmDialog({ title, confirm: yes, cancel, destructive: true, icon, onConfirm: onYes });
}

function MachineTerminal({ machine, onKeyboardChange }: { machine: Machine; onKeyboardChange: (v: boolean) => void }) {
  const columns = useColumns();
  const template = machine.template;
  const shell = useShell(machine.session, {
    columns,
    onSession: (s) => useStore.getState().updateMachine(machine.id, s),
    makeSession: () => createShell(fixtures[template] ?? {}),
  });
  return <Terminal shell={shell} style={{ flex: 1 }} welcome={`Linux trainer 6.8.0 — ${machine.name}`} onKeyboardChange={onKeyboardChange} />;
}

export default function SandboxScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { machines, activeId } = useStore((s) => s.sandbox);
  const active = machines.find((m) => m.id === activeId) ?? machines[0];
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  // remount the terminal when the machine is reset or switched
  const [resetCount, setResetCount] = useState(0);
  /** Our keyboard is open: the header folds away to give the terminal room. */
  const [typing, setTyping] = useState(false);
  const insets = useSafeAreaInsets();

  const create = (template: string) => {
    const id = useStore.getState().createMachine(template, t('sandbox.machineName', { n: machines.length + 1 }));
    if (!id) infoDialog({ title: t('sandbox.limitTitle'), message: t('sandbox.limit'), ok: t('common.ok'), icon: 'server', tone: 'warning' });
    setCreating(false);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Collapsible open={!typing || !active}>
          <View style={styles.header}>
            <H1 style={{ fontSize: 24, flex: 1 }}>{t('sandbox.title')}</H1>
            {active ? (
              <>
                <IconButton icon="edit" label={t('sandbox.rename')} onPress={() => { setName(active.name); setRenaming(active.id); }} />
                <IconButton
                  icon="refresh"
                  label={t('common.reset')}
                  onPress={() =>
                    confirm(t('lesson.resetConfirm'), () => { useStore.getState().resetMachine(active.id); setResetCount((c) => c + 1); }, t('common.reset'), t('common.cancel'), 'refresh')
                  }
                />
                <IconButton
                  icon="trash"
                  label={t('common.delete')}
                  color={theme.danger}
                  onPress={() => confirm(t('sandbox.deleteConfirm', { name: active.name }), () => useStore.getState().deleteMachine(active.id), t('common.delete'), t('common.cancel'), 'trash')}
                />
              </>
            ) : null}
          </View>
          {machines.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabs}>
              {machines.map((m) => {
                const on = m.id === active?.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => useStore.getState().setActiveMachine(m.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={[styles.tab, { backgroundColor: on ? look(m.template).color : theme.surface2 }]}
                  >
                    <Icon name={look(m.template).icon} size={16} color={on ? '#06240F' : theme.textDim} />
                    <Text style={{ color: on ? '#06240F' : theme.text, fontWeight: '700' }}>{m.name}</Text>
                  </Pressable>
                );
              })}
              {machines.length < MAX_MACHINES ? (
                <Pressable onPress={() => setCreating(true)} accessibilityRole="button" accessibilityLabel={t('sandbox.newMachine')} style={[styles.tab, styles.addTab, { borderColor: theme.border }]}>
                  <Icon name="plus" size={18} color={theme.accent} />
                </Pressable>
              ) : null}
            </ScrollView>
          ) : null}
        </Collapsible>
        <View style={{ flex: 1, padding: space.md, paddingTop: space.sm }}>
          {active ? (
            <MachineTerminal key={`${active.id}-${resetCount}`} machine={active} onKeyboardChange={setTyping} />
          ) : (
            <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}>
              <View style={[styles.hero, { backgroundColor: theme.accent }]}>
                <Icon name="terminal" size={30} color={theme.onAccent} />
                <Text style={{ color: theme.onAccent, fontWeight: '800', fontSize: 20 }}>{t('sandbox.subtitle')}</Text>
                <Text style={{ color: theme.onAccent, opacity: 0.85 }}>{t('sandbox.template')}</Text>
              </View>
              <TemplateGrid onPick={create} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setCreating(false)} accessibilityLabel={t('common.cancel')} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + space.md }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>{t('sandbox.template')}</Text>
            <IconButton icon="x" label={t('common.cancel')} onPress={() => setCreating(false)} />
          </Row>
          <ScrollView contentContainerStyle={{ paddingBottom: space.md }}>
            <TemplateGrid onPick={create} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={renaming !== null} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={24}
              accessibilityLabel={t('sandbox.rename')}
              style={{ color: theme.text, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, fontSize: 16 }}
            />
            <Row style={{ marginTop: space.md }}>
              <Button variant="secondary" title={t('common.cancel')} onPress={() => setRenaming(null)} style={{ flex: 1 }} />
              <Button
                title={t('common.save')}
                onPress={() => {
                  if (renaming && name.trim()) useStore.getState().renameMachine(renaming, name.trim());
                  setRenaming(null);
                }}
                style={{ flex: 1 }}
              />
            </Row>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm, gap: 2 },
  addTab: { borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 12 },
  hero: { borderRadius: 24, padding: space.xl, gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileWrap: { width: '48%', flexGrow: 1 },
  tile: { borderRadius: 20, padding: space.md, minHeight: 96, gap: 10, justifyContent: 'space-between' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.sm },
  tabs: { gap: 8, paddingHorizontal: space.md, paddingVertical: space.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, minHeight: 40 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: space.lg },
  sheet: { borderRadius: 20, padding: space.lg, gap: 8, maxWidth: 480, width: '100%', alignSelf: 'center' },
  tpl: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: space.md, gap: 2 },
});
