import { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { AlertCircle, BookOpen, Plus } from 'lucide-react-native';

import { CourseCard } from '@/components/courses/CourseCard';
import { EnrollButton } from '@/components/enrollment/EnrollButton';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { CourseListItem } from '@/types/database';

interface TailwindThemeConfig {
  theme: {
    colors: {
      brand: string;
    };
  };
}

// Brand token extracted directly from tailwind.config for platform RefreshControl (BR-1)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../../tailwind.config') as TailwindThemeConfig;
const brandColor = tailwindConfig.theme.colors.brand;

function CourseSkeletons() {
  return (
    <View className="gap-3">
      {[1, 2, 3].map((key) => (
        <Card key={key} className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Skeleton width={64} height={24} rounded="full" />
            <Skeleton width={110} height={24} rounded="full" />
          </View>
          <Skeleton width="80%" height={22} rounded="control" />
          <Skeleton width="45%" height={16} rounded="control" />
          <View className="pt-2.5 border-t border-line mt-1">
            <Skeleton width={120} height={14} rounded="control" />
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function CoursesScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const { courses, error, status, isLoading, isRefreshing, refetch } = useCourses();

  // Refetch whenever this screen comes into focus — covers returning from /enroll,
  // /course/new, and any other screen that modifies the courses list.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const userRole = role ?? 'student';
  const isInstructor = userRole === 'instructor';

  const renderContent = () => {
    if (isLoading) {
      return <CourseSkeletons />;
    }

    if (status === 'error' && courses.length === 0) {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Unable to load courses"
          message={error ?? 'Something went wrong. Try again in a moment.'}
          action={{
            label: 'Try again',
            onPress: refetch,
            loading: isRefreshing,
          }}
        />
      );
    }

    if (courses.length === 0) {
      return isInstructor ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          message="Create your first course to start sharing materials."
          action={{
            label: 'Create course',
            onPress: () => router.push('/course/new' as unknown as Href),
          }}
        />
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          message="Ask your instructor for the join code."
          action={{
            label: 'Join a course',
            onPress: () => router.push('/enroll' as unknown as Href),
          }}
        />
      );
    }

    return (
      <FlatList
        data={courses}
        keyExtractor={(item: CourseListItem) => item.id}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            role={userRole}
            onPress={() => router.push(`/course/${item.id}` as unknown as Href)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="pb-16"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            colors={[brandColor]}
            tintColor={brandColor}
          />
        }
      />
    );
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between mb-4">
        <Text variant="h1" className="text-ink">
          Courses
        </Text>

        {isInstructor ? (
          <Button
            variant="primary"
            label="Create course"
            icon={<Plus size={20} className="text-white" />}
            onPress={() => router.push('/course/new' as unknown as Href)}
          />
        ) : (
          <EnrollButton />
        )}
      </View>

      <View className="flex-1">{renderContent()}</View>
    </Screen>
  );
}
