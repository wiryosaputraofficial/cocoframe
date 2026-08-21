import type { CocoNode } from "@cocoframe/jsx";
export { solarLinearIconNames } from "./names.ts";
export type { SolarLinearIconName } from "./names.ts";

export interface SolarIconProps {
  readonly size?: number;
  readonly color?: string;
  readonly strokeWidth?: 1 | 1.5 | 2;
  readonly mirrored?: boolean;
  readonly label?: string;
  readonly class?: string;
}

export type SolarIconComponent = (props?: SolarIconProps) => CocoNode;
