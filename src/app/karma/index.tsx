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
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn, SlideInDown } from "react-native-reanimated";

const { width } = Dimensions.get("window");



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


  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('karma_dashboard', 'Karma Dashboard')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Main Hero Card */}
          <Animated.View entering={FadeInDown.duration(600).springify()}>
            <LinearGradient
              colors={['#1F2937', '#111827']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >


              <View style={styles.scoreContainer}>
                <Ionicons name="star" size={24} color="#F59E0B" style={styles.scoreIconLeft} />
                <Text style={styles.karmaScore}>
                  {currentKarma.toLocaleString()}
                </Text>
                <Text style={styles.xpText}>PTS</Text>
              </View>
              <Text style={styles.karmaLabel}>{t('total_karma_points', 'Total Karma Points')}</Text>


            </LinearGradient>
          </Animated.View>



          {/* History Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()} style={styles.section}>
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
                      <View style={[styles.historyIconBox, { backgroundColor: item.color + "20", borderColor: item.color + "40" }]}>
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyAction}>{item.action}</Text>
                        <Text style={styles.historyDate}>{date}</Text>
                      </View>
                      <Text style={styles.historyPoints}>{item.points > 0 ? `+${item.points}` : item.points}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={32} color="#4B5563" style={{ marginBottom: 8 }} />
                  <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '500' }}>No recent karma history.</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
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
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  karmaScore: {
    color: "#F59E0B",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 56,
    paddingTop: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  scoreIconLeft: {
    marginRight: 8,
    alignSelf: 'center',
  },
  xpText: {
    color: "#D1D5DB",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 4,
  },
  karmaLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 24,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  historyList: {
    marginHorizontal: 16,
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: {
    flex: 1,
    gap: 4,
  },
  historyAction: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "800",
  },
  historyDate: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  historyPoints: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "900",
  },
});
