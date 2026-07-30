import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { theme } from '../theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.title}>حدث خطأ غير متوقع</Text>
              <Text style={styles.message}>
                واجه التطبيق مشكلة أثناء التحميل. يمكنك إعادة المحاولة، وإذا تكررت المشكلة تواصل مع الدعم الفني.
              </Text>
              {this.state.error ? (
                <Text style={styles.details}>{String(this.state.error.message || this.state.error)}</Text>
              ) : null}
              <Pressable style={styles.button} onPress={this.handleRetry}>
                <Text style={styles.buttonText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: theme.spacing.lg,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  message: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center' },
  details: { color: '#f87171', fontSize: 12, marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonText: { color: '#111827', fontWeight: '800' },
});
