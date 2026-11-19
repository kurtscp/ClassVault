import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileUp,
  Trash2,
} from 'lucide-react-native';

import {
  Button,
  Card,
  Input,
  Screen,
  Segmented,
  Text,
  type SegmentedOption,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCourse } from '@/hooks/useCourse';
import { toUserMessage } from '@/lib/errors';
import { validatePickedFile } from '@/lib/files';
import { formatBytes } from '@/lib/format';
import {
  UploadableFile,
  uploadMaterial,
  uploadMaterialBatch,
} from '@/services/storage';
import { MaterialType } from '@/types/database';

const TYPE_OPTIONS: SegmentedOption[] = [
  { value: 'presentation', label: 'Presentation' },
  { value: 'exercise', label: 'Exercise' },
];

interface BatchItem {
  id: string;
  file: UploadableFile;
  title: string;
  validationError: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface BatchSummary {
  succeededCount: number;
  totalCount: number;
  failures: Array<{ name: string; message: string }>;
}

function DropArea({
  onPickSingle,
  onPickBatch,
  disabled,
}: {
  onPickSingle: () => void;
  onPickBatch: () => void;
  disabled: boolean;
}) {
  return (
    <Card className="border-2 border-dashed border-line p-6 items-center justify-center gap-3 bg-white mb-6">
      <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center">
        <FileUp size={28} strokeWidth={1.75} className="text-brand" />
      </View>
      <View className="items-center gap-1">
        <Text variant="title" className="text-ink text-center">
          Select files to upload
        </Text>
        <Text variant="small" tone="secondary" className="text-center">
          PDF, PPT, or PPTX up to 80 MB
        </Text>
      </View>
      <View className="flex-row flex-wrap justify-center gap-3 mt-2">
        <Button variant="secondary" label="Choose file" disabled={disabled} onPress={onPickSingle} />
        <Button variant="secondary" label="Choose multiple files" disabled={disabled} onPress={onPickBatch} />
      </View>
    </Card>
  );
}

function SingleFileSection({
  file,
  title,
  validationError,
  disabled,
  onTitleChange,
  onRemove,
}: {
  file: UploadableFile;
  title: string;
  validationError: string | null;
  disabled: boolean;
  onTitleChange: (text: string) => void;
  onRemove: () => void;
}) {
  const isTitleValid = title.trim().length >= 3 && title.trim().length <= 80;
  const titleError = title.trim().length > 0 && !isTitleValid ? 'Title must be between 3 and 80 characters.' : undefined;

  return (
    <Card className="p-4 gap-4 mb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1 mr-2">
          <View className="w-10 h-10 rounded-control bg-emerald-50 items-center justify-center">
            <FileText size={20} strokeWidth={1.75} className="text-brand" />
          </View>
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
        <View className="flex-row items-center gap-2 p-2.5 rounded-control bg-emerald-50">
          <AlertCircle size={18} strokeWidth={1.75} className="text-danger" />
          <Text variant="small" tone="danger" className="flex-1">{validationError}</Text>
        </View>
      ) : null}

      <Input
        label="Title"
        value={title}
        onChangeText={onTitleChange}
        helperText="3 to 80 characters"
        errorText={titleError}
        editable={!disabled && !validationError}
      />
    </Card>
  );
}

function BatchItemCard({
  item,
  disabled,
  onTitleChange,
  onRemove,
}: {
  item: BatchItem;
  disabled: boolean;
  onTitleChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const isTitleValid = item.title.trim().length >= 3 && item.title.trim().length <= 80;
  const titleError = item.title.trim().length > 0 && !isTitleValid ? 'Title must be between 3 and 80 characters.' : undefined;

  return (
    <Card key={item.id} className="p-4 gap-3 mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <FileText size={20} strokeWidth={1.75} className="text-brand" />
          <View className="flex-1">
            <Text variant="bodyStrong" numberOfLines={1}>{item.file.name}</Text>
            <Text variant="caption" tone="secondary">{formatBytes(item.file.size ?? 0)}</Text>
          </View>
        </View>
        <Button
          variant="ghost"
          label="Remove"
          disabled={disabled}
          onPress={() => onRemove(item.id)}
          icon={<Trash2 size={16} strokeWidth={1.75} className="text-danger" />}
        />
      </View>

      {item.validationError ? (
        <View className="flex-row items-center gap-1.5 p-2 rounded-control bg-emerald-50">
          <AlertCircle size={16} strokeWidth={1.75} className="text-danger" />
          <Text variant="caption" tone="danger" className="flex-1">{item.validationError}</Text>
        </View>
      ) : null}

      {item.status === 'uploading' ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <Text variant="caption" tone="brand">Uploading…</Text>
        </View>
      ) : null}

      {item.status === 'success' ? (
        <View className="flex-row items-center gap-1.5">
          <CheckCircle2 size={16} strokeWidth={1.75} className="text-action" />
          <Text variant="caption" className="text-action">Uploaded</Text>
        </View>
      ) : null}

      {item.status === 'error' ? (
        <View className="flex-row items-center gap-1.5">
          <AlertCircle size={16} strokeWidth={1.75} className="text-danger" />
          <Text variant="caption" tone="danger">{item.errorMessage || 'Upload failed'}</Text>
        </View>
      ) : null}

      <Input
        label="Title"
        value={item.title}
        onChangeText={(text) => onTitleChange(item.id, text)}
        errorText={titleError}
        editable={!disabled && !item.validationError && item.status !== 'success'}
      />
    </Card>
  );
}

