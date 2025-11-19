export const FILTERS_DATA = ['new','open','data provided','returned','accepted','declined'];

export const romanToInt = (roman: string): number | null => {
  switch (roman.toUpperCase()) {
    case 'I':
      return 1;
    case 'II*':
    case 'II':
      return 2;
    case 'III':
      return 3;
    default:
      // Handle cases where the input is not a recognized Roman numeral
      console.error(`Invalid Roman numeral: ${roman}`);
      return null;
  }
}