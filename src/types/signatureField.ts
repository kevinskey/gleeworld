
export interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'initials' | 'date' | 'text' | 'username';
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font?: string;
  text_align?: 'left' | 'center' | 'right';
  default_value?: string;
}