function BatchItemsList({
  items,
  disabled,
  onTitleChange,
  onRemove,
}: {
  items: BatchItem[];
  disabled: boolean;
  onTitleChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View className="mb-6">
      <Text variant="title" className="text-ink mb-3">
        Selected files ({items.length})
      </Text>
      {items.map((item) => (
        <BatchItemCard
          key={item.id}
          item={item}
          disabled={disabled}
          onTitleChange={onTitleChange}
          onRemove={onRemove}
        />
      ))}
    </View>
  );
}

function BatchSummaryCard({
  summary,
  onDone,
}: {
  summary: BatchSummary;
  onDone: () => void;
}) {
  return (
    <Card className="p-6 gap-4 mb-6">
      <View className="items-center gap-2">
        <CheckCircle2 size={36} strokeWidth={1.75} className="text-action" />
        <Text variant="h2" className="text-ink text-center">
          {summary.succeededCount} of {summary.totalCount} uploaded successfully
        </Text>
      </View>

      {summary.failures.length > 0 ? (
        <View className="gap-2 mt-2 p-3 bg-emerald-50 rounded-control">
          <Text variant="small" tone="danger">Failed uploads:</Text>
          {summary.failures.map((fail, i) => (
            <Text key={i} variant="caption" tone="secondary">• {fail.name}: {fail.message}</Text>
          ))}
        </View>
      ) : null}

      <Button variant="primary" label="Done" fullWidth onPress={onDone} className="mt-2" />
    </Card>
  );
}

function UploadHeader({
  activeType,
  isUploading,
  onBack,
  onTypeChange,
}: {
  activeType: MaterialType;
  isUploading: boolean;
  onBack: () => void;
  onTypeChange: (type: MaterialType) => void;
}) {
  return (
    <>
      <View className="flex-row items-center gap-3 mb-6">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="p-1.5 -ml-1 rounded-control active:bg-emerald-50"
          disabled={isUploading}
        >
          <ArrowLeft size={24} strokeWidth={1.75} className="text-fg" />
        </Pressable>
        <Text variant="h1" className="text-ink">
          Upload material
        </Text>
      </View>

      <View className="mb-6">
        <Segmented
          options={TYPE_OPTIONS}
          value={activeType}
          onChange={(val) => onTypeChange(val as MaterialType)}
        />
      </View>
    </>
  );
}

function UploadActions({
  mode,
  isUploading,
  progressText,
  formError,
  isSingleValid,
  validBatchCount,
  onUploadSingle,
  onUploadBatch,
}: {
  mode: 'idle' | 'single' | 'batch';
  isUploading: boolean;
  progressText: string;
  formError: string | null;
  isSingleValid: boolean;
  validBatchCount: number;
  onUploadSingle: () => void;
  onUploadBatch: () => void;
}) {
  return (
    <>
      {formError ? (
        <Card className="border border-danger bg-emerald-50 mb-4 p-3.5">
          <Text variant="small" tone="danger">{formError}</Text>
        </Card>
      ) : null}

      {isUploading ? (
        <View className="items-center py-2 mb-3">
          <Text variant="small" tone="secondary">
            {mode === 'single' ? 'Uploading, keep this screen open.' : progressText || 'Uploading files…'}
          </Text>
        </View>
      ) : null}

      {mode === 'single' ? (
        <Button
          variant="primary"
          label="Upload"
          loading={isUploading}
          disabled={!isSingleValid || isUploading}
          fullWidth
          onPress={onUploadSingle}
        />
      ) : null}

      {mode === 'batch' ? (
        <Button
          variant="primary"
          label={`Upload ${validBatchCount} file${validBatchCount === 1 ? '' : 's'}`}
          loading={isUploading}
          disabled={validBatchCount === 0 || isUploading}
          fullWidth
          onPress={onUploadBatch}
        />
      ) : null}
    </>
  );
}

/**
 * Upload material screen supporting single and batch uploads.
 * Restricts access to course instructors owning the course (SEC-6).
 */
