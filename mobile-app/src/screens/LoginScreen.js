import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import { theme } from '../theme';
import { signInWithEmail } from '../services/auth';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!supabase) {
      Alert.alert('اعداد Supabase غير مكتمل', 'أدخل مفاتيح المشروع قبل التشغيل');
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(identifier, password);
    setLoading(false);

    if (error) {
      Alert.alert('فشل تسجيل الدخول', error.message);
      return;
    }

    Alert.alert('تم تسجيل الدخول', 'سيتم توجيهك إلى الشاشة المناسبة');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>تسجيل الدخول</Text>
        <Text style={styles.subtitle}>نفس منطق الموقع مع بيانات Supabase</Text>

        <TextInput
          style={styles.input}
          placeholder="اسم المستخدم أو البريد"
          placeholderTextColor={theme.colors.muted}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="كلمة المرور"
          placeholderTextColor={theme.colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <ActionButton title={loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'} onPress={handleLogin} />

        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>رجوع</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonText: {
    color: '#111827',
    fontWeight: '800',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
