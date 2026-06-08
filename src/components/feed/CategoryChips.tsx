import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', tKey: 'all' },
  { id: 'emergency', label: 'Emergency', tKey: 'emergency' },
  { id: 'services', label: 'Services', tKey: 'services' },
  { id: 'food', label: 'Food', tKey: 'food' },
  { id: 'recommendations', label: 'Recommendations', tKey: 'recommendations' },
  { id: 'lost_found', label: 'Lost & Found', tKey: 'lost_found' },
];

export default function CategoryChips({
  selectedCategory,
  onSelectCategory,
}: CategoryChipsProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.scrollView}
      contentContainerStyle={s.contentContainer}
    >
      {CATEGORIES.map((cat) => {
        const isActive = String(selectedCategory).trim().toLowerCase() === String(cat.id).trim().toLowerCase();

        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelectCategory(cat.id)}
            activeOpacity={0.85}
            style={[
              s.chip,
              isActive ? s.chipActive : s.chipInactive
            ]}
          >
            <Text
              style={[
                s.chipText,
                {
                  color: isActive ? "#FFFFFF" : "#4B5563",
                  fontWeight: isActive ? "600" : "400",
                }
              ]}
            >
              {t(cat.tKey) || cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scrollView: {
    marginBottom: 8,
    marginTop: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#111827', // Black
    borderColor: '#111827',
  },
  chipInactive: {
    backgroundColor: '#FFFFFF', // White
    borderColor: '#E5E7EB', // Very light gray border
  },
  chipText: {
    fontSize: 13,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
