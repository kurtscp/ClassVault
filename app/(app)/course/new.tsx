import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  View,
} from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { ArrowLeft, Check, CheckCircle, Copy } from 'lucide-react-native';

import {
  Badge,
  Button,
  Card,
  Input,
  Screen,
  Text,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { toUserMessage } from '@/lib/errors';
import { Course } from '@/types/database';

/**
 * Screen enabling instructors to create a new course (P3.3).
 * Role access is restricted in UI and enforced by RLS policy `courses_insert_instructor` (SEC-6).
 */
export default function CreateCourseScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const { create } = useCourses();

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Non-instructors redirected to courses dashboard (UX guard; SEC-6 backed by RLS)
  if (role !== 'instructor') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const cleanCode = code.trim().toUpperCase();
  const cleanTitle = title.trim();
  const isCodeValid = cleanCode.length >= 2 && cleanCode.length <= 12;
  const isTitleValid = cleanTitle.length >= 3 && cleanTitle.length <= 80;
  const isDescValid = description.length <= 280;
  const isFormValid = isCodeValid && isTitleValid && isDescValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newCourse = await create({
        code: cleanCode,
        title: cleanTitle,
        description: description.trim() || null,
      });

      setCreatedCourse(newCourse);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const isUniqueError =
        raw.includes('23505') ||
        raw.includes('courses_instructor_id_code_key') ||
        raw.toLowerCase().includes('duplicate') ||
        raw.toLowerCase().includes('unique');

      if (isUniqueError) {
        setError('You already have a course with this code. Use a different code.');
      } else {
        setError(toUserMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyJoinCode = async (joinCode: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(joinCode);
      } else {
        await Share.share({ message: joinCode });
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Discard share/copy cancellation
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <Screen scroll className="py-6">
        {/* Header: back button + title (UX-4) */}
        <View className="flex-row items-center mb-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="mr-3 p-1.5 -ml-1 rounded-control active:bg-emerald-50"
          >
            <ArrowLeft size={24} className="text-fg" />
          </Pressable>
          <Text variant="h2" className="text-ink">
            Create course
          </Text>
        </View>

        {createdCourse ? (
          /* Success Card displaying prominent auto-generated join code */
          <Card className="p-5 space-y-4">
            <View className="flex-row items-center mb-2">
              <CheckCircle size={24} className="text-brand mr-2" />
              <Text variant="title" className="text-ink font-heading">
                Course created
              </Text>
            </View>

            <Text variant="body" tone="secondary">
              Share this auto-generated join code with your students so they can enroll:
            </Text>

            <View className="bg-emerald-50 border border-line rounded-card p-4 items-center justify-center my-3">
              <Text variant="small" tone="muted" className="mb-1">
                Student join code
              </Text>
              <Text variant="display" className="text-ink font-display tracking-widest my-1">
                {createdCourse.join_code}
              </Text>

              <Pressable
                onPress={() => handleCopyJoinCode(createdCourse.join_code)}
                accessibilityRole="button"
                accessibilityLabel="Copy join code"
                className="mt-2 active:opacity-75"
              >
                <Badge
                  label={copiedCode ? 'Copied code!' : 'Copy code'}
                  icon={
                    copiedCode ? (
                      <Check size={14} className="text-action" />
                    ) : (
                      <Copy size={14} className="text-action" />
                    )
                  }
                  className={copiedCode ? 'bg-emerald-200' : 'bg-emerald-100'}
                />
              </Pressable>
            </View>

            <Button
              label="View course"
              variant="primary"
              fullWidth
              onPress={() => router.replace(`/course/${createdCourse.id}` as unknown as Href)}
            />
          </Card>
        ) : (
          /* Course creation form */
          <View className="space-y-4 gap-4">
            <Input
              label="Course code"
              placeholder="e.g. IT101"
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                if (error) setError(null);
              }}
              helperText="2 to 12 alphanumeric characters."
              errorText={!isCodeValid && code.length > 0 ? 'Course code must be between 2 and 12 characters.' : undefined}
            />

            <Input
              label="Title"
              placeholder="e.g. Introduction to Programming"
              maxLength={80}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (error) setError(null);
              }}
              helperText="3 to 80 characters."
              errorText={!isTitleValid && title.length > 0 ? 'Title must be between 3 and 80 characters.' : undefined}
            />

            <View>
              <Input
                label="Description (optional)"
                placeholder="Brief course overview..."
                multiline
                numberOfLines={3}
                maxLength={280}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (error) setError(null);
                }}
                className="min-h-24"
              />
              <Text variant="caption" tone="muted" className="text-right mt-1">
                {description.length}/280
              </Text>
            </View>

            {error ? (
              <Text variant="caption" tone="danger" className="mt-1">
                {error}
              </Text>
            ) : null}

            <Button
              label="Create course"
              variant="primary"
              fullWidth
              disabled={!isFormValid}
              loading={isSubmitting}
              onPress={handleSubmit}
              className="mt-2"
            />
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

