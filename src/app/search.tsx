import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Text from '@/components/common/Text';
import { useAppStore } from '@/store/appStore';
import { PostService } from '@/services/postService';
import { UserService } from '@/services/userService';
import BusinessService from '@/services/businessService';
import Animated, { FadeInDown } from 'react-native-reanimated';

const T = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#222222',
  textSecondary: '#717171',
  border: '#DDDDDD',
  separator: '#EBEBEB',
  primary: '#FF385C',
};

// ── Result type helpers ──────────────────────────────────────────────────────
type ResultType = 'post' | 'user' | 'business';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  icon: string;
  iconColor?: string;
  route?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  help: '🤝 Help',
  emergency: '🚨 Emergency',
  'lost & found': '🔍 Lost & Found',
  lost_found: '🔍 Lost & Found',
  recommendations: '⭐ Recommendations',
  services: '🛠️ Services',
  general: '📢 General',
};

function formatCategory(cat?: string) {
  if (!cat) return 'Post';
  const key = cat.toLowerCase();
  return CATEGORY_LABELS[key] ?? cat;
}

// ── Recent searches persistence (in-memory for session) ─────────────────────
const sessionRecents: string[] = [];

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const community = useAppStore((s) => s.community);
  const coordinates = useAppStore((s) => s.coordinates);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [recents, setRecents] = useState<string[]>([...sessionRecents]);

  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  // ── Clear query on focus ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setQuery('');
      setDebouncedQuery('');
    }, [])
  );

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    const cid = community?.communityId;
    if (!cid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      PostService.getPostsByCommunity(cid, coordinates?.lat, coordinates?.lng),
      UserService.getUsersByCommunity(cid),
      BusinessService.getBusinessesByCommunity(cid),
    ])
      .then(([p, u, b]) => {
        setPosts(p);
        setUsers(u);
        setBusinesses(b);
      })
      .catch((e) => console.error('Search fetch error:', e))
      .finally(() => setLoading(false));
  }, [community?.communityId]);

  // ── Debounce query 150ms ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // ── Build result list from debounced query ────────────────────────────────
  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim()) return [];
    const term = debouncedQuery.toLowerCase();
    const list: SearchResult[] = [];

    posts.forEach((p) => {
      if (
        p.title?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      ) {
        list.push({
          id: `post_${p.id}`,
          type: 'post',
          title: p.title || p.description || 'Untitled post',
          subtitle: `${formatCategory(p.category)} • ${p.distanceLabel ?? 'Nearby'}`,
          icon: 'document-text-outline',
          route: `/post/${p.id}`,
        });
      }
    });

    users.forEach((u) => {
      if (
        u.name?.toLowerCase().includes(term) ||
        u.bio?.toLowerCase().includes(term) ||
        u.neighborhood?.toLowerCase().includes(term)
      ) {
        list.push({
          id: `user_${u.uid}`,
          type: 'user',
          title: u.name ?? 'Neighbor',
          subtitle: u.bio ? u.bio : (u.neighborhood ?? 'Community member'),
          icon: 'person-outline',
        });
      }
    });

    businesses.forEach((b) => {
      if (
        b.businessName?.toLowerCase().includes(term) ||
        b.description?.toLowerCase().includes(term) ||
        b.category?.toLowerCase().includes(term)
      ) {
        list.push({
          id: `biz_${b.id}`,
          type: 'business',
          title: b.businessName ?? 'Business',
          subtitle: `${b.category ?? 'Local Business'}${b.address ? ' • ' + b.address : ''}`,
          icon: 'storefront-outline',
          iconColor: '#F59E0B',
          route: `/businesses/${b.id}`,
        });
      }
    });

    return list;
  }, [debouncedQuery, posts, users, businesses]);

  // ── Grouped label lookup ──────────────────────────────────────────────────
  const groupLabels: Record<ResultType, string> = {
    post: 'Community Posts',
    user: 'Neighbors',
    business: 'Local Businesses',
  };

  // ── Build flat list with section headers ──────────────────────────────────
  const flatData = useMemo(() => {
    if (!results.length) return [];
    const types: ResultType[] = ['post', 'user', 'business'];
    const flat: Array<{ _header: string } | SearchResult> = [];
    types.forEach((type) => {
      const items = results.filter((r) => r.type === type);
      if (items.length > 0) {
        flat.push({ _header: groupLabels[type] });
        flat.push(...items);
      }
    });
    return flat;
  }, [results]);

  // ── Handle tap ───────────────────────────────────────────────────────────
  const handleResultPress = useCallback(
    (item: SearchResult) => {
      Keyboard.dismiss();
      // Persist to session recents
      if (!sessionRecents.includes(debouncedQuery.trim()) && debouncedQuery.trim()) {
        sessionRecents.unshift(debouncedQuery.trim());
        if (sessionRecents.length > 8) sessionRecents.pop();
        setRecents([...sessionRecents]);
      }
      if (item.route) {
        router.push(item.route as any);
      }
    },
    [debouncedQuery, router],
  );

  const handleRecentPress = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const removeRecent = (term: string) => {
    const idx = sessionRecents.indexOf(term);
    if (idx !== -1) sessionRecents.splice(idx, 1);
    setRecents([...sessionRecents]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item._header) {
      return <Text style={styles.sectionHeader}>{item._header}</Text>;
    }
    const sr = item as SearchResult;
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.85}
          onPress={() => handleResultPress(sr)}
        >
          <View style={[styles.iconBox, sr.type === 'business' && styles.iconBoxBiz]}>
            <Ionicons
              name={sr.icon as any}
              size={17}
              color={sr.iconColor ?? T.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {sr.title}
            </Text>
            <Text style={styles.resultSub} numberOfLines={1}>
              {sr.subtitle}
            </Text>
          </View>
          {sr.route && (
            <Ionicons name="chevron-forward" size={14} color="#CCCCCC" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const isEmpty = debouncedQuery.trim() && results.length === 0 && !loading;
  const showRecents = !debouncedQuery.trim() && !loading;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={16} color={T.textSecondary} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search posts, services, or people…"
              placeholderTextColor={T.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
              onSubmitEditing={() => {
                if (query.trim() && !sessionRecents.includes(query.trim())) {
                  sessionRecents.unshift(query.trim());
                  if (sessionRecents.length > 8) sessionRecents.pop();
                  setRecents([...sessionRecents]);
                }
              }}
            />
            {query.length > 0 && Platform.OS !== 'ios' && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={T.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {loading ? (
            // Loading state
            <View style={styles.centeredBox}>
              <ActivityIndicator size="small" color={T.primary} />
              <Text style={styles.stateText}>Loading community data…</Text>
            </View>
          ) : isEmpty ? (
            // No results
            <View style={styles.centeredBox}>
              <Ionicons name="search-outline" size={44} color="#CCCCCC" />
              <Text style={styles.stateTitle}>No results found</Text>
              <Text style={styles.stateText}>
                No posts, people, or businesses match "{debouncedQuery}"
              </Text>
            </View>
          ) : showRecents ? (
            // Recent searches + quick categories
            <FlatList
              data={[]}
              renderItem={() => null}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                  {/* Quick Categories */}
                  <Text style={styles.sectionHeader}>BROWSE BY CATEGORY</Text>
                  {[
                    { label: '🤝  Help Requests', cat: 'help' },
                    { label: '🚨  Emergency Alerts', cat: 'emergency' },
                    { label: '🔍  Lost & Found', cat: 'lost_found' },
                    { label: '⭐  Recommendations', cat: 'recommendations' },
                    { label: '🛠️  Local Services', cat: 'services' },
                    { label: '🏪  Local Businesses', cat: 'business' },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.cat}
                      style={styles.categoryRow}
                      activeOpacity={0.7}
                      onPress={() => setQuery(c.cat === 'business' ? '' : c.cat)}
                    >
                      <Text style={styles.categoryLabel}>{c.label}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#CCCCCC" />
                    </TouchableOpacity>
                  ))}

                  {recents.length > 0 && (
                    <>
                      <View style={styles.recentHeader}>
                        <Text style={styles.sectionHeader}>RECENT SEARCHES</Text>
                        <TouchableOpacity
                          onPress={() => {
                            sessionRecents.length = 0;
                            setRecents([]);
                          }}
                        >
                          <Text style={styles.clearAll}>Clear all</Text>
                        </TouchableOpacity>
                      </View>
                      {recents.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={styles.recentRow}
                          onPress={() => handleRecentPress(r)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={T.textSecondary}
                          />
                          <Text style={styles.recentText}>{r}</Text>
                          <TouchableOpacity
                            onPress={() => removeRecent(r)}
                            hitSlop={12}
                            style={{ marginLeft: 'auto' }}
                          >
                            <Ionicons name="close" size={14} color="#CCCCCC" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              }
            />
          ) : (
            // Results
            <FlatList
              data={flatData}
              keyExtractor={(item, i) =>
                (item as any)._header
                  ? `header_${i}`
                  : (item as SearchResult).id
              }
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
              ListHeaderComponent={
                <Text style={styles.resultCount}>
                  {results.length} result{results.length !== 1 ? 's' : ''} for "{debouncedQuery}"
                </Text>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.separator,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 100,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: T.border,
    gap: 6,
  },
  input: {
    flex: 1,
    color: T.text,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },

  // Section headers
  sectionHeader: {
    color: T.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },

  // Category rows (browse section)
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: T.separator,
  },
  categoryLabel: {
    color: T.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Recent searches
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  clearAll: {
    color: T.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.separator,
    gap: 10,
  },
  recentText: {
    color: T.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Result items
  resultCount: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: T.separator,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  iconBoxBiz: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.text,
    marginBottom: 2,
  },
  resultSub: {
    fontSize: 11,
    color: T.textSecondary,
    fontWeight: '500',
  },

  // States
  centeredBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  stateTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateText: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
});
