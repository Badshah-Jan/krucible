import { useTranslation } from 'react-i18next';
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
import ActionSheet from '@/components/common/ActionSheet';
import { PostService } from '@/services/postService';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { LocationMonitorService } from '@/services/locationMonitorService';
import { typeParamToCategory, CATEGORIES as CAT_DEFS } from '@/constants/categories';

const POST_CATEGORIES = CAT_DEFS.map((c) => ({ id: c.firestoreValue, label: c.label }));

export default function CreatePostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const community = useAppStore((state) => state.community);
  
  const [sheet, setSheet] = useState<{ visible: boolean; title: string; options: any[] }>({
    visible: false, title: '', options: []
  });
  const showSheet = (title: string, options: any[]) => setSheet({ visible: true, title, options });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const initialCategory = React.useMemo(
    () => typeParamToCategory(type as string | undefined),
    [type]
  );

  const [category, setCategory] = useState<string>(initialCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          const profile = await UserService.getUser(user.uid);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;

    const hasLocation = await LocationMonitorService.verifyLocationBeforeAction('post to your community');
    if (!hasLocation) return;

    setIsSubmitting(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const profile = userProfile || await UserService.getUser(user.uid);
      if (!profile) throw new Error('User profile not found');

      const zustandCoords = useAppStore.getState().coordinates;
      const lat = zustandCoords?.lat ?? profile.latitude;
      const lng = zustandCoords?.lng ?? profile.longitude;
      if (!lat || !lng) {
        Alert.alert('Location Required', 'Your location is needed to post. Please enable GPS and try again.');
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

      await UserService.incrementKarma(user.uid, 10);
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
  
  const userName = userProfile?.name || AuthService.getCurrentUser()?.displayName || "Neighbor";
  const userAvatar = userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  const selectedCategoryLabel = POST_CATEGORIES.find(c => c.id === category)?.label || category;

  const openCategorySheet = () => {
    showSheet('Select Category', POST_CATEGORIES.map(cat => ({
      label: cat.label,
      action: () => setCategory(cat.id)
    })));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.root} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* Navigation Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ minWidth: 60 }}>
            <Text style={styles.cancelBtnText}>{t('cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={!isFormValid || isSubmitting} 
            activeOpacity={0.8}
            style={[styles.postBtn, { opacity: isFormValid ? 1 : 0.5 }]}
          >
            <Text style={styles.postBtnText}>{isSubmitting ? 'Posting...' : 'Post'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Profile & Category Row */}
          <View style={styles.profileRow}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <TouchableOpacity onPress={openCategorySheet} style={styles.categoryPill} activeOpacity={0.7}>
                <Text style={styles.categoryPillText}>{selectedCategoryLabel}</Text>
                <Ionicons name="chevron-down" size={12} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>

          {/* INPUT FORM FIELDS */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputTitle}
              placeholder="What's going on?"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            <TextInput
              multiline
              style={styles.inputDesc}
              placeholder="Add more details to help your neighbours understand..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>

        {/* Bottom Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => Alert.alert('Photos', 'Feature coming soon')} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={24} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => Alert.alert('Voice Note', 'Feature coming soon')} activeOpacity={0.7}>
              <Ionicons name="mic-outline" size={24} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => Alert.alert('Location', 'Your post will be tagged with your current GPS location')} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

      </SafeAreaView>

      <ActionSheet
        visible={sheet.visible}
        title={sheet.title}
        options={sheet.options}
        onClose={() => setSheet({ ...sheet, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#111827',
  },
  postBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginRight: 4,
  },
  inputContainer: {
    flex: 1,
  },
  inputTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    paddingVertical: 8,
  },
  inputDesc: {
    fontSize: 17,
    color: '#374151',
    lineHeight: 24,
    paddingTop: 8,
    paddingBottom: 40,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  toolbarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
