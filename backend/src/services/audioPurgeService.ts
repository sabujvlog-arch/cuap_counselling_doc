import fs from 'fs';
import path from 'path';
import { query } from '../config/db';

/**
 * Automated 24-Hour Privacy & Audio Retention Purge Engine
 * Scans audio_recordings for any entries older than 24 hours (or expires_at <= NOW()),
 * permanently deletes physical audio files from disk, and sets recording status to 'deleted'.
 */
export const purgeExpiredAudioRecordings = async (): Promise<{ purgedCount: number }> => {
  try {
    // Find all active audio recordings that have completed AI processing and are past 24 hours retention
    const expiredRes = await query(`
      SELECT id, session_id, file_path, created_at, expires_at, ai_processed_at, ai_processing_status
      FROM audio_recordings
      WHERE status = 'active' 
        AND (ai_processing_status = 'COMPLETED' OR ai_processing_status IS NULL)
        AND (
          expires_at <= CURRENT_TIMESTAMP 
          OR ai_processed_at <= datetime('now', '-1 day') 
          OR (ai_processed_at IS NULL AND created_at <= datetime('now', '-1 day'))
        )
    `);

    const recordsToPurge = expiredRes.rows || [];
    let purgedCount = 0;

    for (const record of recordsToPurge) {
      // 1. Delete physical file if present
      if (record.file_path) {
        const absolutePath = path.isAbsolute(record.file_path)
          ? record.file_path
          : path.join(__dirname, '../../', record.file_path);

        try {
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[AUDIO PURGE] Successfully deleted audio file: ${absolutePath}`);
          }
        } catch (fsErr) {
          console.error(`[AUDIO PURGE] Failed to unlink audio file ${absolutePath}:`, fsErr);
        }
      }

      // 2. Update record status to 'deleted' and clear file_path
      await query(
        `UPDATE audio_recordings
         SET status = 'deleted', file_path = NULL, deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [record.id],
      );

      // 3. Write an immutable audit log entry
      try {
        await query(
          `INSERT INTO audit_logs (user_id, action, resource, details)
           VALUES (1, 'AUTOMATED_24H_AUDIO_PURGE', 'audio_recordings', $1)`,
          [
            `Permanently purged audio recording ID ${record.id} for session ${record.session_id} after 24h retention policy.`,
          ],
        );
      } catch (_) {}

      purgedCount++;
    }

    if (purgedCount > 0) {
      console.log(
        `[AUDIO PURGE] Completed purge job: ${purgedCount} temporary audio recordings permanently destroyed.`,
      );
    }

    return { purgedCount };
  } catch (err) {
    console.error('[AUDIO PURGE] Error during automated 24-hour audio purge:', err);
    return { purgedCount: 0 };
  }
};

/**
 * Initializes recurring background scheduler for 24-hour audio purge
 */
export const startAudioPurgeScheduler = () => {
  const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

  // Initial execution 5 seconds after startup
  setTimeout(() => {
    purgeExpiredAudioRecordings();
  }, 5000);

  // Periodic recurring check
  setInterval(() => {
    purgeExpiredAudioRecordings();
  }, CHECK_INTERVAL_MS);
};
