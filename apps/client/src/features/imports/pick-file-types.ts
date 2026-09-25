export interface PickedFile {
  name: string;
  contentBase64: string;
}

export const SPREADSHEET_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
