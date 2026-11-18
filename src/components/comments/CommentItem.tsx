import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { Badge, Text } from '../ui';
import { formatCommentTimestamp } from '@/lib/format';
import { CommentWithAuthor } from '@/services/comments';

export interface CommentItemProps {
  comment: CommentWithAuthor;
  /** True when the current user authored this comment */
  isOwn: boolean;
  /** True when the current user is the course instructor (can delete any comment) */
  isInstructor: boolean;
  onDelete: (commentId: string) => Promise<void>;
  isDeleting: boolean;
}

/**
 * Single comment row.
 * Avatar circle shows initials (bg-emerald-100).
 * Delete icon visible only to the comment author or the course instructor.
 * Inline confirm before deletion.
 *
 * SEC-6 RLS backing:
 *   comments_delete_author_or_instructor — user_id = auth.uid() OR course instructor
 */
export function CommentItem({
  comment,
  isOwn,
  isInstructor,
  onDelete,
  isDeleting,
}: CommentItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete = isOwn || isInstructor;
  const author = comment.user;
  const authorName = author?.full_name ?? 'Unknown';
  const authorRole = author?.role ?? 'student';

  // Build 1-2 character initials from full name
  const initials = authorName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View className="flex-row gap-3 py-3 border-b border-line">
      {/* Avatar circle */}
      <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center shrink-0 mt-0.5">
        <Text variant="caption" className="text-action font-heading">
          {initials}
        </Text>
      </View>

      <View className="flex-1 gap-1">
        {/* Author name + role badge + timestamp */}
        <View className="flex-row items-center flex-wrap gap-1.5">
          <Text variant="small" className="text-ink font-heading">
            {authorName}
          </Text>
          <Badge
            label={authorRole === 'instructor' ? 'Instructor' : 'Student'}
            className={authorRole === 'instructor' ? 'bg-emerald-100' : 'bg-emerald-50'}
          />
          <Text variant="caption" tone="muted">
            {formatCommentTimestamp(comment.created_at)}
          </Text>
        </View>

        {/* Comment content */}
        <Text variant="body" className="text-fg">
          {comment.content}
        </Text>

        {/* Inline delete confirm */}
        {confirmDelete ? (
          <View className="flex-row items-center gap-2 mt-1">
            <Text variant="small" tone="secondary">
              Delete this comment?
            </Text>
            <Pressable
              onPress={async () => {
                await onDelete(comment.id);
                setConfirmDelete(false);
              }}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Confirm delete comment"
              className="px-2 py-1 rounded-control bg-danger active:opacity-80"
            >
              <Text variant="caption" className="text-white font-heading">
                Delete
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel delete"
              className="px-2 py-1 rounded-control active:bg-emerald-50"
            >
              <Text variant="caption" tone="secondary" className="font-heading">
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Delete icon — only visible to author or instructor */}
      {canDelete && !confirmDelete ? (
        <Pressable
          onPress={() => setConfirmDelete(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete comment"
          className="p-1.5 rounded-control active:bg-emerald-50 self-start mt-0.5"
        >
          <Trash2 size={16} strokeWidth={1.75} className="text-fg-muted" />
        </Pressable>
      ) : null}
    </View>
  );
}
