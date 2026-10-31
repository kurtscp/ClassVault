import { useState } from 'react';
import { View } from 'react-native';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LogoHorizontal,
  LogoStacked,
  Mark,
  Screen,
  Segmented,
  Skeleton,
  StatCard,
  Text,
} from '../src/components/ui';

/**
 * Component gallery for visual verification of all shared UI primitives.
 * Demonstrates locked tokens, typography, and states (BR-1..BR-4).
 * Replaced in Phase 2 with production auth routing.
 */
export default function ComponentGalleryScreen() {
  const [segmentedValue, setSegmentedValue] = useState('presentations');
  const [inputText, setInputText] = useState('');
  const [passwordText, setPasswordText] = useState('');

  return (
    <Screen scroll>
      <View className="mb-8">
        <Text variant="display" className="text-ink mb-2">
          ClassVault UI
        </Text>
        <Text variant="body" tone="muted">
          Shared component gallery and token reference.
        </Text>
      </View>

      {/* ── 1. LOGO PRIMITIVES ────────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          1. Brand Logos
        </Text>

        <Card className="mb-4">
          <Text variant="small" tone="muted" className="mb-3">
            Mark at 24px, 48px, 120px
          </Text>
          <View className="flex-row items-end gap-6 mb-4">
            <Mark width={24} />
            <Mark width={48} />
            <Mark width={120} />
          </View>

          <Text variant="small" tone="muted" className="mb-2">
            Reversed Mark on bg-brand
          </Text>
          <View className="bg-brand p-4 rounded-control items-center justify-center self-start">
            <Mark variant="reversed" width={48} />
          </View>
        </Card>

        <Card className="mb-4">
          <Text variant="small" tone="muted" className="mb-3">
            Horizontal Lockup (Color & Reversed)
          </Text>
          <View className="mb-3">
            <LogoHorizontal width={220} />
          </View>
          <View className="bg-brand p-4 rounded-control">
            <LogoHorizontal variant="reversed" width={220} />
          </View>
        </Card>

        <Card>
          <Text variant="small" tone="muted" className="mb-3">
            Stacked Lockup (Color & Reversed)
          </Text>
          <View className="flex-row items-center gap-4">
            <View className="p-2">
              <LogoStacked width={140} />
            </View>
            <View className="bg-brand p-4 rounded-control">
              <LogoStacked variant="reversed" width={140} />
            </View>
          </View>
        </Card>
      </View>

      {/* ── 2. TYPOGRAPHY ────────────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          2. Typography Scale
        </Text>
        <Card className="gap-2">
          <Text variant="display" className="text-ink">Display 32/40</Text>
          <Text variant="h1" className="text-ink">Heading 1 28/36</Text>
          <Text variant="h2" className="text-ink">Heading 2 22/30</Text>
          <Text variant="title" className="text-ink">Title 18/26</Text>
          <Text variant="body">Body 16/24 regular text in Inter</Text>
          <Text variant="bodyStrong">Body Strong 16/24 semibold emphasis</Text>
          <Text variant="small" tone="secondary">Small 14/20 secondary label</Text>
          <Text variant="caption" tone="muted">Caption 12/16 muted footnote</Text>
          <Text variant="body" tone="danger">Body danger message</Text>
          <Text variant="body" tone="brand">Body brand emphasis</Text>
        </Card>
      </View>

      {/* ── 3. BUTTONS ───────────────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          3. Buttons
        </Text>
        <Card className="gap-3">
          <Button label="Primary Button" variant="primary" fullWidth />
          <Button
            label="Primary with Icon"
            variant="primary"
            icon={<Upload size={20} strokeWidth={1.75} className="text-white" />}
            fullWidth
          />
          <Button label="Secondary Button" variant="secondary" fullWidth />
          <Button label="Ghost Button" variant="ghost" fullWidth />
          <Button label="Danger Button" variant="danger" fullWidth />
          <Button label="Loading State" variant="primary" loading fullWidth />
          <Button label="Disabled State" variant="primary" disabled fullWidth />
        </Card>
      </View>

      {/* ── 4. INPUTS ────────────────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          4. Inputs
        </Text>
        <Card className="gap-4">
          <Input
            label="Course title"
            placeholder="e.g. CS 101 Introduction"
            value={inputText}
            onChangeText={setInputText}
            helperText="Enter a title between 3 and 80 characters."
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={passwordText}
            onChangeText={setPasswordText}
            secureTextEntry
            helperText="Must be at least 8 characters long."
          />
          <Input
            label="Course code"
            placeholder="CS101"
            value="INVALID_CODE_TOO_LONG"
            errorText="Course code must be between 2 and 12 characters."
          />
        </Card>
      </View>

      {/* ── 5. SEGMENTED & BADGE ─────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          5. Segmented & Badge
        </Text>
        <Card className="gap-4">
          <Segmented
            options={[
              { value: 'presentations', label: 'Presentations' },
              { value: 'exercises', label: 'Exercises' },
            ]}
            value={segmentedValue}
            onChange={setSegmentedValue}
          />

          <View className="flex-row items-center gap-2">
            <Badge label="Enrolled" />
            <Badge
              label="Graded"
              icon={<CheckCircle2 size={14} strokeWidth={1.75} className="text-action" />}
            />
            <Badge label="80 MB Cap" />
          </View>
        </Card>
      </View>

      {/* ── 6. STAT CARDS ────────────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          6. Analytics StatCard
        </Text>
        <View className="gap-3">
          <StatCard
            label="Enrolled students"
            value="48"
            icon={<Users size={20} strokeWidth={1.75} className="text-brand" />}
            trend="+12% from last term"
          />
          <StatCard
            label="Exercise submissions"
            value="142"
            icon={<FileText size={20} strokeWidth={1.75} className="text-brand" />}
            trend="96% submission rate"
          />
          <StatCard
            label="Class average"
            value="88.5"
            icon={<TrendingUp size={20} strokeWidth={1.75} className="text-brand" />}
          />
        </View>
      </View>

      {/* ── 7. EMPTY STATE ───────────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          7. Empty State
        </Text>
        <Card>
          <EmptyState
            icon={<BookOpen size={28} strokeWidth={1.75} className="text-brand" />}
            title="No materials uploaded"
            message="Upload slides or exercise files up to 80 MB for your enrolled students."
            action={{
              label: "Upload material",
              onPress: () => {},
            }}
          />
        </Card>
      </View>

      {/* ── 8. SKELETON LOADERS ──────────────────────────────────────── */}
      <View className="mb-8">
        <Text variant="title" className="text-ink mb-3">
          8. Skeleton Loaders
        </Text>
        <Card className="gap-3">
          <Skeleton width="40%" height={24} />
          <Skeleton width="80%" height={16} />
          <Skeleton width="60%" height={16} />
          <View className="flex-row gap-2 mt-2">
            <Skeleton width={80} height={32} rounded="full" />
            <Skeleton width={100} height={32} rounded="full" />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
