import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View, Pressable } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { TodoListColor } from "@/features/lists/types";
import { ListColorPicker } from "@/components/list-color-picker";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useListStore } from "@/stores/list-store";

type CreateListSheetProps = {
  visible: boolean;
  onClose: () => void;
}

export function CreateListSheet({visible,onClose}: CreateListSheetProps) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const createList = useListStore((state) => state.createList,);

  const [name, setName] = useState('');
  const [color, setColor] = useState<TodoListColor>('sage');

  const canSubmit = name.trim().length > 0;

  function resetForm() {
    setName('');
    setColor('sage');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleCreate() {
    if (!canSubmit) {
      return;
    }

    createList({name,color});
    handleClose();
  }

  return (
    <Modal visible={visible}
    transparent
    animationType="fade"
    onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.3)'}}>
          <Pressable style={{flex: 1}} onPress={handleClose}/>
          <View style ={{
            backgroundColor:theme.color.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius:theme.radius.xl,
            padding:theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
            gap:theme.spacing.lg,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable onPress={handleClose}>
                <Text style={{color:theme.color.text2, fontSize:16}}>Cancel</Text>
              </Pressable>
              <Text style={{color:theme.color.text, fontSize: 18, fontWeight: '600'}}>
                Create List
              </Text>
              <Pressable onPress={handleCreate} disabled={!canSubmit}>
                <Text style={{
                  color: canSubmit ? theme.color.accent : theme.color.text2,
                  fontSize:16,
                  fontWeight: '600',
                }}>
                  Create
                </Text>
              </Pressable>
            </View>

            <View style={{gap:theme.spacing.xs,}}>
              <Text style={{color: theme.color.text2,fontSize:13,
                fontWeight: '500',
              }}>Name</Text>
              <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Home"
              placeholderTextColor={theme.color.text2}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              style={{
                backgroundColor:theme.color.surfaceSoft,
                color:theme.color.text,
                borderRadius: theme.radius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                fontSize:16,
              }}/>
            </View>

            <ListColorPicker value={color} onChange={setColor} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}