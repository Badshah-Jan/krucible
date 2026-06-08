import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GradientBg from '@/components/common/GradientBg';
import Text from '@/components/common/Text';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <GradientBg>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts, services, or people..."
              placeholderTextColor="#6B7280"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.content}>
          {search.length > 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="search-outline" size={48} color="#374151" />
              <Text variant="bodyBold" style={{ color: '#9CA3AF', marginTop: 16 }}>No results found for "{search}"</Text>
            </View>
          ) : (
            <View>
              <Text variant="captionBold" style={{ color: '#6B7280', marginBottom: 16 }}>{t('recent_searches', 'RECENT SEARCHES')}</Text>
              {['Electrician', 'Block 13 Power Outage', 'Water Delivery'].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.recentItem} onPress={() => setSearch(item)}>
                  <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                  <Text variant="body" style={{ color: '#FFFFFF', marginLeft: 12 }}>{item}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#4B5563" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 16, height: 40 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14, marginLeft: 8 },
  content: { flex: 1, padding: 24 },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
});
