import { useRouter, type Href } from 'expo-router';
import { Upload } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { MaterialType } from '@/types/database';

export interface UploadButtonProps {
  courseId: string;
  instructorId: string;
  defaultTab?: MaterialType;
}

/**
 * Upload material action button for the course header.
 * Visible ONLY to instructors who own the course (SEC-6 UI complement).
 */
export function UploadButton({
  courseId,
  instructorId,
  defaultTab = 'presentation',
}: UploadButtonProps) {
  const router = useRouter();
  const { profile, role, user } = useAuth();

  const isInstructor = role === 'instructor' || profile?.role === 'instructor';
  const currentUserId = user?.id ?? profile?.id;
  const isOwner = isInstructor && currentUserId === instructorId;

  if (!isOwner) {
    return null;
  }

  const handlePress = () => {
    router.push({
      pathname: '/course/[id]/upload',
      params: { id: courseId, tab: defaultTab },
    } as unknown as Href);
  };

  return (
    <Button
      variant="primary"
      label="Upload material"
      icon={<Upload size={20} strokeWidth={1.75} className="text-white" />}
      onPress={handlePress}
    />
  );
}
