/**
 * Database types matching Supabase schema (0001_init.sql) exactly.
 * Single source of truth for database entities and query extensions.
 */

export type UserRole = 'instructor' | 'student';
export type MaterialType = 'presentation' | 'exercise';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor_id: string;
  join_code: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Material {
  id: string;
  course_id: string;
  uploader_id: string;
  title: string;
  type: MaterialType;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Comment {
  id: string;
  material_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Submission {
  id: string;
  material_id: string;
  student_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  grade: number | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
}

export interface MaterialView {
  id: string;
  material_id: string;
  user_id: string;
  viewed_at: string;
}

export type CourseListItem = Course & {
  instructor: { full_name: string } | null;
  materials: { count: number }[];
  enrollments: { count: number }[];
};

export type MaterialWithStatus = Material & {
  submission_status?: 'not_submitted' | 'submitted' | 'graded';
  grade?: number;
};

