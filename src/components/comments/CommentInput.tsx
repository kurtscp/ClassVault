import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Send } from 'lucide-react-native';

import { Input, Text } from '../ui';

export interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Sticky bottom bar for composing and posting a comment.
 * Clears the input on successful submit. Disabled while a post is in flight.
 * Max 500 characters enforced client-side (matches DB constraint).
 */
export function CommentInput({ onSubmit, isSubmitting }: CommentInputProps) {
  const [text, setText] = useState('');

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= 500 && !isSubmitting;

  const handleSend = async () => {
    if (!canSend) return;
    await onSubmit(trimmed);
    setText('');
  };

  return (
    <View
      className="border-t border-line bg-white px-4 py-3 flex-row items-end gap-2"
      // Web: elevate above page scroll
      style={Platform.OS === 'web' ? { position: 'sticky', bottom: 0 } as never : undefined}
    >
      <View className="flex-1">
        <Input
          placeholder="Write a comment..."
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
          returnKeyType="default"
          editable={!isSubmitting}
          className="max-h-28"
        />
        {text.length > 450 ? (
          <Text variant="caption" tone="muted" className="text-right mt-0.5">
            {text.length}/500
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send comment"
        className={`w-11 h-11 rounded-control items-center justify-center ${
          canSend ? 'bg-action active:bg-action-pressed' : 'bg-emerald-100'
        }`}
      >
        <Send size={18} strokeWidth={1.75} className={canSend ? 'text-white' : 'text-fg-muted'} />
      </Pressable>
    </View>
  );
}
