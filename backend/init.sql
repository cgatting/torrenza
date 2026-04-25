-- create table
CREATE TABLE IF NOT EXISTS downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magnet_link TEXT NOT NULL,
    destination_path VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'paused', 'completed', 'failed')),
    progress DECIMAL(5,2) DEFAULT 0.00,
    speed INTEGER DEFAULT 0,
    eta VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes
CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);

-- create download files table
CREATE TABLE IF NOT EXISTS download_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    download_id UUID REFERENCES downloads(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_path VARCHAR(500),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create download history table
CREATE TABLE IF NOT EXISTS download_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    download_id UUID REFERENCES downloads(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utorrent_host VARCHAR(255) DEFAULT 'localhost',
    utorrent_port INTEGER DEFAULT 8080,
    utorrent_username VARCHAR(100),
    utorrent_password VARCHAR(100),
    ssl_verification BOOLEAN DEFAULT TRUE,
    copyright_filter BOOLEAN DEFAULT TRUE,
    bandwidth_limit INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- insert default settings if not exists
INSERT INTO settings (utorrent_host, utorrent_port, ssl_verification, copyright_filter)
SELECT 'localhost', 8080, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM settings);
