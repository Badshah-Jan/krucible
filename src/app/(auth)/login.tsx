import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
  FadeIn,
  FadeOutLeft,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/common/Text';
import { useAppStore } from '@/store/appStore';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAppStore((state) => state.login);
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '345012250731-a8crsgah080dhofvmotgkh2ppqqme634.apps.googleusercontent.com',
    });
  }, []);

  const signIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success' && response.data.idToken) {
        await handleGoogleLogin(response.data.idToken);
      }
    } catch (error: any) {
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert("Authentication Failed", "Could not complete Google Sign-In. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogin = async (idToken: string) => {
    try {
      const user = await AuthService.loginWithGoogle(idToken);
      if (user) {
        const userProfile = await UserService.getUser(user.uid);
        if (!userProfile) {
          await UserService.createUser(user.uid, {
            name: user.displayName || 'Neighborly User',
            email: user.email || '',
            photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          });
        }
        login(); 
        router.replace('/(auth)/location-permission');
      }
    } catch (error) {
      Alert.alert("Authentication Failed", "Could not complete Google Sign-In. Please try again.");
    }
  };

  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Your Local Community',
      desc: 'Connect with people who live nearby and build stronger local communities.',
      icon: 'earth',
      color: '#3B82F6', 
    },
    {
      title: 'Get Help When You Need It',
      desc: 'Request assistance, recommendations, and support from trusted neighbors.',
      icon: 'people',
      color: '#10B981',
    },
    {
      title: 'Emergency Assistance',
      desc: 'Send SOS alerts and receive help from people close to your location.',
      icon: 'shield-checkmark',
      color: '#EF4444',
    },
    {
      title: 'Stay Connected',
      desc: 'Chat, share updates, and discover what is happening around you.',
      icon: 'chatbubbles',
      color: '#8B5CF6',
    },
    {
      title: 'Neighborly',
      desc: 'Help Is Nearby.',
      icon: 'heart',
      color: '#FFFFFF',
    }
  ];

  const currentSlide = slides[activeSlide];
  const isFinalScreen = activeSlide === 4;

  const renderPagination = () => {
    return (
      <View style={styles.paginationRow}>
        {slides.slice(0, 4).map((_, i) => {
          const isActive = i === activeSlide;
          const isPassed = i < activeSlide;
          return (
            <View 
              key={i} 
              style={[
                styles.dot, 
                isActive ? { backgroundColor: '#FFFFFF' } : 
                isPassed ? { backgroundColor: 'rgba(255,255,255,0.4)' } : 
                { backgroundColor: 'rgba(255,255,255,0.15)' }
              ]} 
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Dynamic Background Glow */}
      <Animated.View style={styles.glowContainer} key={`glow-${activeSlide}`} entering={FadeIn.duration(800)}>
        <LinearGradient
          colors={[currentSlide.color, 'transparent']}
          style={styles.radialGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Top Visual Section */}
        <View style={styles.visualSection}>
           <Animated.View 
             key={`icon-${activeSlide}`} 
             entering={FadeIn.duration(600).delay(100)}
             style={styles.iconContainer}
           >
             {isFinalScreen ? (
               <View style={styles.finalLogoBox}>
                 <Text variant="h1" style={styles.finalLogoText} adjustsFontSizeToFit numberOfLines={1}>N</Text>
                 <View style={styles.finalLogoDot} />
               </View>
             ) : (
               <Ionicons name={currentSlide.icon as any} size={140} color="#FFFFFF" style={styles.hugeIcon} />
             )}
           </Animated.View>
        </View>

        {/* Bottom Content Section */}
        <View style={styles.contentSection}>
          <View>
            {/* Pagination is tied closely to the text layout like Uber/Airbnb */}
            {!isFinalScreen && renderPagination()}

            <Animated.View key={`text-${activeSlide}`} entering={FadeInRight.springify().damping(20).mass(0.8)}>
              <Text variant="h1" style={[styles.titleText, isFinalScreen && { fontSize: 48, marginTop: 24 }]}>
                {currentSlide.title}
                {isFinalScreen && <View style={styles.inlineDot} />}
              </Text>
              <Text variant="body" style={styles.descText}>
                {currentSlide.desc}
              </Text>
            </Animated.View>
          </View>

          {/* Action Buttons */}
          <Animated.View key={`action-${isFinalScreen}`} entering={FadeIn.duration(400).delay(200)} style={styles.actionsContainer}>
            {!isFinalScreen ? (
               <View style={styles.buttonRow}>
                 <TouchableOpacity 
                   style={styles.skipButton} 
                   onPress={() => setActiveSlide(4)}
                 >
                   <Text variant="bodyBold" style={{ color: '#A1A1AA' }}>Skip</Text>
                 </TouchableOpacity>

                 <TouchableOpacity 
                   style={styles.nextButton} 
                   onPress={() => setActiveSlide(prev => prev + 1)}
                   activeOpacity={0.8}
                 >
                   <Text variant="bodyBold" style={styles.nextButtonText}>Next</Text>
                   <Ionicons name="arrow-forward" size={20} color="#000000" style={{ marginLeft: 8 }} />
                 </TouchableOpacity>
               </View>
            ) : (
              <View style={styles.finalActions}>
                <TouchableOpacity 
                  style={styles.googleButton} 
                  onPress={signIn}
                  disabled={isSigningIn}
                  activeOpacity={0.9}
                >
                  <FontAwesome5 name="google" size={20} color="#000000" />
                  <Text variant="bodyBold" style={styles.googleBtnText}>
                    {isSigningIn ? "Signing In..." : "Continue with Google"}
                  </Text>
                </TouchableOpacity>

                <Text variant="caption" style={styles.legalText}>
                  By continuing, you agree to our{' '}
                  <Text variant="caption" style={styles.legalLink}>{t('terms', 'Terms')}</Text> and{' '}
                  <Text variant="caption" style={styles.legalLink}>{t('privacy_policy', 'Privacy Policy')}</Text>
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure OLED Black
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  radialGlow: {
    width: width,
    height: height * 0.6,
    position: 'absolute',
    top: 0,
  },
  visualSection: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hugeIcon: {
    opacity: 0.95,
  },
  finalLogoBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  finalLogoText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -6,
  },
  finalLogoDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    marginLeft: 4,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
    justifyContent: 'space-between',
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    maxWidth: 32,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 16,
    lineHeight: 46,
  },
  inlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    marginLeft: 6,
    marginBottom: 4,
  },
  descText: {
    color: '#A1A1AA', // Zinc 400
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  actionsContainer: {
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 16,
    paddingRight: 32,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 100, // Pill
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  finalActions: {
    gap: 20,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRadius: 100, // Pill
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  legalText: {
    textAlign: 'center',
    color: '#71717A', // Zinc 500
    fontSize: 13,
  },
  legalLink: {
    color: '#D4D4D8', // Zinc 300
    fontWeight: '600',
  },
});
