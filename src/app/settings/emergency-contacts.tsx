import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import { UserService, EmergencyContact } from '@/services/userService';
import { AuthService } from '@/services/authService';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    if (currentUser?.uid) {
      loadContacts();
    }
  }, [currentUser?.uid]);

  const loadContacts = async () => {
    if (!currentUser?.uid) return;
    try {
      const data = await UserService.getEmergencyContacts(currentUser.uid);
      setContacts(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load emergency contacts.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }
    
    if (!currentUser?.uid) return;
    setIsSaving(true);
    try {
      await UserService.addEmergencyContact(currentUser.uid, {
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim()
      });
      setIsAdding(false);
      setName('');
      setPhone('');
      setRelationship('');
      await loadContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to add contact.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: async () => {
          if (!currentUser?.uid) return;
          try {
            await UserService.removeEmergencyContact(currentUser.uid, id);
            await loadContacts();
          } catch (error) {
            Alert.alert('Error', 'Failed to remove contact.');
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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.description}>
            Add close friends or family members who should be contacted in case of an emergency.
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#EF4444" />
          ) : (
            <>
              {contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="person" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactDetails}>{contact.relationship} • {contact.phone}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(contact.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}

              {contacts.length === 0 && !isAdding && (
                <View style={styles.emptyState}>
                  <Ionicons name="shield-checkmark-outline" size={48} color="#E5E7EB" />
                  <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
                </View>
              )}

              {isAdding ? (
                <View style={styles.addForm}>
                  <Text style={styles.formTitle}>New Contact</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    keyboardType="phone-pad"
                    onChangeText={setPhone}
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Relationship (e.g., Brother, Friend)"
                    placeholderTextColor="#9CA3AF"
                    value={relationship}
                    onChangeText={setRelationship}
                  />
                  
                  <View style={styles.formActions}>
                    <TouchableOpacity 
                      style={styles.cancelBtn} 
                      onPress={() => setIsAdding(false)}
                      disabled={isSaving}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.saveBtn} 
                      onPress={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add Contact</Text>
                </TouchableOpacity>
              )}
            </>
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  contactDetails: { fontSize: 12, color: '#6B7280' },
  removeBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  addForm: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 12,
  },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 16 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#111827',
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelText: { color: '#6B7280', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});
