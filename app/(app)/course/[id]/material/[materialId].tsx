import { useCallback, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';

import { CommentInput } from '@/components/comments/CommentInput';
import { CommentItem } from '@/components/comments/CommentItem';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { useMaterial } from '@/hooks/useMaterial';
import { useOpenMaterial } from '@/hooks/useOpenMaterial';
import { formatBytes, formatDate } from '@/lib/format';
import { getStudentSubmission } from '@/services/submissions';
import { useAsync } from '@/hooks/useAsync';
import { toUserMessage } from '@/lib/errors';

/**
 * Material detail screen: file info, action buttons, and commenting.
 *
 * SEC-6 RLS backing:
 *   View material     → materials_select_enrolled_or_owner (is_enrolled(course_id))
 *   Post comment      → comments_insert_enrolled
 *   Delete comment    → comments_delete_author_or_instructor
 *   Submit exercise   → submissions_insert_enrolled_student
 */
export default function MaterialDetailScreen() {
  const { id: courseId, materialId } = useLocalSearchParams<{
    id: string;
    materialId: string;
  }>();
  const router = useRouter();
  const { profile, role } = useAuth();

  const { material, isLoading: materialLoading, error: materialError } = useMaterial(materialId);
  const {
    comments,
    isLoading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
    postComment,
    removeComment,
    isSubmitting: commentSubmitting,
  } = useComments(materialId);

  const {
    open: openMaterial,
    openingId: openingMaterialId,
    error: openError,
  } = useOpenMaterial();

  // Fetch student's own submission if this is an exercise and user is a student
  const isExercise = material?.type === 'exercise';
  const isStudent = role === 'student';
  const isInstructor = role === 'instructor';
  const isCourseInstructor =
    isInstructor && material?.course?.instructor_id === profile?.id;

  const submissionFetcher = useCallback(async () => {
    if (!isExercise || !isStudent || !materialId || !profile?.id) return null;
    return getStudentSubmission(materialId, profile.id);
  }, [isExercise, isStudent, materialId, profile?.id]);

  const { data: submission } = useAsync(submissionFetcher, [
    isExercise,
    isStudent,
    materialId,
    profile?.id,
  ]);

  // Ref for scrolling FlatList to bottom after posting
  const listRef = useRef<FlatList>(null);

  if (!courseId || !materialId) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  // ── Loading / error ───────────────────────────────────────────────────

  if (materialLoading) {
    return (
      <Screen scroll>
        <View className="flex-row items-center gap-3 mb-6">
          <Skeleton width={24} height={24} rounded="full" />
          <Skeleton width="50%" height={28} rounded="control" />
        </View>
        <Skeleton width="30%" height={20} rounded="full" className="mb-4" />
        <Card className="gap-3">
          <Skeleton width="80%" height={16} rounded="control" />
          <Skeleton width="50%" height={14} rounded="control" />
          <Skeleton width="40%" height={14} rounded="control" />
        </Card>
      </Screen>
    );
  }

  if (materialError || !material) {
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
          title="Material not found"
          message={materialError ?? 'This material may have been removed.'}
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  // ── Comment helpers ───────────────────────────────────────────────────

  const handlePostComment = async (content: string) => {
    await postComment(content);
    // Scroll to end after a tick so the new comment is in view
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDeleteComment = async (commentId: string) => {
    await removeComment(commentId);
  };

  // ── Comment list content ──────────────────────────────────────────────

  const renderComments = () => {
    if (commentsLoading) {
      return (
        <View className="gap-3 py-2">
          {[1, 2, 3].map((k) => (
            <View key={k} className="flex-row gap-3 py-2">
              <Skeleton width={36} height={36} rounded="full" />
              <View className="flex-1 gap-1.5">
                <Skeleton width="40%" height={14} rounded="control" />
                <Skeleton width="90%" height={14} rounded="control" />
                <Skeleton width="70%" height={14} rounded="control" />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (commentsError) {
      return (
        <EmptyState
          icon={FileText}
          title="Unable to load comments"
          message={commentsError}
          action={{ label: 'Try again', onPress: refetchComments }}
        />
      );
    }

    if (comments.length === 0) {
      return (
        <View className="py-8 items-center">
          <Text variant="body" tone="muted" className="text-center">
            No comments yet. Start the conversation.
          </Text>
        </View>
      );
    }

    return (
      <View>
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isOwn={comment.user?.id === profile?.id}
            isInstructor={isCourseInstructor}
            onDelete={handleDeleteComment}
            isDeleting={commentSubmitting}
          />
        ))}
      </View>
    );
  };

  // ── Full render ───────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <Screen edges={['top', 'left', 'right']} className="flex-1">
        <FlatList
          ref={listRef}
          data={[]}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="pb-4">

              {/* ── Header ── */}
              <View className="flex-row items-start gap-3 mb-4">
                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  className="p-1.5 -ml-1 mt-0.5 rounded-control active:bg-emerald-50"
                >
                  <ArrowLeft size={24} strokeWidth={1.75} className="text-fg" />
                </Pressable>
                <View className="flex-1 gap-2">
                  <Text variant="h2" className="text-ink">
                    {material.title}
                  </Text>
                  <Badge
                    label={material.type === 'presentation' ? 'Presentation' : 'Exercise'}
                    className="bg-emerald-100 self-start"
                  />
                </View>
              </View>

              {/* ── File info card ── */}
              <Card className="mb-4 gap-2">
                <View className="flex-row items-center gap-2">
                  <FileText size={18} strokeWidth={1.75} className="text-brand shrink-0" />
                  <Text variant="small" className="text-ink font-heading flex-1" numberOfLines={1}>
                    {material.file_name}
                  </Text>
                </View>
                <Text variant="caption" tone="muted">
                  {formatBytes(material.size_bytes)} · Uploaded {formatDate(material.created_at)}
                </Text>
              </Card>

              {/* ── Action buttons ── */}
              <View className="gap-3 mb-6">
                <Button
                  variant="secondary"
                  label="Open file"
                  fullWidth
                  onPress={() => openMaterial(material)}
                  loading={openingMaterialId === material.id}
                  disabled={openingMaterialId === material.id}
                />
                {openError ? (
                  <Text variant="small" tone="danger" className="text-center">
                    {openError}
                  </Text>
                ) : null}

                {/* Instructor: view all submissions for this exercise */}
                {isExercise && isCourseInstructor ? (
                  <Button
                    variant="secondary"
                    label="View submissions"
                    fullWidth
                    onPress={() =>
                      router.push(
                        `/course/${courseId}/submissions/${materialId}` as unknown as Href
                      )
                    }
                  />
                ) : null}

                {/* Student: submit / resubmit */}
                {isExercise && isStudent ? (
                  <View className="gap-3">
                    {submission ? (
                      <Card className="gap-1.5 bg-emerald-50">
                        <Text variant="small" className="text-ink font-heading">
                          {submission.grade !== null
                            ? `Graded: ${submission.grade}/100`
                            : 'Submitted'}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {submission.file_name} · {formatDate(submission.created_at)}
                        </Text>
                      </Card>
                    ) : null}
                    <Button
                      variant="primary"
                      label={submission ? 'Resubmit' : 'Submit'}
                      fullWidth
                      onPress={() =>
                        router.push(
                          `/course/${courseId}/material/${materialId}/submit` as unknown as Href
                        )
                      }
                    />
                  </View>
                ) : null}
              </View>

              {/* ── Comments header ── */}
              <View className="flex-row items-center gap-2 mb-2">
                <Text variant="h2" className="text-ink">
                  Comments
                </Text>
                <Badge
                  label={String(comments.length)}
                  className="bg-emerald-100"
                />
              </View>

            </View>
          }
          ListFooterComponent={<View>{renderComments()}</View>}
        />

        {/* ── Sticky comment input ── */}
        <CommentInput
          onSubmit={handlePostComment}
          isSubmitting={commentSubmitting}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

