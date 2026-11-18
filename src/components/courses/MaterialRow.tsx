import { View } from 'react-native';
import { ChevronRight, ClipboardList, FileText } from 'lucide-react-native';

import { Badge, Card, Text } from '../ui';
import { formatBytes, formatDate } from '@/lib/format';
import { MaterialType } from '@/types/database';

export interface MaterialRowMaterial {
  id: string;
  title: string;
  type: MaterialType;
  file_name: string;
  size_bytes: number;
  created_at: string;
  /** Present on exercise rows for students (from MaterialWithStatus) */
  submission_status?: 'not_submitted' | 'submitted' | 'graded';
  grade?: number;
}

export interface MaterialRowProps {
  material: MaterialRowMaterial;
  /** Navigation callback — Member 4 wires this to the material detail screen */
  onPress?: () => void;
  /** When true, renders submission status badge for exercise rows (student view) */
  showStatus?: boolean;
}

/**
 * Card-based row for the materials list.
 * Icon square (emerald-50 bg): FileText for presentations, ClipboardList for exercises.
 * Caption line: formatted size · formatted date.
 * Student exercise view shows a status badge when showStatus is true.
 */
export function MaterialRow({ material, onPress, showStatus = false }: MaterialRowProps) {
  const isExercise = material.type === 'exercise';
  const IconComponent = isExercise ? ClipboardList : FileText;

  const renderStatusBadge = () => {
    if (!showStatus || !isExercise) return null;
    const status = material.submission_status ?? 'not_submitted';
    if (status === 'graded' && material.grade !== undefined) {
      return <Badge label={`Graded: ${material.grade}`} className="bg-emerald-100" />;
    }
    if (status === 'submitted') {
      return <Badge label="Submitted" className="bg-emerald-100" />;
    }
    return <Badge label="Not submitted" className="bg-emerald-50" />;
  };

  return (
    <Card onPress={onPress} className="flex-row items-center gap-3 py-3">
      <View className="w-10 h-10 rounded-control bg-emerald-50 items-center justify-center shrink-0">
        <IconComponent size={20} strokeWidth={1.75} className="text-brand" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="text-ink" numberOfLines={1}>
          {material.title}
        </Text>
        <Text variant="caption" tone="muted">
          {formatBytes(material.size_bytes)} · {formatDate(material.created_at)}
        </Text>
      </View>
      {renderStatusBadge()}
      <ChevronRight size={20} strokeWidth={1.75} className="text-fg-muted shrink-0" />
    </Card>
  );
}
