import { useCallback, useState } from 'react';
import {
  addComment,
  CommentWithAuthor,
  deleteComment,
  listComments,
} from '../services/comments';
import { useAsync, UseAsyncResult } from './useAsync';

export interface UseCommentsResult
  extends Omit<UseAsyncResult<CommentWithAuthor[]>, 'data'> {
  comments: CommentWithAuthor[];
  postComment: (content: string) => Promise<CommentWithAuthor | null>;
  removeComment: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Hook managing real-time comments on a course material (P3.5).
 */
export function useComments(materialId: string | undefined): UseCommentsResult {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetcher = useCallback(async (): Promise<CommentWithAuthor[]> => {
    if (!materialId) {
      return [];
    }
    return listComments(materialId);
  }, [materialId]);

  const asyncState = useAsync<CommentWithAuthor[]>(fetcher, [materialId]);

  const postComment = useCallback(
    async (content: string): Promise<CommentWithAuthor | null> => {
      if (!materialId) {
        return null;
      }
      setIsSubmitting(true);
      try {
        const newComment = await addComment(materialId, content);
        await asyncState.refetch();
        return newComment;
      } finally {
        setIsSubmitting(false);
      }
    },
    [materialId, asyncState]
  );

  const removeComment = useCallback(
    async (commentId: string): Promise<void> => {
      setIsSubmitting(true);
      try {
        await deleteComment(commentId);
        await asyncState.refetch();
      } finally {
        setIsSubmitting(false);
      }
    },
    [asyncState]
  );

  return {
    ...asyncState,
    comments: asyncState.data ?? [],
    postComment,
    removeComment,
    isSubmitting,
  };
}