export default function UploadMaterialScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { profile, role, user } = useAuth();
  const { course, isLoading: courseLoading } = useCourse(id);

  const initialType: MaterialType = tab === 'exercise' ? 'exercise' : 'presentation';
  const [activeType, setActiveType] = useState<MaterialType>(initialType);

  const [mode, setMode] = useState<'idle' | 'single' | 'batch'>('idle');
  const [singleFile, setSingleFile] = useState<UploadableFile | null>(null);
  const [singleTitle, setSingleTitle] = useState('');
  const [singleValidationError, setSingleValidationError] = useState<string | null>(null);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [uploadSummary, setUploadSummary] = useState<BatchSummary | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!id) return <Redirect href="/(app)/(tabs)" />;

  const isInstructor = role === 'instructor' || profile?.role === 'instructor';
  const currentUserId = user?.id ?? profile?.id;
  const isOwner = isInstructor && course && currentUserId === course.instructor_id;

  if (!courseLoading && course && !isOwner) {
    return <Redirect href={`/course/${id}` as unknown as Href} />;
  }

  const handlePickSingle = async () => {
    try {
      setFormError(null);
      const res = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setSingleFile(asset);
        setSingleTitle(asset.name.replace(/\.[^/.]+$/, '').trim() || 'Untitled');
        setSingleValidationError(validatePickedFile(asset));
        setMode('single');
        setBatchItems([]);
        setUploadSummary(null);
      }
    } catch (err) {
      setFormError(toUserMessage(err));
    }
  };

  const handlePickBatch = async () => {
    try {
      setFormError(null);
      const res = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setBatchItems(
          res.assets.map((asset, i) => ({
            id: `${Date.now()}-${i}-${asset.name}`,
            file: asset,
            title: asset.name.replace(/\.[^/.]+$/, '').trim() || 'Untitled',
            validationError: validatePickedFile(asset),
            status: 'pending',
          }))
        );
        setMode('batch');
        setSingleFile(null);
        setUploadSummary(null);
      }
    } catch (err) {
      setFormError(toUserMessage(err));
    }
  };

  const handleUploadSingle = async () => {
    if (!singleFile || isUploading || singleValidationError) return;
    setIsUploading(true);
    setFormError(null);
    try {
      await uploadMaterial({ courseId: id, type: activeType, title: singleTitle.trim(), file: singleFile });
      router.replace({ pathname: '/course/[id]', params: { id, tab: activeType } } as unknown as Href);
    } catch (err) {
      setFormError(toUserMessage(err));
      setIsUploading(false);
    }
  };

  const handleUploadBatch = async () => {
    const validItems = batchItems.filter((item) => !item.validationError);
    if (validItems.length === 0 || isUploading) return;
    setIsUploading(true);
    setFormError(null);

    try {
      const result = await uploadMaterialBatch({
        courseId: id,
        type: activeType,
        files: validItems.map((item) => ({ ...item.file, title: item.title.trim() })),
        onProgress: (info) => {
          setProgressText(`Uploading ${info.currentIndex} of ${info.totalFiles}…`);
          setBatchItems((prev) =>
            prev.map((item) => (item.file.name === info.currentFileName ? { ...item, status: 'uploading' } : item))
          );
        },
      });

      setBatchItems((prev) =>
        prev.map((item) => {
          const failure = result.failed.find((f) => f.name === item.file.name);
          if (failure) return { ...item, status: 'error', errorMessage: failure.message };
          const success = result.succeeded.find((s) => s.file_name === item.file.name);
          if (success) return { ...item, status: 'success' };
          return item;
        })
      );

      setUploadSummary({ succeededCount: result.succeeded.length, totalCount: validItems.length, failures: result.failed });
    } catch (err) {
      setFormError(toUserMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const isSingleValid =
    singleFile !== null &&
    singleValidationError === null &&
    singleTitle.trim().length >= 3 &&
    singleTitle.trim().length <= 80;

  const validBatchCount = batchItems.filter(
    (item) => !item.validationError && item.title.trim().length >= 3 && item.title.trim().length <= 80
  ).length;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} className="pb-10">
        <UploadHeader
          activeType={activeType}
          isUploading={isUploading}
          onBack={() => router.back()}
          onTypeChange={setActiveType}
        />

        {uploadSummary ? (
          <BatchSummaryCard
            summary={uploadSummary}
            onDone={() =>
              router.replace({ pathname: '/course/[id]', params: { id, tab: activeType } } as unknown as Href)
            }
          />
        ) : (
          <>
            <DropArea onPickSingle={handlePickSingle} onPickBatch={handlePickBatch} disabled={isUploading} />

            {mode === 'single' && singleFile ? (
              <SingleFileSection
                file={singleFile}
                title={singleTitle}
                validationError={singleValidationError}
                disabled={isUploading}
                onTitleChange={setSingleTitle}
                onRemove={() => {
                  setSingleFile(null);
                  setMode('idle');
                }}
              />
            ) : null}

            {mode === 'batch' ? (
              <BatchItemsList
                items={batchItems}
                disabled={isUploading}
                onTitleChange={(itemId, text) =>
                  setBatchItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, title: text } : it)))
                }
                onRemove={(itemId) => setBatchItems((prev) => prev.filter((it) => it.id !== itemId))}
              />
            ) : null}

            <UploadActions
              mode={mode}
              isUploading={isUploading}
              progressText={progressText}
              formError={formError}
              isSingleValid={isSingleValid}
              validBatchCount={validBatchCount}
              onUploadSingle={handleUploadSingle}
              onUploadBatch={handleUploadBatch}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
