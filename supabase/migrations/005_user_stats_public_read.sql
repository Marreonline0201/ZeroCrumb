-- Allow anyone to read user_stats (for viewing other users' profiles)
-- Stats like XP and meals tracked are public for social features
drop policy if exists "Anyone can read user stats" on user_stats;
create policy "Anyone can read user stats" on user_stats
  for select using (true);
