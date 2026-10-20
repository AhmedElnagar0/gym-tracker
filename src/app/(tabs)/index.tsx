import { BackupStatusCard } from '@/components/backup-status-card';
import { DbStatusLine } from '@/components/db-status-line';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';

export default function TodayScreen() {
  return (
    <Screen>
      <DbStatusLine />
      <BackupStatusCard />
      <Notice
        title="No workouts yet"
        body="Empty workouts arrive in M3. Today's suggested split day arrives in M8."
      />
    </Screen>
  );
}
