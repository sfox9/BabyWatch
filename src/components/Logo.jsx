import { C } from "../lib/theme";

// BabyWatch logo — line work only: circle head, ear bumps, three-strand hair
// tuft, dot eyes, curved smile. Nav: sand circle + earth lines. Auth: clay
// circle + cream lines (dark prop).
export default function BabyLogo({ size = 40, dark = false }) {
  const bg = dark ? C.clay : C.sand;
  const stroke = dark ? C.white : C.earth;
  const sw = 1.5;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill={bg} />
      {/* Head outline */}
      <circle cx="20" cy="22" r="10" stroke={stroke} strokeWidth={sw} fill="none" />
      {/* Left ear */}
      <path d="M10.3 19.5 Q7.5 19.5 7.5 22.5 Q7.5 25.5 10.3 25.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* Right ear */}
      <path d="M29.7 19.5 Q32.5 19.5 32.5 22.5 Q32.5 25.5 29.7 25.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* Three-strand hair tuft */}
      <path d="M17 12.6 Q17.8 9.4 19.4 8.2" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d="M20 12.2 Q20 8.8 20 7.4" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d="M23 12.6 Q22.2 9.4 20.6 8.2" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="16.5" cy="21" r="1" fill={stroke} />
      <circle cx="23.5" cy="21" r="1" fill={stroke} />
      {/* Smile */}
      <path d="M16.5 25.5 Q20 29 23.5 25.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </svg>
  );
}
