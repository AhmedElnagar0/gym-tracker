import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';

export default function HistoryScreen() {
  return (
    <Screen>
      <Notice title="No workouts yet" body="Workout history arrives in M5." />
    </Screen>
  );
}
