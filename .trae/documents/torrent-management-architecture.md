## 1. Architecture Design

```mermaid
graph TD
    A[User Browser] --> B[React Frontend Application]
    B --> C[Node.js Backend Service]
    C --> D[Torrent Search APIs]
    C --> E[uTorrent WebUI API]
    C --> F[Drive Detection Service]
    C --> G[Security Scanning Service]
    
    subgraph "Frontend Layer"
        B
    end
    
    subgraph "Backend Layer"
        C
        F
        G
    end
    
    subgraph "External Services"
        D
        E
    end
```

## 2. Technology Description

- **Frontend**: React@18 + tailwindcss@3 + vite
- **Initialization Tool**: vite-init
- **Backend**: Node.js@20 + Express@4
- **Additional Libraries**: 
  - axios for API requests
  - socket.io for real-time updates
  - electron-builder for desktop packaging

## 3. Route Definitions

| Route | Purpose |
|-------|---------|
| / | Search interface for torrent discovery |
| /downloads | Download management and progress monitoring |
| /settings | Application configuration and uTorrent integration |
| /history | Download history and file organization |

## 4. API Definitions

### 4.1 Torrent Search API
```
GET /api/torrents/search
```

Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| query | string | true | Search query string |
| category | string | false | Content category filter |
| minSeeders | number | false | Minimum seeder count |
| maxSize | number | false | Maximum file size in MB |
| format | string | false | File format filter |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| results | array | Array of torrent objects |
| totalCount | number | Total search results |

Example Response:
```json
{
  "results": [
    {
      "name": "Example File",
      "size": 1500,
      "seeders": 1250,
      "leechers": 45,
      "format": "MP4",
      "magnetLink": "magnet:?xt=urn:btih:...",
      "hash": "abc123def456"
    }
  ],
  "totalCount": 150
}
```

### 4.2 Drive Detection API
```
GET /api/system/drives
```

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| drives | array | Available drive information |

Example Response:
```json
{
  "drives": [
    {
      "letter": "C:",
      "label": "System Drive",
      "totalSpace": 500000,
      "freeSpace": 150000,
      "type": "local"
    },
    {
      "letter": "D:",
      "label": "Data Drive",
      "totalSpace": 1000000,
      "freeSpace": 750000,
      "type": "local"
    }
  ]
}
```

### 4.3 Download Management API
```
POST /api/downloads/start
```

Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| magnetLink | string | true | Magnet link or torrent URL |
| destination | string | true | Download destination path |
| bandwidthLimit | number | false | Speed limit in KB/s |

```
GET /api/downloads/progress/:id
```

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| progress | number | Download percentage |
| speed | number | Current download speed |
| eta | string | Estimated time remaining |
| status | string | Current download status |

## 5. Server Architecture Diagram

```mermaid
graph TD
    A[Client Request] --> B[Express Router]
    B --> C[Middleware Layer]
    C --> D[Controller Layer]
    D --> E[Service Layer]
    E --> F[Torrent Service]
    E --> G[Drive Service]
    E --> H[Security Service]
    F --> I[External APIs]
    G --> J[System APIs]
    H --> K[Antivirus APIs]
    
    subgraph "Server Architecture"
        B
        C
        D
        E
        F
        G
        H
    end
```

## 6. Data Model

### 6.1 Data Model Definition

```mermaid
erDiagram
    DOWNLOAD ||--o{ DOWNLOAD_FILE : contains
    DOWNLOAD ||--o{ DOWNLOAD_HISTORY : records
    SETTINGS ||--o{ USER_PREFERENCE : configures
    
    DOWNLOAD {
        string id PK
        string magnet_link
        string destination_path
        string status
        number progress
        number speed
        string eta
        timestamp created_at
        timestamp updated_at
    }
    
    DOWNLOAD_FILE {
        string id PK
        string download_id FK
        string file_name
        number file_size
        string file_path
        boolean completed
    }
    
    DOWNLOAD_HISTORY {
        string id PK
        string download_id FK
        string action
        string details
        timestamp timestamp
    }
    
    SETTINGS {
        string id PK
        string utorrent_host
        string utorrent_port
        string utorrent_username
        string utorrent_password
        boolean ssl_verification
        boolean copyright_filter
        number bandwidth_limit
    }
```

### 6.2 Data Definition Language

Download Table (downloads)
```sql
-- create table
CREATE TABLE downloads (
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
CREATE INDEX idx_downloads_status ON downloads(status);
CREATE INDEX idx_downloads_created_at ON downloads(created_at DESC);

-- create download files table
CREATE TABLE download_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    download_id UUID REFERENCES downloads(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_path VARCHAR(500),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create download history table
CREATE TABLE download_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    download_id UUID REFERENCES downloads(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create settings table
CREATE TABLE settings (
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

-- insert default settings
INSERT INTO settings (utorrent_host, utorrent_port, ssl_verification, copyright_filter) 
VALUES ('localhost', 8080, TRUE, TRUE);
```