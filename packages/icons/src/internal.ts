import { jsx, raw } from "@cocoframe/jsx";
import type { SolarIconComponent, SolarIconProps } from "./index.ts";

export function defineSolarIcon(name: string, content: string): SolarIconComponent {
  const className = `solar solar-${name}-linear`;
  return (props: SolarIconProps = {}) => {
    const {
      size = 24,
      color = "currentColor",
      strokeWidth = 1.5,
      mirrored = false,
      label,
      class: customClass,
    } = props;
    const children = mirrored
      ? raw(`<g transform="translate(24 0) scale(-1 1)">${content}</g>`)
      : raw(content);

    return jsx("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: normalizeSize(size),
      height: normalizeSize(size),
      viewBox: "0 0 24 24",
      fill: "none",
      color,
      "stroke-width": strokeWidth,
      class: customClass ? `${className} ${customClass}` : className,
      role: label ? "img" : undefined,
      "aria-label": label,
      "aria-hidden": label ? undefined : "true",
      focusable: "false",
      children,
    });
  };
}

function normalizeSize(size: number): number {
  return Number.isFinite(size) && size > 0 ? size : 24;
}
