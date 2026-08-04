import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface SearchResult {
  id: string;
  result_type: 'category' | 'request' | 'employee' | 'post' | 'message';
  title_ar: string;
  title_ckb: string | null;
  subtitle_ar: string | null;
  subtitle_ckb: string | null;
  href: string;
}

const TYPE_LABELS: Record<string, string> = {
  category: 'فئة',
  request: 'طلب',
  employee: 'موظف',
  post: 'منشور',
  message: 'رسالة',
};

const TYPE_ICONS: Record<string, string> = {
  category: '🏷️',
  request: '📋',
  employee: '👤',
  post: '📰',
  message: '💬',
};

export default function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      if (!trimmed) setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc('search_content', { p_query: trimmed });
      setResults(data ?? []);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleResultPress(item: SearchResult) {
    if (item.result_type === 'request' || item.result_type === 'message') {
      const id = item.href.split('/').pop();
      if (id) router.push(`/(customer)/requests/${id}`);
    } else if (item.result_type === 'category') {
      router.push('/(customer)/');
    } else if (item.result_type === 'employee') {
      router.push({ pathname: '/(customer)/employee/[id]', params: { id: item.id } });
    } else if (item.result_type === 'post') {
      router.push({ pathname: '/(customer)/news', params: { postId: item.id } });
    }
  }

  const categories = results?.filter(r => r.result_type === 'category') ?? [];
  const requests = results?.filter(r => r.result_type === 'request') ?? [];
  const employees = results?.filter(r => r.result_type === 'employee') ?? [];
  const posts = results?.filter(r => r.result_type === 'post') ?? [];
  const messages = results?.filter(r => r.result_type === 'message') ?? [];

  function ResultSection({ label, items }: { label: string; items: SearchResult[] }) {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {items.map(item => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}
            onPress={() => handleResultPress(item)}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{TYPE_ICONS[item.result_type]}</Text>
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={1}>{item.title_ar}</Text>
              {item.subtitle_ar && (
                <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle_ar}</Text>
              )}
            </View>
            <View style={styles.typePill}>
              <Text style={styles.typeText}>{TYPE_LABELS[item.result_type]}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <ScreenBg>
      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن خدمة أو طلب..."
            placeholderTextColor={COLORS.white40}
            style={styles.searchInput}
            textAlign="right"
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              onPress={() => { setQuery(''); setResults(null); }}
              hitSlop={8}
              style={styles.clearBtn}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {searching && (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
        )}

        {!searching && results !== null && results.length === 0 && (
          <Text style={styles.emptyText}>لا توجد نتائج</Text>
        )}

        {!searching && !query && (
          <Text style={styles.hintText}>اكتب للبحث في الخدمات والطلبات</Text>
        )}

        {!searching && results && results.length > 0 && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <ResultSection label="الفئات" items={categories} />
            <ResultSection label="الطلبات" items={requests} />
            <ResultSection label="الموظفون" items={employees} />
            <ResultSection label="المنشورات" items={posts} />
            <ResultSection label="الرسائل" items={messages} />
          </ScrollView>
        )}
      </View>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: { fontSize: 18 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
  },
  clearBtn: { padding: 4 },
  clearIcon: { fontSize: 14, color: COLORS.muted },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  hintText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 60,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'right',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  pressed: { opacity: 0.75 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(230,171,44,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  resultInfo: { flex: 1 },
  resultTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'right',
  },
  resultSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
    marginTop: 2,
  },
  typePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.muted,
  },
});
