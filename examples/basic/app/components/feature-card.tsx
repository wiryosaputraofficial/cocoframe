import type { CocoNode } from "@cocoframe/jsx";
import styles from "./feature-card.module.css";

export interface FeatureCardProps {
  readonly title: string;
  readonly children?: CocoNode;
}

export function FeatureCard({ title, children }: FeatureCardProps) {
  return <article class={styles.card}><h2>{title}</h2><div>{children}</div></article>;
}
