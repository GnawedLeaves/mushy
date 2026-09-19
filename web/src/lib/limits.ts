// Single source of truth for text field limits -- imported by both the
// client-side maxLength/counters and the Server Actions' own validation
// (client limits are UX only, never trusted alone).
export const USERNAME_MAX = 30;
export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 280;
export const BOARD_TITLE_MAX = 60;
export const BOARD_DESCRIPTION_MAX = 300;
export const SAVE_CAPTION_MAX = 200;
export const COMMENT_MAX = 1000;
