// Who can use the GA screens (Scan, Who's here, Taster bookings): GAs, and
// admins too, so an admin can stand in on the welcome desk. Matches
// requireGA on the website (lib/auth/requireGA.ts). Posting announcements
// stays admins only (role === 'admin').
export const canUseGAScreens = (role?: string) =>
  role === 'ga' || role === 'admin';
