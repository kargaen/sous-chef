import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors } from "@/constants";
import { Button, FormattedText, Spinner } from "@/views/components/ui";
import type { ButtonVariant } from "@/views/components/ui";
import { SousChefMark } from "@/views/components/companion";

import { styles } from "./HomeCard.styles";

/** Visual urgency of a card — reads by accent + icon, not just rank order. */
export type HomeCardTone = "default" | "urgent" | "invite";

export interface HomeCardProps {
  /** Small uppercase label above the title (e.g. "Pantry"). */
  eyebrow?: string;
  title: string;
  /** Visual urgency. `urgent` warms the card + adds an icon; `invite` softens it. */
  tone?: HomeCardTone;
  /** Card body — each card provides its own summary content. */
  children?: ReactNode;
  /** Optional LLM-generated nudge/hint. Rendered as garnish only when present. */
  hint?: string | null;
  /** Primary action. Routes into the owning tab. */
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  /** Optional secondary action, rendered below the primary. */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Shows a spinner in place of the body while the card's data loads. */
  loading?: boolean;
}

/**
 * Shared presentational wrapper for landing-page cards. View-only: data,
 * relevance, and visibility decisions live in each card's controller. The
 * ranker (LP.0a) decides whether and where this renders; this component only
 * draws a consistent card given the content it is handed.
 */
export function HomeCard({
  eyebrow,
  title,
  tone = "default",
  children,
  hint,
  actionLabel,
  onAction,
  actionVariant = "secondary",
  secondaryActionLabel,
  onSecondaryAction,
  loading = false,
}: HomeCardProps) {
  const isUrgent = tone === "urgent";

  return (
    <View
      style={[
        styles.card,
        isUrgent && styles.cardUrgent,
        tone === "invite" && styles.cardInvite,
      ]}
    >
      <View style={styles.header}>
        {eyebrow ? (
          <View style={styles.eyebrowRow}>
            {isUrgent ? (
              <Feather
                name="alert-circle"
                size={13}
                color={colors.brand.terracottaDark}
              />
            ) : null}
            <Text style={[styles.eyebrow, isUrgent && styles.eyebrowUrgent]}>
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Spinner />
        </View>
      ) : (
        <>
          {children ? <View style={styles.body}>{children}</View> : null}

          {hint ? (
            <View style={styles.hintBlock}>
              <SousChefMark size={20} />
              <View style={styles.hintBody}>
                <Text style={styles.hintLabel}>Sous Chef</Text>
                <FormattedText style={styles.hintText}>{hint}</FormattedText>
              </View>
            </View>
          ) : null}

          {actionLabel && onAction ? (
            <View style={styles.actionRow}>
              <Button
                label={actionLabel}
                variant={actionVariant}
                onPress={onAction}
              />
              {secondaryActionLabel && onSecondaryAction ? (
                <Button
                  label={secondaryActionLabel}
                  variant="ghost"
                  onPress={onSecondaryAction}
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
