import { useTranslation } from 'react-i18next';
import { AuthService } from "@/services/authService";
import { UserProfile, UserService } from "@/services/userService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    StatusBar,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from '@/components/common/Text';

const { width } = Dimensions.get("window");

// ─── Constants ───────────────────────────────────────────────────────────────
const LEVELS = [
  { name: "Neighbor", min: 0, color: "#9CA3AF" },
  { name: "Helper", min: 500, color: "#10B981" },
  { name: "Community Hero", min: 1500, color: "#F59E0B" },
  { name: "Local Champion", min: 3000, color: "#3B82F6" },
  { name: "Neighborhood Legend", min: 5000, color: "#2563EB" },
];

const REWARDS = [
  { id: "1", title: "Free Coffee at Local Shop", cost: 150, color: "#D97706", icon: "cafe-outline" },
  { id: "2", title: "Priority Parking Pass", cost: 300, color: "#2563EB", icon: "car-outline" },
  { id: "3", title: "Community Hero Badge", cost: 500, color: "#059669", icon: "shield-checkmark-outline" },
  { id: "4", title: "AasPaas Premium Sticker Pack", cost: 80, color: "#7C3AED", icon: "gift-outline" },
];

// (Mock HISTORY removed, using real-time data)

export default function KarmaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: () => void;
    let unsubscribeHistory: () => void;
    
    const fetchUser = async () => {
      setLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        unsubscribeUser = UserService.subscribeToUser(
          currentUser.uid,
          (profile) => {
            setUserProfile(profile);
            setLoading(false);
          },
        );
        unsubscribeHistory = UserService.subscribeToKarmaHistory(
          currentUser.uid,
          (hist) => {
            setHistory(hist);
          }
        );
      } else {
        setLoading(false);
      }
    };
    fetchUser();
    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  if (loading || !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 13 }}>{t('loading_karma_dashboard', 'Loading Karma Dashboard...')}</Text>
      </View>
    );
  }

  const currentKarma = userProfile?.karma || 0;
  const currentLevel =
    LEVELS.slice()
      .reverse()
      .find((l) => currentKarma >= l.min) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.min > currentKarma);

  const karmaProgress = nextLevel
    ? (currentKarma - currentLevel.min) / (nextLevel.min - currentLevel.min)
    : 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('karma_dashboard', 'Karma Dashboard')}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Main Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View
                style={[
                  styles.levelBadge,
                  {
                    backgroundColor: currentLevel.color + "12",
                    borderColor: currentLevel.color + "30",
                  },
                ]}
              >
                <Ionicons name="flash" size={14} color={currentLevel.color} />
                <Text style={[styles.levelText, { color: currentLevel.color }]}>
                  {currentLevel.name}
                </Text>
              </View>
            </View>

            <Text style={styles.karmaScore}>
              {currentKarma.toLocaleString()}
            </Text>
            <Text style={styles.karmaLabel}>{t('total_karma_points', 'Total Karma Points')}</Text>

            {nextLevel && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>
                    Progress to {nextLevel.name}
                  </Text>
                  <Text style={styles.progressValueText}>
                    {currentKarma} / {nextLevel.min}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${karmaProgress * 100}%` as any,
                        backgroundColor: '#2563EB',
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Action Cards (Earn & Redeem) */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: "#10B98115", borderColor: "#10B98125" },
                ]}
              >
                <Ionicons name="add-circle-outline" size={22} color="#10B981" />
              </View>
              <Text style={styles.actionTitle}>{t('earn_karma', 'Earn Karma')}</Text>
              <Text style={styles.actionSub}>{t('help_others_to_earn_points', 'Help others to earn points')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: "#2563EB15", borderColor: "#2563EB25" },
                ]}
              >
                <Ionicons name="gift-outline" size={22} color="#2563EB" />
              </View>
              <Text style={styles.actionTitle}>{t('redeem', 'Redeem')}</Text>
              <Text style={styles.actionSub}>{t('use_points_for_rewards', 'Use points for rewards')}</Text>
            </TouchableOpacity>
          </View>

          {/* Rewards Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('available_rewards', 'AVAILABLE REWARDS')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rewardsRow}
            >
              {REWARDS.map((reward) => (
                <View key={reward.id} style={styles.rewardCard}>
                  <View
                    style={[
                      styles.rewardIconCircle,
                      { backgroundColor: reward.color + "12", borderColor: reward.color + "25" },
                    ]}
                  >
                    <Ionicons
                      name={reward.icon as any}
                      size={18}
                      color={reward.color}
                    />
                  </View>
                  <Text style={styles.rewardTitle} numberOfLines={2}>
                    {reward.title}
                  </Text>
                  <View style={styles.rewardCostRow}>
                    <Ionicons name="flash-outline" size={12} color="#F59E0B" />
                    <Text style={styles.rewardCost}>{reward.cost} pts</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* History Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recent_history', 'RECENT HISTORY')}</Text>
            <View style={styles.historyList}>
              {history.length > 0 ? (
                history.map((item, index) => {
                  const date = item.createdAt?.toDate 
                    ? item.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                    : 'Just now';

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.historyItem,
                        index !== history.length - 1 && styles.historyItemBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.historyIconBox,
                          { backgroundColor: item.color + "12", borderColor: item.color + "25" },
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={item.color}
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyAction}>{item.action}</Text>
                        <Text style={styles.historyDate}>{date}</Text>
                      </View>
                      <Text style={styles.historyPoints}>{item.points}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No recent karma history.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  heroTop: {
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelText: {
    fontWeight: "800",
    fontSize: 11,
  },
  karmaScore: {
    color: "#111827",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
  },
  karmaLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
  },
  progressValueText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  actionSub: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rewardsRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  rewardCard: {
    width: 136,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  rewardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  rewardTitle: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    height: 32,
    lineHeight: 16,
  },
  rewardCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardCost: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },
  historyList: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: {
    flex: 1,
    gap: 3,
  },
  historyAction: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  historyDate: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
  },
  historyPoints: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "800",
  },
});
