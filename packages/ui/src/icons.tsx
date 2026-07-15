import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };
}

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base({ size: 16, ...p })}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base({ size: 16, ...p })}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
  </svg>
);

export const AlertTriangleIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m22 4-10 10.01-3-3" />
  </svg>
);

export const MoreVerticalIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export const BookOpenIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
    <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
  </svg>
);

export const WalletIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M2 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H4a2 2 0 0 0 0 4h16v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <circle cx="17" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <circle cx="9" cy="8" r="3.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M2 19c0-3 3-5 7-5s7 2 7 5" />
    <path d="M16 14.5c2.2.3 4 1.6 4 4.5" />
  </svg>
);

export const BuildingIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
    <path d="M15 10h4a1 1 0 0 1 1 1v10" />
    <path d="M8 8h2M8 12h2M8 16h2M4 21h16" />
  </svg>
);

export const BriefcaseIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M3 13h18" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const HelpCircleIcon = (p: IconProps) => (
  <svg {...base({ size: 20, ...p })}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01" />
  </svg>
);
