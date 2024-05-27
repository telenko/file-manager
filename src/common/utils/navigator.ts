import { NavigationProp } from '@react-navigation/native';

export const navigateFromSelectable = (
  navigator: NavigationProp<any>,
  reload: boolean = false,
) => {
  const state = navigator.getState();
  const routes = state.routes;

  let screensCounter = 0;
  // Find the last screen where isSelectable is either undefined or false
  for (let i = routes.length - 1; i >= 0; i--) {
    const route = routes[i];
    if (
      route.params &&
      route.params.mode !== 'copy' &&
      route.params.mode !== 'move'
    ) {
      break;
    }
    screensCounter++;
  }
  // @ts-ignore
  navigator.pop(screensCounter, { reload });
};
