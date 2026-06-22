/**
 * ReportModal — Universal reporting dialog.
 *
 * Usage:
 *   <ReportModal
 *     visible={show}
 *     targetId="post_abc123"
 *     targetType="post"
 *     targetOwnerId="uid_xyz"
 *     onClose={() => setShow(false)}
 *   />
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "@/components/common/Text";
import { AuthService } from "@/services/authService";
import {
  TrustSafetyService,
  REPORT_REASONS,
  ReportReason,
  ReportTargetType,
} from "@/services/trustSafetyService";

interface Props {
  visible: boolean;
  targetId: string;
  targetType: ReportTargetType;
  targetOwnerId?: string;
  onClose: () => void;
}

export default function ReportModal({
  visible,
  targetId,
  targetType,
  targetOwnerId,
  onClose,
}: Props) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert("Select Reason", "Please select a reason for your report.");
      return;
    }
    const user = AuthService.getCurrentUser();
    if (!user) return;

    setSubmitting(true);
    try {
      await TrustSafetyService.submitReport({
        reporterId: user.uid,
        reporterName: user.displayName || "Anonymous",
        targetId,
        targetType,
        targetOwnerId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      Alert.alert(
        "Report Submitted",
        "Thank you. Our moderation team will review this report within 24 hours.",
      );
      setSelectedReason(null);
      setDetails("");
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, details, targetId, targetType, targetOwnerId, onClose]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDetails("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Report {targetType}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Help keep our community safe. Select a reason below.
          </Text>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Reason List */}
            {REPORT_REASONS.map((r) => {
              const active = selectedReason === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reasonRow, active && styles.reasonRowActive]}
                  onPress={() => setSelectedReason(r.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.reasonIcon,
                      active && { backgroundColor: "#EF444418" },
                    ]}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={18}
                      color={active ? "#EF4444" : "#6B7280"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.reasonLabel,
                      active && { color: "#EF4444", fontWeight: "800" },
                    ]}
                  >
                    {r.label}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#EF4444"
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Optional details */}
            <Text style={styles.detailLabel}>
              Additional details (optional)
            </Text>
            <TextInput
              style={styles.detailInput}
              placeholder="Describe what happened…"
              placeholderTextColor="#9CA3AF"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
            />
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              !selectedReason && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textTransform: "capitalize",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scroll: { paddingHorizontal: 20 },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  reasonRowActive: {
    backgroundColor: "#FEF2F2",
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  detailInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },

  submitBtn: {
    flexDirection: "row",
    backgroundColor: "#EF4444",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
