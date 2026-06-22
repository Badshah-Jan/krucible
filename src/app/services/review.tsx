import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import ProviderService from '@/services/providerService';
import { AuthService } from '@/services/authService';
import { Colors } from '@/constants/colors';

export default function WriteReviewScreen() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Comment Required', 'Please write a short review.');
      return;
    }

    const user = AuthService.getCurrentUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to review.');
      return;
    }

    if (!serviceId) {
      Alert.alert('Error', 'Invalid service ID.');
      return;
    }

    setLoading(true);
    try {
      await ProviderService.addReview({
        serviceId: serviceId as string,
        userId: user.uid,
        rating,
        comment: comment.trim()
      });
      Alert.alert('Success', 'Your review has been submitted!');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to submit review. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          <Text style={styles.label}>Rate your experience</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={{ padding: 4 }}>
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"} 
                  size={40} 
                  color={star <= rating ? "#F59E0B" : "#D1D5DB"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Share details of your experience</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="How was the service? Did they arrive on time? Was the problem fixed?"
            multiline
            numberOfLines={6}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />

        </ScrollView>

        <View style={styles.footer}>
          <Button 
            title={loading ? "Submitting..." : "Submit Review"}
            onPress={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: Colors.primary }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scroll: { padding: 24 },
  label: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827' },
  textArea: { height: 160, paddingTop: 14 },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' }
});
