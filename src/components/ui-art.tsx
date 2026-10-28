import { uiArtUrl, type UiArtName } from "@/data/ingredient-art/ui";

/** 화면 장식 그림 (냄비·접시·탭 아이콘 등). 글자가 늘 함께 있으므로 장식이다. */
export function UiArt({ name, className = "size-6" }: { name: UiArtName; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 코드로 만든 SVG data URL
    <img
      src={uiArtUrl(name)}
      alt=""
      aria-hidden
      draggable={false}
      data-ui-art={name}
      className={`pointer-events-none inline-block shrink-0 select-none ${className}`}
    />
  );
}
