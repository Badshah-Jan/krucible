import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import Text from '@/components/common/Text';
import { useAppStore } from '@/store/appStore';
import { PostService } from '@/services/postService';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { LocationMonitorService } from '@/services/locationMonitorService';
import {
  typeParamToCategory,
  CATEGORIES,
  getCategoryPlaceholder,
} from '@/constants/categories';

// ─── STEP TYPES ───────────────────────────────────────────────────────────────
type Step = 'category' | 'compose';

export default function CreatePostScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();

  const initialCategory = React.useMemo(
    () => typeParamToCategory(type as string | undefined),
    [type]
  );

  const [step, setStep] = useState<Step>(type ? 'compose' : 'category');
  const [category, setCategory] = useState<string>(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          const profile = await UserService.getOwnProfile(user.uid);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, []);

  const selectedCatDef = CATEGORIES.find((c) => c.firestoreValue === category) ?? CATEGORIES[0];

  const handleSelectCategory = (cat: typeof CATEGORIES[0]) => {
    setCategory(cat.firestoreValue);
    setStep('compose');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;

    const hasLocation = await LocationMonitorService.verifyLocationBeforeAction(
      'post to your community'
    );
    if (!hasLocation) return;

    setIsSubmitting(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const profile = userProfile || (await UserService.getOwnProfile(user.uid));
      if (!profile) throw new Error('User profile not found');

      const zustandCoords = useAppStore.getState().coordinates;
      const lat = zustandCoords?.lat ?? profile.latitude;
      const lng = zustandCoords?.lng ?? profile.longitude;
      if (!lat || !lng) {
        Alert.alert(
          'Location Required',
          'Your location is needed to post. Please enable GPS and try again.'
        );
        setIsSubmitting(false);
        return;
      }

      await PostService.createPost({
        userId: user.uid,
        userName: profile.name || 'A Neighbor',
        userAvatar: profile.photoURL,
        communityId: profile.communityId,
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: lat,
        longitude: lng,
      });

      await UserService.incrementPostsCount(user.uid);
      router.back();
    } catch (error) {
      console.error('Post creation error:', error);
      Alert.alert('Error', 'Could not create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = title.trim().length > 0 && description.trim().length > 0;
  const userName = userProfile?.name || AuthService.getCurrentUser()?.displayName || 'Neighbor';
  const userAvatar = userProfile?.photoURL || '';

  // ─── STEP 1: CATEGORY SELECTOR ─────────────────────────────────────────────
  if (step === 'category') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.navHeader}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.categoryScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.pageTitle}>What do you need?</Text>
            <Text style={styles.categoryHint}>
              Neighborly is a community platform. Choose the type of post that best describes your situation.
            </Text>

            {CATEGORIES.filter((c) => c.chipId !== 'emergency').map((cat) => (
              <TouchableOpacity
                key={cat.chipId}
                style={styles.cleanCard}
                activeOpacity={0.7}
                onPress={() => handleSelectCategory(cat)}
              >
                <View style={[styles.cleanCardIcon, { backgroundColor: cat.color + '15' }]}>
                  <Text style={styles.catCardEmoji}>{cat.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cleanCardTitle}>{cat.label}</Text>
                  <Text style={styles.cleanCardDesc}>{cat.placeholder}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))}

            <View style={styles.sectionDivider} />

            {/* SOS redirect */}
            <TouchableOpacity
              style={[styles.cleanCard, styles.sosCard]}
              activeOpacity={0.7}
              onPress={() => {
                router.back();
                router.push('/sos');
              }}
            >
              <View style={[styles.cleanCardIcon, { backgroundColor: '#EF444415' }]}>
                <Text style={styles.catCardEmoji}>🚨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cleanCardTitle, { color: '#DC2626' }]}>Emergency SOS</Text>
                <Text style={styles.cleanCardDesc}>
                  Broadcast an immediate, high-priority emergency alert to all neighbors.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─── STEP 2: COMPOSE POST ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Navigation Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => (type ? router.back() : setStep('category'))}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          {/* Category badge */}
          <View style={[styles.catPill, { backgroundColor: selectedCatDef.bg }]}>
            <Text style={styles.catPillEmoji}>{selectedCatDef.emoji}</Text>
            <Text style={[styles.catPillLabel, { color: selectedCatDef.color }]}>
              {selectedCatDef.label}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
            style={[
              styles.postBtn,
              { backgroundColor: selectedCatDef.color, opacity: isFormValid ? 1 : 0.4 },
            ]}
          >
            <Text style={styles.postBtnText}>{isSubmitting ? 'Posting...' : 'Post'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Author row */}
          <View style={styles.profileRow}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>
                  {userName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.postingTo}>Posting to your community</Text>
            </View>
          </View>

          {/* Category context banner */}
          <View style={[styles.contextBanner, { backgroundColor: selectedCatDef.bg, borderColor: selectedCatDef.border }]}>
            <Text style={styles.contextBannerEmoji}>{selectedCatDef.emoji}</Text>
            <Text style={[styles.contextBannerText, { color: selectedCatDef.color }]}>
              {selectedCatDef.label} post — visible to all neighbors in your area
            </Text>
          </View>

          {/* INPUT FIELDS */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputTitle}
              placeholder="Write a clear, descriptive title..."
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              returnKeyType="next"
            />
            <View style={styles.divider} />
            <TextInput
              multiline
              style={styles.inputDesc}
              placeholder={getCategoryPlaceholder(category)}
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              maxLength={800}
              scrollEnabled={false}
              textAlignVertical="top"
            />
          </View>

          {/* Location indicator */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#10B981" />
            <Text style={styles.locationText}>
              Your post will be tagged to your current GPS location
            </Text>
          </View>
        </ScrollView>

        {/* Char count footer */}
        <View style={styles.footer}>
          <Text style={styles.charCount}>{description.length}/800</Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },

  // Category selector step
  categoryScroll: { padding: 20, paddingBottom: 48 },
  categoryHint: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 28,
  },
  cleanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  sosCard: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
    marginHorizontal: 10,
  },
  cleanCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catCardEmoji: { fontSize: 22 },
  cleanCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cleanCardDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  // Compose step
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  catPillEmoji: { fontSize: 13 },
  catPillLabel: { fontSize: 12, fontWeight: '700' },

  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  scrollContent: { padding: 20, flexGrow: 1 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F6' },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  avatarFallbackText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  postingTo: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
  },
  contextBannerEmoji: { fontSize: 14 },
  contextBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

  inputContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    padding: 14,
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  inputDesc: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    minHeight: 120,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  locationText: { fontSize: 12, color: '#6B7280' },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-end',
  },
  charCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});
