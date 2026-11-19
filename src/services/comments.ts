import { toUserMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/database';
import { AppError } from '../types/domain';

export interface CommentAuthor {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface CommentWithAuthor {
  id: string;
  material_id: string;
  content: string;
  created_at: string;
  user: CommentAuthor | null;
}

const COMMENT_SELECT_FIELDS = `
  id,
  material_id,
  content,
  created_at,
  user:profiles!user_id(id, full_name, role)
`;

/**
 * Retrieves chronological comments for a material.
 * Joined with the author profile to display name and role.
 */
export async function listComments(materialId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT_FIELDS)
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(error.code ?? 'LIST_COMMENTS_FAILED', toUserMessage(error), error);
  }

  return (data as unknown as CommentWithAuthor[]) ?? [];
}

/**
 * Adds a new comment on a material by the authenticated user.
 */
export async function addComment(
  materialId: string,
  content: string
): Promise<CommentWithAuthor> {
  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new AppError('VALIDATION_ERROR', 'Comment cannot be empty.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'You must be signed in to post a comment.');
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      material_id: materialId,
      user_id: user.id,
      content: cleanContent,
    })
    .select(COMMENT_SELECT_FIELDS)
    .single();

  if (error) {
    throw new AppError(error.code ?? 'ADD_COMMENT_FAILED', toUserMessage(error), error);
  }

  return data as unknown as CommentWithAuthor;
}

/**
 * Deletes a comment.
 * Database RLS policy comments_delete_author_or_instructor allows the author or course instructor.
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new AppError(error.code ?? 'DELETE_COMMENT_FAILED', toUserMessage(error), error);
  }
}

