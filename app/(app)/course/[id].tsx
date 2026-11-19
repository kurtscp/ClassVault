import { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ArrowLeft,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  LogOut,
  Trash2,
  UserMinus,
} from 'lucide-react-native';

import { MaterialRow } from '@/components/courses/MaterialRow';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Segmented,
  Skeleton,
  Text,
  type SegmentedOption,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCourse } from '@/hooks/useCourse';
import { useMaterials } from '@/hooks/useMaterials';
import { toUserMessage } from '@/lib/errors';
import { deleteCourse, EnrolledStudent, listEnrolledStudents, removeStudent } from '@/services/courses';
import { unenrollFromCourse } from '@/services/enrollment';
import { MaterialType } from '@/types/database';

interface TailwindThemeConfig {
  theme: { colors: { brand: string } };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../../tailwind.config') as TailwindThemeConfig;
const brandColor = tailwindConfig.theme.colors.brand;

const TAB_OPTIONS: SegmentedOption[] = [
  { value: 'presentation', label: 'Presentations' },
  { value: 'exercise', label: 'Exercises' },
];

function MaterialSkeletons() {
  return (
    <View className="gap-3">
      {[1, 2, 3].map((k) => (
        <Card key={k} className="flex-row items-center gap-3 py-3">
          <Skeleton width={40} height={40} rounded="control" />
          <View className="flex-1 gap-1.5">
            <Skeleton width="70%" height={16} rounded="control" />
            <Skeleton width="45%" height={12} rounded="control" />
          </View>
        </Card>
      ))}
    </View>
  );
}

/**
 * Course detail screen showing materials grouped by type.
 *
 * SEC-6 RLS backing:
 *   Delete course    → courses_delete_owner        (instructor_id = auth.uid())
 *   Remove student   → enrollments_delete_participant (is_course_instructor(course_id))
 *   Leave course     → enrollments_delete_participant (student_id = auth.uid())
 */
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, role } = useAuth();

  const { course, isLoading: courseLoading, error: courseError, refetch: refetchCourse } =
    useCourse(id);

  const [activeTab, setActiveTab] = useState<MaterialType>('presentation');
  const {
    materials,
    isLoading: materialsLoading,
    isRefreshing,
    error: materialsError,
    refetch: refetchMaterials,
  } = useMaterials({
    courseId: id,
    type: activeTab,
    // Pass studentId only for students so submission status is fetched per row
    studentId: role === 'student' ? (profile?.id ?? undefined) : undefined,
  });

  const [codeCopied, setCodeCopied] = useState(false);

  // Instructor: expandable student roster
  const [studentsExpanded, setStudentsExpanded] = useState(false);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // Confirm dialog states
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemoveStudent, setConfirmRemoveStudent] = useState<EnrolledStudent | null>(null);

  // Action loading + error
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!id) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const isOwner = role === 'instructor' && course?.instructor_id === profile?.id;
  const isStudent = role === 'student';
  const enrollmentsCount = course?.enrollments?.[0]?.count ?? 0;

  const handleCopyCode = async () => {
    if (!course) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(course.join_code);
      } else {
        await Share.share({ message: course.join_code });
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Discard share/copy cancellation
    }
  };

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const list = await listEnrolledStudents(id);
      setStudents(list);
    } catch (err) {
      setStudentsError(toUserMessage(err));
    } finally {
      setStudentsLoading(false);
    }
  }, [id]);

  const handleToggleStudents = useCallback(async () => {
    if (studentsExpanded) {
      setStudentsExpanded(false);
      return;
    }
    setStudentsExpanded(true);
    await loadStudents();
  }, [studentsExpanded, loadStudents]);

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmRemoveStudent) return;
    setIsRemoving(true);
    setActionError(null);
    try {
      await removeStudent(id, confirmRemoveStudent.id);
      setConfirmRemoveStudent(null);
      // Refresh both roster and enrollment count
      await Promise.all([loadStudents(), refetchCourse()]);
    } catch (err) {
      setActionError(toUserMessage(err));
    } finally {
      setIsRemoving(false);
    }
  }, [confirmRemoveStudent, id, loadStudents, refetchCourse]);

  const handleConfirmDelete = useCallback(async () => {
    if (!course) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteCourse(id);
      router.replace('/(app)/(tabs)');
    } catch (err) {
      setActionError(toUserMessage(err));
      setIsDeleting(false);
    }
  }, [course, id, router]);

  const handleConfirmLeave = useCallback(async () => {
    setIsLeaving(true);
    setActionError(null);
    try {
      await unenrollFromCourse(id);
      router.replace('/(app)/(tabs)');
    } catch (err) {
      setActionError(toUserMessage(err));
      setIsLeaving(false);
    }
  }, [id, router]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchCourse(), refetchMaterials()]);
  }, [refetchCourse, refetchMaterials]);

  // ── Course loading / error ────────────────────────────────────────────

  if (courseLoading) {
    return (
      <Screen scroll>
        <View className="flex-row items-center gap-3 mb-6">
          <Skeleton width={24} height={24} rounded="full" />
          <Skeleton width={80} height={24} rounded="full" />
        </View>
        <Skeleton width="60%" height={28} rounded="control" className="mb-2" />
        <Skeleton width="40%" height={16} rounded="control" className="mb-6" />
        <MaterialSkeletons />
      </Screen>
    );
  }

  if (courseError || !course) {
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
          icon={ArrowLeft}
          title="Course not found"
          message={courseError ?? 'This course may have been deleted.'}
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  // ── Materials content per tab ─────────────────────────────────────────

  const renderMaterials = () => {
    if (materialsLoading) return <MaterialSkeletons />;

    if (materialsError) {
      return (
        <EmptyState
          icon={ArrowLeft}
          title="Unable to load materials"
          message={materialsError}
          action={{ label: 'Try again', onPress: refetchMaterials, loading: isRefreshing }}
        />
      );
    }

    if (materials.length === 0) {
      return (
        <View className="items-center py-10 gap-2">
          <Text variant="body" tone="muted" className="text-center">
            {activeTab === 'presentation' ? 'No presentations yet.' : 'No exercises yet.'}
          </Text>
          {isOwner ? (
            <Text variant="small" tone="muted" className="text-center">
              Use Upload material to add one.
            </Text>
          ) : null}
        </View>
      );
    }

    return (
      <View className="gap-3">
        {materials.map((item) => (
          <MaterialRow
            key={item.id}
            material={item}
            showStatus={isStudent && activeTab === 'exercise'}
            onPress={() => router.push(`/course/${id}/material/${item.id}` as unknown as Href)}
          />
        ))}
      </View>
    );
  };

  // ── Full screen render ────────────────────────────────────────────────

  return (
    <Screen edges={['top', 'left', 'right']}>
      <FlatList
        data={[]}
        renderItem={() => null}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[brandColor]}
            tintColor={brandColor}
          />
        }
        ListHeaderComponent={
          <View className="pb-10">

            {/* ── Back + badge ── */}
            <View className="flex-row items-center gap-3 mb-4">
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                className="p-1.5 -ml-1 rounded-control active:bg-emerald-50"
              >
                <ArrowLeft size={24} strokeWidth={1.75} className="text-fg" />
              </Pressable>
              <Badge label={course.code} />
              {/*
               * headerAction slot — Member 4 inserts the Upload material button here.
               * Keep this comment so Member 4 knows exactly where to add it.
               */}
            </View>

            {/* ── Title + instructor ── */}
            <Text variant="h2" className="text-ink mb-1">
              {course.title}
            </Text>
            <Text variant="small" tone="secondary" className="mb-2">
              {course.instructor?.full_name ?? 'Instructor'}
            </Text>
            {course.description ? (
              <Text variant="body" tone="secondary" className="mb-4">
                {course.description}
              </Text>
            ) : null}

            {/* ── Course analytics link (Member 5 builds target) ── */}
            <Button
              variant="secondary"
              label="Course analytics"
              icon={<BarChart2 size={18} strokeWidth={1.75} className="text-action" />}
              onPress={() => router.push(`/course/${id}/analytics` as unknown as Href)}
              className="mb-5 self-start"
            />

            {/* ── Instructor: join code card ── */}
            {isOwner ? (
              <Card className="mb-4 gap-3">
                <Text variant="small" tone="secondary">
                  Share this code with students to let them enroll.
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text variant="h1" className="text-ink font-display tracking-widest">
                    {course.join_code}
                  </Text>
                  <Pressable
                    onPress={handleCopyCode}
                    accessibilityRole="button"
                    accessibilityLabel="Copy join code"
                    className="active:opacity-75"
                  >
                    <Badge
                      label={codeCopied ? 'Copied!' : 'Copy code'}
                      icon={
                        codeCopied
                          ? <Check size={14} className="text-action" />
                          : <Copy size={14} className="text-action" />
                      }
                      className={codeCopied ? 'bg-emerald-200' : 'bg-emerald-100'}
                    />
                  </Pressable>
                </View>
              </Card>
            ) : null}

            {/* ── Instructor: expandable student roster ── */}
            {isOwner ? (
              <Card className="mb-5">
                <Pressable
                  onPress={handleToggleStudents}
                  accessibilityRole="button"
                  accessibilityLabel={studentsExpanded ? 'Collapse student list' : 'Expand student list'}
                  className="flex-row items-center justify-between active:opacity-75"
                >
                  <Text variant="body" className="text-ink font-heading">
                    {enrollmentsCount}{' '}
                    {enrollmentsCount === 1 ? 'enrolled student' : 'enrolled students'}
                  </Text>
                  {studentsExpanded
                    ? <ChevronUp size={20} strokeWidth={1.75} className="text-fg-muted" />
                    : <ChevronDown size={20} strokeWidth={1.75} className="text-fg-muted" />}
                </Pressable>

                {studentsExpanded ? (
                  <View className="mt-3 gap-1">
                    {studentsLoading ? (
                      <View className="gap-2">
                        {[1, 2].map((k) => (
                          <Skeleton key={k} width="100%" height={40} rounded="control" />
                        ))}
                      </View>
                    ) : studentsError ? (
                      <Text variant="small" tone="danger">{studentsError}</Text>
                    ) : students.length === 0 ? (
                      <Text variant="small" tone="muted">No students enrolled yet.</Text>
                    ) : (
                      students.map((student) =>
                        confirmRemoveStudent?.id === student.id ? (
                          <Card key={student.id} className="gap-3 bg-canvas">
                            <Text variant="small" className="text-ink">
                              Remove {student.full_name} from {course.title}?
                            </Text>
                            {actionError ? (
                              <Text variant="caption" tone="danger">{actionError}</Text>
                            ) : null}
                            <View className="flex-row gap-2">
                              <Button
                                variant="danger"
                                label="Remove"
                                loading={isRemoving}
                                onPress={handleConfirmRemove}
                              />
                              <Button
                                variant="ghost"
                                label="Cancel"
                                onPress={() => {
                                  setConfirmRemoveStudent(null);
                                  setActionError(null);
                                }}
                              />
                            </View>
                          </Card>
                        ) : (
                          <View
                            key={student.id}
                            className="flex-row items-center justify-between py-1.5 border-b border-line"
                          >
                            <Text variant="body" className="text-ink flex-1">
                              {student.full_name}
                            </Text>
                            <Pressable
                              onPress={() => setConfirmRemoveStudent(student)}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove student ${student.full_name}`}
                              className="p-2 rounded-control active:bg-emerald-50"
                            >
                              <UserMinus size={20} strokeWidth={1.75} className="text-danger" />
                            </Pressable>
                          </View>
                        )
                      )
                    )}
                  </View>
                ) : null}
              </Card>
            ) : null}

            {/* ── Segmented control ── */}
            <Segmented
              options={TAB_OPTIONS}
              value={activeTab}
              onChange={(val) => setActiveTab(val as MaterialType)}
              className="mb-4"
            />

            {/* ── Materials list ── */}
            {renderMaterials()}

            {/* ── Student: leave course ── */}
            {isStudent ? (
              <View className="mt-8">
                {confirmLeave ? (
                  <Card className="gap-3">
                    <Text variant="body" className="text-ink font-heading">
                      Leave {course.title}?
                    </Text>
                    <Text variant="small" tone="secondary">
                      You will lose access to all materials and your submissions.
                    </Text>
                    {actionError ? (
                      <Text variant="caption" tone="danger">{actionError}</Text>
                    ) : null}
                    <View className="flex-row gap-2">
                      <Button
                        variant="danger"
                        label="Leave course"
                        loading={isLeaving}
                        onPress={handleConfirmLeave}
                      />
                      <Button
                        variant="ghost"
                        label="Cancel"
                        onPress={() => {
                          setConfirmLeave(false);
                          setActionError(null);
                        }}
                      />
                    </View>
                  </Card>
                ) : (
                  <Button
                    variant="ghost"
                    label="Leave course"
                    icon={<LogOut size={18} strokeWidth={1.75} className="text-fg-secondary" />}
                    onPress={() => setConfirmLeave(true)}
                  />
                )}
              </View>
            ) : null}

            {/* ── Instructor: delete course ── */}
            {isOwner ? (
              <View className="mt-6 border-t border-line pt-6">
                {confirmDelete ? (
                  <Card className="gap-3 border-danger">
                    <Text variant="body" className="text-ink font-heading">
                      Delete {course.title}?
                    </Text>
                    <Text variant="small" tone="secondary">
                      This will permanently remove all materials, files, enrollments,
                      submissions, and comments. This cannot be undone.
                    </Text>
                    {actionError ? (
                      <Text variant="caption" tone="danger">{actionError}</Text>
                    ) : null}
                    <View className="flex-row gap-2">
                      <Button
                        variant="danger"
                        label="Delete course"
                        loading={isDeleting}
                        onPress={handleConfirmDelete}
                      />
                      <Button
                        variant="ghost"
                        label="Cancel"
                        onPress={() => {
                          setConfirmDelete(false);
                          setActionError(null);
                        }}
                      />
                    </View>
                  </Card>
                ) : (
                  <Button
                    variant="ghost"
                    label="Delete course"
                    icon={<Trash2 size={18} strokeWidth={1.75} className="text-danger" />}
                    onPress={() => setConfirmDelete(true)}
                  />
                )}
              </View>
            ) : null}

          </View>
        }
      />
    </Screen>
  );
}



