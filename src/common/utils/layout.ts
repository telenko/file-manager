const GRID_WIDTH_BASE = 100;

export const calcGridColumns = (windowWidth: number) => {
  return Math.round(windowWidth / GRID_WIDTH_BASE);
};

export const GRID_HEIGHT = 110;
export const LIST_HEIGHT = 70;