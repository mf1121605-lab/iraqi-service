import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomTabs from '../components/BottomTabs';
import GlassCard from '../components/GlassCard';
import { theme } from '../theme';

const initialMessages = [
  { id: 1, from: 'assistant', text: 'أهلاً بك، كيف أستطيع مساعدتك اليوم؟' },
  { id: 2, from: 'user', text: 'أحتاج إلى متابعة طلب الخدمة' },
];

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');

  function sendMessage() {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: 'user', text: draft.trim() },
      { id: Date.now() + 1, from: 'assistant', text: 'سأراجع طلبك وأرسل لك تحديثًا قريبًا.' },
    ]);
    setDraft('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>الدردشة</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>رجوع</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.chatArea}>
          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.from === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={message.from === 'user' ? styles.userText : styles.assistantText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>

        <GlassCard style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={theme.colors.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendText}>إرسال</Text>
          </Pressable>
        </GlassCard>
      </KeyboardAvoidingView>
      <BottomTabs navigation={navigation} active="Chat" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  link: { color: theme.colors.primary, fontWeight: '700' },
  chatArea: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  userText: { color: '#111827', fontWeight: '700' },
  assistantText: { color: theme.colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: { flex: 1, color: theme.colors.text, paddingVertical: 8 },
  sendButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  sendText: { color: '#111827', fontWeight: '700' },
});
