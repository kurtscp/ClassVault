import { useRouter, type Href } from 'expo-router';
import { UserPlus } from 'lucide-react-native';

import { Button } from '../ui';
import { useAuth } from '../../hooks/useAuth';

export interface EnrollButtonProps {
  className?: string;
  fullWidth?: boolean;
}

/**
 * Secondary action button for students to join courses by enter-code flow (P2.4).
 * Rendered conditionally: visible ONLY when the authenticated user's role is 'student'.
 */
export function EnrollButton({ className = '', fullWidth = false }: EnrollButtonProps) {
  const router = useRouter();
  const { role } = useAuth();

  // Role restriction: instructors create courses, only students enroll (SEC-6, SEC-7)
  if (role !== 'student') {
    return null;
  }

  return (
    <Button
      variant="secondary"
      label="Join a course"
      icon={<UserPlus size={20} className="text-action" />}
      fullWidth={fullWidth}
      className={className}
      onPress={() => router.push('/enroll' as unknown as Href)}
    />
  );
}
