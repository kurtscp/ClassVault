import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { AlertCircle, ArrowLeft, FileText, FileUp, Trash2 } from 'lucide-react-native';

import { Badge, Button, Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMaterial } from '@/hooks/useMaterial';
import { useMySubmission } from '@/hooks/useSubmissions';
import { toUserMessage } from '@/lib/errors';
import { validatePickedFile } from '@/lib/files';
import { formatBytes, formatDate } from '@/lib/format';
import { UploadableFile } from '@/services/storage';
import { submitExercise } from '@/services/submissions';
import { Submission } from '@/types/database';

function CurrentSubmissionCard({ submission }: { submission: Submission }) {
  return (
    <Card className="mb-6 p-4 gap-3 bg-emerald-50 border border-line">
      <View className="flex-row items-center justify-between">
        <Text variant="bodyStrong" className="text-ink">Current submission</Text>
        <Badge
          label={submission.grade !== null ? `Grade: ${submission.grade}/100` : 'Submitted'}
          className={submission.grade !== null ? 'bg-emerald-200' : 'bg-emerald-100'}
        />
      </View>
      <View className="flex-row items-center gap-2">
        <FileText size={18} strokeWidth={1.75} className="text-brand shrink-0" />
        <Text variant="small" className="text-ink font-heading flex-1" numberOfLines={1}>
          {submission.file_name}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {formatBytes(submission.size_bytes)} · Submitted {formatDate(submission.created_at)}
      </Text>
      <View className="flex-row items-start gap-2 pt-2 border-t border-line">
        <AlertCircle size={16} strokeWidth={1.75} className="text-warning shrink-0 mt-0.5" />
        <Text variant="caption" tone="secondary" className="flex-1">
          Submitting again will replace your current submission. Your grade will be reset.
        </Text>
      </View>
    </Card>
  );
}

function FilePickerSection({
  file,
  validationError,
  disabled,
  onPick,
  onRemove,
}: {
  file: UploadableFile | null;
  validationError: string | null;
  disabled: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  if (!file) {
    return (
      <Card className="border-2 border-dashed border-line p-6 items-center justify-center gap-3 bg-white mb-6">
        <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center">
          <FileUp size={28} strokeWidth={1.75} className="text-brand" />
        </View>
        <View className="items-center gap-1">
          <Text variant="title" className="text-ink text-center">Select submission file</Text>
          <Text variant="small" tone="secondary" className="text-center">PDF, PPT, or PPTX up to 80 MB</Text>
        </View>
        <Button variant="secondary" label="Choose file" disabled={disabled} onPress={onPick} />
      </Card>
    );
  }

  return (
    <Card className="p-4 gap-3 mb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <FileText size={20} strokeWidth={1.75} className="text-brand shrink-0" />
          <View className="flex-1">
            <Text variant="bodyStrong" numberOfLines={1}>{file.name}</Text>
            <Text variant="caption" tone="secondary">{formatBytes(file.size ?? 0)}</Text>
          </View>
        </View>
        <Button
          variant="ghost"
          label="Remove"
          disabled={disabled}
          onPress={onRemove}
          icon={<Trash2 size={16} strokeWidth={1.75} className="text-danger" />}
        />
      </View>
      {validationError ? (
        <View className="flex-row items-center gap-1.5 p-2 rounded-control bg-emerald-50">
          <AlertCircle size={16} strokeWidth={1.75} className="text-danger shrink-0" />
          <Text variant="caption" tone="danger" className="flex-1">{validationError}</Text>
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Exercise submission screen for enrolled students (SEC-6, SEC-7).
 */
export default function SubmitExerciseScreen() {
  const { id: courseId, materialId } = useLocalSearchParams<{ id: string; materialId: string }>();
  const router = useRouter();
  const { profile, role, status } = useAuth();
  const { material, isLoading: materialLoading, error: materialError } = useMaterial(materialId);
  const { submission, isLoading: submissionLoading } = useMySubmission(materialId);

  const [file, setFile] = useState<UploadableFile | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!courseId || !materialId) return <Redirect href="/(app)/(tabs)" />;

  const authLoading = status === 'loading';
  const isStudent = role === 'student' || profile?.role === 'student';
  if (!authLoading && !isStudent) {
    return <Redirect href={`/course/${courseId}/material/${materialId}` as unknown as Href} />;
  }

  if (materialLoading || submissionLoading || authLoading) {
    return (
      <Screen scroll>
        <View className="flex-row items-center gap-3 mb-6">
          <Skeleton width={24} height={24} rounded="full" />
          <Skeleton width="60%" height={28} rounded="control" />
        </View>
        <Skeleton width="100%" height={80} rounded="card" className="mb-6" />
        <Skeleton width="100%" height={160} rounded="card" />
      </Screen>
    );
  }

  if (materialError || !material || material.type !== 'exercise') {
    return (
      <Screen>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mb-6 self-start p-1.5 -ml-1 rounded-control active:bg-emerald-50"
        >
          <ArrowLeft size={24} strokeWidth={1.75} className="text-fg" />
        </Pressable>
        <EmptyState
          icon={FileText}
          title="Exercise not available"
          message={materialError ?? 'This material is not an exercise or is no longer available.'}
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const handlePickFile = async () => {
    try {
      setFormError(null);
      const res = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setFile(asset);
        setValidationError(validatePickedFile(asset));
      }
    } catch (err) {
      setFormError(toUserMessage(err));
    }
  };

  const handleSubmit = async () => {
    if (!file || validationError) return;
    setIsUploading(true);
    setFormError(null);
    try {
      await submitExercise({ courseId, materialId, file });
      router.back();
    } catch (err) {
      setFormError(toUserMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Screen scroll>
      <View className="flex-row items-center gap-3 mb-6">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="p-1.5 -ml-1 rounded-control active:bg-emerald-50"
        >
          <ArrowLeft size={24} strokeWidth={1.75} className="text-fg" />
        </Pressable>
        <Text variant="h2" className="text-ink flex-1">Submit exercise</Text>
      </View>

      <Card className="mb-6 gap-2">
        <Text variant="title" className="text-ink">{material.title}</Text>
        <Badge label="Exercise" className="bg-emerald-100 self-start" />
      </Card>

      {submission ? <CurrentSubmissionCard submission={submission} /> : null}

      <FilePickerSection
        file={file}
        validationError={validationError}
        disabled={isUploading}
        onPick={handlePickFile}
        onRemove={() => { setFile(null); setValidationError(null); }}
      />

      {formError ? (
        <Card className="border border-danger bg-emerald-50 mb-4 p-3.5">
          <Text variant="small" tone="danger">{formError}</Text>
        </Card>
      ) : null}

      {isUploading ? (
        <Text variant="small" tone="secondary" className="text-center mb-3">
          Uploading your submission…
        </Text>
      ) : null}

      <Button
        variant="primary"
        label={submission ? 'Resubmit' : 'Submit'}
        loading={isUploading}
        disabled={!file || Boolean(validationError) || isUploading}
        fullWidth
        onPress={handleSubmit}
      />
    </Screen>
  );
}
