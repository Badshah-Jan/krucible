import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import { UserService, UserProfile } from '@/services/userService';
import { AuthService } from '@/services/authService';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    if (currentUser?.uid) {
      loadBlockedUsers();
    }
  }, [currentUser?.uid]);

  const loadBlockedUsers = async () => {
    if (!currentUser?.uid) return;
    try {
      const uids = await UserService.getBlockedUsers(currentUser.uid);
      
      // Fetch details for each blocked user
      const userPromises = uids.map(uid => UserService.getUser(uid));
      const users = await Promise.all(userPromises);
      
      // Filter out nulls and set state
      setBlockedUsers(users.filter(u => u !== null) as UserProfile[]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load blocked users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = (uid: string, name: string) => {
    Alert.alert('Unblock User', `Are you sure you want to unblock ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Unblock', 
        onPress: async () => {
          if (!currentUser?.uid) return;
          try {
            await UserService.unblockUser(currentUser.uid, uid);
            // Refresh list
            setBlockedUsers(prev => prev.filter(u => u.uid !== uid));
          } catch (error) {
            Alert.alert('Error', 'Failed to unblock user.');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.description}>
            Blocked users cannot see your profile, send you messages, or interact with your posts.
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#6B7280" />
          ) : blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
            </View>
          ) : (
            blockedUsers.map((user) => (
              <View key={user.uid} style={styles.userCard}>
                <Image 
                  source={{ uri: user.photoURL || 'https://via.placeholder.com/150/E5E7EB/9CA3AF?text=?' }} 
                  style={styles.avatar} 
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  {user.handle && <Text style={styles.userHandle}>@{user.handle}</Text>}
                </View>
                <TouchableOpacity 
                  style={styles.unblockBtn} 
                  onPress={() => handleUnblock(user.uid, user.name)}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  description: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  userHandle: { fontSize: 12, color: '#6B7280' },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
  },
  unblockText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
});
