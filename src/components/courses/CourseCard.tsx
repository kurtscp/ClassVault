import { useState } from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  Share,
  View,
} from 'react-native';
import { Check, Copy, FileText, Users } from 'lucide-react-native';

import { Badge, Card, Text } from '../ui';
import { CourseListItem, UserRole } from '../../types/database';

export interface CourseCardProps {
  course: CourseListItem;
  role: UserRole;
  onPress: () => void;
}

/**
 * Course summary card for dashboard listing (P3.2).
 * Displays course code, title, instructor name, and role-scoped metadata:
 * - Instructors see a copyable join-code badge and enrolled student count.
 * - Students see material count with a FileText icon.
 */
export function CourseCard({ course, role, onPress }: CourseCardProps) {
  const [copied, setCopied] = useState(false);

  const materialsCount = course.materials?.[0]?.count ?? 0;
  const enrollmentsCount = course.enrollments?.[0]?.count ?? 0;
  const isInstructor = role === 'instructor';

  const handleCopyCode = async (event: GestureResponderEvent) => {
    // Stop propagation so copying the join code does not trigger card navigation
    event.stopPropagation();

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(course.join_code);
      } else {
        await Share.share({ message: course.join_code });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Discard share/copy cancellation
    }
  };

  return (
    <Card onPress={onPress} className="space-y-2">
      <View className="flex-row items-center justify-between">
        <Badge label={course.code} />

        {isInstructor ? (
          <Pressable
            onPress={handleCopyCode}
            accessibilityRole="button"
            accessibilityLabel={`Copy join code ${course.join_code}`}
            className="active:opacity-75"
          >
            <Badge
              label={copied ? 'Copied!' : `Code: ${course.join_code}`}
              icon={
                copied ? (
                  <Check size={14} className="text-action" />
                ) : (
                  <Copy size={14} className="text-action" />
                )
              }
              className={copied ? 'bg-emerald-200' : 'bg-emerald-100'}
            />
          </Pressable>
        ) : null}
      </View>

      <Text variant="title" className="text-ink font-heading mt-1">
        {course.title}
      </Text>

      {course.description ? (
        <Text variant="body" tone="secondary" numberOfLines={2} className="mt-0.5">
          {course.description}
        </Text>
      ) : null}

      <Text variant="small" tone="secondary" className="mt-1">
        {course.instructor?.full_name ?? 'Instructor'}
      </Text>

      <View className="flex-row items-center mt-3 pt-2.5 border-t border-line">
        {isInstructor ? (
          <View className="flex-row items-center">
            <Users size={16} strokeWidth={1.75} className="text-fg-secondary mr-1.5" />
            <Text variant="caption" tone="secondary">
              {enrollmentsCount} {enrollmentsCount === 1 ? 'student enrolled' : 'students enrolled'}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <FileText size={16} strokeWidth={1.75} className="text-fg-muted mr-1.5" />
            <Text variant="caption" tone="muted">
              {materialsCount} {materialsCount === 1 ? 'material' : 'materials'}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

