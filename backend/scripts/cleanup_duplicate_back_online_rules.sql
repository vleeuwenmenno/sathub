-- Cleanup duplicate back_online notification rules
-- Keep only the oldest back_online rule per settings_id and delete the rest

-- First, let's see what we're about to delete
SELECT 
    snr.id,
    snr.settings_id,
    snr.type,
    snr.created_at,
    'TO DELETE' as action
FROM station_notification_rules snr
WHERE snr.type = 'back_online'
AND snr.id NOT IN (
    -- Keep the oldest back_online rule for each settings_id
    SELECT DISTINCT ON (settings_id) id
    FROM station_notification_rules
    WHERE type = 'back_online'
    ORDER BY settings_id, created_at ASC
);

-- Delete duplicate back_online rules (keep only the oldest one per settings_id)
DELETE FROM station_notification_rules
WHERE id IN (
    SELECT snr.id
    FROM station_notification_rules snr
    WHERE snr.type = 'back_online'
    AND snr.id NOT IN (
        -- Keep the oldest back_online rule for each settings_id
        SELECT DISTINCT ON (settings_id) id
        FROM station_notification_rules
        WHERE type = 'back_online'
        ORDER BY settings_id, created_at ASC
    )
);

-- Show the final state
SELECT 
    settings_id,
    COUNT(*) FILTER (WHERE type = 'back_online') as back_online_count,
    COUNT(*) as total_rules
FROM station_notification_rules
GROUP BY settings_id
ORDER BY settings_id;
