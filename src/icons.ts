/** 24×24 line icons, drawn with stroke="currentColor" so they follow every theme. Each entry is a list of SVG path `d` values. */
export const ICONS = {
  overview: ['M3 12.5 12 4l9 8.5', 'M5.5 10.5V20h13v-9.5', 'M10 20v-5h4v5'],
  sessions: ['M4 6.5h16v13.5H4z', 'M4 10.5h16', 'M8.5 4v4', 'M15.5 4v4', 'M8 14h2.5', 'M13.5 14H16', 'M8 17h2.5'],
  invoices: ['M6 3.5h8.5L18.5 7.5V20.5H6z', 'M14 3.5v4.5h4.5', 'M9 12h6', 'M9 15.5h6', 'M9 8.5h2.5'],
  expenses: ['M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z', 'M9 8h6', 'M9 11.5h6', 'M9 15h3.5'],
  bank: ['M3.5 9.5 12 4.5l8.5 5', 'M4.5 20h15', 'M6.5 10.5v7', 'M10.5 10.5v7', 'M13.5 10.5v7', 'M17.5 10.5v7'],
  tax: ['M5 19 19 5', 'M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  settings: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', 'M16 5v4', 'M10 15v4'],
  logout: ['M14 4.5H6.5v15H14', 'M10.5 12H20', 'M16.5 8.5 20 12l-3.5 3.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  upload: ['M12 15V4.5', 'M8 8.5l4-4 4 4', 'M5 15v4.5h14V15'],
  download: ['M12 4.5V15', 'M8 11l4 4 4-4', 'M5 15v4.5h14V15'],
  print: ['M7 9V4h10v5', 'M7 17H4.5V9h15v8H17', 'M7 14h10v6H7z'],
} satisfies Record<string, string[]>

export type IconName = keyof typeof ICONS
