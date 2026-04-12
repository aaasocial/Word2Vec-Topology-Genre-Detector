export const GENRE_COLORS: Record<string, string> = {
  romance:    '#F472B6',
  mystery:    '#60A5FA',
  western:    '#FB923C',
  fantasy:    '#A78BFA',
  scifi:      '#34D399',
  horror:     '#F87171',
  historical: '#FBBF24',
  literary:   '#2DD4BF',
  adventure:  '#FB7185',
  gothic:     '#C084FC',
}
export const GENRE_LIST = Object.keys(GENRE_COLORS) as string[]
// historical dims to amber-600 when uploaded book is active (avoids color collision)
export const HISTORICAL_DIM_COLOR = '#D97706'
export const UPLOADED_BOOK_COLOR = '#FBBF24'
