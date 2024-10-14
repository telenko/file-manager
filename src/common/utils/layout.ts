import { theme } from "../../theme";

const GRID_WIDTH_BASE = theme.layout.GRID_WIDTH_BASE;

export const calcGridColumns = (windowWidth: number) => {
  return Math.round(windowWidth / GRID_WIDTH_BASE);
};

export const GRID_HEIGHT = theme.layout.GRID_HEIGHT;
export const LIST_HEIGHT = theme.layout.LIST_HEIGHT;