import type { Href } from 'expo-router';

// Every in-app link is built here, so a path typo can only happen in one place.
// (Expo Router's experimental typed routes are off: on Windows its generator listed
// every file under src/ as a route and broke type-checking.)

export const routes = {
  backup: (): Href => '/backup',
  newExercise: (): Href => '/exercise/new',
  newVariant: (parentId: string): Href => ({ pathname: '/exercise/new', params: { parentId } }),
  exercise: (id: string): Href => ({ pathname: '/exercise/[id]', params: { id } }),
  editExercise: (id: string): Href => ({ pathname: '/exercise/[id]/edit', params: { id } }),
};
