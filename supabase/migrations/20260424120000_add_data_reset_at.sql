-- Add data_reset_at column to track when user data was last cleared
ALTER TABLE user_data ADD COLUMN data_reset_at TIMESTAMPTZ;

-- Add comment to explain the column
COMMENT ON COLUMN user_data.data_reset_at IS 'Timestamp when user last cleared all portfolio and comparator data';