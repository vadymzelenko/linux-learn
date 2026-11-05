import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createShell } from '@linux-learn/engine';
import { fixtures } from '@linux-learn/content';
import { MAX_MACHINES, useStore, type Machine } from '../../state/store';
import { useTheme, MONO, space } from '../../theme';
import { Body, Button, Card, H1, Icon, IconButton, Row, Screen } from '../../components/ui';
import { Terminal, useColumns } from '../../components/terminal/Terminal';
import { useShell } from '../../components/terminal/useShell';
import { Text } from '../../theme/Text';
import { confirmDialog, infoDialog } from '../../components/Dialog';

const TEMPLATES = Object.keys(fixtures);

function confirm(title: string, onYes: () => void, yes: string, cancel: string, icon = 'alert-triangle') {
  confirmDialog({ title, confirm: yes, cancel, destructive: true, icon, onConfirm: onYes });
}

function MachineTerminal({ machine }: { machine: Machine }) {
  const columns = useColumns();
  const template = machine.template;
  const shell = useShell(machine.session, {
    columns,
    onSession: (s) => useStore.getState().updateMachine(machine.id, s),
    makeSession: () => createShell(fixtures[template] ?? {}),
  });
  return <Terminal shell={shell} style={{ flex: 1 }} welcome={`Linux trainer 6.8.0 — ${machine.name}`} />;
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

  const create = (template: string) => {
    const id = useStore.getState().createMachine(template, t('sandbox.machineName', { n: machines.length + 1 }));
    if (!id) infoDialog({ title: t('sandbox.limitTitle'), message: t('sandbox.limit'), ok: t('common.ok'), icon: 'server', tone: 'warning' });
    setCreating(false);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <H1>{t('sandbox.title')}</H1>
            <Body dim>{t('sandbox.subtitle')}</Body>
          </View>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabs}>
          {machines.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => useStore.getState().setActiveMachine(m.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: m.id === active?.id }}
              style={[styles.tab, { backgroundColor: m.id === active?.id ? theme.accent : theme.surface2 }]}
            >
              <Icon name="terminal" size={16} color={m.id === active?.id ? theme.onAccent : theme.textDim} />
              <Text style={{ color: m.id === active?.id ? theme.onAccent : theme.text, fontWeight: '700' }}>{m.name}</Text>
            </Pressable>
          ))}
          {machines.length > 0 && machines.length < MAX_MACHINES ? (
            <Pressable onPress={() => setCreating(true)} accessibilityRole="button" accessibilityLabel={t('sandbox.newMachine')} style={[styles.tab, { borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }]}>
              <Icon name="plus" size={16} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{t('sandbox.newMachine')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <View style={{ flex: 1, padding: space.md, paddingTop: space.sm }}>
          {active ? (
            <MachineTerminal key={`${active.id}-${resetCount}`} machine={active} />
          ) : (
            <Card style={{ gap: space.md, alignItems: 'center', marginTop: space.xl }}>
              <Icon name="terminal" size={48} color={theme.accent} />
              <Body dim style={{ textAlign: 'center' }}>{t('sandbox.subtitle')}</Body>
              <Button title={t('sandbox.newMachine')} icon="plus" onPress={() => setCreating(true)} />
            </Card>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => undefined}>
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800', marginBottom: space.sm }}>{t('sandbox.template')}</Text>
            {TEMPLATES.map((tpl) => (
              <Pressable key={tpl} onPress={() => create(tpl)} accessibilityRole="button" style={({ pressed }) => [styles.tpl, { backgroundColor: pressed ? theme.surface2 : 'transparent', borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{t(`sandbox.templates.${tpl}` as 'sandbox.templates.search')}</Text>
                <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>{tpl}</Text>
              </Pressable>
            ))}
            <Button variant="ghost" title={t('common.cancel')} onPress={() => setCreating(false)} />
          </Pressable>
        </Pressable>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md, gap: 2 },
  tabs: { gap: 8, paddingHorizontal: space.md, paddingVertical: space.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, minHeight: 40 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: space.lg },
  sheet: { borderRadius: 20, padding: space.lg, gap: 8, maxWidth: 480, width: '100%', alignSelf: 'center' },
  tpl: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: space.md, gap: 2 },
});
