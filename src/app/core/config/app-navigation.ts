export interface NavigationItem {
  label: string;
  route: string | null;
  icon: string;
}

export const APP_NAVIGATION = {
  DASHBOARD: {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  },
  RECORDS: {
    label: 'Records',
    route: '/records',
    icon: 'M8 3H5v18h14V3h-3 M8 2h8v4H8z M8 11h8 M8 16h5',
  },
  TRENDS: {
    label: 'Trends',
    route: '/trends',
    icon: 'M4 3v17h17 M7 14l4-4 4 3 6-7',
  },
  PROFILE: {
    label: 'Profile',
    route: '/profile',
    icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  },
  SETTINGS: {
    label: 'Settings',
    route: '/settings',
    icon: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  },
} satisfies Record<string, NavigationItem>;
