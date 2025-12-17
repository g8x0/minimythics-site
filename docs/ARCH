# Game Clone Architecture

> A comprehensive design document for a Legend of Mushroom / Pew Pew Slime style multiplayer game.
> **Status:** Living Document
> **Last Updated:** 2025-11-30

---

## Table of Contents

1. [Server Architecture](#i-server-architecture)
2. [Packet Protocol](#ii-packet-protocol)
3. [Client Architecture](#iii-client-architecture)
4. [Game Systems](#iv-game-systems)
5. [Database Schema](#v-database-schema)
6. [Infrastructure](#vi-infrastructure)
7. [Assets & Content](#vii-assets--content)

---

# I. Server Architecture

## Overview

The server is built on **Pitaya**, a scalable game server framework written in Go. It handles all authoritative game logic, player sessions, arena PvP, and persistence.

## Service Topology

```
                                    ┌─────────────────────────────────────┐
                                    │           Load Balancer             │
                                    │         (nginx / AWS ALB)           │
                                    └─────────────────┬───────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
          ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
          │   Gate Server   │               │   Gate Server   │               │   Gate Server   │
          │   (WebSocket)   │               │   (WebSocket)   │               │   (WebSocket)   │
          │    Port 3000    │               │    Port 3000    │               │    Port 3000    │
          └────────┬────────┘               └────────┬────────┘               └────────┬────────┘
                   │                                 │                                 │
                   └─────────────────────────────────┼─────────────────────────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │     NATS / gRPC     │
                                          │   (Service Mesh)    │
                                          └──────────┬──────────┘
                                                     │
                   ┌─────────────────────────────────┼─────────────────────────────────┐
                   │                                 │                                 │
                   ▼                                 ▼                                 ▼
         ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
         │  Game Server    │               │  Arena Server   │               │  Chat Server    │
         │  (Rooms/Combat) │               │  (Async PvP)    │               │  (Social)       │
         └────────┬────────┘               └────────┬────────┘               └────────┬────────┘
                  │                                 │                                 │
                  └─────────────────────────────────┼─────────────────────────────────┘
                                                    │
                                                    ▼
                                     ┌──────────────────────────────┐
                                     │         Data Layer           │
                                     │  ┌────────┐    ┌──────────┐  │
                                     │  │ Redis  │    │  MySQL/  │  │
                                     │  │ Cache  │    │ Postgres │  │
                                     │  └────────┘    └──────────┘  │
                                     └──────────────────────────────┘
```

## Server Types

### 1. Gate Server (Frontend)
The entry point for all client connections.

**Responsibilities:**
- Accept WebSocket connections from clients
- Handle handshake and encryption setup
- Route packets to appropriate backend services
- Maintain session state
- Handle disconnection/reconnection

**Configuration:**
```go
type GateConfig struct {
    Port              int           `yaml:"port"`               // 3000
    MaxConnections    int           `yaml:"max_connections"`    // 10000
    HandshakeTimeout  time.Duration `yaml:"handshake_timeout"`  // 10s
    HeartbeatInterval time.Duration `yaml:"heartbeat_interval"` // 30s
    WriteBufferSize   int           `yaml:"write_buffer_size"`  // 4096
    ReadBufferSize    int           `yaml:"read_buffer_size"`   // 4096
}
```

### 2. Game Server (Backend)
Handles authoritative game logic and room management.

**Responsibilities:**
- Create and manage game rooms
- Process player inputs (movement, attacks)
- Run game simulation tick loop
- Broadcast state updates to players
- Handle combat resolution

**Configuration:**
```go
type GameConfig struct {
    TickRate          int           `yaml:"tick_rate"`          // 20 (50ms per tick)
    MaxRoomsPerServer int           `yaml:"max_rooms"`          // 100
    MaxPlayersPerRoom int           `yaml:"max_players_room"`   // 8
    RoomIdleTimeout   time.Duration `yaml:"room_idle_timeout"`  // 5m
}
```

### 3. Arena Server (Backend)
Handles PvP arena with asynchronous battles against AI-controlled player builds.

**Responsibilities:**
- Maintain PvP leaderboard rankings
- Store player "defense" builds for others to challenge
- Simulate battles between challenger and defender AI
- Calculate ELO/MMR changes after battles
- Manage arena refresh timers and challenge attempts

**Configuration:**
```go
type ArenaConfig struct {
    DailyAttempts       int           `yaml:"daily_attempts"`     // 5
    AttemptRefreshTime  time.Duration `yaml:"attempt_refresh"`    // 2h per attempt
    EloKFactor          int           `yaml:"elo_k_factor"`       // 32
    LeaderboardPageSize int           `yaml:"leaderboard_size"`   // 50
    OpponentPoolSize    int           `yaml:"opponent_pool"`      // 3 choices
    BattleSimTickRate   int           `yaml:"sim_tick_rate"`      // 60 (faster for AI vs AI)
}
```

### 4. Chat Server (Backend)
Handles social features and communication.

**Responsibilities:**
- Global/regional chat channels
- Private messaging
- Guild chat
- Chat moderation (filters, muting)

---

## Pitaya Handler Definitions

Handlers are the RPC endpoints that process client requests.

### Gate Handlers

```go
// gate/handlers.go

type GateHandler struct {
    // dependencies
}

// Handshake - Initial connection setup
// Route: "gate.handshake"
func (h *GateHandler) Handshake(ctx context.Context, req *pb.HandshakeRequest) (*pb.HandshakeResponse, error)

// Heartbeat - Keep connection alive
// Route: "gate.heartbeat"
func (h *GateHandler) Heartbeat(ctx context.Context, req *pb.HeartbeatRequest) (*pb.HeartbeatResponse, error)
```

### Auth Handlers

```go
// auth/handlers.go

type AuthHandler struct {
    // dependencies
}

// Login - Authenticate player
// Route: "auth.login"
func (h *AuthHandler) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error)

// GuestLogin - Create/login as guest
// Route: "auth.guest"
func (h *AuthHandler) GuestLogin(ctx context.Context, req *pb.GuestLoginRequest) (*pb.GuestLoginResponse, error)

// Logout - End session
// Route: "auth.logout"
func (h *AuthHandler) Logout(ctx context.Context, req *pb.LogoutRequest) (*pb.LogoutResponse, error)

// Register - Create new account
// Route: "auth.register"
func (h *AuthHandler) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error)
```

### Arena Handlers

```go
// arena/handlers.go

type ArenaHandler struct {
    // dependencies
}

// GetLeaderboard - Fetch arena rankings
// Route: "arena.leaderboard"
func (h *ArenaHandler) GetLeaderboard(ctx context.Context, req *pb.LeaderboardRequest) (*pb.LeaderboardResponse, error)

// GetOpponents - Get available opponents to challenge (based on ELO range)
// Route: "arena.opponents"
func (h *ArenaHandler) GetOpponents(ctx context.Context, req *pb.OpponentsRequest) (*pb.OpponentsResponse, error)

// Challenge - Start async battle against opponent's defense build
// Route: "arena.challenge"
func (h *ArenaHandler) Challenge(ctx context.Context, req *pb.ChallengeRequest) (*pb.ChallengeResponse, error)

// SetDefense - Update player's defense build for others to fight
// Route: "arena.setdefense"
func (h *ArenaHandler) SetDefense(ctx context.Context, req *pb.SetDefenseRequest) (*pb.SetDefenseResponse, error)

// GetBattleLog - Retrieve recent arena battle history
// Route: "arena.battlelog"
func (h *ArenaHandler) GetBattleLog(ctx context.Context, req *pb.BattleLogRequest) (*pb.BattleLogResponse, error)
```

### Game Handlers

```go
// game/handlers.go

type GameHandler struct {
    // dependencies
}

// Ready - Signal ready to start
// Route: "game.ready"
func (h *GameHandler) Ready(ctx context.Context, req *pb.ReadyRequest) (*pb.ReadyResponse, error)

// Move - Player movement input
// Route: "game.move"
func (h *GameHandler) Move(ctx context.Context, req *pb.MoveRequest) (*pb.MoveResponse, error)

// Attack - Player attack input
// Route: "game.attack"
func (h *GameHandler) Attack(ctx context.Context, req *pb.AttackRequest) (*pb.AttackResponse, error)

// UseSkill - Activate ability
// Route: "game.skill"
func (h *GameHandler) UseSkill(ctx context.Context, req *pb.UseSkillRequest) (*pb.UseSkillResponse, error)

// UseItem - Consume item
// Route: "game.item"
func (h *GameHandler) UseItem(ctx context.Context, req *pb.UseItemRequest) (*pb.UseItemResponse, error)
```

### Player Handlers

```go
// player/handlers.go

type PlayerHandler struct {
    // dependencies
}

// GetProfile - Fetch player data
// Route: "player.profile"
func (h *PlayerHandler) GetProfile(ctx context.Context, req *pb.ProfileRequest) (*pb.ProfileResponse, error)

// GetInventory - Fetch player inventory
// Route: "player.inventory"
func (h *PlayerHandler) GetInventory(ctx context.Context, req *pb.InventoryRequest) (*pb.InventoryResponse, error)

// EquipItem - Equip item to slot
// Route: "player.equip"
func (h *PlayerHandler) EquipItem(ctx context.Context, req *pb.EquipRequest) (*pb.EquipResponse, error)

// UnequipItem - Remove item from slot
// Route: "player.unequip"
func (h *PlayerHandler) UnequipItem(ctx context.Context, req *pb.UnequipRequest) (*pb.UnequipResponse, error)

// GetStats - Fetch player statistics
// Route: "player.stats"
func (h *PlayerHandler) GetStats(ctx context.Context, req *pb.StatsRequest) (*pb.StatsResponse, error)
```

### Chat Handlers

```go
// chat/handlers.go

type ChatHandler struct {
    // dependencies
}

// SendMessage - Send chat message
// Route: "chat.send"
func (h *ChatHandler) SendMessage(ctx context.Context, req *pb.ChatSendRequest) (*pb.ChatSendResponse, error)

// JoinChannel - Subscribe to channel
// Route: "chat.join"
func (h *ChatHandler) JoinChannel(ctx context.Context, req *pb.JoinChannelRequest) (*pb.JoinChannelResponse, error)

// LeaveChannel - Unsubscribe from channel
// Route: "chat.leave"
func (h *ChatHandler) LeaveChannel(ctx context.Context, req *pb.LeaveChannelRequest) (*pb.LeaveChannelResponse, error)
```

---

## Game Room Lifecycle

```
┌─────────────┐     Create      ┌─────────────┐     All Ready    ┌─────────────┐
│   EMPTY     │ ──────────────► │   WAITING   │ ────────────────►│   RUNNING   │
└─────────────┘                 └─────────────┘                  └──────┬──────┘
                                       │                                │
                                       │ Timeout/                       │ Game End
                                       │ All Leave                      │
                                       ▼                                ▼
                                ┌─────────────┐                  ┌─────────────┐
                                │  DISPOSED   │ ◄────────────────│  FINISHED   │
                                └─────────────┘    Cleanup       └─────────────┘
```

### Room States

| State | Description |
|-------|-------------|
| `EMPTY` | Room created, no players |
| `WAITING` | Players joining, waiting for ready |
| `COUNTDOWN` | All ready, starting countdown |
| `RUNNING` | Game in progress |
| `FINISHED` | Game ended, showing results |
| `DISPOSED` | Room cleaned up and removed |

### Room Structure

```go
type Room struct {
    ID            string
    State         RoomState
    Config        RoomConfig
    Players       map[string]*Player
    Entities      map[string]*Entity
    CreatedAt     time.Time
    StartedAt     time.Time
    TickNumber    uint64

    // Channels
    inputQueue    chan PlayerInput
    broadcastChan chan *pb.StateUpdate

    // Ticker
    ticker        *time.Ticker
    done          chan struct{}
}

type RoomConfig struct {
    MaxPlayers    int
    GameMode      GameMode
    MapID         string
    TimeLimit     time.Duration
    ScoreLimit    int
    Private       bool
    Password      string
}
```

---

## Game Loop (Tick System)

The server runs an authoritative tick-based simulation.

```go
func (r *Room) RunGameLoop() {
    r.ticker = time.NewTicker(time.Second / time.Duration(r.Config.TickRate))
    defer r.ticker.Stop()

    for {
        select {
        case <-r.done:
            return

        case <-r.ticker.C:
            r.processTick()
        }
    }
}

func (r *Room) processTick() {
    r.TickNumber++

    // 1. Process all queued inputs
    r.processInputs()

    // 2. Update physics/movement
    r.updatePhysics()

    // 3. Process combat/collisions
    r.processCombat()

    // 4. Update entity states
    r.updateEntities()

    // 5. Check win conditions
    r.checkGameEnd()

    // 6. Broadcast state to all players
    r.broadcastState()
}
```

### Tick Rate Considerations

| Tick Rate | Interval | Use Case |
|-----------|----------|----------|
| 10 Hz | 100ms | Turn-based, casual |
| 20 Hz | 50ms | Action RPG (recommended) |
| 30 Hz | 33ms | Fast-paced shooter |
| 60 Hz | 16ms | Competitive FPS |

**Recommended: 20 Hz** - Good balance between responsiveness and bandwidth.

---

## Session Management

```go
type Session struct {
    ID            string
    PlayerID      string
    ConnectionID  string
    ServerID      string
    State         SessionState
    Data          map[string]interface{}
    CreatedAt     time.Time
    LastActiveAt  time.Time
    ExpiresAt     time.Time
}

type SessionState int

const (
    SessionConnected SessionState = iota
    SessionAuthenticated
    SessionInLobby
    SessionInGame
    SessionDisconnected
)
```

### Session Flow

```
Connect → Handshake → Authenticate → Lobby ←→ Game → Disconnect
                                       ↑         │
                                       └─────────┘
                                       (Return to Lobby)
```

---

## Scaling Strategy

### Horizontal Scaling

1. **Gate Servers**: Scale based on connection count
   - Each gate handles ~10,000 connections
   - Add more gates behind load balancer

2. **Game Servers**: Scale based on room count
   - Each game server handles ~100 rooms
   - Rooms are assigned to least-loaded server

3. **Arena Servers**: Usually 1-2 instances sufficient
   - Handles async PvP battle simulations
   - Stateless, can scale horizontally if needed

### Server Discovery (Service Registry)

```go
type ServiceRegistry interface {
    Register(service ServiceInfo) error
    Deregister(serviceID string) error
    Discover(serviceType string) ([]ServiceInfo, error)
    Watch(serviceType string, callback func([]ServiceInfo))
}

type ServiceInfo struct {
    ID       string
    Type     string   // "gate", "game", "match", "chat"
    Address  string
    Port     int
    Load     float64  // 0.0 - 1.0
    Metadata map[string]string
}
```

---

## Directory Structure (Server)

```
server/
├── cmd/
│   ├── gate/
│   │   └── main.go           # Gate server entry point
│   ├── game/
│   │   └── main.go           # Game server entry point
│   ├── arena/
│   │   └── main.go           # Arena server entry point
│   └── chat/
│       └── main.go           # Chat server entry point
│
├── internal/
│   ├── gate/
│   │   ├── handler.go        # Gate handlers
│   │   ├── session.go        # Session management
│   │   └── websocket.go      # WebSocket handling
│   │
│   ├── game/
│   │   ├── handler.go        # Game handlers
│   │   ├── room.go           # Room management
│   │   ├── loop.go           # Game loop
│   │   ├── physics.go        # Physics simulation
│   │   ├── combat.go         # Combat resolution
│   │   └── entity.go         # Entity management
│   │
│   ├── arena/
│   │   ├── handler.go        # Arena handlers
│   │   ├── leaderboard.go    # Leaderboard rankings
│   │   ├── battle_sim.go     # AI vs AI battle simulation
│   │   └── elo.go            # ELO/MMR calculations
│   │
│   ├── chat/
│   │   ├── handler.go        # Chat handlers
│   │   ├── channel.go        # Channel management
│   │   └── filter.go         # Chat filtering
│   │
│   ├── player/
│   │   ├── handler.go        # Player handlers
│   │   ├── model.go          # Player model
│   │   └── service.go        # Player service
│   │
│   └── auth/
│       ├── handler.go        # Auth handlers
│       ├── jwt.go            # JWT handling
│       └── service.go        # Auth service
│
├── pkg/
│   ├── protocol/
│   │   ├── packet.go         # Packet encoding/decoding
│   │   ├── opcodes.go        # Opcode definitions
│   │   └── crypto.go         # Encryption
│   │
│   ├── db/
│   │   ├── redis.go          # Redis client
│   │   ├── mysql.go          # MySQL client
│   │   └── migrations/       # DB migrations
│   │
│   └── utils/
│       ├── logger.go         # Logging
│       ├── config.go         # Config loading
│       └── errors.go         # Error handling
│
├── proto/
│   ├── gate.proto            # Gate messages
│   ├── auth.proto            # Auth messages
│   ├── lobby.proto           # Lobby messages
│   ├── game.proto            # Game messages
│   ├── player.proto          # Player messages
│   └── chat.proto            # Chat messages
│
├── configs/
│   ├── gate.yaml             # Gate config
│   ├── game.yaml             # Game config
│   ├── arena.yaml            # Arena config
│   └── chat.yaml             # Chat config
│
├── scripts/
│   ├── build.sh              # Build script
│   ├── deploy.sh             # Deploy script
│   └── migrate.sh            # DB migration script
│
├── go.mod
├── go.sum
└── Makefile
```

---

## Configuration Example

```yaml
# configs/game.yaml

server:
  id: "game-1"
  type: "game"
  host: "0.0.0.0"
  port: 3100

game:
  tick_rate: 20
  max_rooms: 100
  max_players_per_room: 8
  room_idle_timeout: 5m

physics:
  world_width: 1920
  world_height: 1080
  player_speed: 200
  projectile_speed: 500

nats:
  url: "nats://localhost:4222"
  cluster_id: "game-cluster"

redis:
  host: "localhost"
  port: 6379
  password: ""
  db: 0

mysql:
  host: "localhost"
  port: 3306
  user: "game"
  password: "secret"
  database: "game_db"
  max_connections: 20

logging:
  level: "info"
  format: "json"
  output: "stdout"
```

---

## Error Handling

```go
type GameError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

// Error codes
const (
    ErrCodeSuccess           = 0
    ErrCodeUnknown           = 1
    ErrCodeInvalidRequest    = 100
    ErrCodeUnauthorized      = 101
    ErrCodeSessionExpired    = 102
    ErrCodeRoomNotFound      = 200
    ErrCodeRoomFull          = 201
    ErrCodeAlreadyInRoom     = 202
    ErrCodeNotInRoom         = 203
    ErrCodeGameAlreadyStarted = 204
    ErrCodeInvalidMove       = 300
    ErrCodeOnCooldown        = 301
    ErrCodeInsufficientMana  = 302
    ErrCodeItemNotFound      = 400
    ErrCodeInventoryFull     = 401
)
```

---

## Next Section

Continue to [II. Packet Protocol](#ii-packet-protocol) for the communication layer design.

---

# II. Packet Protocol

## Overview

All communication between client and server uses a binary packet format over WebSocket. Packets are serialized using Protocol Buffers (protobuf) for efficiency and type safety.

## Packet Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        Packet Frame                             │
├─────────┬─────────┬─────────┬───────────────────────────────────┤
│  Type   │ Opcode  │ Length  │            Payload                │
│ (1 byte)│ (2 bytes)│(4 bytes)│          (N bytes)                │
├─────────┼─────────┼─────────┼───────────────────────────────────┤
│  0x01   │  0x0064 │ 0x00000020 │  [Protobuf encoded data...]    │
└─────────┴─────────┴─────────┴───────────────────────────────────┘
         │                   │
         │    Header (7 bytes)                Payload (variable)
         │                   │
```

### Packet Types

| Type | Value | Description |
|------|-------|-------------|
| `REQUEST` | 0x01 | Client → Server request (expects response) |
| `RESPONSE` | 0x02 | Server → Client response to request |
| `PUSH` | 0x03 | Server → Client unsolicited push |
| `NOTIFY` | 0x04 | Client → Server notification (no response) |

### Header Format

```go
type PacketHeader struct {
    Type   uint8   // Packet type (1 byte)
    Opcode uint16  // Operation code (2 bytes, big-endian)
    Length uint32  // Payload length (4 bytes, big-endian)
}

func (h *PacketHeader) Encode() []byte {
    buf := make([]byte, 7)
    buf[0] = h.Type
    binary.BigEndian.PutUint16(buf[1:3], h.Opcode)
    binary.BigEndian.PutUint32(buf[3:7], h.Length)
    return buf
}

func DecodeHeader(data []byte) *PacketHeader {
    return &PacketHeader{
        Type:   data[0],
        Opcode: binary.BigEndian.Uint16(data[1:3]),
        Length: binary.BigEndian.Uint32(data[3:7]),
    }
}
```

---

## Connection Handshake

```
┌────────┐                                              ┌────────┐
│ Client │                                              │ Server │
└───┬────┘                                              └───┬────┘
    │                                                       │
    │  ──────────── WebSocket Connect ──────────────────►   │
    │                                                       │
    │  ◄─────────── Connection Accepted ────────────────    │
    │                                                       │
    │  ──────────── HandshakeRequest ───────────────────►   │
    │               (client version, platform)              │
    │                                                       │
    │  ◄─────────── HandshakeResponse ──────────────────    │
    │               (server time, session token,            │
    │                heartbeat interval, encryption key)    │
    │                                                       │
    │  ══════════════ Encrypted Channel ════════════════    │
    │                                                       │
    │  ──────────── LoginRequest ───────────────────────►   │
    │               (credentials / guest token)             │
    │                                                       │
    │  ◄─────────── LoginResponse ──────────────────────    │
    │               (player data, success/fail)             │
    │                                                       │
    │  ◄──────────────── Heartbeat ─────────────────────►   │
    │               (every 30 seconds)                      │
    │                                                       │
```

### Encryption Flow

After handshake, all packets are encrypted:

```go
// Key exchange during handshake
type HandshakeResponse struct {
    ServerTime        int64  // Unix timestamp (ms)
    SessionToken      string // Unique session ID
    HeartbeatInterval int32  // Heartbeat interval (seconds)
    EncryptionKey     []byte // AES-128 key (encrypted with RSA)
    EncryptionIV      []byte // AES initialization vector
}

// Packet encryption (AES-128-CBC)
func EncryptPacket(plaintext, key, iv []byte) []byte {
    block, _ := aes.NewCipher(key)
    plaintext = pkcs7Pad(plaintext, aes.BlockSize)
    ciphertext := make([]byte, len(plaintext))
    mode := cipher.NewCBCEncrypter(block, iv)
    mode.CryptBlocks(ciphertext, plaintext)
    return ciphertext
}

func DecryptPacket(ciphertext, key, iv []byte) []byte {
    block, _ := aes.NewCipher(key)
    plaintext := make([]byte, len(ciphertext))
    mode := cipher.NewCBCDecrypter(block, iv)
    mode.CryptBlocks(plaintext, ciphertext)
    return pkcs7Unpad(plaintext)
}
```

---

## Opcode Registry

Opcodes are organized by category using ranges:

| Range | Category | Description |
|-------|----------|-------------|
| 0x0001 - 0x00FF | System | Handshake, heartbeat, errors |
| 0x0100 - 0x01FF | Auth | Login, logout, register |
| 0x0200 - 0x02FF | Arena | Leaderboard, challenge, defense |
| 0x0300 - 0x03FF | Game | Movement, attacks, skills |
| 0x0400 - 0x04FF | Player | Profile, inventory, stats |
| 0x0500 - 0x05FF | Chat | Messages, channels |
| 0x0600 - 0x06FF | Social | Friends, guild |
| 0x0700 - 0x07FF | Shop | Purchases, currency |
| 0x0800 - 0x08FF | Events | Notifications, broadcasts |

### System Opcodes (0x0001 - 0x00FF)

```go
const (
    // System
    OpHandshakeReq      uint16 = 0x0001
    OpHandshakeRes      uint16 = 0x0002
    OpHeartbeatReq      uint16 = 0x0003
    OpHeartbeatRes      uint16 = 0x0004
    OpDisconnect        uint16 = 0x0005
    OpErrorRes          uint16 = 0x00FF
)
```

### Auth Opcodes (0x0100 - 0x01FF)

```go
const (
    // Auth
    OpLoginReq          uint16 = 0x0100
    OpLoginRes          uint16 = 0x0101
    OpGuestLoginReq     uint16 = 0x0102
    OpGuestLoginRes     uint16 = 0x0103
    OpLogoutReq         uint16 = 0x0104
    OpLogoutRes         uint16 = 0x0105
    OpRegisterReq       uint16 = 0x0106
    OpRegisterRes       uint16 = 0x0107
    OpTokenRefreshReq   uint16 = 0x0108
    OpTokenRefreshRes   uint16 = 0x0109
)
```

### Arena Opcodes (0x0200 - 0x02FF)

```go
const (
    // Arena
    OpLeaderboardReq    uint16 = 0x0200
    OpLeaderboardRes    uint16 = 0x0201
    OpOpponentsReq      uint16 = 0x0202
    OpOpponentsRes      uint16 = 0x0203
    OpChallengeReq      uint16 = 0x0204
    OpChallengeRes      uint16 = 0x0205
    OpSetDefenseReq     uint16 = 0x0206
    OpSetDefenseRes     uint16 = 0x0207
    OpBattleLogReq      uint16 = 0x0208
    OpBattleLogRes      uint16 = 0x0209
    OpArenaInfoReq      uint16 = 0x020A
    OpArenaInfoRes      uint16 = 0x020B

    // Arena Push Events
    OpDefenseAttackedPush   uint16 = 0x0280  // Someone attacked your defense
    OpRankChangePush        uint16 = 0x0281  // Your rank changed
    OpArenaRewardPush       uint16 = 0x0282  // Daily/weekly arena rewards
    OpAttemptsRefreshPush   uint16 = 0x0283  // Challenge attempts refreshed
)
```

### Game Opcodes (0x0300 - 0x03FF)

```go
const (
    // Game Input
    OpMoveReq           uint16 = 0x0300
    OpMoveRes           uint16 = 0x0301
    OpAttackReq         uint16 = 0x0302
    OpAttackRes         uint16 = 0x0303
    OpUseSkillReq       uint16 = 0x0304
    OpUseSkillRes       uint16 = 0x0305
    OpUseItemReq        uint16 = 0x0306
    OpUseItemRes        uint16 = 0x0307
    OpInteractReq       uint16 = 0x0308
    OpInteractRes       uint16 = 0x0309

    // Game State Push
    OpStateUpdatePush   uint16 = 0x0380
    OpPlayerSpawnPush   uint16 = 0x0381
    OpPlayerDeathPush   uint16 = 0x0382
    OpPlayerRespawnPush uint16 = 0x0383
    OpDamageEventPush   uint16 = 0x0384
    OpProjectileSpawnPush uint16 = 0x0385
    OpProjectileHitPush uint16 = 0x0386
    OpItemDropPush      uint16 = 0x0387
    OpItemPickupPush    uint16 = 0x0388
    OpGameEndPush       uint16 = 0x038F
)
```

### Player Opcodes (0x0400 - 0x04FF)

```go
const (
    // Player Data
    OpProfileReq        uint16 = 0x0400
    OpProfileRes        uint16 = 0x0401
    OpInventoryReq      uint16 = 0x0402
    OpInventoryRes      uint16 = 0x0403
    OpEquipReq          uint16 = 0x0404
    OpEquipRes          uint16 = 0x0405
    OpUnequipReq        uint16 = 0x0406
    OpUnequipRes        uint16 = 0x0407
    OpStatsReq          uint16 = 0x0408
    OpStatsRes          uint16 = 0x0409
    OpLeaderboardReq    uint16 = 0x040A
    OpLeaderboardRes    uint16 = 0x040B
)
```

### Chat Opcodes (0x0500 - 0x05FF)

```go
const (
    // Chat
    OpChatSendReq       uint16 = 0x0500
    OpChatSendRes       uint16 = 0x0501
    OpJoinChannelReq    uint16 = 0x0502
    OpJoinChannelRes    uint16 = 0x0503
    OpLeaveChannelReq   uint16 = 0x0504
    OpLeaveChannelRes   uint16 = 0x0505

    // Chat Push
    OpChatMessagePush   uint16 = 0x0580
    OpSystemMessagePush uint16 = 0x0581
)
```

---

## Protobuf Schemas

### Common Types

```protobuf
// proto/common.proto

syntax = "proto3";
package game;

option go_package = "github.com/yourproject/proto";

// Vector2 - 2D position/direction
message Vector2 {
    float x = 1;
    float y = 2;
}

// Vector3 - 3D position/direction
message Vector3 {
    float x = 1;
    float y = 2;
    float z = 3;
}

// Timestamp - Unix milliseconds
message Timestamp {
    int64 millis = 1;
}

// Error response
message ErrorResponse {
    int32 code = 1;
    string message = 2;
}
```

### System Messages

```protobuf
// proto/system.proto

syntax = "proto3";
package game;

import "common.proto";

// Handshake
message HandshakeRequest {
    string client_version = 1;
    string platform = 2;        // "webgl", "ios", "android"
    string device_id = 3;
}

message HandshakeResponse {
    int64 server_time = 1;
    string session_token = 2;
    int32 heartbeat_interval = 3;
    bytes encryption_key = 4;
    bytes encryption_iv = 5;
    string server_version = 6;
}

// Heartbeat
message HeartbeatRequest {
    int64 client_time = 1;
}

message HeartbeatResponse {
    int64 server_time = 1;
}

// Disconnect
message DisconnectNotify {
    int32 reason = 1;
    string message = 2;
}
```

### Auth Messages

```protobuf
// proto/auth.proto

syntax = "proto3";
package game;

// Login with credentials
message LoginRequest {
    string username = 1;
    string password = 2;        // Hashed client-side
}

message LoginResponse {
    int32 code = 1;
    string message = 2;
    PlayerData player = 3;
    string auth_token = 4;
}

// Guest login
message GuestLoginRequest {
    string device_id = 1;
    string guest_token = 2;     // Empty for new guest
}

message GuestLoginResponse {
    int32 code = 1;
    string message = 2;
    PlayerData player = 3;
    string guest_token = 4;
    string auth_token = 5;
}

// Register
message RegisterRequest {
    string username = 1;
    string password = 2;
    string email = 3;
}

message RegisterResponse {
    int32 code = 1;
    string message = 2;
}

// Logout
message LogoutRequest {}

message LogoutResponse {
    int32 code = 1;
}
```

### Arena Messages

```protobuf
// proto/arena.proto

syntax = "proto3";
package game;

// Arena opponent preview (shown in opponent selection)
message ArenaOpponent {
    string player_id = 1;
    string name = 2;
    int32 level = 3;
    int32 elo = 4;
    int32 rank = 5;
    int64 power = 6;            // Combat power rating
    string avatar_id = 7;
    string title = 8;           // Player title/achievement
}

// Defense build configuration
message DefenseBuild {
    string character_id = 1;
    repeated string skill_ids = 2;
    repeated string equipment_ids = 3;
    repeated string rune_ids = 4;
    int64 total_power = 5;
}

// Arena battle result
message ArenaBattleResult {
    string battle_id = 1;
    string opponent_id = 2;
    string opponent_name = 3;
    bool won = 4;
    int32 elo_change = 5;
    int32 new_elo = 6;
    int32 new_rank = 7;
    int64 battle_time = 8;      // Unix timestamp
    bytes battle_replay = 9;    // Compressed replay data for playback
}

// Get leaderboard
message LeaderboardRequest {
    int32 page = 1;
    int32 limit = 2;            // Default 50
}

message LeaderboardResponse {
    int32 code = 1;
    repeated ArenaOpponent rankings = 2;
    int32 my_rank = 3;
    int32 my_elo = 4;
    int32 total_players = 5;
}

// Get available opponents to challenge
message OpponentsRequest {}

message OpponentsResponse {
    int32 code = 1;
    repeated ArenaOpponent opponents = 2;   // 3 opponents near your ELO
    int32 attempts_remaining = 3;
    int64 next_attempt_refresh = 4;         // Unix timestamp
    int32 refresh_cost = 5;                 // Gems to refresh opponents
}

// Challenge an opponent
message ChallengeRequest {
    string opponent_id = 1;
}

message ChallengeResponse {
    int32 code = 1;
    string message = 2;
    ArenaBattleResult result = 3;
    int32 attempts_remaining = 4;
}

// Set defense build
message SetDefenseRequest {
    DefenseBuild build = 1;
}

message SetDefenseResponse {
    int32 code = 1;
    string message = 2;
}

// Get battle history
message BattleLogRequest {
    int32 limit = 1;            // Default 20
}

message BattleLogResponse {
    int32 code = 1;
    repeated ArenaBattleResult battles = 2;
    repeated ArenaBattleResult defenses = 3;    // Battles where others attacked you
}

// Get arena info (attempts, rank, rewards)
message ArenaInfoRequest {}

message ArenaInfoResponse {
    int32 code = 1;
    int32 rank = 2;
    int32 elo = 3;
    int32 attempts_remaining = 4;
    int32 max_attempts = 5;
    int64 next_attempt_refresh = 6;
    int32 season_id = 7;
    int64 season_end = 8;       // Unix timestamp
    DefenseBuild current_defense = 9;
}

// Push: Someone attacked your defense
message DefenseAttackedPush {
    string attacker_id = 1;
    string attacker_name = 2;
    bool they_won = 3;
    int32 elo_change = 4;
    int32 new_elo = 5;
    int32 new_rank = 6;
}

// Push: Rank changed significantly
message RankChangePush {
    int32 old_rank = 1;
    int32 new_rank = 2;
    string reason = 3;          // "attack_win", "defense_loss", "season_reset"
}

// Push: Arena rewards available
message ArenaRewardPush {
    string reward_type = 1;     // "daily", "weekly", "season"
    repeated ItemReward rewards = 2;
}

// Push: Attempts refreshed
message AttemptsRefreshPush {
    int32 new_attempts = 1;
    int32 max_attempts = 2;
}
```

### Game Messages

```protobuf
// proto/game.proto

syntax = "proto3";
package game;

import "common.proto";

// Input: Movement
message MoveRequest {
    Vector2 direction = 1;      // Normalized direction
    uint64 input_sequence = 2;  // For reconciliation
    int64 timestamp = 3;
}

message MoveResponse {
    int32 code = 1;
    Vector2 position = 2;       // Server-authoritative position
    uint64 input_sequence = 3;
}

// Input: Attack
message AttackRequest {
    Vector2 direction = 1;      // Aim direction
    uint64 input_sequence = 2;
}

message AttackResponse {
    int32 code = 1;
    string projectile_id = 2;
}

// Input: Use skill
message UseSkillRequest {
    int32 skill_slot = 1;       // 0-3
    Vector2 target_pos = 2;     // Optional target position
    string target_id = 3;       // Optional target entity
}

message UseSkillResponse {
    int32 code = 1;
    string message = 2;
    float cooldown = 3;
}

// Input: Use item
message UseItemRequest {
    string item_id = 1;
    int32 slot = 2;
}

message UseItemResponse {
    int32 code = 1;
    string message = 2;
}

// Entity state (for updates)
message EntityState {
    string entity_id = 1;
    int32 entity_type = 2;      // 0=player, 1=projectile, 2=item, 3=npc
    Vector2 position = 3;
    Vector2 velocity = 4;
    float rotation = 5;
    int32 health = 6;
    int32 max_health = 7;
    int32 state_flags = 8;      // Bitfield for various states
    bytes extra_data = 9;       // Type-specific data
}

// Push: Full state update (sent every tick)
message StateUpdatePush {
    uint64 tick = 1;
    int64 server_time = 2;
    repeated EntityState entities = 3;
    repeated string removed_entities = 4;
}

// Push: Player spawned
message PlayerSpawnPush {
    string player_id = 1;
    string player_name = 2;
    Vector2 position = 3;
    int32 team = 4;
    string character_id = 5;
    int32 health = 6;
    int32 max_health = 7;
}

// Push: Player died
message PlayerDeathPush {
    string player_id = 1;
    string killer_id = 2;
    string weapon_id = 3;
    Vector2 position = 4;
}

// Push: Player respawned
message PlayerRespawnPush {
    string player_id = 1;
    Vector2 position = 2;
    int32 health = 3;
}

// Push: Damage event
message DamageEventPush {
    string target_id = 1;
    string source_id = 2;
    int32 damage = 3;
    int32 damage_type = 4;      // 0=normal, 1=crit, 2=dot
    int32 remaining_health = 5;
    Vector2 position = 6;
}

// Push: Projectile spawned
message ProjectileSpawnPush {
    string projectile_id = 1;
    string owner_id = 2;
    string weapon_id = 3;
    Vector2 position = 4;
    Vector2 velocity = 5;
    float lifetime = 6;
}

// Push: Projectile hit
message ProjectileHitPush {
    string projectile_id = 1;
    string hit_entity_id = 2;   // Empty if hit wall
    Vector2 position = 3;
}

// Push: Item dropped
message ItemDropPush {
    string drop_id = 1;
    string item_id = 2;
    Vector2 position = 3;
    int32 quantity = 4;
}

// Push: Item picked up
message ItemPickupPush {
    string drop_id = 1;
    string player_id = 2;
}

// Push: Game ended
message GameEndPush {
    int32 result = 1;           // 0=loss, 1=win, 2=draw
    string winner_id = 2;
    int32 winner_team = 3;
    repeated PlayerScore scores = 4;
    int32 game_duration = 5;    // Seconds
}

message PlayerScore {
    string player_id = 1;
    string player_name = 2;
    int32 kills = 3;
    int32 deaths = 4;
    int32 assists = 5;
    int32 score = 6;
    int32 damage_dealt = 7;
}
```

### Player Messages

```protobuf
// proto/player.proto

syntax = "proto3";
package game;

// Player data
message PlayerData {
    string player_id = 1;
    string username = 2;
    int32 level = 3;
    int64 experience = 4;
    int64 gold = 5;
    int64 gems = 6;
    int64 created_at = 7;
    int64 last_login = 8;
    PlayerStats stats = 9;
    string avatar_id = 10;
    string title = 11;
}

message PlayerStats {
    int32 games_played = 1;
    int32 games_won = 2;
    int32 kills = 3;
    int32 deaths = 4;
    int32 assists = 5;
    int64 total_damage = 6;
    int32 highest_kill_streak = 7;
    int32 rating = 8;           // ELO/MMR
}

// Item
message Item {
    string item_id = 1;
    string template_id = 2;
    int32 quantity = 3;
    int32 level = 4;
    int32 rarity = 5;           // 0=common, 1=uncommon, 2=rare, 3=epic, 4=legendary
    repeated ItemStat stats = 6;
    bool is_equipped = 7;
    int32 equip_slot = 8;
}

message ItemStat {
    string stat_type = 1;       // "attack", "defense", "speed", etc.
    float value = 2;
}

// Get profile
message ProfileRequest {
    string player_id = 1;       // Empty for self
}

message ProfileResponse {
    int32 code = 1;
    PlayerData player = 2;
}

// Get inventory
message InventoryRequest {
    int32 page = 1;
    int32 limit = 2;
    string category = 3;        // Filter by category
}

message InventoryResponse {
    int32 code = 1;
    repeated Item items = 2;
    int32 total = 3;
    int32 capacity = 4;
}

// Equip item
message EquipRequest {
    string item_id = 1;
    int32 slot = 2;
}

message EquipResponse {
    int32 code = 1;
    string message = 2;
}

// Unequip item
message UnequipRequest {
    int32 slot = 1;
}

message UnequipResponse {
    int32 code = 1;
    string message = 2;
}

// Get stats
message StatsRequest {
    string player_id = 1;       // Empty for self
}

message StatsResponse {
    int32 code = 1;
    PlayerStats stats = 2;
}

// Leaderboard
message LeaderboardRequest {
    string type = 1;            // "rating", "kills", "wins"
    int32 page = 2;
    int32 limit = 3;
}

message LeaderboardResponse {
    int32 code = 1;
    repeated LeaderboardEntry entries = 2;
    int32 my_rank = 3;
}

message LeaderboardEntry {
    int32 rank = 1;
    string player_id = 2;
    string player_name = 3;
    int32 level = 4;
    int64 value = 5;
}
```

### Chat Messages

```protobuf
// proto/chat.proto

syntax = "proto3";
package game;

// Channel types
enum ChannelType {
    CHANNEL_GLOBAL = 0;
    CHANNEL_GUILD = 1;
    CHANNEL_PRIVATE = 2;
    CHANNEL_SYSTEM = 3;
}

// Send message
message ChatSendRequest {
    ChannelType channel_type = 1;
    string channel_id = 2;      // Room ID, player ID for PM
    string content = 3;
}

message ChatSendResponse {
    int32 code = 1;
    string message = 2;
}

// Join channel
message JoinChannelRequest {
    ChannelType channel_type = 1;
    string channel_id = 2;
}

message JoinChannelResponse {
    int32 code = 1;
}

// Leave channel
message LeaveChannelRequest {
    ChannelType channel_type = 1;
    string channel_id = 2;
}

message LeaveChannelResponse {
    int32 code = 1;
}

// Push: Chat message received
message ChatMessagePush {
    ChannelType channel_type = 1;
    string channel_id = 2;
    string sender_id = 3;
    string sender_name = 4;
    string content = 5;
    int64 timestamp = 6;
}

// Push: System message
message SystemMessagePush {
    int32 message_type = 1;     // 0=info, 1=warning, 2=error, 3=event
    string content = 2;
    int64 timestamp = 3;
}
```

---

## Request/Response Pattern

### Request IDs

For request-response correlation, each request includes a unique ID:

```go
type RequestPacket struct {
    Header    PacketHeader
    RequestID uint32   // Unique request identifier
    Payload   []byte   // Protobuf encoded message
}

type ResponsePacket struct {
    Header    PacketHeader
    RequestID uint32   // Matches original request
    Payload   []byte   // Protobuf encoded message
}
```

### Client-Side Request Tracking

```csharp
// Unity C# example
public class PendingRequest
{
    public uint RequestId;
    public ushort Opcode;
    public float Timestamp;
    public Action<byte[]> OnSuccess;
    public Action<int, string> OnError;
    public float Timeout;
}

private Dictionary<uint, PendingRequest> _pendingRequests;
private uint _nextRequestId = 1;

public uint SendRequest<TReq, TRes>(ushort opcode, TReq request,
    Action<TRes> onSuccess, Action<int, string> onError, float timeout = 10f)
    where TReq : IMessage
    where TRes : IMessage, new()
{
    uint requestId = _nextRequestId++;

    var pending = new PendingRequest
    {
        RequestId = requestId,
        Opcode = opcode,
        Timestamp = Time.time,
        OnSuccess = (data) => {
            var response = new TRes();
            response.MergeFrom(data);
            onSuccess?.Invoke(response);
        },
        OnError = onError,
        Timeout = timeout
    };

    _pendingRequests[requestId] = pending;

    // Build and send packet
    byte[] payload = request.ToByteArray();
    byte[] packet = BuildPacket(PacketType.Request, opcode, requestId, payload);
    _socket.Send(packet);

    return requestId;
}
```

---

## Server Push Events

Push events are unsolicited messages from server to client:

```go
// Server-side push
func (r *Room) BroadcastStateUpdate() {
    update := &pb.StateUpdatePush{
        Tick:       r.TickNumber,
        ServerTime: time.Now().UnixMilli(),
        Entities:   r.GetEntityStates(),
        RemovedEntities: r.GetRemovedEntityIDs(),
    }

    payload, _ := proto.Marshal(update)

    for _, player := range r.Players {
        player.SendPush(OpStateUpdatePush, payload)
    }
}

func (p *Player) SendPush(opcode uint16, payload []byte) {
    header := &PacketHeader{
        Type:   PacketTypePush,
        Opcode: opcode,
        Length: uint32(len(payload)),
    }

    packet := append(header.Encode(), payload...)
    p.Connection.Send(packet)
}
```

```csharp
// Client-side push handler
private Dictionary<ushort, Action<byte[]>> _pushHandlers;

public void RegisterPushHandler<T>(ushort opcode, Action<T> handler)
    where T : IMessage, new()
{
    _pushHandlers[opcode] = (data) => {
        var message = new T();
        message.MergeFrom(data);
        handler?.Invoke(message);
    };
}

// Register handlers during initialization
void InitializePushHandlers()
{
    RegisterPushHandler<StateUpdatePush>(OpCodes.StateUpdatePush, OnStateUpdate);
    RegisterPushHandler<PlayerSpawnPush>(OpCodes.PlayerSpawnPush, OnPlayerSpawn);
    RegisterPushHandler<PlayerDeathPush>(OpCodes.PlayerDeathPush, OnPlayerDeath);
    RegisterPushHandler<ChatMessagePush>(OpCodes.ChatMessagePush, OnChatMessage);
    // ... etc
}
```

---

## Error Handling

### Error Response Format

```protobuf
message ErrorResponse {
    int32 code = 1;             // Error code
    string message = 2;         // Human-readable message
    string details = 3;         // Optional debug info
}
```

### Reconnection Protocol

```
┌────────┐                                              ┌────────┐
│ Client │                                              │ Server │
└───┬────┘                                              └───┬────┘
    │                                                       │
    │  [Connection Lost]                                    │
    │                                                       │
    │  ──────────── WebSocket Reconnect ────────────────►   │
    │                                                       │
    │  ──────────── ReconnectRequest ───────────────────►   │
    │               (session_token, last_tick)              │
    │                                                       │
    │  ◄─────────── ReconnectResponse ──────────────────    │
    │               (success, missed_events[])              │
    │                                                       │
    │  ◄─────────── StateUpdatePush (full sync) ────────    │
    │                                                       │
```

```protobuf
message ReconnectRequest {
    string session_token = 1;
    uint64 last_tick = 2;
}

message ReconnectResponse {
    int32 code = 1;
    bool success = 2;
    repeated bytes missed_events = 3;   // Queued push events
}
```

---

## Bandwidth Optimization

### Delta Compression

Only send changed entity states:

```go
type DeltaEncoder struct {
    lastState map[string]*EntityState
}

func (d *DeltaEncoder) EncodeDelta(current map[string]*EntityState) *StateUpdatePush {
    update := &StateUpdatePush{
        Entities: make([]*EntityState, 0),
        RemovedEntities: make([]string, 0),
    }

    for id, state := range current {
        if last, exists := d.lastState[id]; exists {
            if !statesEqual(last, state) {
                update.Entities = append(update.Entities, state)
            }
        } else {
            update.Entities = append(update.Entities, state)
        }
    }

    for id := range d.lastState {
        if _, exists := current[id]; !exists {
            update.RemovedEntities = append(update.RemovedEntities, id)
        }
    }

    d.lastState = current
    return update
}
```

### Interest Management

Only send entities within player's view:

```go
func (r *Room) GetVisibleEntities(player *Player) []*EntityState {
    visible := make([]*EntityState, 0)
    viewRadius := float64(1000) // Pixels

    for _, entity := range r.Entities {
        dist := distance(player.Position, entity.Position)
        if dist <= viewRadius {
            visible = append(visible, entity.GetState())
        }
    }

    return visible
}
```

---

## Next Section

Continue to [III. Client Architecture](#iii-client-architecture) for Unity project structure.

---

# III. Client Architecture

## Overview

The Unity client handles rendering, input, audio, and network communication. It follows a modular architecture with clear separation between game logic, networking, and presentation layers.

## Project Structure

```
Assets/
├── _Project/                       # All project-specific assets
│   ├── Scenes/
│   │   ├── Boot.unity              # Initial loading, asset preload
│   │   ├── Login.unity             # Login/registration (brief)
│   │   └── Game.unity              # Main gameplay (always active)
│   │
│   ├── Scripts/
│   │   ├── Core/                   # Core systems
│   │   │   ├── GameManager.cs
│   │   │   ├── SceneLoader.cs
│   │   │   ├── ServiceLocator.cs
│   │   │   └── Singleton.cs
│   │   │
│   │   ├── Network/                # Networking layer
│   │   │   ├── NetworkManager.cs
│   │   │   ├── WebSocketClient.cs
│   │   │   ├── PacketHandler.cs
│   │   │   ├── PacketBuilder.cs
│   │   │   ├── OpCodes.cs
│   │   │   └── Crypto/
│   │   │       ├── AESEncryption.cs
│   │   │       └── PacketEncryption.cs
│   │   │
│   │   ├── Protocol/               # Generated protobuf classes
│   │   │   ├── Common.cs
│   │   │   ├── System.cs
│   │   │   ├── Auth.cs
│   │   │   ├── Lobby.cs
│   │   │   ├── Game.cs
│   │   │   ├── Player.cs
│   │   │   └── Chat.cs
│   │   │
│   │   ├── Services/               # Game services
│   │   │   ├── AuthService.cs
│   │   │   ├── LobbyService.cs
│   │   │   ├── GameService.cs
│   │   │   ├── PlayerService.cs
│   │   │   ├── ChatService.cs
│   │   │   └── AudioService.cs
│   │   │
│   │   ├── Game/                   # Gameplay systems
│   │   │   ├── GameController.cs
│   │   │   ├── InputController.cs
│   │   │   ├── CameraController.cs
│   │   │   │
│   │   │   ├── Entity/
│   │   │   │   ├── EntityManager.cs
│   │   │   │   ├── Entity.cs
│   │   │   │   ├── PlayerEntity.cs
│   │   │   │   ├── ProjectileEntity.cs
│   │   │   │   ├── ItemEntity.cs
│   │   │   │   └── NPCEntity.cs
│   │   │   │
│   │   │   ├── Player/
│   │   │   │   ├── LocalPlayer.cs
│   │   │   │   ├── RemotePlayer.cs
│   │   │   │   ├── PlayerController.cs
│   │   │   │   ├── PlayerAnimation.cs
│   │   │   │   └── PlayerCombat.cs
│   │   │   │
│   │   │   ├── Combat/
│   │   │   │   ├── CombatSystem.cs
│   │   │   │   ├── Projectile.cs
│   │   │   │   ├── DamageNumber.cs
│   │   │   │   └── HealthBar.cs
│   │   │   │
│   │   │   ├── Prediction/
│   │   │   │   ├── ClientPrediction.cs
│   │   │   │   ├── ServerReconciliation.cs
│   │   │   │   └── InterpolationBuffer.cs
│   │   │   │
│   │   │   └── Map/
│   │   │       ├── MapManager.cs
│   │   │       ├── SpawnPoint.cs
│   │   │       └── Colliders.cs
│   │   │
│   │   ├── UI/                     # User interface
│   │   │   ├── UIManager.cs
│   │   │   ├── Screens/
│   │   │   │   ├── LoginScreen.cs
│   │   │   │   ├── LobbyScreen.cs
│   │   │   │   ├── RoomScreen.cs
│   │   │   │   ├── GameHUD.cs
│   │   │   │   ├── ScoreboardScreen.cs
│   │   │   │   ├── SettingsScreen.cs
│   │   │   │   └── InventoryScreen.cs
│   │   │   │
│   │   │   ├── Components/
│   │   │   │   ├── PlayerListItem.cs
│   │   │   │   ├── RoomListItem.cs
│   │   │   │   ├── ChatMessage.cs
│   │   │   │   ├── HealthBar.cs
│   │   │   │   ├── SkillButton.cs
│   │   │   │   └── ItemSlot.cs
│   │   │   │
│   │   │   └── Popups/
│   │   │       ├── ConfirmPopup.cs
│   │   │       ├── ErrorPopup.cs
│   │   │       └── LoadingPopup.cs
│   │   │
│   │   ├── Data/                   # Data models & configs
│   │   │   ├── Models/
│   │   │   │   ├── PlayerModel.cs
│   │   │   │   ├── RoomModel.cs
│   │   │   │   ├── ItemModel.cs
│   │   │   │   └── SkillModel.cs
│   │   │   │
│   │   │   ├── Config/
│   │   │   │   ├── GameConfig.cs
│   │   │   │   ├── NetworkConfig.cs
│   │   │   │   └── AudioConfig.cs
│   │   │   │
│   │   │   └── ScriptableObjects/
│   │   │       ├── CharacterData.cs
│   │   │       ├── WeaponData.cs
│   │   │       ├── SkillData.cs
│   │   │       └── MapData.cs
│   │   │
│   │   └── Utils/                  # Utilities
│   │       ├── ObjectPool.cs
│   │       ├── EventBus.cs
│   │       ├── Timer.cs
│   │       └── Extensions.cs
│   │
│   ├── Prefabs/
│   │   ├── Player/
│   │   │   ├── LocalPlayer.prefab
│   │   │   └── RemotePlayer.prefab
│   │   ├── Projectiles/
│   │   ├── Effects/
│   │   ├── UI/
│   │   └── Items/
│   │
│   ├── Art/
│   │   ├── Sprites/
│   │   ├── Animations/
│   │   ├── Materials/
│   │   └── Shaders/
│   │
│   ├── Audio/
│   │   ├── Music/
│   │   ├── SFX/
│   │   └── Mixers/
│   │
│   ├── Resources/                  # Runtime-loaded assets
│   │   ├── Characters/
│   │   ├── Weapons/
│   │   └── Maps/
│   │
│   └── StreamingAssets/            # Platform-specific data
│       └── config.json
│
├── Plugins/
│   ├── Protobuf/                   # Google.Protobuf
│   └── WebSocket/                  # WebSocket library
│
├── Editor/
│   ├── BuildPipeline/
│   └── Tools/
│
└── Tests/
    ├── EditMode/
    └── PlayMode/
```

---

## Core Systems

### Game Manager

Central orchestrator for game state and services.

```csharp
// Scripts/Core/GameManager.cs

using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Configuration")]
    [SerializeField] private NetworkConfig networkConfig;
    [SerializeField] private GameConfig gameConfig;

    // Services
    public NetworkManager Network { get; private set; }
    public AuthService Auth { get; private set; }
    public LobbyService Lobby { get; private set; }
    public GameService Game { get; private set; }
    public PlayerService Player { get; private set; }
    public ChatService Chat { get; private set; }
    public AudioService Audio { get; private set; }

    // State
    public GameState CurrentState { get; private set; }
    public PlayerData LocalPlayer { get; set; }

    private void Awake()
    {
        if (Instance != null)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);

        InitializeServices();
    }

    private void InitializeServices()
    {
        // Create network manager
        Network = gameObject.AddComponent<NetworkManager>();
        Network.Initialize(networkConfig);

        // Create services
        Auth = new AuthService(Network);
        Lobby = new LobbyService(Network);
        Game = new GameService(Network);
        Player = new PlayerService(Network);
        Chat = new ChatService(Network);
        Audio = gameObject.AddComponent<AudioService>();

        // Register push handlers
        RegisterPushHandlers();
    }

    private void RegisterPushHandlers()
    {
        Network.RegisterPushHandler<PlayerJoinedPush>(OpCodes.PlayerJoinedPush, Lobby.OnPlayerJoined);
        Network.RegisterPushHandler<PlayerLeftPush>(OpCodes.PlayerLeftPush, Lobby.OnPlayerLeft);
        Network.RegisterPushHandler<GameStartingPush>(OpCodes.GameStartingPush, OnGameStarting);
        Network.RegisterPushHandler<StateUpdatePush>(OpCodes.StateUpdatePush, Game.OnStateUpdate);
        Network.RegisterPushHandler<ChatMessagePush>(OpCodes.ChatMessagePush, Chat.OnMessageReceived);
        // ... etc
    }

    public void ChangeState(GameState newState)
    {
        CurrentState = newState;
        OnStateChanged?.Invoke(newState);
    }

    private void OnGameStarting(GameStartingPush push)
    {
        ChangeState(GameState.Loading);
        SceneLoader.Instance.LoadScene("Game", () => {
            ChangeState(GameState.Playing);
        });
    }

    public event System.Action<GameState> OnStateChanged;
}

public enum GameState
{
    Boot,
    Login,
    Lobby,
    InRoom,
    Loading,
    Playing,
    GameOver
}
```

### Service Locator

Alternative to singleton pattern for service access.

```csharp
// Scripts/Core/ServiceLocator.cs

using System;
using System.Collections.Generic;

public static class ServiceLocator
{
    private static Dictionary<Type, object> _services = new Dictionary<Type, object>();

    public static void Register<T>(T service) where T : class
    {
        var type = typeof(T);
        if (_services.ContainsKey(type))
        {
            _services[type] = service;
        }
        else
        {
            _services.Add(type, service);
        }
    }

    public static T Get<T>() where T : class
    {
        var type = typeof(T);
        if (_services.TryGetValue(type, out var service))
        {
            return service as T;
        }
        throw new InvalidOperationException($"Service {type.Name} not registered");
    }

    public static bool TryGet<T>(out T service) where T : class
    {
        var type = typeof(T);
        if (_services.TryGetValue(type, out var obj))
        {
            service = obj as T;
            return true;
        }
        service = null;
        return false;
    }

    public static void Clear()
    {
        _services.Clear();
    }
}
```

### Scene Loader

Handles async scene transitions with loading screens.

```csharp
// Scripts/Core/SceneLoader.cs

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class SceneLoader : MonoBehaviour
{
    public static SceneLoader Instance { get; private set; }

    [SerializeField] private string loadingSceneName = "Loading";
    [SerializeField] private float minimumLoadTime = 0.5f;

    public float LoadProgress { get; private set; }
    public bool IsLoading { get; private set; }

    public event Action<float> OnProgressChanged;
    public event Action OnLoadComplete;

    private void Awake()
    {
        if (Instance != null)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    public void LoadScene(string sceneName, Action onComplete = null)
    {
        if (IsLoading) return;
        StartCoroutine(LoadSceneAsync(sceneName, onComplete));
    }

    private IEnumerator LoadSceneAsync(string sceneName, Action onComplete)
    {
        IsLoading = true;
        LoadProgress = 0f;

        // Load loading scene first
        yield return SceneManager.LoadSceneAsync(loadingSceneName);

        float startTime = Time.time;

        // Load target scene
        AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName);
        asyncLoad.allowSceneActivation = false;

        while (!asyncLoad.isDone)
        {
            // Progress goes from 0 to 0.9, then jumps to 1 when activated
            LoadProgress = Mathf.Clamp01(asyncLoad.progress / 0.9f);
            OnProgressChanged?.Invoke(LoadProgress);

            // Wait for minimum load time and scene ready
            if (asyncLoad.progress >= 0.9f)
            {
                float elapsed = Time.time - startTime;
                if (elapsed >= minimumLoadTime)
                {
                    asyncLoad.allowSceneActivation = true;
                }
            }

            yield return null;
        }

        LoadProgress = 1f;
        IsLoading = false;
        OnLoadComplete?.Invoke();
        onComplete?.Invoke();
    }
}
```

---

## Networking Layer

### Network Manager

Central hub for all network communication.

```csharp
// Scripts/Network/NetworkManager.cs

using System;
using System.Collections.Generic;
using UnityEngine;
using Google.Protobuf;

public class NetworkManager : MonoBehaviour
{
    private WebSocketClient _socket;
    private PacketHandler _packetHandler;
    private NetworkConfig _config;

    private Dictionary<uint, PendingRequest> _pendingRequests = new Dictionary<uint, PendingRequest>();
    private Dictionary<ushort, Action<byte[]>> _pushHandlers = new Dictionary<ushort, Action<byte[]>>();

    private uint _nextRequestId = 1;
    private byte[] _encryptionKey;
    private byte[] _encryptionIV;
    private bool _isEncrypted = false;

    public string SessionToken { get; private set; }
    public bool IsConnected => _socket?.IsConnected ?? false;
    public int Latency { get; private set; }

    public event Action OnConnected;
    public event Action OnDisconnected;
    public event Action<int, string> OnError;

    public void Initialize(NetworkConfig config)
    {
        _config = config;
        _packetHandler = new PacketHandler();

        _socket = new WebSocketClient();
        _socket.OnOpen += HandleOpen;
        _socket.OnClose += HandleClose;
        _socket.OnError += HandleError;
        _socket.OnMessage += HandleMessage;
    }

    public void Connect()
    {
        string url = $"wss://{_config.Host}:{_config.Port}";
        _socket.Connect(url);
    }

    public void Disconnect()
    {
        _socket.Close();
    }

    private void HandleOpen()
    {
        Debug.Log("WebSocket connected");
        StartCoroutine(SendHandshake());
    }

    private void HandleClose()
    {
        Debug.Log("WebSocket disconnected");
        _isEncrypted = false;
        OnDisconnected?.Invoke();
    }

    private void HandleError(string error)
    {
        Debug.LogError($"WebSocket error: {error}");
        OnError?.Invoke(-1, error);
    }

    private void HandleMessage(byte[] data)
    {
        // Decrypt if encryption is enabled
        if (_isEncrypted)
        {
            data = PacketEncryption.Decrypt(data, _encryptionKey, _encryptionIV);
        }

        // Parse header
        var header = _packetHandler.ParseHeader(data);
        var payload = new byte[data.Length - 7];
        Array.Copy(data, 7, payload, 0, payload.Length);

        switch (header.Type)
        {
            case PacketType.Response:
                HandleResponse(header, payload);
                break;

            case PacketType.Push:
                HandlePush(header, payload);
                break;
        }
    }

    private void HandleResponse(PacketHeader header, byte[] payload)
    {
        // Extract request ID (first 4 bytes of payload)
        uint requestId = BitConverter.ToUInt32(payload, 0);
        var actualPayload = new byte[payload.Length - 4];
        Array.Copy(payload, 4, actualPayload, 0, actualPayload.Length);

        if (_pendingRequests.TryGetValue(requestId, out var pending))
        {
            _pendingRequests.Remove(requestId);

            // Check for error response
            if (header.Opcode == OpCodes.ErrorRes)
            {
                var error = ErrorResponse.Parser.ParseFrom(actualPayload);
                pending.OnError?.Invoke(error.Code, error.Message);
            }
            else
            {
                pending.OnSuccess?.Invoke(actualPayload);
            }
        }
    }

    private void HandlePush(PacketHeader header, byte[] payload)
    {
        if (_pushHandlers.TryGetValue(header.Opcode, out var handler))
        {
            handler.Invoke(payload);
        }
        else
        {
            Debug.LogWarning($"No handler for push opcode: 0x{header.Opcode:X4}");
        }
    }

    // Send request with callback
    public uint SendRequest<TReq, TRes>(ushort opcode, TReq request,
        Action<TRes> onSuccess, Action<int, string> onError = null, float timeout = 10f)
        where TReq : IMessage
        where TRes : IMessage, new()
    {
        uint requestId = _nextRequestId++;

        var pending = new PendingRequest
        {
            RequestId = requestId,
            Opcode = opcode,
            Timestamp = Time.time,
            Timeout = timeout,
            OnSuccess = (data) =>
            {
                var response = new TRes();
                response.MergeFrom(data);
                onSuccess?.Invoke(response);
            },
            OnError = onError
        };

        _pendingRequests[requestId] = pending;

        // Build packet
        byte[] payload = request.ToByteArray();
        byte[] packet = _packetHandler.BuildRequestPacket(opcode, requestId, payload);

        // Encrypt if enabled
        if (_isEncrypted)
        {
            packet = PacketEncryption.Encrypt(packet, _encryptionKey, _encryptionIV);
        }

        _socket.Send(packet);

        return requestId;
    }

    // Send notification (no response expected)
    public void SendNotify<TReq>(ushort opcode, TReq request) where TReq : IMessage
    {
        byte[] payload = request.ToByteArray();
        byte[] packet = _packetHandler.BuildNotifyPacket(opcode, payload);

        if (_isEncrypted)
        {
            packet = PacketEncryption.Encrypt(packet, _encryptionKey, _encryptionIV);
        }

        _socket.Send(packet);
    }

    // Register push handler
    public void RegisterPushHandler<T>(ushort opcode, Action<T> handler) where T : IMessage, new()
    {
        _pushHandlers[opcode] = (data) =>
        {
            var message = new T();
            message.MergeFrom(data);
            handler?.Invoke(message);
        };
    }

    // Handshake coroutine
    private System.Collections.IEnumerator SendHandshake()
    {
        var request = new HandshakeRequest
        {
            ClientVersion = Application.version,
            Platform = GetPlatform(),
            DeviceId = SystemInfo.deviceUniqueIdentifier
        };

        bool handshakeComplete = false;
        HandshakeResponse response = null;

        SendRequest<HandshakeRequest, HandshakeResponse>(
            OpCodes.HandshakeReq,
            request,
            (res) =>
            {
                response = res;
                handshakeComplete = true;
            },
            (code, msg) =>
            {
                Debug.LogError($"Handshake failed: {msg}");
                Disconnect();
            }
        );

        // Wait for response
        float timeout = 10f;
        while (!handshakeComplete && timeout > 0)
        {
            timeout -= Time.deltaTime;
            yield return null;
        }

        if (response != null)
        {
            SessionToken = response.SessionToken;
            _encryptionKey = response.EncryptionKey.ToByteArray();
            _encryptionIV = response.EncryptionIv.ToByteArray();
            _isEncrypted = true;

            // Start heartbeat
            StartCoroutine(HeartbeatLoop(response.HeartbeatInterval));

            OnConnected?.Invoke();
        }
    }

    private System.Collections.IEnumerator HeartbeatLoop(int interval)
    {
        var wait = new WaitForSeconds(interval);

        while (IsConnected)
        {
            long sendTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            SendRequest<HeartbeatRequest, HeartbeatResponse>(
                OpCodes.HeartbeatReq,
                new HeartbeatRequest { ClientTime = sendTime },
                (res) =>
                {
                    long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    Latency = (int)(now - sendTime) / 2;
                }
            );

            yield return wait;
        }
    }

    private string GetPlatform()
    {
#if UNITY_WEBGL
        return "webgl";
#elif UNITY_IOS
        return "ios";
#elif UNITY_ANDROID
        return "android";
#else
        return "desktop";
#endif
    }

    private void Update()
    {
        // Check for request timeouts
        float currentTime = Time.time;
        var expiredRequests = new List<uint>();

        foreach (var kvp in _pendingRequests)
        {
            if (currentTime - kvp.Value.Timestamp > kvp.Value.Timeout)
            {
                expiredRequests.Add(kvp.Key);
            }
        }

        foreach (var requestId in expiredRequests)
        {
            var pending = _pendingRequests[requestId];
            _pendingRequests.Remove(requestId);
            pending.OnError?.Invoke(-1, "Request timeout");
        }
    }

    private void OnDestroy()
    {
        Disconnect();
    }
}

public class PendingRequest
{
    public uint RequestId;
    public ushort Opcode;
    public float Timestamp;
    public float Timeout;
    public Action<byte[]> OnSuccess;
    public Action<int, string> OnError;
}
```

### WebSocket Client

Platform-specific WebSocket implementation.

```csharp
// Scripts/Network/WebSocketClient.cs

using System;
using UnityEngine;

#if UNITY_WEBGL && !UNITY_EDITOR
using System.Runtime.InteropServices;
#else
using WebSocketSharp;
#endif

public class WebSocketClient
{
    public bool IsConnected { get; private set; }

    public event Action OnOpen;
    public event Action OnClose;
    public event Action<string> OnError;
    public event Action<byte[]> OnMessage;

#if UNITY_WEBGL && !UNITY_EDITOR

    [DllImport("__Internal")]
    private static extern int WebSocketConnect(string url);

    [DllImport("__Internal")]
    private static extern int WebSocketClose(int instanceId);

    [DllImport("__Internal")]
    private static extern int WebSocketSend(int instanceId, byte[] data, int length);

    [DllImport("__Internal")]
    private static extern int WebSocketGetState(int instanceId);

    private int _instanceId = -1;

    public void Connect(string url)
    {
        _instanceId = WebSocketConnect(url);
        // Register callbacks via WebGL plugin
        WebSocketRegisterCallbacks(_instanceId, OnOpenCallback, OnCloseCallback, OnErrorCallback, OnMessageCallback);
    }

    public void Close()
    {
        if (_instanceId >= 0)
        {
            WebSocketClose(_instanceId);
            _instanceId = -1;
        }
    }

    public void Send(byte[] data)
    {
        if (_instanceId >= 0)
        {
            WebSocketSend(_instanceId, data, data.Length);
        }
    }

    // Callbacks from JavaScript
    [AOT.MonoPInvokeCallback(typeof(Action))]
    private static void OnOpenCallback() { /* Dispatch to instance */ }

    [AOT.MonoPInvokeCallback(typeof(Action))]
    private static void OnCloseCallback() { /* Dispatch to instance */ }

    [AOT.MonoPInvokeCallback(typeof(Action<string>))]
    private static void OnErrorCallback(string error) { /* Dispatch to instance */ }

    [AOT.MonoPInvokeCallback(typeof(Action<IntPtr, int>))]
    private static void OnMessageCallback(IntPtr data, int length) { /* Dispatch to instance */ }

#else

    private WebSocket _ws;

    public void Connect(string url)
    {
        _ws = new WebSocket(url);

        _ws.OnOpen += (sender, e) =>
        {
            IsConnected = true;
            MainThreadDispatcher.Enqueue(() => OnOpen?.Invoke());
        };

        _ws.OnClose += (sender, e) =>
        {
            IsConnected = false;
            MainThreadDispatcher.Enqueue(() => OnClose?.Invoke());
        };

        _ws.OnError += (sender, e) =>
        {
            MainThreadDispatcher.Enqueue(() => OnError?.Invoke(e.Message));
        };

        _ws.OnMessage += (sender, e) =>
        {
            if (e.IsBinary)
            {
                var data = e.RawData;
                MainThreadDispatcher.Enqueue(() => OnMessage?.Invoke(data));
            }
        };

        _ws.ConnectAsync();
    }

    public void Close()
    {
        if (_ws != null)
        {
            _ws.CloseAsync();
            _ws = null;
        }
    }

    public void Send(byte[] data)
    {
        if (_ws != null && _ws.IsAlive)
        {
            _ws.Send(data);
        }
    }

#endif
}
```

### Packet Handler

Builds and parses binary packets.

```csharp
// Scripts/Network/PacketHandler.cs

using System;

public class PacketHandler
{
    public PacketHeader ParseHeader(byte[] data)
    {
        return new PacketHeader
        {
            Type = (PacketType)data[0],
            Opcode = (ushort)((data[1] << 8) | data[2]),
            Length = (uint)((data[3] << 24) | (data[4] << 16) | (data[5] << 8) | data[6])
        };
    }

    public byte[] BuildRequestPacket(ushort opcode, uint requestId, byte[] payload)
    {
        // Header (7) + RequestID (4) + Payload
        int totalLength = 7 + 4 + payload.Length;
        byte[] packet = new byte[totalLength];

        // Type
        packet[0] = (byte)PacketType.Request;

        // Opcode (big-endian)
        packet[1] = (byte)(opcode >> 8);
        packet[2] = (byte)(opcode & 0xFF);

        // Length (big-endian) - includes request ID
        uint payloadLength = (uint)(4 + payload.Length);
        packet[3] = (byte)(payloadLength >> 24);
        packet[4] = (byte)(payloadLength >> 16);
        packet[5] = (byte)(payloadLength >> 8);
        packet[6] = (byte)(payloadLength & 0xFF);

        // Request ID (little-endian for compatibility)
        packet[7] = (byte)(requestId & 0xFF);
        packet[8] = (byte)((requestId >> 8) & 0xFF);
        packet[9] = (byte)((requestId >> 16) & 0xFF);
        packet[10] = (byte)((requestId >> 24) & 0xFF);

        // Payload
        Array.Copy(payload, 0, packet, 11, payload.Length);

        return packet;
    }

    public byte[] BuildNotifyPacket(ushort opcode, byte[] payload)
    {
        int totalLength = 7 + payload.Length;
        byte[] packet = new byte[totalLength];

        packet[0] = (byte)PacketType.Notify;

        packet[1] = (byte)(opcode >> 8);
        packet[2] = (byte)(opcode & 0xFF);

        uint payloadLength = (uint)payload.Length;
        packet[3] = (byte)(payloadLength >> 24);
        packet[4] = (byte)(payloadLength >> 16);
        packet[5] = (byte)(payloadLength >> 8);
        packet[6] = (byte)(payloadLength & 0xFF);

        Array.Copy(payload, 0, packet, 7, payload.Length);

        return packet;
    }
}

public struct PacketHeader
{
    public PacketType Type;
    public ushort Opcode;
    public uint Length;
}

public enum PacketType : byte
{
    Request = 0x01,
    Response = 0x02,
    Push = 0x03,
    Notify = 0x04
}
```

### OpCodes

Constant definitions matching server.

```csharp
// Scripts/Network/OpCodes.cs

public static class OpCodes
{
    // System (0x0001 - 0x00FF)
    public const ushort HandshakeReq = 0x0001;
    public const ushort HandshakeRes = 0x0002;
    public const ushort HeartbeatReq = 0x0003;
    public const ushort HeartbeatRes = 0x0004;
    public const ushort Disconnect = 0x0005;
    public const ushort ErrorRes = 0x00FF;

    // Auth (0x0100 - 0x01FF)
    public const ushort LoginReq = 0x0100;
    public const ushort LoginRes = 0x0101;
    public const ushort GuestLoginReq = 0x0102;
    public const ushort GuestLoginRes = 0x0103;
    public const ushort LogoutReq = 0x0104;
    public const ushort LogoutRes = 0x0105;
    public const ushort RegisterReq = 0x0106;
    public const ushort RegisterRes = 0x0107;

    // Arena (0x0200 - 0x02FF)
    public const ushort LeaderboardReq = 0x0200;
    public const ushort LeaderboardRes = 0x0201;
    public const ushort OpponentsReq = 0x0202;
    public const ushort OpponentsRes = 0x0203;
    public const ushort ChallengeReq = 0x0204;
    public const ushort ChallengeRes = 0x0205;
    public const ushort SetDefenseReq = 0x0206;
    public const ushort SetDefenseRes = 0x0207;
    public const ushort BattleLogReq = 0x0208;
    public const ushort BattleLogRes = 0x0209;
    public const ushort ArenaInfoReq = 0x020A;
    public const ushort ArenaInfoRes = 0x020B;

    // Arena Push
    public const ushort DefenseAttackedPush = 0x0280;
    public const ushort RankChangePush = 0x0281;
    public const ushort ArenaRewardPush = 0x0282;
    public const ushort AttemptsRefreshPush = 0x0283;

    // Game (0x0300 - 0x03FF)
    public const ushort MoveReq = 0x0300;
    public const ushort MoveRes = 0x0301;
    public const ushort AttackReq = 0x0302;
    public const ushort AttackRes = 0x0303;
    public const ushort UseSkillReq = 0x0304;
    public const ushort UseSkillRes = 0x0305;
    public const ushort UseItemReq = 0x0306;
    public const ushort UseItemRes = 0x0307;

    // Game Push
    public const ushort StateUpdatePush = 0x0380;
    public const ushort PlayerSpawnPush = 0x0381;
    public const ushort PlayerDeathPush = 0x0382;
    public const ushort PlayerRespawnPush = 0x0383;
    public const ushort DamageEventPush = 0x0384;
    public const ushort ProjectileSpawnPush = 0x0385;
    public const ushort ProjectileHitPush = 0x0386;
    public const ushort GameEndPush = 0x038F;

    // Player (0x0400 - 0x04FF)
    public const ushort ProfileReq = 0x0400;
    public const ushort ProfileRes = 0x0401;
    public const ushort InventoryReq = 0x0402;
    public const ushort InventoryRes = 0x0403;

    // Chat (0x0500 - 0x05FF)
    public const ushort ChatSendReq = 0x0500;
    public const ushort ChatSendRes = 0x0501;
    public const ushort ChatMessagePush = 0x0580;
    public const ushort SystemMessagePush = 0x0581;
}
```

---

## Services Layer

### Auth Service

Handles login, registration, and session management.

```csharp
// Scripts/Services/AuthService.cs

using System;
using UnityEngine;

public class AuthService
{
    private readonly NetworkManager _network;

    public bool IsLoggedIn { get; private set; }
    public PlayerData CurrentPlayer { get; private set; }

    public event Action<PlayerData> OnLoginSuccess;
    public event Action<int, string> OnLoginFailed;
    public event Action OnLogout;

    public AuthService(NetworkManager network)
    {
        _network = network;
    }

    public void Login(string username, string password, Action<PlayerData> onSuccess = null, Action<int, string> onError = null)
    {
        var request = new LoginRequest
        {
            Username = username,
            Password = HashPassword(password)
        };

        _network.SendRequest<LoginRequest, LoginResponse>(
            OpCodes.LoginReq,
            request,
            (response) =>
            {
                if (response.Code == 0)
                {
                    CurrentPlayer = response.Player;
                    IsLoggedIn = true;
                    SaveAuthToken(response.AuthToken);
                    OnLoginSuccess?.Invoke(CurrentPlayer);
                    onSuccess?.Invoke(CurrentPlayer);
                }
                else
                {
                    OnLoginFailed?.Invoke(response.Code, response.Message);
                    onError?.Invoke(response.Code, response.Message);
                }
            },
            onError
        );
    }

    public void GuestLogin(Action<PlayerData> onSuccess = null, Action<int, string> onError = null)
    {
        string guestToken = PlayerPrefs.GetString("guest_token", "");

        var request = new GuestLoginRequest
        {
            DeviceId = SystemInfo.deviceUniqueIdentifier,
            GuestToken = guestToken
        };

        _network.SendRequest<GuestLoginRequest, GuestLoginResponse>(
            OpCodes.GuestLoginReq,
            request,
            (response) =>
            {
                if (response.Code == 0)
                {
                    CurrentPlayer = response.Player;
                    IsLoggedIn = true;
                    PlayerPrefs.SetString("guest_token", response.GuestToken);
                    SaveAuthToken(response.AuthToken);
                    OnLoginSuccess?.Invoke(CurrentPlayer);
                    onSuccess?.Invoke(CurrentPlayer);
                }
                else
                {
                    onError?.Invoke(response.Code, response.Message);
                }
            },
            onError
        );
    }

    public void Logout()
    {
        _network.SendRequest<LogoutRequest, LogoutResponse>(
            OpCodes.LogoutReq,
            new LogoutRequest(),
            (response) =>
            {
                CurrentPlayer = null;
                IsLoggedIn = false;
                ClearAuthToken();
                OnLogout?.Invoke();
            }
        );
    }

    private string HashPassword(string password)
    {
        // Client-side hashing (additional server-side hashing recommended)
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            byte[] bytes = System.Text.Encoding.UTF8.GetBytes(password);
            byte[] hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }
    }

    private void SaveAuthToken(string token)
    {
        PlayerPrefs.SetString("auth_token", token);
        PlayerPrefs.Save();
    }

    private void ClearAuthToken()
    {
        PlayerPrefs.DeleteKey("auth_token");
        PlayerPrefs.Save();
    }
}
```

### Game Service

Handles gameplay-related network communication.

```csharp
// Scripts/Services/GameService.cs

using System;
using System.Collections.Generic;
using UnityEngine;

public class GameService
{
    private readonly NetworkManager _network;

    private ulong _inputSequence = 0;
    private Queue<InputRecord> _pendingInputs = new Queue<InputRecord>();

    public event Action<StateUpdatePush> OnStateUpdate;
    public event Action<PlayerSpawnPush> OnPlayerSpawn;
    public event Action<PlayerDeathPush> OnPlayerDeath;
    public event Action<DamageEventPush> OnDamageEvent;
    public event Action<GameEndPush> OnGameEnd;

    public GameService(NetworkManager network)
    {
        _network = network;

        // Register game-specific push handlers
        _network.RegisterPushHandler<PlayerSpawnPush>(OpCodes.PlayerSpawnPush, HandlePlayerSpawn);
        _network.RegisterPushHandler<PlayerDeathPush>(OpCodes.PlayerDeathPush, HandlePlayerDeath);
        _network.RegisterPushHandler<DamageEventPush>(OpCodes.DamageEventPush, HandleDamageEvent);
        _network.RegisterPushHandler<GameEndPush>(OpCodes.GameEndPush, HandleGameEnd);
    }

    // Called by NetworkManager for state updates
    public void OnStateUpdate(StateUpdatePush update)
    {
        OnStateUpdate?.Invoke(update);
    }

    public void SendMove(Vector2 direction)
    {
        _inputSequence++;

        var request = new MoveRequest
        {
            Direction = new Proto.Vector2 { X = direction.x, Y = direction.y },
            InputSequence = _inputSequence,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // Store for reconciliation
        _pendingInputs.Enqueue(new InputRecord
        {
            Sequence = _inputSequence,
            Direction = direction,
            Timestamp = Time.time
        });

        // Limit queue size
        while (_pendingInputs.Count > 60)
        {
            _pendingInputs.Dequeue();
        }

        _network.SendNotify(OpCodes.MoveReq, request);
    }

    public void SendAttack(Vector2 direction)
    {
        _inputSequence++;

        var request = new AttackRequest
        {
            Direction = new Proto.Vector2 { X = direction.x, Y = direction.y },
            InputSequence = _inputSequence
        };

        _network.SendRequest<AttackRequest, AttackResponse>(
            OpCodes.AttackReq,
            request,
            (response) =>
            {
                if (response.Code == 0)
                {
                    // Projectile spawned with ID
                    Debug.Log($"Attack spawned projectile: {response.ProjectileId}");
                }
            }
        );
    }

    public void SendUseSkill(int slot, Vector2? targetPos = null, string targetId = null)
    {
        var request = new UseSkillRequest
        {
            SkillSlot = slot
        };

        if (targetPos.HasValue)
        {
            request.TargetPos = new Proto.Vector2 { X = targetPos.Value.x, Y = targetPos.Value.y };
        }

        if (!string.IsNullOrEmpty(targetId))
        {
            request.TargetId = targetId;
        }

        _network.SendRequest<UseSkillRequest, UseSkillResponse>(
            OpCodes.UseSkillReq,
            request,
            (response) =>
            {
                if (response.Code != 0)
                {
                    Debug.Log($"Skill failed: {response.Message}");
                }
            }
        );
    }

    public Queue<InputRecord> GetPendingInputs() => _pendingInputs;

    public void ClearInputsUpTo(ulong sequence)
    {
        while (_pendingInputs.Count > 0 && _pendingInputs.Peek().Sequence <= sequence)
        {
            _pendingInputs.Dequeue();
        }
    }

    private void HandlePlayerSpawn(PlayerSpawnPush push) => OnPlayerSpawn?.Invoke(push);
    private void HandlePlayerDeath(PlayerDeathPush push) => OnPlayerDeath?.Invoke(push);
    private void HandleDamageEvent(DamageEventPush push) => OnDamageEvent?.Invoke(push);
    private void HandleGameEnd(GameEndPush push) => OnGameEnd?.Invoke(push);
}

public struct InputRecord
{
    public ulong Sequence;
    public Vector2 Direction;
    public float Timestamp;
}
```

---

## Gameplay Systems

### Client-Side Prediction

Smooth movement with server reconciliation.

```csharp
// Scripts/Game/Prediction/ClientPrediction.cs

using System.Collections.Generic;
using UnityEngine;

public class ClientPrediction : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float reconciliationThreshold = 0.5f;

    private GameService _gameService;
    private Vector2 _serverPosition;
    private ulong _lastProcessedSequence;

    private void Start()
    {
        _gameService = GameManager.Instance.Game;
        _gameService.OnStateUpdate += OnStateUpdate;
    }

    private void OnDestroy()
    {
        if (_gameService != null)
        {
            _gameService.OnStateUpdate -= OnStateUpdate;
        }
    }

    public void ProcessInput(Vector2 input)
    {
        if (input.sqrMagnitude < 0.01f) return;

        // Apply input locally (prediction)
        Vector2 movement = input.normalized * moveSpeed * Time.fixedDeltaTime;
        transform.position += (Vector3)movement;

        // Send to server
        _gameService.SendMove(input);
    }

    private void OnStateUpdate(StateUpdatePush update)
    {
        // Find our entity in the update
        foreach (var entity in update.Entities)
        {
            if (entity.EntityId == GameManager.Instance.LocalPlayer.PlayerId)
            {
                _serverPosition = new Vector2(entity.Position.X, entity.Position.Y);

                // Reconciliation
                Reconcile(update.Tick);
                break;
            }
        }
    }

    private void Reconcile(ulong serverTick)
    {
        // Clear acknowledged inputs
        _gameService.ClearInputsUpTo(_lastProcessedSequence);

        // Check if we need to reconcile
        float distance = Vector2.Distance(transform.position, _serverPosition);

        if (distance > reconciliationThreshold)
        {
            // Snap to server position
            transform.position = _serverPosition;

            // Replay unacknowledged inputs
            var pendingInputs = _gameService.GetPendingInputs();
            foreach (var input in pendingInputs)
            {
                Vector2 movement = input.Direction.normalized * moveSpeed * Time.fixedDeltaTime;
                transform.position += (Vector3)movement;
            }
        }
    }
}
```

### Entity Interpolation

Smooth remote player movement.

```csharp
// Scripts/Game/Prediction/InterpolationBuffer.cs

using System.Collections.Generic;
using UnityEngine;

public class InterpolationBuffer : MonoBehaviour
{
    [SerializeField] private float interpolationDelay = 0.1f; // 100ms delay

    private Queue<StateSnapshot> _buffer = new Queue<StateSnapshot>();
    private StateSnapshot _fromState;
    private StateSnapshot _toState;
    private float _interpolationTime;

    public void AddSnapshot(Vector2 position, float rotation, long serverTime)
    {
        _buffer.Enqueue(new StateSnapshot
        {
            Position = position,
            Rotation = rotation,
            Timestamp = serverTime / 1000f // Convert to seconds
        });

        // Limit buffer size
        while (_buffer.Count > 20)
        {
            _buffer.Dequeue();
        }
    }

    private void Update()
    {
        if (_buffer.Count < 2) return;

        float renderTime = Time.time - interpolationDelay;

        // Find surrounding snapshots
        while (_buffer.Count > 2)
        {
            var peek = _buffer.Peek();
            if (peek.Timestamp <= renderTime)
            {
                _fromState = _buffer.Dequeue();
            }
            else
            {
                break;
            }
        }

        if (_buffer.Count > 0)
        {
            _toState = _buffer.Peek();
        }

        // Interpolate
        if (_fromState.Timestamp > 0 && _toState.Timestamp > 0)
        {
            float duration = _toState.Timestamp - _fromState.Timestamp;
            if (duration > 0)
            {
                float t = (renderTime - _fromState.Timestamp) / duration;
                t = Mathf.Clamp01(t);

                transform.position = Vector2.Lerp(_fromState.Position, _toState.Position, t);
                transform.rotation = Quaternion.Slerp(
                    Quaternion.Euler(0, 0, _fromState.Rotation),
                    Quaternion.Euler(0, 0, _toState.Rotation),
                    t
                );
            }
        }
    }

    private struct StateSnapshot
    {
        public Vector2 Position;
        public float Rotation;
        public float Timestamp;
    }
}
```

### Entity Manager

Manages all game entities.

```csharp
// Scripts/Game/Entity/EntityManager.cs

using System.Collections.Generic;
using UnityEngine;

public class EntityManager : MonoBehaviour
{
    [Header("Prefabs")]
    [SerializeField] private GameObject localPlayerPrefab;
    [SerializeField] private GameObject remotePlayerPrefab;
    [SerializeField] private GameObject projectilePrefab;
    [SerializeField] private GameObject itemPrefab;

    private Dictionary<string, Entity> _entities = new Dictionary<string, Entity>();
    private GameService _gameService;

    private void Start()
    {
        _gameService = GameManager.Instance.Game;
        _gameService.OnStateUpdate += HandleStateUpdate;
        _gameService.OnPlayerSpawn += HandlePlayerSpawn;
        _gameService.OnPlayerDeath += HandlePlayerDeath;
    }

    private void OnDestroy()
    {
        if (_gameService != null)
        {
            _gameService.OnStateUpdate -= HandleStateUpdate;
            _gameService.OnPlayerSpawn -= HandlePlayerSpawn;
            _gameService.OnPlayerDeath -= HandlePlayerDeath;
        }
    }

    private void HandleStateUpdate(StateUpdatePush update)
    {
        // Update existing entities
        foreach (var entityState in update.Entities)
        {
            if (_entities.TryGetValue(entityState.EntityId, out var entity))
            {
                entity.ApplyState(entityState);
            }
            else
            {
                // Entity doesn't exist, might need to spawn
                SpawnEntity(entityState);
            }
        }

        // Remove entities
        foreach (var entityId in update.RemovedEntities)
        {
            RemoveEntity(entityId);
        }
    }

    private void HandlePlayerSpawn(PlayerSpawnPush push)
    {
        bool isLocal = push.PlayerId == GameManager.Instance.LocalPlayer.PlayerId;
        GameObject prefab = isLocal ? localPlayerPrefab : remotePlayerPrefab;

        var go = Instantiate(prefab);
        go.transform.position = new Vector3(push.Position.X, push.Position.Y, 0);

        var entity = go.GetComponent<PlayerEntity>();
        entity.Initialize(push.PlayerId, push.PlayerName, push.Team, isLocal);

        _entities[push.PlayerId] = entity;
    }

    private void HandlePlayerDeath(PlayerDeathPush push)
    {
        if (_entities.TryGetValue(push.PlayerId, out var entity))
        {
            if (entity is PlayerEntity player)
            {
                player.OnDeath(push.KillerId);
            }
        }
    }

    private void SpawnEntity(EntityState state)
    {
        GameObject prefab = state.EntityType switch
        {
            0 => remotePlayerPrefab,
            1 => projectilePrefab,
            2 => itemPrefab,
            _ => null
        };

        if (prefab == null) return;

        var go = Instantiate(prefab);
        go.transform.position = new Vector3(state.Position.X, state.Position.Y, 0);

        var entity = go.GetComponent<Entity>();
        entity.EntityId = state.EntityId;

        _entities[state.EntityId] = entity;
    }

    private void RemoveEntity(string entityId)
    {
        if (_entities.TryGetValue(entityId, out var entity))
        {
            _entities.Remove(entityId);
            entity.OnRemoved();
            Destroy(entity.gameObject);
        }
    }

    public Entity GetEntity(string entityId)
    {
        _entities.TryGetValue(entityId, out var entity);
        return entity;
    }

    public T GetEntity<T>(string entityId) where T : Entity
    {
        if (_entities.TryGetValue(entityId, out var entity))
        {
            return entity as T;
        }
        return null;
    }
}
```

---

## UI System

### UI Manager

Central controller for all UI screens.

```csharp
// Scripts/UI/UIManager.cs

using System.Collections.Generic;
using UnityEngine;

public class UIManager : MonoBehaviour
{
    public static UIManager Instance { get; private set; }

    [Header("Screens")]
    [SerializeField] private UIScreen loginScreen;
    [SerializeField] private UIScreen lobbyScreen;
    [SerializeField] private UIScreen roomScreen;
    [SerializeField] private UIScreen gameHUD;
    [SerializeField] private UIScreen scoreboardScreen;
    [SerializeField] private UIScreen settingsScreen;

    [Header("Popups")]
    [SerializeField] private LoadingPopup loadingPopup;
    [SerializeField] private ErrorPopup errorPopup;
    [SerializeField] private ConfirmPopup confirmPopup;

    private Stack<UIScreen> _screenStack = new Stack<UIScreen>();
    private UIScreen _currentScreen;

    private void Awake()
    {
        if (Instance != null)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        // Hide all screens initially
        HideAllScreens();
    }

    private void Start()
    {
        GameManager.Instance.OnStateChanged += OnGameStateChanged;
    }

    private void OnGameStateChanged(GameState state)
    {
        switch (state)
        {
            case GameState.Login:
                ShowScreen(loginScreen);
                break;
            case GameState.Lobby:
                ShowScreen(lobbyScreen);
                break;
            case GameState.InRoom:
                ShowScreen(roomScreen);
                break;
            case GameState.Playing:
                ShowScreen(gameHUD);
                break;
            case GameState.GameOver:
                ShowScreen(scoreboardScreen);
                break;
        }
    }

    public void ShowScreen(UIScreen screen)
    {
        if (_currentScreen != null)
        {
            _currentScreen.Hide();
        }

        _currentScreen = screen;
        _currentScreen.Show();
    }

    public void PushScreen(UIScreen screen)
    {
        if (_currentScreen != null)
        {
            _screenStack.Push(_currentScreen);
            _currentScreen.Hide();
        }

        _currentScreen = screen;
        _currentScreen.Show();
    }

    public void PopScreen()
    {
        if (_screenStack.Count > 0)
        {
            _currentScreen.Hide();
            _currentScreen = _screenStack.Pop();
            _currentScreen.Show();
        }
    }

    public void ShowLoading(string message = "Loading...")
    {
        loadingPopup.Show(message);
    }

    public void HideLoading()
    {
        loadingPopup.Hide();
    }

    public void ShowError(string title, string message, System.Action onConfirm = null)
    {
        errorPopup.Show(title, message, onConfirm);
    }

    public void ShowConfirm(string title, string message, System.Action onConfirm, System.Action onCancel = null)
    {
        confirmPopup.Show(title, message, onConfirm, onCancel);
    }

    private void HideAllScreens()
    {
        loginScreen?.Hide();
        lobbyScreen?.Hide();
        roomScreen?.Hide();
        gameHUD?.Hide();
        scoreboardScreen?.Hide();
        settingsScreen?.Hide();
    }
}

// Base class for UI screens
public abstract class UIScreen : MonoBehaviour
{
    [SerializeField] protected CanvasGroup canvasGroup;
    [SerializeField] protected float fadeDuration = 0.2f;

    public virtual void Show()
    {
        gameObject.SetActive(true);
        if (canvasGroup != null)
        {
            StartCoroutine(FadeIn());
        }
        OnShow();
    }

    public virtual void Hide()
    {
        if (canvasGroup != null)
        {
            StartCoroutine(FadeOut());
        }
        else
        {
            gameObject.SetActive(false);
        }
        OnHide();
    }

    protected virtual void OnShow() { }
    protected virtual void OnHide() { }

    private System.Collections.IEnumerator FadeIn()
    {
        float elapsed = 0f;
        canvasGroup.alpha = 0f;

        while (elapsed < fadeDuration)
        {
            elapsed += Time.deltaTime;
            canvasGroup.alpha = elapsed / fadeDuration;
            yield return null;
        }

        canvasGroup.alpha = 1f;
    }

    private System.Collections.IEnumerator FadeOut()
    {
        float elapsed = 0f;
        canvasGroup.alpha = 1f;

        while (elapsed < fadeDuration)
        {
            elapsed += Time.deltaTime;
            canvasGroup.alpha = 1f - (elapsed / fadeDuration);
            yield return null;
        }

        canvasGroup.alpha = 0f;
        gameObject.SetActive(false);
    }
}
```

---

## Configuration

### Network Config

```csharp
// Scripts/Data/Config/NetworkConfig.cs

using UnityEngine;

[CreateAssetMenu(fileName = "NetworkConfig", menuName = "Config/Network")]
public class NetworkConfig : ScriptableObject
{
    [Header("Server")]
    public string Host = "localhost";
    public int Port = 3000;

    [Header("Timeouts")]
    public float ConnectionTimeout = 10f;
    public float RequestTimeout = 10f;
    public float ReconnectDelay = 3f;
    public int MaxReconnectAttempts = 5;

    [Header("Debug")]
    public bool LogPackets = false;
    public bool UseLocalServer = true;

    public string GetServerUrl()
    {
        string protocol = UseLocalServer ? "ws" : "wss";
        return $"{protocol}://{Host}:{Port}";
    }
}
```

### Game Config

```csharp
// Scripts/Data/Config/GameConfig.cs

using UnityEngine;

[CreateAssetMenu(fileName = "GameConfig", menuName = "Config/Game")]
public class GameConfig : ScriptableObject
{
    [Header("Player")]
    public float MoveSpeed = 5f;
    public float AttackCooldown = 0.5f;
    public int MaxHealth = 100;

    [Header("Networking")]
    public float InterpolationDelay = 0.1f;
    public float ReconciliationThreshold = 0.5f;
    public int InputBufferSize = 60;

    [Header("Visual")]
    public float DamageNumberDuration = 1f;
    public float DeathFadeTime = 0.5f;
}
```

---

## WebGL Considerations

### Memory Management

```csharp
// Scripts/Utils/WebGLMemory.cs

using UnityEngine;

public static class WebGLMemory
{
    public static void OptimizeForWebGL()
    {
#if UNITY_WEBGL
        // Reduce texture memory
        QualitySettings.masterTextureLimit = 1;

        // Lower audio quality
        AudioSettings.outputSampleRate = 22050;

        // Aggressive garbage collection
        Application.lowMemory += OnLowMemory;
#endif
    }

    private static void OnLowMemory()
    {
        Resources.UnloadUnusedAssets();
        System.GC.Collect();
    }
}
```

### Build Settings

```
// Player Settings for WebGL

Memory Size: 256MB (minimum for game)
Compression: Brotli (best compression)
Exception Support: Explicitly Thrown (smaller build)
Code Optimization: Size
Managed Stripping Level: High
```

---

## Next Section

Continue to [IV. Game Systems](#iv-game-systems) for core gameplay mechanics.

---

# IV. Game Systems

## Overview

This section defines the core gameplay mechanics, combat system, progression, and game modes. All game logic is server-authoritative with client-side prediction for responsiveness.

---

## Player System

### Player Stats

```go
// server/internal/game/player_stats.go

type PlayerStats struct {
    // Base Stats
    MaxHealth     int     `json:"max_health"`
    Health        int     `json:"health"`
    MaxMana       int     `json:"max_mana"`
    Mana          int     `json:"mana"`

    // Combat Stats
    Attack        int     `json:"attack"`
    Defense       int     `json:"defense"`
    CritRate      float32 `json:"crit_rate"`      // 0.0 - 1.0
    CritDamage    float32 `json:"crit_damage"`    // Multiplier (default 1.5)

    // Movement
    MoveSpeed     float32 `json:"move_speed"`     // Units per second

    // Regeneration
    HealthRegen   float32 `json:"health_regen"`   // Per second
    ManaRegen     float32 `json:"mana_regen"`     // Per second
}

// Base stats for new players
var DefaultPlayerStats = PlayerStats{
    MaxHealth:   100,
    Health:      100,
    MaxMana:     50,
    Mana:        50,
    Attack:      10,
    Defense:     5,
    CritRate:    0.05,
    CritDamage:  1.5,
    MoveSpeed:   200.0,
    HealthRegen: 1.0,
    ManaRegen:   2.0,
}
```

### Stat Modifiers

```go
// Stat modification system for equipment and buffs
type StatModifier struct {
    Type      ModifierType
    Stat      string
    Value     float32
    Duration  time.Duration  // 0 for permanent
    Source    string         // "equipment", "buff", "skill"
}

type ModifierType int

const (
    ModifierFlat       ModifierType = iota  // +10 attack
    ModifierPercent                         // +10% attack
    ModifierMultiplier                      // x1.5 attack
)

func (p *Player) CalculateStat(baseStat string, baseValue float32) float32 {
    flat := float32(0)
    percent := float32(0)
    multiplier := float32(1)

    for _, mod := range p.Modifiers {
        if mod.Stat != baseStat {
            continue
        }

        switch mod.Type {
        case ModifierFlat:
            flat += mod.Value
        case ModifierPercent:
            percent += mod.Value
        case ModifierMultiplier:
            multiplier *= mod.Value
        }
    }

    // Formula: (base + flat) * (1 + percent) * multiplier
    return (baseValue + flat) * (1 + percent) * multiplier
}
```

---

## Combat System

### Damage Calculation

```go
// server/internal/game/combat.go

type DamageResult struct {
    Damage      int
    IsCritical  bool
    DamageType  DamageType
    Blocked     int
    Overkill    int
}

type DamageType int

const (
    DamageTypePhysical DamageType = iota
    DamageTypeMagical
    DamageTypeTrue  // Ignores defense
)

func CalculateDamage(attacker, defender *Player, baseDamage int, damageType DamageType) DamageResult {
    result := DamageResult{
        DamageType: damageType,
    }

    // 1. Calculate raw damage
    rawDamage := float32(baseDamage)

    // 2. Apply attack stat
    attackStat := attacker.CalculateStat("attack", float32(attacker.Stats.Attack))
    rawDamage *= (1 + attackStat/100)

    // 3. Check for critical hit
    critRate := attacker.CalculateStat("crit_rate", attacker.Stats.CritRate)
    if rand.Float32() < critRate {
        result.IsCritical = true
        critDamage := attacker.CalculateStat("crit_damage", attacker.Stats.CritDamage)
        rawDamage *= critDamage
    }

    // 4. Apply defense (except for true damage)
    if damageType != DamageTypeTrue {
        defenseStat := defender.CalculateStat("defense", float32(defender.Stats.Defense))
        // Defense formula: damage reduction = defense / (defense + 100)
        reduction := defenseStat / (defenseStat + 100)
        result.Blocked = int(rawDamage * reduction)
        rawDamage *= (1 - reduction)
    }

    // 5. Apply damage modifiers (skills, buffs)
    for _, mod := range attacker.DamageModifiers {
        rawDamage *= mod.Multiplier
    }

    // 6. Minimum damage is 1
    result.Damage = max(1, int(rawDamage))

    return result
}
```

### Projectile System

```go
// server/internal/game/projectile.go

type Projectile struct {
    ID          string
    OwnerID     string
    WeaponID    string

    Position    Vector2
    Velocity    Vector2
    Speed       float32

    Damage      int
    DamageType  DamageType
    Piercing    int         // Number of enemies to pierce (0 = single target)

    Lifetime    float32     // Seconds
    CreatedAt   time.Time

    HitEntities map[string]bool  // Track already-hit entities

    // Collision
    Radius      float32

    // Effects on hit
    OnHitEffects []Effect
}

func (p *Projectile) Update(dt float32, room *Room) {
    // Move projectile
    p.Position.X += p.Velocity.X * p.Speed * dt
    p.Position.Y += p.Velocity.Y * p.Speed * dt

    // Check lifetime
    if time.Since(p.CreatedAt).Seconds() > float64(p.Lifetime) {
        room.RemoveProjectile(p.ID)
        return
    }

    // Check wall collision
    if room.Map.CollidesWithWall(p.Position, p.Radius) {
        room.RemoveProjectile(p.ID)
        room.BroadcastProjectileHit(p.ID, "", p.Position)
        return
    }

    // Check entity collision
    for _, entity := range room.GetEntities() {
        if entity.ID == p.OwnerID {
            continue // Don't hit self
        }

        if p.HitEntities[entity.ID] {
            continue // Already hit this entity
        }

        if !entity.IsAlive() {
            continue
        }

        if p.CollidesWithEntity(entity) {
            p.OnHit(entity, room)

            if p.Piercing <= 0 {
                room.RemoveProjectile(p.ID)
                return
            }
            p.Piercing--
        }
    }
}

func (p *Projectile) OnHit(target Entity, room *Room) {
    p.HitEntities[target.GetID()] = true

    // Get owner
    owner := room.GetPlayer(p.OwnerID)
    if owner == nil {
        return
    }

    // Calculate and apply damage
    if player, ok := target.(*Player); ok {
        result := CalculateDamage(owner, player, p.Damage, p.DamageType)
        player.TakeDamage(result, owner, room)

        // Apply on-hit effects
        for _, effect := range p.OnHitEffects {
            player.ApplyEffect(effect, owner)
        }
    }

    // Broadcast hit event
    room.BroadcastProjectileHit(p.ID, target.GetID(), p.Position)
}
```

### Attack Cooldowns

```go
// Cooldown management
type CooldownManager struct {
    cooldowns map[string]time.Time
}

func (cm *CooldownManager) IsOnCooldown(action string) bool {
    if endTime, exists := cm.cooldowns[action]; exists {
        return time.Now().Before(endTime)
    }
    return false
}

func (cm *CooldownManager) GetRemainingCooldown(action string) float32 {
    if endTime, exists := cm.cooldowns[action]; exists {
        remaining := time.Until(endTime).Seconds()
        if remaining > 0 {
            return float32(remaining)
        }
    }
    return 0
}

func (cm *CooldownManager) StartCooldown(action string, duration time.Duration) {
    cm.cooldowns[action] = time.Now().Add(duration)
}

// Usage
const (
    CooldownAttack    = "attack"
    CooldownSkill1    = "skill_1"
    CooldownSkill2    = "skill_2"
    CooldownSkill3    = "skill_3"
    CooldownDash      = "dash"
)
```

---

## Skill System

### Skill Definition

```go
// server/internal/game/skill.go

type Skill struct {
    ID           string
    Name         string
    Description  string

    // Cost
    ManaCost     int
    HealthCost   int

    // Timing
    CastTime     float32         // Seconds (0 = instant)
    Cooldown     time.Duration

    // Targeting
    TargetType   TargetType
    Range        float32
    AreaRadius   float32         // For AoE skills

    // Effects
    Effects      []SkillEffect

    // Requirements
    RequiredLevel int
}

type TargetType int

const (
    TargetSelf TargetType = iota
    TargetPoint
    TargetEnemy
    TargetAlly
    TargetDirection
)

type SkillEffect struct {
    Type        EffectType
    Value       float32
    Duration    time.Duration
    Chance      float32  // 0-1, for proc effects
}

type EffectType int

const (
    EffectDamage EffectType = iota
    EffectHeal
    EffectBuff
    EffectDebuff
    EffectStun
    EffectSlow
    EffectKnockback
    EffectDash
    EffectSummon
    EffectShield
)
```

### Skill Examples

```go
// Example skill definitions
var Skills = map[string]Skill{
    "fireball": {
        ID:          "fireball",
        Name:        "Fireball",
        Description: "Launch a fireball that deals damage to enemies",
        ManaCost:    15,
        CastTime:    0.5,
        Cooldown:    3 * time.Second,
        TargetType:  TargetDirection,
        Range:       500,
        Effects: []SkillEffect{
            {Type: EffectDamage, Value: 50},
        },
    },
    "heal": {
        ID:          "heal",
        Name:        "Healing Light",
        Description: "Restore health to yourself",
        ManaCost:    20,
        CastTime:    0,
        Cooldown:    10 * time.Second,
        TargetType:  TargetSelf,
        Effects: []SkillEffect{
            {Type: EffectHeal, Value: 30},
        },
    },
    "dash": {
        ID:          "dash",
        Name:        "Dash",
        Description: "Quickly dash in a direction",
        ManaCost:    10,
        CastTime:    0,
        Cooldown:    5 * time.Second,
        TargetType:  TargetDirection,
        Range:       150,
        Effects: []SkillEffect{
            {Type: EffectDash, Value: 150},
        },
    },
    "frost_nova": {
        ID:          "frost_nova",
        Name:        "Frost Nova",
        Description: "Freeze nearby enemies",
        ManaCost:    30,
        CastTime:    0.3,
        Cooldown:    15 * time.Second,
        TargetType:  TargetSelf,
        AreaRadius:  200,
        Effects: []SkillEffect{
            {Type: EffectDamage, Value: 25},
            {Type: EffectSlow, Value: 0.5, Duration: 3 * time.Second},
        },
    },
}
```

### Skill Execution

```go
func (p *Player) UseSkill(skillID string, targetPos Vector2, targetID string, room *Room) error {
    skill, exists := Skills[skillID]
    if !exists {
        return ErrSkillNotFound
    }

    // Check cooldown
    if p.Cooldowns.IsOnCooldown(skillID) {
        return ErrOnCooldown
    }

    // Check mana
    if p.Stats.Mana < skill.ManaCost {
        return ErrInsufficientMana
    }

    // Consume mana
    p.Stats.Mana -= skill.ManaCost

    // Start cooldown
    p.Cooldowns.StartCooldown(skillID, skill.Cooldown)

    // Execute skill effects
    switch skill.TargetType {
    case TargetSelf:
        p.ApplySkillEffects(skill.Effects, p, room)

    case TargetDirection:
        direction := targetPos.Subtract(p.Position).Normalize()
        p.ExecuteDirectionalSkill(skill, direction, room)

    case TargetPoint:
        p.ExecuteAreaSkill(skill, targetPos, room)

    case TargetEnemy:
        target := room.GetEntity(targetID)
        if target == nil || target.GetID() == p.ID {
            return ErrInvalidTarget
        }
        p.ApplySkillEffects(skill.Effects, target, room)
    }

    return nil
}

func (p *Player) ExecuteDirectionalSkill(skill Skill, direction Vector2, room *Room) {
    for _, effect := range skill.Effects {
        switch effect.Type {
        case EffectDamage:
            // Spawn projectile
            proj := &Projectile{
                ID:       generateID(),
                OwnerID:  p.ID,
                Position: p.Position,
                Velocity: direction,
                Speed:    400,
                Damage:   int(effect.Value),
                Lifetime: skill.Range / 400,
                Radius:   10,
            }
            room.AddProjectile(proj)

        case EffectDash:
            // Instant movement
            newPos := p.Position.Add(direction.Scale(effect.Value))
            if !room.Map.CollidesWithWall(newPos, p.Radius) {
                p.Position = newPos
            }
        }
    }
}
```

### Skill Collection

The game has **30 total skills** distributed across rarity tiers. Players unlock and collect skills to equip in their active skill slots.

#### Skill Distribution by Rarity

| Rarity | Count | Drop Rate | Description |
|--------|-------|-----------|-------------|
| **Normal** | 3 | Common | Basic starter skills |
| **Unique** | 3 | Common | Slightly improved basics |
| **Well** | 3 | Uncommon | Reliable utility skills |
| **Rare** | 3 | Uncommon | Solid damage/support options |
| **Mythic** | 3 | Rare | Powerful specialized skills |
| **Epic** | 6 | Rare | High-impact abilities |
| **Legendary** | 6 | Very Rare | Build-defining skills |
| **Immortal** | 3 | Ultra Rare | Top-tier ultimate skills |
| **Total** | **30** | - | - |

#### Skill Data Structure

```go
// server/internal/game/skill_collection.go

type SkillRarity int

const (
    SkillRarityNormal SkillRarity = iota    // 3 skills
    SkillRarityUnique                        // 3 skills
    SkillRarityWell                          // 3 skills
    SkillRarityRare                          // 3 skills
    SkillRarityMythic                        // 3 skills
    SkillRarityEpic                          // 6 skills
    SkillRarityLegendary                     // 6 skills
    SkillRarityImmortal                      // 3 skills
)

var SkillCountByRarity = map[SkillRarity]int{
    SkillRarityNormal:    3,
    SkillRarityUnique:    3,
    SkillRarityWell:      3,
    SkillRarityRare:      3,
    SkillRarityMythic:    3,
    SkillRarityEpic:      6,
    SkillRarityLegendary: 6,
    SkillRarityImmortal:  3,
}

const TotalSkills = 30

type CollectibleSkill struct {
    ID             string              `json:"id"`
    Name           string              `json:"name"`
    Description    string              `json:"description"`
    Rarity         SkillRarity         `json:"rarity"`
    Icon           string              `json:"icon"`

    // Skill mechanics
    ManaCost       int                 `json:"mana_cost"`
    Cooldown       float64             `json:"cooldown"`        // Seconds
    TargetType     TargetType          `json:"target_type"`
    Range          float32             `json:"range"`
    AreaRadius     float32             `json:"area_radius"`

    // Effects
    BaseDamage     float64             `json:"base_damage"`
    Scaling        map[Attribute]float64 `json:"scaling"`       // Stat scaling
    Effects        []SkillEffect       `json:"effects"`

    // Upgrade
    MaxLevel       int                 `json:"max_level"`       // Typically 5-10
    UpgradeCost    []SkillUpgradeCost  `json:"upgrade_cost"`
}

type SkillUpgradeCost struct {
    Level     int   `json:"level"`
    Gold      int64 `json:"gold"`
    Fragments int   `json:"fragments"`  // Skill-specific fragments
}

// Player's skill collection
type PlayerSkillCollection struct {
    UnlockedSkills map[string]*PlayerSkill `json:"unlocked_skills"`
    EquippedSkills [5]string               `json:"equipped_skills"` // 5 equippable slots (slots 1-5)
    // Note: Slot 0 is the Evolution Active Skill, managed by PlayerEvolution
}

type PlayerSkill struct {
    SkillID     string `json:"skill_id"`
    Level       int    `json:"level"`
    Fragments   int    `json:"fragments"`   // Towards next level
    Unlocked    bool   `json:"unlocked"`
    EquipSlot   int    `json:"equip_slot"`  // -1 if not equipped, 0-4 for equipped
}

func (p *PlayerSkillCollection) GetEquippedSkills() []*CollectibleSkill {
    var skills []*CollectibleSkill
    for _, skillID := range p.EquippedSkills {
        if skillID != "" {
            if skill, ok := SkillDatabase[skillID]; ok {
                skills = append(skills, skill)
            }
        }
    }
    return skills
}

func (p *PlayerSkillCollection) EquipSkill(skillID string, slot int) error {
    if slot < 0 || slot >= 5 {
        return ErrInvalidSlot
    }

    playerSkill, ok := p.UnlockedSkills[skillID]
    if !ok || !playerSkill.Unlocked {
        return ErrSkillNotUnlocked
    }

    // Unequip from previous slot if equipped elsewhere
    if playerSkill.EquipSlot >= 0 {
        p.EquippedSkills[playerSkill.EquipSlot] = ""
    }

    // Equip to new slot
    p.EquippedSkills[slot] = skillID
    playerSkill.EquipSlot = slot

    return nil
}
```

#### Skill Tab UI

The character has 6 skill slots total:
- **Slot 0**: Evolution Active Skill (from current evolution form, cannot be changed)
- **Slots 1-5**: Equippable skills (from skill collection)

```
┌──────────────────────────────────────────────────────────────┐
│ ◀ Skills                                        [Sort ▼]     │
├──────────────────────────────────────────────────────────────┤
│  ACTIVE SKILLS (6 total)                                     │
│  ┌────────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│  │ ⭐ EVO │ │ 🔥 │ │ 🛡️ │ │ 💨 │ │ ❄️ │ │ ✨ │              │
│  │ Dragon │ │Lv.3│ │Lv.4│ │Lv.2│ │Lv.1│ │ -- │              │
│  │ Breath │ │    │ │    │ │    │ │    │ │    │              │
│  │ 🔒LOCK │ │    │ │    │ │    │ │    │ │    │              │
│  └────────┘ └────┘ └────┘ └────┘ └────┘ └────┘              │
│   ↑ From Evolution    ↑ Equippable Slots (5)                │
├──────────────────────────────────────────────────────────────┤
│  SKILL COLLECTION (24/30)                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [All] [Normal] [Unique] [Well] [Rare] [Mythic+]     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ 🔥 │ │ 🛡️ │ │ 💨 │ │ ❄️ │ │ 💀 │ │ 🌟 │                  │
│  │Lv.3│ │Lv.4│ │Lv.2│ │Lv.1│ │Lv.2│ │Lv.1│                  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ 🌀 │ │ 💥 │ │ 🔮 │ │ ⭐ │ │ 🎯 │ │ 🔒 │                  │
│  │Lv.2│ │Lv.1│ │Lv.3│ │Lv.1│ │Lv.1│ │    │ ← Not unlocked  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │
│  ... (scrollable)                                            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  SELECTED: Fireball (Epic)                     [EQUIP]       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Level 3/10          ████████░░░░ 45/100 fragments      │  │
│  │ Damage: 150 (+15% ATK)                                 │  │
│  │ Cooldown: 3.5s      Range: 500                         │  │
│  │ "Launch a fireball that deals damage and burns"        │  │
│  │                                                        │  │
│  │ [UPGRADE 💰 5,000]                                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### Protobuf Messages

```protobuf
// proto/skills.proto

syntax = "proto3";
package game;

enum SkillRarity {
    SKILL_RARITY_NORMAL = 0;
    SKILL_RARITY_UNIQUE = 1;
    SKILL_RARITY_WELL = 2;
    SKILL_RARITY_RARE = 3;
    SKILL_RARITY_MYTHIC = 4;
    SKILL_RARITY_EPIC = 5;
    SKILL_RARITY_LEGENDARY = 6;
    SKILL_RARITY_IMMORTAL = 7;
}

message CollectibleSkill {
    string id = 1;
    string name = 2;
    string description = 3;
    SkillRarity rarity = 4;
    string icon = 5;
    int32 mana_cost = 6;
    double cooldown = 7;
    int32 target_type = 8;
    float range = 9;
    float area_radius = 10;
    double base_damage = 11;
    map<int32, double> scaling = 12;
    int32 max_level = 13;
}

message PlayerSkill {
    string skill_id = 1;
    int32 level = 2;
    int32 fragments = 3;
    bool unlocked = 4;
    int32 equip_slot = 5;
}

message PlayerSkillCollection {
    map<string, PlayerSkill> unlocked_skills = 1;
    repeated string equipped_skills = 2;  // 5 equippable slots (evolution skill separate)
}

message SkillEquipRequest {
    string skill_id = 1;
    int32 slot = 2;
}

message SkillUpgradeRequest {
    string skill_id = 1;
}

message SkillCollectionResponse {
    PlayerSkillCollection collection = 1;
    repeated CollectibleSkill all_skills = 2;
}
```

---

## Pal System

Pals are companions that fight alongside the player, providing additional damage, support, and unique abilities.

### Pal Collection

The game has **62 total pals** distributed across rarity tiers.

#### Pal Distribution by Rarity

| Rarity | Count | Acquisition | Description |
|--------|-------|-------------|-------------|
| **Normal** | 3 | Common drops | Basic starter pals |
| **Unique** | 4 | Common drops | Slightly improved abilities |
| **Well** | 7 | Uncommon drops | Reliable support pals |
| **Rare** | 8 | Gacha / Events | Solid combat companions |
| **Mythic** | 10 | Gacha / Events | Powerful specialized pals |
| **Epic** | 11 | Gacha / Events | High-impact abilities |
| **Legendary** | 13 | Premium Gacha | Build-defining companions |
| **Immortal** | 6 | Ultra Premium | Top-tier ultimate pals |
| **Total** | **62** | - | - |

### Pal Data Structure

```go
// server/internal/game/pal.go

type PalRarity int

const (
    PalRarityNormal PalRarity = iota      // 3 pals
    PalRarityUnique                        // 4 pals
    PalRarityWell                          // 7 pals
    PalRarityRare                          // 8 pals
    PalRarityMythic                        // 10 pals
    PalRarityEpic                          // 11 pals
    PalRarityLegendary                     // 13 pals
    PalRarityImmortal                      // 6 pals
)

var PalCountByRarity = map[PalRarity]int{
    PalRarityNormal:    3,
    PalRarityUnique:    4,
    PalRarityWell:      7,
    PalRarityRare:      8,
    PalRarityMythic:    10,
    PalRarityEpic:      11,
    PalRarityLegendary: 13,
    PalRarityImmortal:  6,
}

const TotalPals = 62

type PalType int

const (
    PalTypeAttack PalType = iota   // Offensive damage dealers
    PalTypeDefense                  // Tanky / protection
    PalTypeSupport                  // Healing / buffs
    PalTypeUtility                  // Special effects
)

type Pal struct {
    ID             string              `json:"id"`
    Name           string              `json:"name"`
    Description    string              `json:"description"`
    Rarity         PalRarity           `json:"rarity"`
    Type           PalType             `json:"type"`

    // Visuals
    SpriteID       string              `json:"sprite_id"`
    PortraitID     string              `json:"portrait_id"`

    // Base Stats (scaled by level and stars)
    BaseHP         float64             `json:"base_hp"`
    BaseATK        float64             `json:"base_atk"`
    BaseDEF        float64             `json:"base_def"`
    BaseAtkSpeed   float64             `json:"base_atk_speed"`

    // Pal Skill (each pal has one unique skill)
    SkillID        string              `json:"skill_id"`
    SkillName      string              `json:"skill_name"`
    SkillDesc      string              `json:"skill_desc"`
    SkillCooldown  float64             `json:"skill_cooldown"`

    // Passive Ability
    PassiveID      string              `json:"passive_id"`
    PassiveName    string              `json:"passive_name"`
    PassiveDesc    string              `json:"passive_desc"`

    // Growth
    MaxLevel       int                 `json:"max_level"`       // 100
    MaxStars       int                 `json:"max_stars"`       // 5 stars
}

// Player's owned pal instance
type PlayerPal struct {
    PalID        string  `json:"pal_id"`
    Level        int     `json:"level"`
    Stars        int     `json:"stars"`           // 1-5 stars (ascension)
    Experience   int64   `json:"experience"`
    Fragments    int     `json:"fragments"`       // For star upgrades
    DeploySlot   int     `json:"deploy_slot"`     // -1 if not deployed, 0-4 if deployed
}

// Player's pal collection
type PlayerPalCollection struct {
    OwnedPals     map[string]*PlayerPal `json:"owned_pals"`
    DeployedPals  [5]string             `json:"deployed_pals"`   // 5 active pal slots
}

const MaxDeployedPals = 5

func (p *PlayerPalCollection) DeployPal(palID string, slot int) error {
    if slot < 0 || slot >= MaxDeployedPals {
        return ErrInvalidSlot
    }

    pal, ok := p.OwnedPals[palID]
    if !ok {
        return ErrPalNotOwned
    }

    // Unequip from previous slot if deployed elsewhere
    if pal.DeploySlot >= 0 {
        p.DeployedPals[pal.DeploySlot] = ""
    }

    // Unequip existing pal in target slot
    if existingPalID := p.DeployedPals[slot]; existingPalID != "" {
        if existingPal, ok := p.OwnedPals[existingPalID]; ok {
            existingPal.DeploySlot = -1
        }
    }

    // Deploy to new slot
    p.DeployedPals[slot] = palID
    pal.DeploySlot = slot

    return nil
}

func (p *PlayerPalCollection) GetDeployedPals() []*PlayerPal {
    var pals []*PlayerPal
    for _, palID := range p.DeployedPals {
        if palID != "" {
            if pal, ok := p.OwnedPals[palID]; ok {
                pals = append(pals, pal)
            }
        }
    }
    return pals
}

// Pal stats calculation
func (p *PlayerPal) CalculateStats(basePal *Pal) PalStats {
    levelMultiplier := 1.0 + (float64(p.Level-1) * 0.02)   // +2% per level
    starMultiplier := 1.0 + (float64(p.Stars-1) * 0.15)    // +15% per star

    return PalStats{
        HP:       basePal.BaseHP * levelMultiplier * starMultiplier,
        ATK:      basePal.BaseATK * levelMultiplier * starMultiplier,
        DEF:      basePal.BaseDEF * levelMultiplier * starMultiplier,
        AtkSpeed: basePal.BaseAtkSpeed * (1.0 + float64(p.Level-1)*0.005), // Slower scaling
    }
}

type PalStats struct {
    HP       float64 `json:"hp"`
    ATK      float64 `json:"atk"`
    DEF      float64 `json:"def"`
    AtkSpeed float64 `json:"atk_speed"`
}

// Star upgrade requirements
var PalStarUpgradeCost = map[int]struct {
    Fragments int
    Gold      int64
}{
    2: {Fragments: 20, Gold: 10000},
    3: {Fragments: 50, Gold: 50000},
    4: {Fragments: 100, Gold: 200000},
    5: {Fragments: 200, Gold: 500000},
}
```

### Pal Combat Behavior

```go
// server/internal/game/pal_ai.go

type PalAI struct {
    Owner       *Player
    Pal         *PlayerPal
    PalData     *Pal
    Stats       PalStats

    // Combat state
    Position    Vector2
    Target      *Entity
    Health      float64
    SkillCD     float64

    // Behavior
    FollowDist  float32     // Distance to maintain from owner
    AttackRange float32
    AggroRange  float32
}

func (ai *PalAI) Update(dt float64, room *Room) {
    // Update cooldowns
    ai.SkillCD = max(0, ai.SkillCD-dt)

    // Find target
    ai.Target = ai.FindBestTarget(room)

    if ai.Target != nil && ai.InAttackRange(ai.Target) {
        // Attack behavior
        ai.Attack(ai.Target, room)

        // Use skill if available
        if ai.SkillCD <= 0 {
            ai.UseSkill(room)
        }
    } else {
        // Follow owner
        ai.FollowOwner(dt)
    }
}

func (ai *PalAI) FindBestTarget(room *Room) *Entity {
    var bestTarget *Entity
    bestDist := ai.AggroRange

    for _, enemy := range room.GetEnemiesNear(ai.Position, ai.AggroRange) {
        dist := ai.Position.DistanceTo(enemy.Position)
        if dist < bestDist {
            bestDist = dist
            bestTarget = enemy
        }
    }

    return bestTarget
}

func (ai *PalAI) Attack(target *Entity, room *Room) {
    damage := ai.Stats.ATK

    // Apply pal crit from owner
    if rand.Float64() < ai.Owner.Stats.GetStat(AttrPalCrit)/100 {
        critDmg := 1.5 + ai.Owner.Stats.GetStat(AttrPalCritDmg)/100
        damage *= critDmg
    }

    target.TakeDamage(damage, ai.Owner)
}

func (ai *PalAI) UseSkill(room *Room) {
    // Execute pal's unique skill
    skill := PalSkills[ai.PalData.SkillID]
    skill.Execute(ai, room)
    ai.SkillCD = ai.PalData.SkillCooldown
}

func (ai *PalAI) FollowOwner(dt float64) {
    dirToOwner := ai.Owner.Position.Sub(ai.Position)
    dist := dirToOwner.Length()

    if dist > ai.FollowDist {
        // Move towards owner
        speed := 200.0 // Base pal movement speed
        movement := dirToOwner.Normalize().Scale(float32(speed * dt))
        ai.Position = ai.Position.Add(movement)
    }
}
```

### Pal Tab UI

Players can deploy up to **5 pals** simultaneously that fight alongside them in combat.

```
┌──────────────────────────────────────────────────────────────┐
│ ◀ Pals                                          [Sort ▼]     │
├──────────────────────────────────────────────────────────────┤
│  DEPLOYED PALS (5 slots)                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ 🐉     │ │ 🦅     │ │ 🦊     │ │ 🐺     │ │  --    │     │
│  │ Dragon │ │ Phoenix│ │ Kitsune│ │ Fenrir │ │ Empty  │     │
│  │ ★★★★☆ │ │ ★★★☆☆ │ │ ★★★☆☆ │ │ ★★☆☆☆ │ │        │     │
│  │ Lv.45  │ │ Lv.32  │ │ Lv.28  │ │ Lv.20  │ │        │     │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
│   [Slot 1]   [Slot 2]   [Slot 3]   [Slot 4]   [Slot 5]      │
├──────────────────────────────────────────────────────────────┤
│  PAL COLLECTION (38/62)                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [All] [Attack] [Defense] [Support] [Utility]        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  IMMORTAL (2/6)                                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ 🌟 │ │ 👼 │ │ 🔒 │ │ 🔒 │ │ 🔒 │ │ 🔒 │                  │
│  │★★★★│ │★★★☆│ │    │ │    │ │    │ │    │                  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │
│                                                              │
│  LEGENDARY (8/13)                                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ 🐉 │ │ 🦅 │ │ 🦊 │ │ 🐺 │ │ 🦁 │ │ 🐯 │                  │
│  │★★★★│ │★★★☆│ │★★★☆│ │★★☆☆│ │★★☆☆│ │★☆☆☆│  ← [D] = Deployed │
│  │ [D]│ │ [D]│ │ [D]│ │ [D]│ │    │ │    │                  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │
│  ... (scrollable)                                            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  SELECTED: Phoenix (Legendary)          [DEPLOY TO SLOT ▼]   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ★★★☆☆  Level 32/100  ████████░░░░ 65/100 frags        │  │
│  │ ATK: 980  HP: 2,800  DEF: 320  SPD: 1.2               │  │
│  │                                                        │  │
│  │ Skill: Rebirth Flame                                   │  │
│  │ "Deals fire damage and heals 10% of damage dealt"      │  │
│  │                                                        │  │
│  │ Passive: Phoenix Blessing                              │  │
│  │ "Revive once per battle with 30% HP"                   │  │
│  │                                                        │  │
│  │ [LEVEL UP 💰 2,500]    [STAR UP ⬆️ 35/100]            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Pal Gacha System

```go
// server/internal/game/pal_gacha.go

type PalGachaPool struct {
    ID          string              `json:"id"`
    Name        string              `json:"name"`
    CostType    CurrencyType        `json:"cost_type"`    // Gems, tickets, etc.
    SingleCost  int64               `json:"single_cost"`
    TenPullCost int64               `json:"ten_pull_cost"`

    // Drop rates
    Rates       map[PalRarity]float64 `json:"rates"`

    // Featured/rate-up pals
    Featured    []string            `json:"featured"`
    FeaturedBonus float64           `json:"featured_bonus"` // Extra rate for featured

    // Pity system
    PityCounter int                 `json:"pity_counter"`
    SoftPity    int                 `json:"soft_pity"`     // Rate increase starts
    HardPity    int                 `json:"hard_pity"`     // Guaranteed high rarity
}

var StandardPalGachaRates = map[PalRarity]float64{
    PalRarityNormal:    0.00,   // Not in gacha (given free)
    PalRarityUnique:    0.00,   // Not in gacha (given free)
    PalRarityWell:      0.30,   // 30%
    PalRarityRare:      0.35,   // 35%
    PalRarityMythic:    0.20,   // 20%
    PalRarityEpic:      0.10,   // 10%
    PalRarityLegendary: 0.04,   // 4%
    PalRarityImmortal:  0.01,   // 1%
}

func (g *PalGachaPool) Pull(player *Player, count int) ([]PalGachaResult, error) {
    results := []PalGachaResult{}

    for i := 0; i < count; i++ {
        g.PityCounter++

        // Determine rarity
        rarity := g.rollRarity()

        // Select pal from that rarity
        pal := g.selectPalOfRarity(rarity)

        // Check if new or duplicate (fragments)
        isNew := !player.Pals.HasPal(pal.ID)
        fragments := 0
        if !isNew {
            fragments = g.getDuplicateFragments(rarity)
        }

        results = append(results, PalGachaResult{
            Pal:       pal,
            IsNew:     isNew,
            Fragments: fragments,
        })

        // Reset pity on high rarity
        if rarity >= PalRarityLegendary {
            g.PityCounter = 0
        }
    }

    return results, nil
}

func (g *PalGachaPool) rollRarity() PalRarity {
    // Hard pity
    if g.PityCounter >= g.HardPity {
        return PalRarityLegendary
    }

    // Soft pity (increased rates)
    rates := g.Rates
    if g.PityCounter >= g.SoftPity {
        pityBonus := float64(g.PityCounter-g.SoftPity) * 0.05 // +5% per pull after soft pity
        rates[PalRarityLegendary] += pityBonus
        rates[PalRarityImmortal] += pityBonus * 0.25
    }

    roll := rand.Float64()
    cumulative := 0.0

    // Roll from highest to lowest rarity
    for rarity := PalRarityImmortal; rarity >= PalRarityWell; rarity-- {
        cumulative += rates[rarity]
        if roll < cumulative {
            return rarity
        }
    }

    return PalRarityWell // Default
}

type PalGachaResult struct {
    Pal       *Pal  `json:"pal"`
    IsNew     bool  `json:"is_new"`
    Fragments int   `json:"fragments"`
}
```

### Protobuf Messages

```protobuf
// proto/pal.proto

syntax = "proto3";
package game;

enum PalRarity {
    PAL_RARITY_NORMAL = 0;
    PAL_RARITY_UNIQUE = 1;
    PAL_RARITY_WELL = 2;
    PAL_RARITY_RARE = 3;
    PAL_RARITY_MYTHIC = 4;
    PAL_RARITY_EPIC = 5;
    PAL_RARITY_LEGENDARY = 6;
    PAL_RARITY_IMMORTAL = 7;
}

enum PalType {
    PAL_TYPE_ATTACK = 0;
    PAL_TYPE_DEFENSE = 1;
    PAL_TYPE_SUPPORT = 2;
    PAL_TYPE_UTILITY = 3;
}

message Pal {
    string id = 1;
    string name = 2;
    string description = 3;
    PalRarity rarity = 4;
    PalType type = 5;
    string sprite_id = 6;
    string portrait_id = 7;
    double base_hp = 8;
    double base_atk = 9;
    double base_def = 10;
    double base_atk_speed = 11;
    string skill_id = 12;
    string skill_name = 13;
    string skill_desc = 14;
    double skill_cooldown = 15;
    string passive_id = 16;
    string passive_name = 17;
    string passive_desc = 18;
    int32 max_level = 19;
    int32 max_stars = 20;
}

message PlayerPal {
    string pal_id = 1;
    int32 level = 2;
    int32 stars = 3;
    int64 experience = 4;
    int32 fragments = 5;
    int32 deploy_slot = 6;  // -1 if not deployed, 0-4 if deployed
}

message PlayerPalCollection {
    map<string, PlayerPal> owned_pals = 1;
    repeated string deployed_pals = 2;  // 5 pal slots
}

message PalDeployRequest {
    string pal_id = 1;
    int32 slot = 2;  // 0-4
}

message PalLevelUpRequest {
    string pal_id = 1;
}

message PalStarUpRequest {
    string pal_id = 1;
}

message PalGachaPullRequest {
    string pool_id = 1;
    int32 count = 2;  // 1 or 10
}

message PalGachaResult {
    Pal pal = 1;
    bool is_new = 2;
    int32 fragments = 3;
}

message PalGachaPullResponse {
    repeated PalGachaResult results = 1;
    int32 pity_counter = 2;
}

message PalCollectionResponse {
    PlayerPalCollection collection = 1;
    repeated Pal all_pals = 2;
}
```

---

## Buff/Debuff System

### Status Effects

```go
// server/internal/game/effects.go

type StatusEffect struct {
    ID          string
    Name        string
    Type        StatusType

    // Duration
    Duration    time.Duration
    StartTime   time.Time

    // Stacking
    Stackable   bool
    MaxStacks   int
    Stacks      int

    // Effect
    StatMods    []StatModifier
    TickEffect  *TickEffect     // For DoT/HoT

    // Source
    SourceID    string
}

type StatusType int

const (
    StatusBuff StatusType = iota
    StatusDebuff
)

type TickEffect struct {
    Interval    time.Duration
    LastTick    time.Time
    EffectType  EffectType
    Value       float32
}

// Common status effects
var StatusEffects = map[string]StatusEffect{
    "burning": {
        ID:   "burning",
        Name: "Burning",
        Type: StatusDebuff,
        TickEffect: &TickEffect{
            Interval:   time.Second,
            EffectType: EffectDamage,
            Value:      5,
        },
    },
    "slowed": {
        ID:   "slowed",
        Name: "Slowed",
        Type: StatusDebuff,
        StatMods: []StatModifier{
            {Type: ModifierPercent, Stat: "move_speed", Value: -0.3},
        },
    },
    "stunned": {
        ID:   "stunned",
        Name: "Stunned",
        Type: StatusDebuff,
        StatMods: []StatModifier{
            {Type: ModifierMultiplier, Stat: "move_speed", Value: 0},
        },
    },
    "attack_up": {
        ID:       "attack_up",
        Name:     "Attack Up",
        Type:     StatusBuff,
        Stackable: true,
        MaxStacks: 5,
        StatMods: []StatModifier{
            {Type: ModifierPercent, Stat: "attack", Value: 0.1},
        },
    },
    "regeneration": {
        ID:   "regeneration",
        Name: "Regeneration",
        Type: StatusBuff,
        TickEffect: &TickEffect{
            Interval:   time.Second,
            EffectType: EffectHeal,
            Value:      3,
        },
    },
}

func (p *Player) UpdateStatusEffects(dt float32, room *Room) {
    now := time.Now()
    expired := make([]string, 0)

    for _, effect := range p.StatusEffects {
        // Check expiration
        if now.Sub(effect.StartTime) >= effect.Duration {
            expired = append(expired, effect.ID)
            continue
        }

        // Process tick effects
        if effect.TickEffect != nil {
            if now.Sub(effect.TickEffect.LastTick) >= effect.TickEffect.Interval {
                effect.TickEffect.LastTick = now

                switch effect.TickEffect.EffectType {
                case EffectDamage:
                    damage := int(effect.TickEffect.Value * float32(effect.Stacks))
                    p.TakeDamage(DamageResult{
                        Damage:     damage,
                        DamageType: DamageTypeTrue,
                    }, nil, room)

                case EffectHeal:
                    heal := int(effect.TickEffect.Value * float32(effect.Stacks))
                    p.Heal(heal)
                }
            }
        }
    }

    // Remove expired effects
    for _, id := range expired {
        p.RemoveStatusEffect(id)
    }
}
```

---

## Equipment System

> **Note**: The game uses a **15-slot equipment system** with Dice Roll acquisition.
> See [Equipment Slot System](#equipment-slot-system) for the full 15-slot definitions,
> and [Rarity System](#rarity-system) for the 11-tier rarity colors and UI.

### Rarity System (Go Definition)

```go
// server/internal/game/rarity.go

type Rarity int

const (
    RarityNormal Rarity = iota    // Tier 1 - Common drops
    RarityUnique                   // Tier 2 - Slightly better
    RarityWell                     // Tier 3 - Above average
    RarityRare                     // Tier 4 - Noticeably powerful
    RarityMythic                   // Tier 5 - Strong, harder to obtain
    RarityEpic                     // Tier 6 - Very powerful
    RarityLegendary                // Tier 7 - Extremely rare
    RarityImmortal                 // Tier 8 - Near top-tier
    RaritySupreme                  // Tier 9 - Elite tier
    RarityAurous                   // Tier 10 - Ultra-rare
    RarityEternal                  // Tier 11 - Highest tier
    RarityCount                    // Total: 11 rarities
)

var RarityMultipliers = map[Rarity]float64{
    RarityNormal:    1.0,
    RarityUnique:    1.15,
    RarityWell:      1.35,
    RarityRare:      1.6,
    RarityMythic:    2.0,
    RarityEpic:      2.5,
    RarityLegendary: 3.5,
    RarityImmortal:  5.0,
    RaritySupreme:   7.5,
    RarityAurous:    12.0,
    RarityEternal:   20.0,
}

var RarityNames = map[Rarity]string{
    RarityNormal:    "Normal",
    RarityUnique:    "Unique",
    RarityWell:      "Well",
    RarityRare:      "Rare",
    RarityMythic:    "Mythic",
    RarityEpic:      "Epic",
    RarityLegendary: "Legendary",
    RarityImmortal:  "Immortal",
    RaritySupreme:   "Supreme",
    RarityAurous:    "Aurous",
    RarityEternal:   "Eternal",
}
```

### Item Structure

```go
// server/internal/game/item.go

type Item struct {
    ID          string              `json:"id"`
    TemplateID  string              `json:"template_id"`
    Name        string              `json:"name"`
    Rarity      Rarity              `json:"rarity"`
    Level       int                 `json:"level"`
    Slot        EquipmentSlot       `json:"slot"`

    // Stats from the 31-attribute system
    BaseStats   map[Attribute]float64 `json:"base_stats"`
    BonusStats  map[Attribute]float64 `json:"bonus_stats"`   // From upgrades

    // Sub-attributes (2 random rolls for dice-rollable equipment)
    SubAttribute1 *SubAttribute       `json:"sub_attr_1,omitempty"`
    SubAttribute2 *SubAttribute       `json:"sub_attr_2,omitempty"`
}

type PlayerEquipment struct {
    Slots [SlotCount]*Item `json:"slots"` // 15 equipment slots
}
```

### Equipment Effects

```go
func (p *Player) RecalculateStats() {
    // Reset to base stats
    p.Stats = DefaultPlayerStats()

    // Apply equipment stats from all 15 slots
    for slot := EquipmentSlot(0); slot < SlotCount; slot++ {
        item := p.Equipment.Slots[slot]
        if item == nil {
            continue
        }

        // Apply base stats
        for attr, value := range item.BaseStats {
            p.AddStatModifier(StatModifier{
                Type:   ModifierFlat,
                Attr:   attr,
                Value:  value,
                Source: fmt.Sprintf("equipment:%s", item.ID),
            })
        }

        // Apply bonus stats from upgrades
        for attr, value := range item.BonusStats {
            p.AddStatModifier(StatModifier{
                Type:   ModifierFlat,
                Attr:   attr,
                Value:  value,
                Source: fmt.Sprintf("equipment:%s:bonus", item.ID),
            })
        }

        // Apply sub-attributes
        if item.SubAttribute1 != nil {
            p.ApplySubAttribute(item.SubAttribute1, item.ID)
        }
        if item.SubAttribute2 != nil {
            p.ApplySubAttribute(item.SubAttribute2, item.ID)
        }
    }

    // Apply evolution passives (up to 5)
    for _, passiveID := range p.Evolution.UnlockedPassives {
        passive := GetEvolutionPassive(passiveID)
        if passive != nil {
            p.ApplyEvolutionPassive(passive)
        }
    }

    // Apply level scaling
    levelBonus := float64(p.Level-1) * 0.02  // 2% per level
    p.AddStatModifier(StatModifier{
        Type:   ModifierPercent,
        Attr:   AttrHP,
        Value:  levelBonus,
        Source: "level",
    })
}
```

---

## Progression System

### Experience & Leveling

```go
// server/internal/game/progression.go

type Progression struct {
    Level      int
    Experience int64

    // Skill points
    SkillPoints int

    // Unlocks
    UnlockedSkills []string
}

// XP required for each level
func GetXPForLevel(level int) int64 {
    // Formula: base * level^exponent
    base := int64(100)
    exponent := 1.5
    return int64(float64(base) * math.Pow(float64(level), exponent))
}

func (p *Player) AddExperience(amount int64) {
    p.Progression.Experience += amount

    for {
        xpNeeded := GetXPForLevel(p.Progression.Level + 1)
        if p.Progression.Experience >= xpNeeded {
            p.Progression.Experience -= xpNeeded
            p.LevelUp()
        } else {
            break
        }
    }
}

func (p *Player) LevelUp() {
    p.Progression.Level++
    p.Progression.SkillPoints++

    // Stat increases
    p.Stats.MaxHealth += 10
    p.Stats.MaxMana += 5
    p.Stats.Attack += 2
    p.Stats.Defense += 1

    // Full heal on level up
    p.Stats.Health = p.Stats.MaxHealth
    p.Stats.Mana = p.Stats.MaxMana

    // Unlock skills at certain levels
    switch p.Progression.Level {
    case 5:
        p.UnlockSkill("dash")
    case 10:
        p.UnlockSkill("fireball")
    case 15:
        p.UnlockSkill("frost_nova")
    }
}
```

### Match Rewards

```go
type MatchRewards struct {
    BaseXP      int64
    WinBonus    int64
    KillXP      int64
    AssistXP    int64

    BaseGold    int64
    WinGold     int64
    KillGold    int64
}

var StandardRewards = MatchRewards{
    BaseXP:   50,
    WinBonus: 100,
    KillXP:   20,
    AssistXP: 10,
    BaseGold: 25,
    WinGold:  50,
    KillGold: 10,
}

func CalculateMatchRewards(player *Player, score PlayerScore, won bool) (xp int64, gold int64) {
    r := StandardRewards

    xp = r.BaseXP
    gold = r.BaseGold

    if won {
        xp += r.WinBonus
        gold += r.WinGold
    }

    xp += int64(score.Kills) * r.KillXP
    xp += int64(score.Assists) * r.AssistXP
    gold += int64(score.Kills) * r.KillGold

    return xp, gold
}
```

### Character Evolution System

A branching evolution/mutation system where characters evolve at key level milestones, choosing specialization paths that affect playstyle, stats, and abilities.

#### Evolution Tree Structure

```
Level 1          Level 15         Level 20              Level 30                Level 50           Level 70         Level 100
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
                                  ┌─ Projectile Focus ─┬─ Projectile Focus II ─┬─ Branch A ───────┬─ Evolution A1 ─┬─ Final Form A1
                                  │                    │                       │                  │                │
                                  │                    │                       └─ Branch B ───────┼─ Evolution A2 ─┼─ Final Form A2
                                  │                    │                                          │                │
[Base Form] ──── [Form II] ───────┼─ Pal Focus ────────┼─ Pal Focus II ────────┬─ Branch C ───────┼─ Evolution B1 ─┼─ Final Form B1
                                  │                    │                       │                  │                │
                                  │                    │                       └─ Branch D ───────┼─ Evolution B2 ─┼─ Final Form B2
                                  │                    │                                          │                │
                                  └─ Skill Focus ──────┴─ Skill Focus II ──────┬─ Branch E ───────┼─ Evolution C1 ─┼─ Final Form C1
                                                                               │                  │                │
                                                                               └─ Branch F ───────┴─ Evolution C2 ─┴─ Final Form C2
```

#### Evolution Tiers

| Tier | Level | Choices | Description |
|------|-------|---------|-------------|
| 0 | 1 | 1 | Starting base form |
| 1 | 15 | 1 | First evolution (linear upgrade) |
| 2 | 20 | 3 | First branch - choose specialization path |
| 3 | 30 | 1 | Path upgrade (locked to chosen path) |
| 4 | 50 | 2 | Sub-branch within chosen path |
| 5 | 70 | 1 | Path evolution (locked to sub-branch) |
| 6 | 100 | 1 | Final form / Ascension |

#### Evolution Data Structures

```go
// server/internal/game/evolution.go

type EvolutionTier int

const (
    TierBase EvolutionTier = iota      // Level 1
    TierFirst                           // Level 15
    TierBranch                          // Level 20 - First choice
    TierBranchII                        // Level 30
    TierSubBranch                       // Level 50 - Second choice
    TierEvolution                       // Level 70
    TierFinal                           // Level 100 - Ascension
    TierCount
)

var EvolutionLevelRequirements = map[EvolutionTier]int{
    TierBase:      1,
    TierFirst:     15,
    TierBranch:    20,
    TierBranchII:  30,
    TierSubBranch: 50,
    TierEvolution: 70,
    TierFinal:     100,
}

type EvolutionPath int

const (
    PathNone EvolutionPath = iota
    PathProjectile    // Focus on basic attacks / projectiles
    PathPal           // Focus on companion / pal abilities
    PathSkill         // Focus on active skills
)

type Evolution struct {
    ID             string              `json:"id"`
    Name           string              `json:"name"`
    Tier           EvolutionTier       `json:"tier"`
    Path           EvolutionPath       `json:"path"`
    RequiredLevel  int                 `json:"required_level"`
    PreviousFormID string              `json:"previous_form_id"`  // What you evolve FROM
    NextFormIDs    []string            `json:"next_form_ids"`     // What you can evolve TO

    // Visual
    SpriteID       string              `json:"sprite_id"`
    PortraitID     string              `json:"portrait_id"`

    // Stats bonuses for this form
    StatBonuses    map[Attribute]float64 `json:"stat_bonuses"`

    // Evolution Active Skill (goes in skill slot 0, locked)
    ActiveSkillID  string              `json:"active_skill_id"`
    ActiveSkill    *EvolutionSkill     `json:"active_skill,omitempty"`

    // Evolution Passive (unlocked at this tier, cumulative)
    PassiveID      string              `json:"passive_id"`
    Passive        *EvolutionPassive   `json:"passive,omitempty"`

    // Path-specific bonuses
    PathBonus      *PathBonus          `json:"path_bonus,omitempty"`
}

// Evolution Active Skill - the locked skill in slot 0
type EvolutionSkill struct {
    ID          string  `json:"id"`
    Name        string  `json:"name"`
    Description string  `json:"description"`
    Icon        string  `json:"icon"`
    Cooldown    float64 `json:"cooldown"`
    BaseDamage  float64 `json:"base_damage"`
}

// Evolution Passive - unlocked progressively through evolutions
type EvolutionPassive struct {
    ID          string  `json:"id"`
    Name        string  `json:"name"`
    Description string  `json:"description"`
    Icon        string  `json:"icon"`
    Effect      string  `json:"effect"`      // Effect type
    Value       float64 `json:"value"`       // Effect value
}

type PathBonus struct {
    Path        EvolutionPath `json:"path"`
    BonusType   string        `json:"bonus_type"`   // "damage", "cooldown", "effect"
    BonusValue  float64       `json:"bonus_value"`
    Description string        `json:"description"`
}

// Player's evolution state
type PlayerEvolution struct {
    CurrentFormID   string        `json:"current_form_id"`
    CurrentTier     EvolutionTier `json:"current_tier"`
    ChosenPath      EvolutionPath `json:"chosen_path"`       // Set at Tier 2
    ChosenSubBranch string        `json:"chosen_sub_branch"` // Set at Tier 4

    // History of all forms taken
    EvolutionHistory []string     `json:"evolution_history"`

    // Pending evolution (player reached level but hasn't chosen)
    PendingEvolution bool         `json:"pending_evolution"`

    // Current active skill from evolution (slot 0, locked)
    ActiveSkillID    string       `json:"active_skill_id"`

    // Unlocked passives (cumulative from all evolutions, max 5)
    UnlockedPassives []string     `json:"unlocked_passives"`
}

// Get current evolution's active skill
func (p *PlayerEvolution) GetActiveSkill() *EvolutionSkill {
    if form, ok := EvolutionTree[p.CurrentFormID]; ok {
        return form.ActiveSkill
    }
    return nil
}

// Get all unlocked passives (up to 5 based on evolution tier)
func (p *PlayerEvolution) GetUnlockedPassives() []*EvolutionPassive {
    var passives []*EvolutionPassive
    for _, passiveID := range p.UnlockedPassives {
        if passive, ok := EvolutionPassives[passiveID]; ok {
            passives = append(passives, passive)
        }
    }
    return passives
}
```

#### Evolution Passive System

Each evolution tier unlocks a new passive ability. Players accumulate up to **5 passives** as they progress through evolution tiers (tiers 1-5 each grant a passive).

| Evolution Tier | Level | Passive Slot | Description |
|----------------|-------|--------------|-------------|
| Tier 1 (First) | 15 | Passive 1 | First passive unlocked |
| Tier 2 (Branch) | 20 | Passive 2 | Second passive (path-specific) |
| Tier 3 (Branch II) | 30 | Passive 3 | Third passive |
| Tier 4 (Sub-Branch) | 50 | Passive 4 | Fourth passive |
| Tier 5 (Evolution) | 70 | Passive 5 | Fifth passive (final) |
| Tier 6 (Final) | 100 | - | No new passive, but may upgrade existing |

```go
// Evolution passive examples
var EvolutionPassives = map[string]*EvolutionPassive{
    // Tier 1 passives (all paths get same one initially)
    "passive_spirit_bond": {
        ID:          "passive_spirit_bond",
        Name:        "Spirit Bond",
        Description: "Increases all damage by 5%",
        Effect:      "damage_bonus",
        Value:       5.0,
    },

    // Tier 2 passives (path-specific)
    "passive_proj_mastery": {
        ID:          "passive_proj_mastery",
        Name:        "Projectile Mastery",
        Description: "Basic attacks deal 10% more damage",
        Effect:      "basic_atk_damage",
        Value:       10.0,
    },
    "passive_pal_synergy": {
        ID:          "passive_pal_synergy",
        Name:        "Pal Synergy",
        Description: "Pals attack 10% faster",
        Effect:      "pal_atk_speed",
        Value:       10.0,
    },
    "passive_skill_affinity": {
        ID:          "passive_skill_affinity",
        Name:        "Skill Affinity",
        Description: "Skills cooldown 10% faster",
        Effect:      "skill_cooldown",
        Value:       10.0,
    },

    // ... more passives for tiers 3, 4, 5
}

const MaxEvolutionPassives = 5
```

#### Character Panel - Passives Section

```
┌──────────────────────────────────────────────────────────────┐
│  EVOLUTION PASSIVES (4/5 unlocked)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │ ✨ Spirit│ │ 🎯 Proj  │ │ ⚔️ Rapid │ │ 💥 Burst│ │ 🔒  │ │
│  │   Bond   │ │ Mastery  │ │   Fire   │ │  Power  │ │Lv70 │ │
│  │  +5% DMG │ │+10% Basic│ │ +15% SPD │ │+20% Crit│ │     │ │
│  │  [Lv15]  │ │  [Lv20]  │ │  [Lv30]  │ │  [Lv50] │ │     │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────┘ │
│   Slot 1      Slot 2       Slot 3       Slot 4      Slot 5  │
└──────────────────────────────────────────────────────────────┘
```

#### Evolution Example Data

```go
// Example evolution tree (placeholder names)

var EvolutionTree = map[string]Evolution{
    // Tier 0 - Base (no passive, basic active skill)
    "base_form": {
        ID:            "base_form",
        Name:          "Slime", // Placeholder
        Tier:          TierBase,
        Path:          PathNone,
        RequiredLevel: 1,
        NextFormIDs:   []string{"form_ii"},
        StatBonuses:   map[Attribute]float64{},
        ActiveSkillID: "evo_skill_basic_shot",
        ActiveSkill: &EvolutionSkill{
            ID:          "evo_skill_basic_shot",
            Name:        "Slime Shot",
            Description: "Fire a basic projectile",
            Cooldown:    2.0,
            BaseDamage:  10,
        },
    },

    // Tier 1 - First Evolution (1st passive unlocked)
    "form_ii": {
        ID:             "form_ii",
        Name:           "Spirit Slime", // Placeholder
        Tier:           TierFirst,
        Path:           PathNone,
        RequiredLevel:  15,
        PreviousFormID: "base_form",
        NextFormIDs:    []string{"projectile_focus", "pal_focus", "skill_focus"},
        StatBonuses: map[Attribute]float64{
            AttrATK: 10,
            AttrHP:  50,
        },
        ActiveSkillID: "evo_skill_spirit_blast",
        ActiveSkill: &EvolutionSkill{
            ID:          "evo_skill_spirit_blast",
            Name:        "Spirit Blast",
            Description: "Fire an enhanced spirit projectile",
            Cooldown:    2.5,
            BaseDamage:  25,
        },
        PassiveID: "passive_spirit_bond",
        Passive: &EvolutionPassive{
            ID:          "passive_spirit_bond",
            Name:        "Spirit Bond",
            Description: "Increases all damage by 5%",
            Effect:      "damage_bonus",
            Value:       5.0,
        },
    },

    // Tier 2 - First Branch (2nd passive, path-specific)
    "projectile_focus": {
        ID:             "projectile_focus",
        Name:           "Projectile Mimicry", // Placeholder
        Tier:           TierBranch,
        Path:           PathProjectile,
        RequiredLevel:  20,
        PreviousFormID: "form_ii",
        NextFormIDs:    []string{"projectile_focus_ii"},
        StatBonuses: map[Attribute]float64{
            AttrATK:          25,
            AttrAtkSpeed:     0.1,
            AttrBasicAtkCrit: 5,
        },
        ActiveSkillID: "evo_skill_rapid_fire",
        ActiveSkill: &EvolutionSkill{
            ID:          "evo_skill_rapid_fire",
            Name:        "Rapid Fire",
            Description: "Fire multiple projectiles in quick succession",
            Cooldown:    3.0,
            BaseDamage:  15,
        },
        PassiveID: "passive_proj_mastery",
        Passive: &EvolutionPassive{
            ID:          "passive_proj_mastery",
            Name:        "Projectile Mastery",
            Description: "Basic attacks deal 10% more damage",
            Effect:      "basic_atk_damage",
            Value:       10.0,
        },
        PathBonus: &PathBonus{
            Path:        PathProjectile,
            BonusType:   "damage",
            BonusValue:  15,
            Description: "+15% Basic Attack Damage",
        },
    },
    "pal_focus": {
        ID:             "pal_focus",
        Name:           "Pal Symbiosis", // Placeholder
        Tier:           TierBranch,
        Path:           PathPal,
        RequiredLevel:  20,
        PreviousFormID: "form_ii",
        NextFormIDs:    []string{"pal_focus_ii"},
        StatBonuses: map[Attribute]float64{
            AttrPalAtkSpeed: 0.15,
            AttrPalCrit:     10,
        },
        PathBonus: &PathBonus{
            Path:        PathPal,
            BonusType:   "damage",
            BonusValue:  20,
            Description: "+20% Pal Damage",
        },
    },
    "skill_focus": {
        ID:             "skill_focus",
        Name:           "Skill Mutation", // Placeholder
        Tier:           TierBranch,
        Path:           PathSkill,
        RequiredLevel:  20,
        PreviousFormID: "form_ii",
        NextFormIDs:    []string{"skill_focus_ii"},
        StatBonuses: map[Attribute]float64{
            AttrSkillRechargeSpeed: 0.15,
            AttrSkillCrit:          10,
        },
        PathBonus: &PathBonus{
            Path:        PathSkill,
            BonusType:   "cooldown",
            BonusValue:  -10,
            Description: "-10% Skill Cooldown",
        },
    },

    // Tier 3 - Branch II (path locked)
    "projectile_focus_ii": {
        ID:             "projectile_focus_ii",
        Name:           "Projectile Mimicry II",
        Tier:           TierBranchII,
        Path:           PathProjectile,
        RequiredLevel:  30,
        PreviousFormID: "projectile_focus",
        NextFormIDs:    []string{"proj_branch_a", "proj_branch_b"},
        StatBonuses: map[Attribute]float64{
            AttrATK:            50,
            AttrBasicAtkCritDmg: 20,
        },
    },

    // Tier 4 - Sub-branch (2 choices within path)
    "proj_branch_a": {
        ID:             "proj_branch_a",
        Name:           "Mimic Cat", // Placeholder
        Tier:           TierSubBranch,
        Path:           PathProjectile,
        RequiredLevel:  50,
        PreviousFormID: "projectile_focus_ii",
        NextFormIDs:    []string{"proj_evo_a"},
        UnlockedSkills: []string{"rapid_fire", "pierce_shot"},
    },
    "proj_branch_b": {
        ID:             "proj_branch_b",
        Name:           "Mimic Plant", // Placeholder
        Tier:           TierSubBranch,
        Path:           PathProjectile,
        RequiredLevel:  50,
        PreviousFormID: "projectile_focus_ii",
        NextFormIDs:    []string{"proj_evo_b"},
        UnlockedSkills: []string{"spread_shot", "homing_seed"},
    },

    // Tier 5 - Evolution
    "proj_evo_a": {
        ID:             "proj_evo_a",
        Name:           "Shadow Panther", // Placeholder
        Tier:           TierEvolution,
        Path:           PathProjectile,
        RequiredLevel:  70,
        PreviousFormID: "proj_branch_a",
        NextFormIDs:    []string{"proj_final_a"},
    },

    // Tier 6 - Final Form / Ascension
    "proj_final_a": {
        ID:             "proj_final_a",
        Name:           "Frost Seraph", // Placeholder
        Tier:           TierFinal,
        Path:           PathProjectile,
        RequiredLevel:  100,
        PreviousFormID: "proj_evo_a",
        NextFormIDs:    []string{}, // No further evolution
        Passives:       []string{"ascended_projectile_mastery"},
    },

    // ... similar entries for Pal and Skill paths
}
```

#### Evolution Service

```go
// server/internal/game/evolution_service.go

type EvolutionService struct {
    repo EvolutionRepository
}

func (s *EvolutionService) CheckEvolutionAvailable(player *Player) (*EvolutionCheck, error) {
    current := player.Evolution.CurrentFormID
    form := EvolutionTree[current]
    currentTier := form.Tier

    // Check if player level qualifies for next tier
    nextTier := currentTier + 1
    if nextTier >= TierCount {
        return &EvolutionCheck{Available: false, Reason: "Max evolution reached"}, nil
    }

    requiredLevel := EvolutionLevelRequirements[nextTier]
    if player.Level < requiredLevel {
        return &EvolutionCheck{
            Available:     false,
            Reason:        "Level too low",
            RequiredLevel: requiredLevel,
        }, nil
    }

    // Get available evolutions
    options := s.GetEvolutionOptions(player)

    return &EvolutionCheck{
        Available:     true,
        CurrentForm:   form,
        Options:       options,
        RequiredLevel: requiredLevel,
    }, nil
}

func (s *EvolutionService) GetEvolutionOptions(player *Player) []Evolution {
    current := EvolutionTree[player.Evolution.CurrentFormID]
    options := []Evolution{}

    for _, nextID := range current.NextFormIDs {
        if next, ok := EvolutionTree[nextID]; ok {
            // Filter by chosen path if already committed
            if player.Evolution.ChosenPath != PathNone &&
               next.Path != PathNone &&
               next.Path != player.Evolution.ChosenPath {
                continue // Skip options from other paths
            }
            options = append(options, next)
        }
    }

    return options
}

func (s *EvolutionService) Evolve(player *Player, targetFormID string) error {
    // Validate evolution is available
    check, err := s.CheckEvolutionAvailable(player)
    if err != nil || !check.Available {
        return ErrEvolutionNotAvailable
    }

    // Validate target is in options
    valid := false
    var targetForm Evolution
    for _, opt := range check.Options {
        if opt.ID == targetFormID {
            valid = true
            targetForm = opt
            break
        }
    }
    if !valid {
        return ErrInvalidEvolutionChoice
    }

    // Apply evolution
    player.Evolution.EvolutionHistory = append(
        player.Evolution.EvolutionHistory,
        player.Evolution.CurrentFormID,
    )
    player.Evolution.CurrentFormID = targetFormID
    player.Evolution.CurrentTier = targetForm.Tier
    player.Evolution.PendingEvolution = false

    // Lock path if this is tier 2 (first branch)
    if targetForm.Tier == TierBranch {
        player.Evolution.ChosenPath = targetForm.Path
    }

    // Lock sub-branch if tier 4
    if targetForm.Tier == TierSubBranch {
        player.Evolution.ChosenSubBranch = targetFormID
    }

    // Apply stat bonuses
    for attr, bonus := range targetForm.StatBonuses {
        player.Stats.Base[attr] += bonus
    }
    player.Stats.Recalculate()

    // Unlock skills
    for _, skillID := range targetForm.UnlockedSkills {
        player.UnlockSkill(skillID)
    }

    // Save
    return s.repo.SavePlayerEvolution(player)
}

type EvolutionCheck struct {
    Available     bool        `json:"available"`
    Reason        string      `json:"reason,omitempty"`
    CurrentForm   Evolution   `json:"current_form"`
    Options       []Evolution `json:"options,omitempty"`
    RequiredLevel int         `json:"required_level"`
}
```

#### Evolution UI Panel

```
┌──────────────────────────────────────────────────────────────┐
│ ⬆️ EVOLUTION AVAILABLE!                               [X]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Form: Spirit Slime (Lv.15)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                      🟢                                │  │
│  │                    (◕‿◕)                               │  │
│  │                   Spirit Slime                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Choose Your Path:                                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   🎯 PROJECTILE │ │   🐾 PAL       │ │   ✨ SKILL      │ │
│  │     MIMICRY    │ │   SYMBIOSIS    │ │    MUTATION    │ │
│  │                 │ │                 │ │                 │ │
│  │ +15% Basic ATK  │ │ +20% Pal DMG   │ │ -10% Skill CD  │ │
│  │ +25 ATK         │ │ +15% Pal SPD   │ │ +15% Skill SPD │ │
│  │ +5% Basic Crit  │ │ +10% Pal Crit  │ │ +10% Skill Crit│ │
│  │                 │ │                 │ │                 │ │
│  │   [SELECT]      │ │   [SELECT]      │ │   [SELECT]      │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                              │
│  ⚠️ This choice is permanent and determines your build path! │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Evolution Tree Preview

```
┌──────────────────────────────────────────────────────────────┐
│ 📖 Evolution Tree                                     [X]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Path: PROJECTILE MIMICRY                               │
│  ═══════════════════════════════════════════════════════════ │
│                                                              │
│  Lv.1        Lv.15       Lv.20         Lv.30                │
│  ┌───┐      ┌───┐      ┌───┐         ┌───┐                  │
│  │ ✓ │─────▶│ ✓ │─────▶│ ✓ │────────▶│ ★ │ ◀── YOU ARE HERE │
│  │   │      │   │      │   │         │   │                  │
│  └───┘      └───┘      └───┘         └───┘                  │
│  Base       Spirit     Projectile    Projectile             │
│  Form       Slime      Mimicry       Mimicry II             │
│                                         │                    │
│                            ┌────────────┴────────────┐       │
│                            ▼                         ▼       │
│  Lv.50                  ┌───┐                     ┌───┐      │
│                         │ ? │                     │ ? │      │
│                         │   │                     │   │      │
│                         └───┘                     └───┘      │
│                         Mimic                     Mimic      │
│                         Cat                       Plant      │
│                            │                         │       │
│  Lv.70                  ┌───┐                     ┌───┐      │
│                         │ ? │                     │ ? │      │
│                         └───┘                     └───┘      │
│                            │                         │       │
│  Lv.100                 ┌───┐                     ┌───┐      │
│                         │ ? │                     │ ? │      │
│                         └───┘                     └───┘      │
│                         Frost                     ???        │
│                         Seraph                               │
│                                                              │
│  ✓ = Completed   ★ = Current   ? = Locked                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### C# Evolution Panel

```csharp
// Scripts/UI/Panels/EvolutionPanel.cs

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class EvolutionPanel : PanelBase
{
    [Header("Current Form")]
    [SerializeField] private Image _currentFormSprite;
    [SerializeField] private Text _currentFormName;
    [SerializeField] private Text _currentFormLevel;

    [Header("Evolution Options")]
    [SerializeField] private Transform _optionsContainer;
    [SerializeField] private EvolutionOptionCard _optionCardPrefab;

    [Header("Warning")]
    [SerializeField] private GameObject _permanentWarning;

    private List<EvolutionOptionCard> _activeCards = new();
    private EvolutionCheck _currentCheck;

    public override void Show()
    {
        base.Show();
        RefreshEvolutionData();
    }

    private async void RefreshEvolutionData()
    {
        var response = await NetworkManager.Instance.SendRequest<EvolutionCheckResponse>(
            OpCodes.EvolutionCheckReq,
            new EvolutionCheckRequest()
        );

        _currentCheck = response.Check;
        UpdateUI();
    }

    private void UpdateUI()
    {
        // Current form
        _currentFormSprite.sprite = AssetManager.GetSprite(_currentCheck.CurrentForm.SpriteID);
        _currentFormName.text = _currentCheck.CurrentForm.Name;
        _currentFormLevel.text = $"Lv.{PlayerManager.Instance.Level}";

        // Clear old cards
        foreach (var card in _activeCards)
        {
            Destroy(card.gameObject);
        }
        _activeCards.Clear();

        // Create option cards
        foreach (var option in _currentCheck.Options)
        {
            var card = Instantiate(_optionCardPrefab, _optionsContainer);
            card.Setup(option, OnEvolutionSelected);
            _activeCards.Add(card);
        }

        // Show permanent warning for branching tiers
        bool isBranchingChoice = _currentCheck.CurrentForm.Tier == EvolutionTier.First ||
                                 _currentCheck.CurrentForm.Tier == EvolutionTier.BranchII;
        _permanentWarning.SetActive(isBranchingChoice && _currentCheck.Options.Count > 1);
    }

    private void OnEvolutionSelected(Evolution evolution)
    {
        // Show confirmation if permanent choice
        if (_currentCheck.Options.Count > 1)
        {
            ConfirmationPopup.Show(
                "Confirm Evolution",
                $"Evolve into {evolution.Name}?\n\nThis choice is permanent!",
                () => PerformEvolution(evolution.ID),
                null
            );
        }
        else
        {
            PerformEvolution(evolution.ID);
        }
    }

    private async void PerformEvolution(string evolutionID)
    {
        try
        {
            var response = await NetworkManager.Instance.SendRequest<EvolutionResponse>(
                OpCodes.EvolutionReq,
                new EvolutionRequest { TargetFormID = evolutionID }
            );

            if (response.Success)
            {
                // Play evolution animation
                await EvolutionAnimation.Play(response.NewForm);

                // Update player data
                PlayerManager.Instance.RefreshData();

                // Close panel
                Hide();

                // Show success
                ToastNotification.Show($"Evolved into {response.NewForm.Name}!");
            }
        }
        catch (Exception e)
        {
            ErrorPopup.Show(e.Message);
        }
    }
}

public class EvolutionOptionCard : MonoBehaviour
{
    [SerializeField] private Image _formSprite;
    [SerializeField] private Text _formName;
    [SerializeField] private Text _pathName;
    [SerializeField] private Transform _bonusContainer;
    [SerializeField] private Text _bonusTextPrefab;
    [SerializeField] private Button _selectButton;
    [SerializeField] private Image _pathIcon;

    private Evolution _evolution;
    private Action<Evolution> _onSelect;

    public void Setup(Evolution evolution, Action<Evolution> onSelect)
    {
        _evolution = evolution;
        _onSelect = onSelect;

        _formSprite.sprite = AssetManager.GetSprite(evolution.SpriteID);
        _formName.text = evolution.Name;
        _pathName.text = GetPathDisplayName(evolution.Path);
        _pathIcon.sprite = GetPathIcon(evolution.Path);

        // Clear old bonuses
        foreach (Transform child in _bonusContainer)
        {
            Destroy(child.gameObject);
        }

        // Add stat bonuses
        foreach (var (attr, value) in evolution.StatBonuses)
        {
            var text = Instantiate(_bonusTextPrefab, _bonusContainer);
            text.text = FormatStatBonus(attr, value);
        }

        // Add path bonus
        if (evolution.PathBonus != null)
        {
            var text = Instantiate(_bonusTextPrefab, _bonusContainer);
            text.text = evolution.PathBonus.Description;
            text.color = GetPathColor(evolution.Path);
        }

        _selectButton.onClick.AddListener(() => _onSelect?.Invoke(_evolution));
    }

    private string GetPathDisplayName(EvolutionPath path) => path switch
    {
        EvolutionPath.Projectile => "PROJECTILE",
        EvolutionPath.Pal => "PAL",
        EvolutionPath.Skill => "SKILL",
        _ => ""
    };

    private Sprite GetPathIcon(EvolutionPath path) => path switch
    {
        EvolutionPath.Projectile => AssetManager.GetSprite("icon_projectile"),
        EvolutionPath.Pal => AssetManager.GetSprite("icon_pal"),
        EvolutionPath.Skill => AssetManager.GetSprite("icon_skill"),
        _ => null
    };

    private Color GetPathColor(EvolutionPath path) => path switch
    {
        EvolutionPath.Projectile => new Color(1f, 0.6f, 0.2f),  // Orange
        EvolutionPath.Pal => new Color(0.4f, 0.8f, 0.4f),       // Green
        EvolutionPath.Skill => new Color(0.6f, 0.4f, 1f),       // Purple
        _ => Color.white
    };

    private string FormatStatBonus(Attribute attr, float value)
    {
        string sign = value >= 0 ? "+" : "";
        bool isPercent = IsPercentAttribute(attr);
        return isPercent
            ? $"{sign}{value:F0}% {AttributeNames[attr]}"
            : $"{sign}{value:F0} {AttributeNames[attr]}";
    }
}

public enum EvolutionPath
{
    None = 0,
    Projectile = 1,
    Pal = 2,
    Skill = 3
}

public enum EvolutionTier
{
    Base = 0,       // Level 1
    First = 1,      // Level 15
    Branch = 2,     // Level 20
    BranchII = 3,   // Level 30
    SubBranch = 4,  // Level 50
    Evolution = 5,  // Level 70
    Final = 6       // Level 100
}
```

#### Protobuf Messages

```protobuf
// proto/evolution.proto

syntax = "proto3";
package game;

enum EvolutionPath {
    EVOLUTION_PATH_NONE = 0;
    EVOLUTION_PATH_PROJECTILE = 1;
    EVOLUTION_PATH_PAL = 2;
    EVOLUTION_PATH_SKILL = 3;
}

enum EvolutionTier {
    EVOLUTION_TIER_BASE = 0;
    EVOLUTION_TIER_FIRST = 1;
    EVOLUTION_TIER_BRANCH = 2;
    EVOLUTION_TIER_BRANCH_II = 3;
    EVOLUTION_TIER_SUB_BRANCH = 4;
    EVOLUTION_TIER_EVOLUTION = 5;
    EVOLUTION_TIER_FINAL = 6;
}

message Evolution {
    string id = 1;
    string name = 2;
    EvolutionTier tier = 3;
    EvolutionPath path = 4;
    int32 required_level = 5;
    string previous_form_id = 6;
    repeated string next_form_ids = 7;
    string sprite_id = 8;
    string portrait_id = 9;
    map<int32, double> stat_bonuses = 10;  // Attribute enum -> value

    // Evolution Active Skill (locked in skill slot 0)
    string active_skill_id = 11;
    EvolutionSkill active_skill = 12;

    // Evolution Passive (unlocked at this tier)
    string passive_id = 13;
    EvolutionPassive passive = 14;

    PathBonus path_bonus = 15;
}

message EvolutionSkill {
    string id = 1;
    string name = 2;
    string description = 3;
    string icon = 4;
    double cooldown = 5;
    double base_damage = 6;
}

message EvolutionPassive {
    string id = 1;
    string name = 2;
    string description = 3;
    string icon = 4;
    string effect = 5;
    double value = 6;
}

message PathBonus {
    EvolutionPath path = 1;
    string bonus_type = 2;
    double bonus_value = 3;
    string description = 4;
}

message PlayerEvolution {
    string current_form_id = 1;
    EvolutionTier current_tier = 2;
    EvolutionPath chosen_path = 3;
    string chosen_sub_branch = 4;
    repeated string evolution_history = 5;
    bool pending_evolution = 6;
    string active_skill_id = 7;              // Current evolution's active skill
    repeated string unlocked_passives = 8;   // All unlocked passives (max 5)
}

// Requests
message EvolutionCheckRequest {}

message EvolutionCheckResponse {
    bool available = 1;
    string reason = 2;
    Evolution current_form = 3;
    repeated Evolution options = 4;
    int32 required_level = 5;
}

message EvolutionRequest {
    string target_form_id = 1;
}

message EvolutionResponse {
    bool success = 1;
    string error = 2;
    Evolution new_form = 3;
    PlayerEvolution player_evolution = 4;
}
```

---

## Stage System

The core gameplay loop is stage-based progression. Players battle through stages, defeating waves of enemies to progress.

### Stage Structure

```go
// server/internal/game/stage.go

type Stage struct {
    ID          string    `json:"id"`           // e.g., "1-1", "1-2", "I1-1" (Chapter-Stage)
    Chapter     int       `json:"chapter"`
    StageNum    int       `json:"stage_num"`
    Difficulty  string    `json:"difficulty"`   // "Normal", "Hard", "Hell"

    // Requirements
    MinPower    int64     `json:"min_power"`    // Recommended combat power
    MinLevel    int       `json:"min_level"`

    // Enemy waves
    Waves       []EnemyWave `json:"waves"`
    BossWave    *BossWave   `json:"boss_wave"`  // nil for normal stages

    // Rewards
    BaseExp     int64     `json:"base_exp"`
    BaseGold    int64     `json:"base_gold"`
    DropTable   []DropEntry `json:"drop_table"`
    FirstClearRewards []Reward `json:"first_clear_rewards"`
}

type EnemyWave struct {
    WaveNum     int           `json:"wave_num"`
    Enemies     []EnemySpawn  `json:"enemies"`
    SpawnDelay  time.Duration `json:"spawn_delay"`  // Time before wave starts
    WaveTimeout time.Duration `json:"wave_timeout"` // Auto-clear if exceeded
}

type EnemySpawn struct {
    EnemyID     string    `json:"enemy_id"`
    Count       int       `json:"count"`
    SpawnPattern string   `json:"spawn_pattern"` // "random", "circle", "line", "boss"
    EliteChance float32   `json:"elite_chance"`  // Chance to spawn as elite
}

type BossWave struct {
    BossID      string    `json:"boss_id"`
    Health      int64     `json:"health"`
    Enrage      time.Duration `json:"enrage_time"` // Boss enrages after this
    Mechanics   []string  `json:"mechanics"`     // Special boss mechanics
}
```

### Stage Progression

```go
// server/internal/game/stage_manager.go

type StageManager struct {
    CurrentStage  *Stage
    CurrentWave   int
    EnemiesAlive  int
    WaveTimer     time.Duration
    AutoProgress  bool           // Auto-advance to next stage on clear
    IdleMode      bool           // Reduced rewards, no manual input needed
}

type StageProgress struct {
    PlayerID       string `json:"player_id"`
    HighestStage   string `json:"highest_stage"`   // Furthest stage cleared
    CurrentStage   string `json:"current_stage"`   // Where player is now
    StageClears    map[string]int `json:"stage_clears"` // Times each stage cleared
    DailyClears    int    `json:"daily_clears"`
    LastClearTime  int64  `json:"last_clear_time"`
}

func (sm *StageManager) OnEnemyKilled(enemy *Enemy) {
    sm.EnemiesAlive--

    // Check wave clear
    if sm.EnemiesAlive <= 0 {
        sm.OnWaveClear()
    }
}

func (sm *StageManager) OnWaveClear() {
    sm.CurrentWave++

    if sm.CurrentWave >= len(sm.CurrentStage.Waves) {
        // Check for boss wave
        if sm.CurrentStage.BossWave != nil {
            sm.SpawnBoss()
        } else {
            sm.OnStageClear()
        }
    } else {
        sm.SpawnNextWave()
    }
}

func (sm *StageManager) OnStageClear() {
    // Calculate rewards
    rewards := sm.CalculateRewards()

    // Update progress
    sm.UpdateProgress()

    // Auto-progress if enabled
    if sm.AutoProgress {
        nextStage := sm.GetNextStage()
        if nextStage != nil {
            sm.StartStage(nextStage)
        }
    }
}

func (sm *StageManager) CalculateRewards() StageRewards {
    stage := sm.CurrentStage

    rewards := StageRewards{
        Exp:  stage.BaseExp,
        Gold: stage.BaseGold,
    }

    // Apply idle mode penalty (70% rewards)
    if sm.IdleMode {
        rewards.Exp = int64(float64(rewards.Exp) * 0.7)
        rewards.Gold = int64(float64(rewards.Gold) * 0.7)
    }

    // Roll drop table
    for _, drop := range stage.DropTable {
        if rand.Float32() < drop.Chance {
            rewards.Items = append(rewards.Items, drop.ItemID)
        }
    }

    return rewards
}
```

### Challenge Mode (Boss Rush)

```go
// Special stage type for boss encounters
type ChallengeMode struct {
    StageID       string
    TimeLimit     time.Duration
    AttemptsDaily int           // Limited attempts per day

    // Leaderboard
    FastestClear  time.Duration
    LowestDamage  int64
}

func (cm *ChallengeMode) OnBossKill(player *Player, clearTime time.Duration, damageTaken int64) {
    // Record for leaderboard
    if clearTime < cm.FastestClear {
        cm.FastestClear = clearTime
    }

    // Bonus rewards for performance
    var bonusMultiplier float32 = 1.0

    // Speed bonus
    if clearTime < 30*time.Second {
        bonusMultiplier += 0.5
    } else if clearTime < 60*time.Second {
        bonusMultiplier += 0.25
    }

    // No-hit bonus
    if damageTaken == 0 {
        bonusMultiplier += 1.0
    }
}
```

---

## Idle/AFK System

The game accumulates rewards while the player is offline or AFK. This is a core monetization and retention feature.

### AFK Rewards Calculation

```go
// server/internal/game/afk.go

type AFKRewards struct {
    PlayerID      string    `json:"player_id"`
    LastCollect   time.Time `json:"last_collect"`
    MaxAccumulate time.Duration `json:"max_accumulate"` // Default 12h, upgradeable

    // Current accumulated
    AccumulatedExp  int64 `json:"accumulated_exp"`
    AccumulatedGold int64 `json:"accumulated_gold"`
    AccumulatedItems []ItemDrop `json:"accumulated_items"`
}

type AFKConfig struct {
    BaseExpPerMinute   int64   `yaml:"base_exp_per_minute"`   // 100
    BaseGoldPerMinute  int64   `yaml:"base_gold_per_minute"`  // 50
    ItemDropInterval   time.Duration `yaml:"item_drop_interval"` // 30m
    MaxAccumulateHours int     `yaml:"max_accumulate_hours"`  // 12 (can upgrade to 24)

    // VIP bonuses
    VIPExpMultiplier   float32 `yaml:"vip_exp_multiplier"`    // 1.5x
    VIPGoldMultiplier  float32 `yaml:"vip_gold_multiplier"`   // 1.5x
}

func CalculateAFKRewards(player *Player, config AFKConfig) AFKRewards {
    lastCollect := player.AFKData.LastCollect
    now := time.Now()

    // Cap at max accumulate time
    maxDuration := time.Duration(config.MaxAccumulateHours) * time.Hour
    elapsed := now.Sub(lastCollect)
    if elapsed > maxDuration {
        elapsed = maxDuration
    }

    minutes := elapsed.Minutes()

    // Base rewards
    exp := int64(float64(config.BaseExpPerMinute) * minutes)
    gold := int64(float64(config.BaseGoldPerMinute) * minutes)

    // Apply stage multiplier (higher stages = better AFK rewards)
    stageMultiplier := GetStageMultiplier(player.Progress.HighestStage)
    exp = int64(float64(exp) * stageMultiplier)
    gold = int64(float64(gold) * stageMultiplier)

    // Apply VIP bonus
    if player.VIPLevel > 0 {
        exp = int64(float64(exp) * config.VIPExpMultiplier)
        gold = int64(float64(gold) * config.VIPGoldMultiplier)
    }

    // Calculate item drops
    items := []ItemDrop{}
    dropChances := int(elapsed / config.ItemDropInterval)
    for i := 0; i < dropChances; i++ {
        if drop := RollAFKDrop(player.Progress.HighestStage); drop != nil {
            items = append(items, *drop)
        }
    }

    return AFKRewards{
        PlayerID:         player.ID,
        LastCollect:      lastCollect,
        AccumulatedExp:   exp,
        AccumulatedGold:  gold,
        AccumulatedItems: items,
    }
}

func GetStageMultiplier(stageID string) float64 {
    // Parse chapter from stage ID (e.g., "5-10" -> chapter 5)
    chapter := ParseChapter(stageID)

    // Each chapter adds 10% bonus
    return 1.0 + (float64(chapter-1) * 0.1)
}
```

### Quick AFK Rewards (Premium Feature)

```go
// Allow players to instantly collect X hours of AFK rewards
type QuickAFKConfig struct {
    FreeClaimsDaily    int   `yaml:"free_claims_daily"`    // 1
    HoursPerClaim      int   `yaml:"hours_per_claim"`      // 2
    GemCostPerClaim    int   `yaml:"gem_cost_per_claim"`   // 50
    MaxClaimsDaily     int   `yaml:"max_claims_daily"`     // 5
}

func (s *AFKService) ClaimQuickRewards(playerID string, useGems bool) (*AFKRewards, error) {
    player := s.GetPlayer(playerID)

    // Check daily limit
    if player.QuickClaimsToday >= s.Config.MaxClaimsDaily {
        return nil, ErrMaxClaimsReached
    }

    // Check free claims or charge gems
    if player.FreeClaimsToday < s.Config.FreeClaimsDaily {
        player.FreeClaimsToday++
    } else if useGems {
        if player.Gems < s.Config.GemCostPerClaim {
            return nil, ErrInsufficientGems
        }
        player.Gems -= s.Config.GemCostPerClaim
    } else {
        return nil, ErrNoFreeClaims
    }

    // Calculate rewards for X hours
    duration := time.Duration(s.Config.HoursPerClaim) * time.Hour
    rewards := CalculateAFKRewardsForDuration(player, duration)

    player.QuickClaimsToday++
    return &rewards, nil
}
```

### Auto-Battle System

```go
// server/internal/game/auto_battle.go

type AutoBattleConfig struct {
    Enabled           bool    `json:"enabled"`
    UseSkillsAuto     bool    `json:"use_skills_auto"`
    SkillPriority     []string `json:"skill_priority"` // Order to use skills
    DodgeEnabled      bool    `json:"dodge_enabled"`   // Auto-dodge dangerous attacks
    TargetPriority    string  `json:"target_priority"` // "nearest", "lowest_hp", "highest_threat"
    AutoProgressStage bool    `json:"auto_progress"`   // Move to next stage on clear
    StopOnBoss        bool    `json:"stop_on_boss"`    // Pause auto for boss stages
}

type AutoBattleAI struct {
    Config     AutoBattleConfig
    Player     *Player
    SkillQueue []string
}

func (ai *AutoBattleAI) Update(dt float32, enemies []*Enemy) PlayerInput {
    input := PlayerInput{}

    if !ai.Config.Enabled {
        return input
    }

    // Find target
    target := ai.SelectTarget(enemies)
    if target == nil {
        return input
    }

    // Move towards or away from target based on range
    optimalRange := ai.GetOptimalRange()
    currentDist := ai.Player.Position.DistanceTo(target.Position)

    if currentDist > optimalRange+50 {
        // Move closer
        input.MoveDirection = target.Position.Sub(ai.Player.Position).Normalized()
    } else if currentDist < optimalRange-20 {
        // Move away (kiting)
        input.MoveDirection = ai.Player.Position.Sub(target.Position).Normalized()
    }

    // Auto-dodge dangerous attacks
    if ai.Config.DodgeEnabled {
        if dangerZone := ai.DetectDanger(enemies); dangerZone != nil {
            input.MoveDirection = ai.CalculateDodge(dangerZone)
        }
    }

    // Use skills
    if ai.Config.UseSkillsAuto {
        if skill := ai.SelectSkill(); skill != "" {
            input.SkillID = skill
        }
    }

    return input
}

func (ai *AutoBattleAI) SelectTarget(enemies []*Enemy) *Enemy {
    if len(enemies) == 0 {
        return nil
    }

    switch ai.Config.TargetPriority {
    case "nearest":
        return ai.FindNearest(enemies)
    case "lowest_hp":
        return ai.FindLowestHP(enemies)
    case "highest_threat":
        return ai.FindHighestThreat(enemies)
    default:
        return ai.FindNearest(enemies)
    }
}
```

---

## Monetization System

Heavy monetization with events always visible. All premium features should feel rewarding without being pay-to-win.

### Currency Types

```go
type Currency string

const (
    CurrencyGold     Currency = "gold"      // Primary soft currency
    CurrencyGems     Currency = "gems"      // Premium currency (IAP)
    CurrencyStamina  Currency = "stamina"   // Energy for dungeons
    CurrencyArena    Currency = "arena"     // Arena tokens
    CurrencyGuild    Currency = "guild"     // Guild contribution
)

type PlayerCurrencies struct {
    Gold        int64 `json:"gold"`
    Gems        int64 `json:"gems"`
    Stamina     int   `json:"stamina"`
    MaxStamina  int   `json:"max_stamina"`
    ArenaTokens int   `json:"arena_tokens"`
    GuildCoins  int   `json:"guild_coins"`
}
```

### Gacha System

```go
// server/internal/game/gacha.go

type GachaBanner struct {
    ID            string    `json:"id"`
    Name          string    `json:"name"`
    Type          string    `json:"type"`     // "standard", "limited", "collab"
    StartTime     time.Time `json:"start_time"`
    EndTime       time.Time `json:"end_time"`

    // Cost
    SinglePullCost  int     `json:"single_pull_cost"`  // Gems
    TenPullCost     int     `json:"ten_pull_cost"`     // Usually 10x - discount

    // Rates
    RateTable       []GachaRate `json:"rate_table"`
    PityThreshold   int     `json:"pity_threshold"`    // Guaranteed at X pulls
    SoftPityStart   int     `json:"soft_pity_start"`   // Increased rates start

    // Featured items
    FeaturedItems   []string `json:"featured_items"`
    FeaturedRate    float32  `json:"featured_rate"`    // Rate for featured vs standard
}

type GachaRate struct {
    Rarity      Rarity  `json:"rarity"`
    BaseRate    float32 `json:"base_rate"`    // e.g., 0.006 for 0.6%
    SoftPityAdd float32 `json:"soft_pity_add"` // Added per pull after soft pity
}

// Standard banner rates (example)
var StandardBannerRates = []GachaRate{
    {Rarity: RarityEternal, BaseRate: 0.001, SoftPityAdd: 0.005},   // 0.1%
    {Rarity: RarityAurous, BaseRate: 0.004, SoftPityAdd: 0.01},     // 0.4%
    {Rarity: RaritySupreme, BaseRate: 0.01, SoftPityAdd: 0.02},     // 1%
    {Rarity: RarityImmortal, BaseRate: 0.02, SoftPityAdd: 0.03},    // 2%
    {Rarity: RarityLegendary, BaseRate: 0.05, SoftPityAdd: 0.05},   // 5%
    {Rarity: RarityEpic, BaseRate: 0.10, SoftPityAdd: 0.0},         // 10%
    {Rarity: RarityMythic, BaseRate: 0.15, SoftPityAdd: 0.0},       // 15%
    {Rarity: RarityRare, BaseRate: 0.20, SoftPityAdd: 0.0},         // 20%
    // Remaining goes to lower rarities
}

func (g *GachaService) Pull(playerID string, bannerID string, count int) ([]GachaResult, error) {
    player := g.GetPlayer(playerID)
    banner := g.GetBanner(bannerID)

    // Check cost
    cost := banner.SinglePullCost * count
    if count == 10 {
        cost = banner.TenPullCost
    }

    if player.Gems < cost {
        return nil, ErrInsufficientGems
    }

    // Perform pulls
    results := []GachaResult{}
    for i := 0; i < count; i++ {
        result := g.SinglePull(player, banner)
        results = append(results, result)

        // Update pity counter
        player.UpdatePity(banner.ID, result.Rarity)
    }

    // Charge currency
    player.Gems -= cost

    return results, nil
}

func (g *GachaService) SinglePull(player *Player, banner *GachaBanner) GachaResult {
    pityCount := player.GetPity(banner.ID)

    // Check hard pity
    if pityCount >= banner.PityThreshold {
        return g.GuaranteedPull(banner)
    }

    // Calculate rates with soft pity
    rates := g.CalculateRates(banner, pityCount)

    // Roll
    roll := rand.Float32()
    cumulative := float32(0)

    for _, rate := range rates {
        cumulative += rate.EffectiveRate
        if roll < cumulative {
            return g.GenerateItem(banner, rate.Rarity)
        }
    }

    // Fallback to lowest rarity
    return g.GenerateItem(banner, RarityNormal)
}
```

### Daily/Weekly Events

```go
type Event struct {
    ID          string    `json:"id"`
    Type        EventType `json:"type"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    StartTime   time.Time `json:"start_time"`
    EndTime     time.Time `json:"end_time"`

    // Requirements
    Tasks       []EventTask `json:"tasks"`

    // Rewards
    Milestones  []EventMilestone `json:"milestones"`
}

type EventType string

const (
    EventTypeLogin     EventType = "login"       // Daily login rewards
    EventTypeSpending  EventType = "spending"    // Spend X gems
    EventTypeProgress  EventType = "progress"    // Clear X stages
    EventTypePvP       EventType = "pvp"         // Win X arena battles
    EventTypeCollect   EventType = "collect"     // Collect X items
    EventTypeLimited   EventType = "limited"     // Limited-time special
)

// Daily login calendar
type LoginCalendar struct {
    Month       int              `json:"month"`
    Year        int              `json:"year"`
    Rewards     []DailyReward    `json:"rewards"`
    Cumulative  []CumulativeReward `json:"cumulative"` // 7-day, 14-day, etc.
}

type DailyReward struct {
    Day     int      `json:"day"`
    Rewards []Reward `json:"rewards"`
    VIPOnly bool     `json:"vip_only"` // Bonus for VIP
}
```

### Battle Pass

```go
type BattlePass struct {
    SeasonID      string    `json:"season_id"`
    Name          string    `json:"name"`
    StartTime     time.Time `json:"start_time"`
    EndTime       time.Time `json:"end_time"`

    MaxLevel      int       `json:"max_level"`
    XPPerLevel    int       `json:"xp_per_level"`

    FreeRewards   []BPReward `json:"free_rewards"`
    PremiumRewards []BPReward `json:"premium_rewards"`

    PremiumPrice  int       `json:"premium_price"` // Gems
}

type BPReward struct {
    Level   int      `json:"level"`
    Rewards []Reward `json:"rewards"`
}

type PlayerBattlePass struct {
    PlayerID      string `json:"player_id"`
    SeasonID      string `json:"season_id"`
    CurrentLevel  int    `json:"current_level"`
    CurrentXP     int    `json:"current_xp"`
    IsPremium     bool   `json:"is_premium"`
    ClaimedFree   []int  `json:"claimed_free"`
    ClaimedPremium []int `json:"claimed_premium"`
}
```

---

## Collision System

### Collision Detection

```go
// server/internal/game/collision.go

type Collider interface {
    GetBounds() AABB
    GetPosition() Vector2
    GetRadius() float32
}

type AABB struct {
    Min Vector2
    Max Vector2
}

func CircleVsCircle(a, b Collider) bool {
    dist := a.GetPosition().DistanceTo(b.GetPosition())
    return dist < a.GetRadius()+b.GetRadius()
}

func CircleVsAABB(circle Collider, box AABB) bool {
    pos := circle.GetPosition()
    radius := circle.GetRadius()

    // Find closest point on AABB to circle
    closestX := clamp(pos.X, box.Min.X, box.Max.X)
    closestY := clamp(pos.Y, box.Min.Y, box.Max.Y)

    // Check distance
    distX := pos.X - closestX
    distY := pos.Y - closestY
    distSquared := distX*distX + distY*distY

    return distSquared < radius*radius
}

func Raycast(origin, direction Vector2, maxDist float32, walls []AABB) (hit bool, point Vector2, distance float32) {
    closestDist := maxDist

    for _, wall := range walls {
        if hitDist, ok := RayVsAABB(origin, direction, wall); ok {
            if hitDist < closestDist {
                closestDist = hitDist
                hit = true
            }
        }
    }

    point = origin.Add(direction.Scale(closestDist))
    distance = closestDist
    return
}
```

### Spatial Partitioning

```go
// Grid-based spatial hash for efficient collision detection
type SpatialHash struct {
    cellSize float32
    cells    map[int64][]Entity
}

func NewSpatialHash(cellSize float32) *SpatialHash {
    return &SpatialHash{
        cellSize: cellSize,
        cells:    make(map[int64][]Entity),
    }
}

func (sh *SpatialHash) Hash(pos Vector2) int64 {
    cellX := int64(pos.X / sh.cellSize)
    cellY := int64(pos.Y / sh.cellSize)
    return cellX<<32 | cellY
}

func (sh *SpatialHash) Insert(entity Entity) {
    pos := entity.GetPosition()
    hash := sh.Hash(pos)
    sh.cells[hash] = append(sh.cells[hash], entity)
}

func (sh *SpatialHash) Query(pos Vector2, radius float32) []Entity {
    results := make([]Entity, 0)

    // Check all cells that could contain entities within radius
    minX := int64((pos.X - radius) / sh.cellSize)
    maxX := int64((pos.X + radius) / sh.cellSize)
    minY := int64((pos.Y - radius) / sh.cellSize)
    maxY := int64((pos.Y + radius) / sh.cellSize)

    for x := minX; x <= maxX; x++ {
        for y := minY; y <= maxY; y++ {
            hash := x<<32 | y
            if entities, ok := sh.cells[hash]; ok {
                results = append(results, entities...)
            }
        }
    }

    return results
}

func (sh *SpatialHash) Clear() {
    sh.cells = make(map[int64][]Entity)
}
```

---

## Map System

### Map Definition

```go
// server/internal/game/map.go

type GameMap struct {
    ID          string
    Name        string
    Width       int
    Height      int

    // Collision
    Walls       []AABB
    Obstacles   []Obstacle

    // Spawning
    SpawnPoints []Vector2
    TeamSpawns  map[int][]Vector2
    ItemSpawns  []ItemSpawn

    // Navigation (for AI/pathfinding)
    NavGrid     *NavGrid
}

type Obstacle struct {
    Position    Vector2
    Radius      float32
    Destructible bool
    Health      int
}

type ItemSpawn struct {
    Position    Vector2
    ItemPool    []string
    RespawnTime time.Duration
    LastSpawn   time.Time
}

func (m *GameMap) CollidesWithWall(pos Vector2, radius float32) bool {
    circle := &SimpleCollider{Pos: pos, Rad: radius}

    for _, wall := range m.Walls {
        if CircleVsAABB(circle, wall) {
            return true
        }
    }

    for _, obs := range m.Obstacles {
        if pos.DistanceTo(obs.Position) < radius+obs.Radius {
            return true
        }
    }

    return false
}

func (m *GameMap) GetSpawnPoints() []Vector2 {
    return m.SpawnPoints
}

func (m *GameMap) GetTeamSpawnPoints(team int) []Vector2 {
    if spawns, ok := m.TeamSpawns[team]; ok {
        return spawns
    }
    return m.SpawnPoints
}
```

### Example Map Data

```json
{
    "id": "arena_01",
    "name": "Crystal Arena",
    "width": 1920,
    "height": 1080,
    "walls": [
        {"min": {"x": 0, "y": 0}, "max": {"x": 1920, "y": 50}},
        {"min": {"x": 0, "y": 1030}, "max": {"x": 1920, "y": 1080}},
        {"min": {"x": 0, "y": 0}, "max": {"x": 50, "y": 1080}},
        {"min": {"x": 1870, "y": 0}, "max": {"x": 1920, "y": 1080}}
    ],
    "obstacles": [
        {"position": {"x": 960, "y": 540}, "radius": 100, "destructible": false},
        {"position": {"x": 400, "y": 300}, "radius": 50, "destructible": true, "health": 100},
        {"position": {"x": 1520, "y": 780}, "radius": 50, "destructible": true, "health": 100}
    ],
    "spawn_points": [
        {"x": 200, "y": 200},
        {"x": 1720, "y": 200},
        {"x": 200, "y": 880},
        {"x": 1720, "y": 880},
        {"x": 960, "y": 200},
        {"x": 960, "y": 880},
        {"x": 200, "y": 540},
        {"x": 1720, "y": 540}
    ],
    "team_spawns": {
        "0": [
            {"x": 200, "y": 200},
            {"x": 200, "y": 540},
            {"x": 200, "y": 880}
        ],
        "1": [
            {"x": 1720, "y": 200},
            {"x": 1720, "y": 540},
            {"x": 1720, "y": 880}
        ]
    },
    "item_spawns": [
        {"position": {"x": 960, "y": 300}, "items": ["health_pack", "mana_pack"], "respawn": 30},
        {"position": {"x": 960, "y": 780}, "items": ["health_pack", "mana_pack"], "respawn": 30},
        {"position": {"x": 480, "y": 540}, "items": ["damage_boost"], "respawn": 60},
        {"position": {"x": 1440, "y": 540}, "items": ["speed_boost"], "respawn": 60}
    ]
}
```

---

## Next Section

Continue to [V. Database Schema](#v-database-schema) for data persistence.

---

# V. Database Schema

## Overview

The game uses a hybrid persistence approach:
- **Redis**: Session data, real-time state, caching, leaderboards
- **MySQL/PostgreSQL**: Persistent player data, inventory, match history

---

## Redis Schema

### Session Data

```redis
# Active session
session:{session_id} -> HASH
    player_id: string
    server_id: string
    connected_at: timestamp
    last_active: timestamp
    state: "lobby" | "in_room" | "in_game"
    room_id: string (optional)

# TTL: 1 hour, refreshed on activity
EXPIRE session:{session_id} 3600

# Player to session mapping
player_session:{player_id} -> STRING session_id
```

### Room State

```redis
# Active room
room:{room_id} -> HASH
    name: string
    host_id: string
    game_mode: string
    map_id: string
    state: "waiting" | "countdown" | "running" | "finished"
    max_players: int
    created_at: timestamp
    started_at: timestamp

# Room players (ordered set by join time)
room_players:{room_id} -> ZSET
    member: player_id
    score: join_timestamp

# Room list for lobby (sorted by creation time)
rooms:lobby -> ZSET
    member: room_id
    score: created_at
```

### Arena Data

```redis
# Arena leaderboard (ELO-based rankings)
arena:leaderboard -> ZSET
    member: player_id
    score: elo_rating

# Player arena state
arena:player:{player_id} -> HASH
    elo: int
    rank: int
    attempts_remaining: int
    last_attempt_refresh: timestamp
    season_wins: int
    season_losses: int

# Player defense build (cached for fast lookup)
arena:defense:{player_id} -> STRING (JSON)
    # DefenseBuild protobuf as JSON

# Arena battle log (recent battles per player)
arena:battles:{player_id} -> LIST
    # Recent battle IDs (capped at 50)

# Arena season info
arena:season -> HASH
    season_id: int
    start_time: timestamp
    end_time: timestamp
```

### Leaderboards

```redis
# Global leaderboards
leaderboard:power -> ZSET
    member: player_id
    score: combat_power

leaderboard:level -> ZSET
    member: player_id
    score: level

leaderboard:arena -> ZSET
    member: player_id
    score: total_wins

# Seasonal leaderboards
leaderboard:season:{season_id}:rating -> ZSET
```

### Rate Limiting

```redis
# Rate limit per action
ratelimit:{player_id}:{action} -> STRING count
EXPIRE ratelimit:{player_id}:{action} 60

# Example: chat messages
ratelimit:player123:chat -> "5"  # 5 messages this minute
```

---

## MySQL/PostgreSQL Schema

### Players Table

```sql
CREATE TABLE players (
    id              VARCHAR(36) PRIMARY KEY,  -- UUID
    username        VARCHAR(32) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255),

    -- Guest accounts
    is_guest        BOOLEAN DEFAULT FALSE,
    guest_token     VARCHAR(255),
    device_id       VARCHAR(255),

    -- Profile
    avatar_id       VARCHAR(36),
    title           VARCHAR(64),

    -- Progression
    level           INT DEFAULT 1,
    experience      BIGINT DEFAULT 0,
    skill_points    INT DEFAULT 0,

    -- Currency
    gold            BIGINT DEFAULT 0,
    gems            BIGINT DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login      TIMESTAMP,

    -- Status
    is_banned       BOOLEAN DEFAULT FALSE,
    ban_reason      TEXT,
    ban_expires     TIMESTAMP,

    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_guest_token (guest_token),
    INDEX idx_level (level)
);
```

### Player Stats Table

```sql
CREATE TABLE player_stats (
    player_id       VARCHAR(36) PRIMARY KEY,

    -- Match stats
    games_played    INT DEFAULT 0,
    games_won       INT DEFAULT 0,
    games_lost      INT DEFAULT 0,

    -- Combat stats
    kills           INT DEFAULT 0,
    deaths          INT DEFAULT 0,
    assists         INT DEFAULT 0,
    damage_dealt    BIGINT DEFAULT 0,
    damage_taken    BIGINT DEFAULT 0,
    healing_done    BIGINT DEFAULT 0,

    -- Records
    highest_kills   INT DEFAULT 0,
    highest_streak  INT DEFAULT 0,
    longest_game    INT DEFAULT 0,  -- seconds

    -- Rating
    rating          INT DEFAULT 1000,
    peak_rating     INT DEFAULT 1000,

    -- Time
    play_time       BIGINT DEFAULT 0,  -- seconds

    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

### Inventory Table

```sql
CREATE TABLE inventory (
    id              VARCHAR(36) PRIMARY KEY,
    player_id       VARCHAR(36) NOT NULL,
    template_id     VARCHAR(36) NOT NULL,

    -- Item properties
    quantity        INT DEFAULT 1,
    level           INT DEFAULT 1,
    rarity          TINYINT DEFAULT 0,

    -- Stats (JSON for flexibility)
    base_stats      JSON,
    bonus_stats     JSON,

    -- Equipment state
    is_equipped     BOOLEAN DEFAULT FALSE,
    equip_slot      TINYINT,

    -- Timestamps
    acquired_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player (player_id),
    INDEX idx_template (template_id),
    INDEX idx_equipped (player_id, is_equipped)
);
```

### Item Templates Table

```sql
CREATE TABLE item_templates (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(64) NOT NULL,
    description     TEXT,
    category        VARCHAR(32) NOT NULL,  -- weapon, armor, consumable, etc.

    -- Equipment
    slot            TINYINT,
    weapon_type     TINYINT,

    -- Base stats
    base_stats      JSON,

    -- Requirements
    required_level  INT DEFAULT 1,

    -- Rarity weights for drops
    rarity_weights  JSON,  -- {"common": 70, "uncommon": 20, "rare": 8, "epic": 2}

    -- Flags
    is_tradeable    BOOLEAN DEFAULT TRUE,
    is_consumable   BOOLEAN DEFAULT FALSE,
    stack_limit     INT DEFAULT 1,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_slot (slot)
);
```

### Skills Table

```sql
CREATE TABLE player_skills (
    player_id       VARCHAR(36) NOT NULL,
    skill_id        VARCHAR(36) NOT NULL,

    -- Skill state
    is_unlocked     BOOLEAN DEFAULT FALSE,
    level           INT DEFAULT 1,

    -- Equipped slots (0-3)
    equipped_slot   TINYINT,

    unlocked_at     TIMESTAMP,

    PRIMARY KEY (player_id, skill_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

### Arena Battle History Table

```sql
CREATE TABLE arena_battles (
    id              VARCHAR(36) PRIMARY KEY,

    -- Participants
    attacker_id     VARCHAR(36) NOT NULL,
    defender_id     VARCHAR(36) NOT NULL,

    -- Results
    attacker_won    BOOLEAN NOT NULL,

    -- ELO changes
    attacker_elo_before   INT NOT NULL,
    attacker_elo_after    INT NOT NULL,
    defender_elo_before   INT NOT NULL,
    defender_elo_after    INT NOT NULL,

    -- Battle data
    battle_duration INT NOT NULL,           -- milliseconds
    replay_data     MEDIUMBLOB,             -- compressed replay for playback

    -- Timing
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Season tracking
    season_id       INT NOT NULL,

    FOREIGN KEY (attacker_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (defender_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_attacker (attacker_id, created_at),
    INDEX idx_defender (defender_id, created_at),
    INDEX idx_season (season_id)
);

-- Player arena stats (per season)
CREATE TABLE arena_stats (
    player_id       VARCHAR(36) NOT NULL,
    season_id       INT NOT NULL,

    -- Current state
    elo             INT DEFAULT 1000,
    highest_elo     INT DEFAULT 1000,
    current_rank    INT,
    highest_rank    INT,

    -- Statistics
    attack_wins     INT DEFAULT 0,
    attack_losses   INT DEFAULT 0,
    defense_wins    INT DEFAULT 0,
    defense_losses  INT DEFAULT 0,

    -- Rewards claimed
    daily_reward_claimed    DATE,
    weekly_reward_claimed   DATE,

    PRIMARY KEY (player_id, season_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_elo (season_id, elo DESC),
    INDEX idx_rank (season_id, current_rank)
);

-- Player defense builds
CREATE TABLE arena_defense_builds (
    player_id       VARCHAR(36) PRIMARY KEY,

    character_id    VARCHAR(36) NOT NULL,
    skill_ids       JSON NOT NULL,          -- Array of skill IDs
    equipment_ids   JSON NOT NULL,          -- Array of equipment IDs
    rune_ids        JSON,                   -- Array of rune IDs

    total_power     BIGINT NOT NULL,

    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

### Friends & Social

```sql
CREATE TABLE friendships (
    player_id       VARCHAR(36) NOT NULL,
    friend_id       VARCHAR(36) NOT NULL,

    status          ENUM('pending', 'accepted', 'blocked') NOT NULL,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at     TIMESTAMP,

    PRIMARY KEY (player_id, friend_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_friend (friend_id)
);

```

### Transactions & Purchases

```sql
CREATE TABLE transactions (
    id              VARCHAR(36) PRIMARY KEY,
    player_id       VARCHAR(36) NOT NULL,

    -- Type
    type            ENUM('purchase', 'reward', 'trade', 'refund') NOT NULL,

    -- Currency changes
    gold_change     BIGINT DEFAULT 0,
    gems_change     BIGINT DEFAULT 0,

    -- Item changes
    items_added     JSON,  -- [{template_id, quantity}]
    items_removed   JSON,

    -- Metadata
    description     VARCHAR(255),
    reference_id    VARCHAR(36),  -- Order ID, match ID, etc.

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id) REFERENCES players(id),
    INDEX idx_player (player_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
);

CREATE TABLE shop_purchases (
    id              VARCHAR(36) PRIMARY KEY,
    player_id       VARCHAR(36) NOT NULL,

    -- Purchase details
    product_id      VARCHAR(36) NOT NULL,
    price_gems      INT,
    price_gold      INT,
    price_real      DECIMAL(10,2),
    currency        VARCHAR(3),  -- USD, EUR, etc.

    -- Platform
    platform        VARCHAR(32),  -- web, ios, android
    receipt_id      VARCHAR(255),

    -- Status
    status          ENUM('pending', 'completed', 'refunded', 'failed') NOT NULL,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,

    FOREIGN KEY (player_id) REFERENCES players(id),
    INDEX idx_player (player_id),
    INDEX idx_status (status)
);
```

### Seasons & Battle Pass

```sql
CREATE TABLE seasons (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(64) NOT NULL,

    starts_at       TIMESTAMP NOT NULL,
    ends_at         TIMESTAMP NOT NULL,

    -- Rewards configuration
    free_rewards    JSON,
    premium_rewards JSON,
    max_level       INT DEFAULT 100,

    is_active       BOOLEAN DEFAULT FALSE
);

CREATE TABLE player_seasons (
    player_id       VARCHAR(36) NOT NULL,
    season_id       INT NOT NULL,

    -- Progress
    level           INT DEFAULT 1,
    experience      INT DEFAULT 0,

    -- Premium
    has_premium     BOOLEAN DEFAULT FALSE,
    premium_purchased_at TIMESTAMP,

    -- Claimed rewards (bitmask or JSON)
    claimed_free    JSON,  -- [1, 2, 3, 5, ...]
    claimed_premium JSON,

    PRIMARY KEY (player_id, season_id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id)
);
```

---

## Data Access Patterns

### Repository Pattern

```go
// Repository interfaces
type PlayerRepository interface {
    Create(player *Player) error
    GetByID(id string) (*Player, error)
    GetByUsername(username string) (*Player, error)
    Update(player *Player) error
    Delete(id string) error
}

type InventoryRepository interface {
    GetByPlayer(playerID string) ([]*Item, error)
    AddItem(playerID string, item *Item) error
    RemoveItem(itemID string) error
    UpdateItem(item *Item) error
    EquipItem(playerID, itemID string, slot int) error
}

type MatchRepository interface {
    Create(match *Match) error
    GetByID(id string) (*Match, error)
    GetByPlayer(playerID string, limit, offset int) ([]*Match, error)
    AddPlayerResult(matchID string, result *PlayerMatchResult) error
}
```

### Caching Strategy

```go
// Cache-aside pattern
func (r *CachedPlayerRepo) GetByID(id string) (*Player, error) {
    // Try cache first
    cacheKey := fmt.Sprintf("player:%s", id)
    cached, err := r.redis.Get(cacheKey)
    if err == nil {
        var player Player
        json.Unmarshal([]byte(cached), &player)
        return &player, nil
    }

    // Cache miss - fetch from DB
    player, err := r.db.GetByID(id)
    if err != nil {
        return nil, err
    }

    // Store in cache
    data, _ := json.Marshal(player)
    r.redis.SetEX(cacheKey, string(data), 5*time.Minute)

    return player, nil
}

// Cache invalidation
func (r *CachedPlayerRepo) Update(player *Player) error {
    // Update DB
    if err := r.db.Update(player); err != nil {
        return err
    }

    // Invalidate cache
    cacheKey := fmt.Sprintf("player:%s", player.ID)
    r.redis.Del(cacheKey)

    return nil
}
```

---

## Migrations

```sql
-- migrations/001_initial.up.sql
CREATE TABLE players ( ... );
CREATE TABLE player_stats ( ... );
CREATE TABLE inventory ( ... );

-- migrations/001_initial.down.sql
DROP TABLE inventory;
DROP TABLE player_stats;
DROP TABLE players;

-- migrations/002_add_seasons.up.sql
CREATE TABLE seasons ( ... );
CREATE TABLE player_seasons ( ... );

-- migrations/002_add_seasons.down.sql
DROP TABLE player_seasons;
DROP TABLE seasons;
```

---

## Backup & Recovery

```yaml
# Backup schedule
backup:
  mysql:
    full:
      schedule: "0 0 * * *"  # Daily at midnight
      retention: 30          # Keep 30 days
    incremental:
      schedule: "0 */4 * * *"  # Every 4 hours
      retention: 7

  redis:
    rdb:
      schedule: "0 */1 * * *"  # Hourly
      retention: 24
    aof:
      enabled: true
      fsync: everysec
```

---

# VI. Infrastructure

## Overview

Production deployment uses containerized services with orchestration for scaling, monitoring, and reliability.

---

## Architecture Diagram

```
                                    ┌─────────────────────┐
                                    │    Cloudflare CDN   │
                                    │   (WebGL Assets)    │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   Load Balancer     │
                                    │   (nginx / HAProxy) │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
          ┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
          │   Gate Server 1   │     │   Gate Server 2   │     │   Gate Server N   │
          │   (WebSocket)     │     │   (WebSocket)     │     │   (WebSocket)     │
          └─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │        NATS         │
                                    │   (Message Broker)  │
                                    └──────────┬──────────┘
                                               │
          ┌────────────────────────────────────┼────────────────────────────────────┐
          │                          │                   │                          │
┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌───▼───┐     ┌─────────────────▼─────────────────┐
│   Game Server 1   │     │   Game Server N   │     │ Match │     │         Data Services             │
│   (Rooms)         │     │   (Rooms)         │     │Server │     │  ┌───────────┐  ┌──────────────┐  │
└───────────────────┘     └───────────────────┘     └───────┘     │  │   Redis   │  │ MySQL/Postgres│  │
                                                                   │  │  Cluster  │  │   Primary +   │  │
                                                                   │  └───────────┘  │   Replicas    │  │
                                                                   │                 └──────────────┘  │
                                                                   └───────────────────────────────────┘
```

---

## Docker Configuration

### Server Dockerfile

```dockerfile
# Dockerfile.server
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server ./cmd/gate

# Runtime
FROM alpine:3.18

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /bin/server /bin/server
COPY configs/ /etc/game/

EXPOSE 3000

ENTRYPOINT ["/bin/server"]
CMD ["--config", "/etc/game/gate.yaml"]
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  gate:
    build:
      context: ./server
      dockerfile: Dockerfile.server
    ports:
      - "3000:3000"
    environment:
      - SERVER_TYPE=gate
      - NATS_URL=nats://nats:4222
      - REDIS_URL=redis:6379
    depends_on:
      - nats
      - redis

  game:
    build:
      context: ./server
      dockerfile: Dockerfile.server
    command: ["--config", "/etc/game/game.yaml"]
    environment:
      - SERVER_TYPE=game
      - NATS_URL=nats://nats:4222
      - REDIS_URL=redis:6379
    depends_on:
      - nats
      - redis
    deploy:
      replicas: 2

  arena:
    build:
      context: ./server
      dockerfile: Dockerfile.server
    command: ["--config", "/etc/game/arena.yaml"]
    environment:
      - SERVER_TYPE=arena
      - NATS_URL=nats://nats:4222
      - REDIS_URL=redis:6379
    depends_on:
      - nats
      - redis

  nats:
    image: nats:2.10-alpine
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["--jetstream", "--http_port", "8222"]

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: ["redis-server", "--appendonly", "yes"]

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: devpassword
      MYSQL_DATABASE: game_db
    volumes:
      - mysql_data:/var/lib/mysql
      - ./server/pkg/db/migrations:/docker-entrypoint-initdb.d

  prometheus:
    image: prom/prometheus:v2.45.0
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  redis_data:
  mysql_data:
  grafana_data:
```

---

## Kubernetes Deployment

### Gate Server Deployment

```yaml
# k8s/gate-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gate-server
  labels:
    app: game
    component: gate
spec:
  replicas: 3
  selector:
    matchLabels:
      app: game
      component: gate
  template:
    metadata:
      labels:
        app: game
        component: gate
    spec:
      containers:
      - name: gate
        image: game-server:latest
        args: ["--config", "/etc/game/gate.yaml"]
        ports:
        - containerPort: 3000
          name: websocket
        - containerPort: 9090
          name: metrics
        env:
        - name: NATS_URL
          valueFrom:
            configMapKeyRef:
              name: game-config
              key: nats_url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: game-secrets
              key: redis_url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 9090
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /etc/game
      volumes:
      - name: config
        configMap:
          name: gate-config
---
apiVersion: v1
kind: Service
metadata:
  name: gate-service
spec:
  selector:
    app: game
    component: gate
  ports:
  - port: 3000
    targetPort: 3000
    name: websocket
  type: ClusterIP
```

### Game Server StatefulSet

```yaml
# k8s/game-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: game-server
spec:
  serviceName: "game-server"
  replicas: 5
  selector:
    matchLabels:
      app: game
      component: game
  template:
    metadata:
      labels:
        app: game
        component: game
    spec:
      containers:
      - name: game
        image: game-server:latest
        args: ["--config", "/etc/game/game.yaml"]
        ports:
        - containerPort: 3100
          name: grpc
        env:
        - name: SERVER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gate-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gate-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: active_connections
      target:
        type: AverageValue
        averageValue: 5000
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: game-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$remote_addr"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - game.example.com
    secretName: game-tls
  rules:
  - host: game.example.com
    http:
      paths:
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: gate-service
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webgl-service
            port:
              number: 80
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'

    - name: Run tests
      run: |
        cd server
        go test -v -race -coverprofile=coverage.out ./...

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./server/coverage.out

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4

    - name: Log in to registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        context: ./server
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/gate-server \
          gate=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubectl set image statefulset/game-server \
          game=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubectl rollout status deployment/gate-server
        kubectl rollout status statefulset/game-server
```

### Unity WebGL Build

```yaml
# .github/workflows/build-client.yml
name: Build Unity Client

on:
  push:
    branches: [main]
    paths:
      - 'client/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Cache Unity Library
      uses: actions/cache@v3
      with:
        path: client/Library
        key: Library-${{ hashFiles('client/Assets/**', 'client/Packages/**', 'client/ProjectSettings/**') }}
        restore-keys: |
          Library-

    - name: Build WebGL
      uses: game-ci/unity-builder@v4
      env:
        UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
      with:
        projectPath: client
        targetPlatform: WebGL
        buildName: Game

    - name: Upload to S3/CDN
      uses: jakejarvis/s3-sync-action@master
      with:
        args: --acl public-read --delete
      env:
        AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        SOURCE_DIR: 'build/WebGL'
```

---

## Monitoring & Observability

### Prometheus Configuration

```yaml
# infrastructure/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gate-servers'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_component]
        regex: gate
        action: keep
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: '${1}:9090'

  - job_name: 'game-servers'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_component]
        regex: game
        action: keep
```

### Key Metrics

```go
// Prometheus metrics
var (
    ActiveConnections = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "game_active_connections",
        Help: "Number of active WebSocket connections",
    })

    ActiveRooms = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "game_active_rooms",
        Help: "Number of active game rooms",
    })

    PacketsReceived = prometheus.NewCounterVec(prometheus.CounterOpts{
        Name: "game_packets_received_total",
        Help: "Total packets received by opcode",
    }, []string{"opcode"})

    PacketLatency = prometheus.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "game_packet_latency_seconds",
        Help:    "Packet processing latency",
        Buckets: prometheus.ExponentialBuckets(0.001, 2, 10),
    }, []string{"opcode"})

    ArenaBattlesTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
        Name: "game_arena_battles_total",
        Help: "Total arena battles completed",
    }, []string{"result"})  // result: "attacker_win", "defender_win"

    ArenaLeaderboardSize = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "game_arena_leaderboard_size",
        Help: "Number of players in arena leaderboard",
    })
)
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Game Server Overview",
    "panels": [
      {
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(game_active_connections)"
          }
        ]
      },
      {
        "title": "Active Rooms",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(game_active_rooms)"
          }
        ]
      },
      {
        "title": "Packet Latency (p99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(game_packet_latency_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Arena Battles",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(game_arena_battles_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# infrastructure/alerts.yml
groups:
- name: game-alerts
  rules:
  - alert: HighConnectionCount
    expr: game_active_connections > 8000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High connection count on {{ $labels.instance }}"
      description: "Connection count is {{ $value }}"

  - alert: HighPacketLatency
    expr: histogram_quantile(0.99, rate(game_packet_latency_seconds_bucket[5m])) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High packet latency detected"
      description: "P99 latency is {{ $value }}s"

  - alert: GameServerDown
    expr: up{job="game-servers"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Game server {{ $labels.instance }} is down"

  - alert: ArenaBattleFailures
    expr: rate(game_arena_battles_total{result="error"}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Arena battle failures detected"
      description: "Error rate: {{ $value }} per second"
```

---

## Cost Estimation (Cloud)

| Service | Specs | Monthly Cost |
|---------|-------|--------------|
| **Gate Servers** (3x) | 2 vCPU, 4GB RAM | ~$150 |
| **Game Servers** (5x) | 4 vCPU, 8GB RAM | ~$400 |
| **Arena Server** (1x) | 2 vCPU, 4GB RAM | ~$50 |
| **Redis Cluster** | 3 nodes, 4GB each | ~$200 |
| **MySQL** | 4 vCPU, 16GB RAM + replica | ~$300 |
| **Load Balancer** | Application LB | ~$30 |
| **CDN** | 100GB transfer | ~$20 |
| **Monitoring** | Prometheus + Grafana | ~$50 |
| **Total** | | **~$1,200/mo** |

For 10,000 concurrent players. Scale linearly for higher loads.

---

# VII. Assets & Content

## Overview

This section defines the art style, asset specifications, audio requirements, UI/UX patterns, and content pipeline for creating a cohesive visual and audio experience.

---

## Art Style Guide

### Visual Identity

```
Style: Cute/Chibi 2D with soft gradients and vibrant colors
Inspiration: Legend of Mushroom, casual mobile RPGs
Target: Mobile-first, works on WebGL

Color Palette:
┌─────────────────────────────────────────────────────────────┐
│ Primary Colors                                               │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│ Slime Blue  │ Slime Green │ Slime Pink  │ Slime Purple       │
│ #4FC3F7     │ #81C784     │ #F48FB1     │ #B39DDB            │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│ UI Colors                                                    │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│ Gold        │ Silver      │ Bronze      │ Exp Green          │
│ #FFD700     │ #C0C0C0     │ #CD7F32     │ #4CAF50            │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│ Rarity Colors                                                │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│ Common      │ Uncommon    │ Rare        │ Epic               │
│ #9E9E9E     │ #4CAF50     │ #2196F3     │ #9C27B0            │
├─────────────┬─────────────┴─────────────┴─────────────────────┤
│ Legendary   │ Mythic                                         │
│ #FF9800     │ #E91E63                                        │
└─────────────┴─────────────────────────────────────────────────┘
```

### Character Design Guidelines

```
Slime Characters:
- Round, bouncy body shape
- 2-3 head proportions (chibi style)
- Expressive, large eyes
- Simple limb designs (optional arms/legs)
- Clear silhouettes at small sizes
- Color variations per skin/type

Enemy Design:
- Distinct silhouettes from player slimes
- Increasing complexity with difficulty
- Color coding for element/type
- Attack telegraphing through visual cues
- Death animations that feel satisfying

Boss Design:
- 2-4x larger than regular enemies
- Multiple attack phases with visual changes
- Weak point indicators
- Health bar segmentation visuals
```

---

## Sprite Specifications

### Resolution Standards

```csharp
public static class SpriteSpecs
{
    // Base unit size (1 Unity unit = 64 pixels)
    public const int PixelsPerUnit = 64;

    // Character sprites
    public static class Character
    {
        public const int Width = 128;      // 2 units
        public const int Height = 128;     // 2 units
        public const int IdleFrames = 4;
        public const int WalkFrames = 6;
        public const int AttackFrames = 8;
        public const int DeathFrames = 6;
        public const int FrameRate = 12;   // FPS
    }

    // Enemy sprites
    public static class Enemy
    {
        public const int SmallSize = 64;   // 1 unit
        public const int MediumSize = 128; // 2 units
        public const int LargeSize = 256;  // 4 units
        public const int BossSize = 512;   // 8 units
    }

    // Projectile sprites
    public static class Projectile
    {
        public const int Small = 32;       // 0.5 units
        public const int Medium = 64;      // 1 unit
        public const int Large = 128;      // 2 units
    }

    // UI sprites
    public static class UI
    {
        public const int IconSmall = 32;
        public const int IconMedium = 64;
        public const int IconLarge = 128;
        public const int ButtonHeight = 48;
    }

    // Tile sprites
    public static class Tiles
    {
        public const int Size = 64;        // 1 unit
        public const int AutoTileSet = 47; // Blob tileset
    }

    // Effect sprites
    public static class Effects
    {
        public const int Small = 64;
        public const int Medium = 128;
        public const int Large = 256;
        public const int FrameRate = 24;   // FPS for VFX
    }
}
```

### Sprite Atlas Organization

```
Assets/
└── Sprites/
    ├── Atlases/
    │   ├── Characters.spriteatlas
    │   ├── Enemies.spriteatlas
    │   ├── Projectiles.spriteatlas
    │   ├── Effects.spriteatlas
    │   ├── UI.spriteatlas
    │   └── Environment.spriteatlas
    ├── Characters/
    │   ├── Slime_Blue/
    │   │   ├── Idle.png
    │   │   ├── Walk.png
    │   │   ├── Attack.png
    │   │   ├── Skill.png
    │   │   └── Death.png
    │   ├── Slime_Green/
    │   └── Slime_Pink/
    ├── Enemies/
    │   ├── Common/
    │   ├── Elite/
    │   └── Boss/
    ├── Projectiles/
    │   ├── Physical/
    │   ├── Fire/
    │   ├── Ice/
    │   ├── Lightning/
    │   └── Poison/
    ├── Effects/
    │   ├── Hit/
    │   ├── Buff/
    │   ├── Debuff/
    │   ├── Heal/
    │   └── Level/
    ├── UI/
    │   ├── Buttons/
    │   ├── Icons/
    │   ├── Frames/
    │   ├── Bars/
    │   └── Panels/
    └── Environment/
        ├── Tilesets/
        ├── Props/
        └── Backgrounds/
```

### Sprite Import Settings

```csharp
// Editor script for consistent sprite imports
public class SpriteImportSettings : AssetPostprocessor
{
    void OnPreprocessTexture()
    {
        TextureImporter importer = (TextureImporter)assetImporter;

        if (assetPath.Contains("Sprites/"))
        {
            importer.textureType = TextureImporterType.Sprite;
            importer.spritePixelsPerUnit = 64;
            importer.filterMode = FilterMode.Point; // Pixel art
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.maxTextureSize = 2048;

            // Disable mipmaps for 2D sprites
            importer.mipmapEnabled = false;

            // Set sprite packing tag
            if (assetPath.Contains("Characters/"))
                importer.spritePackingTag = "Characters";
            else if (assetPath.Contains("Enemies/"))
                importer.spritePackingTag = "Enemies";
            else if (assetPath.Contains("UI/"))
                importer.spritePackingTag = "UI";
        }
    }
}
```

---

## Animation Specifications

### Animation Controller Structure

```
AnimatorControllers/
├── SlimeController.controller
│   ├── States:
│   │   ├── Idle (default)
│   │   ├── Walk
│   │   ├── Attack
│   │   ├── Skill
│   │   ├── Hit
│   │   └── Death
│   ├── Parameters:
│   │   ├── Speed (float)
│   │   ├── IsAttacking (bool)
│   │   ├── SkillIndex (int)
│   │   ├── IsHit (bool)
│   │   └── IsDead (bool)
│   └── Transitions:
│       ├── Idle <-> Walk (Speed threshold)
│       ├── Any -> Attack (trigger)
│       ├── Any -> Hit (trigger)
│       └── Any -> Death (trigger)
```

### Animation Timing

```csharp
public static class AnimationTiming
{
    // Character animations
    public static class Character
    {
        public const float IdleDuration = 0.5f;      // 4 frames @ 12fps
        public const float WalkCycle = 0.5f;         // 6 frames @ 12fps
        public const float AttackDuration = 0.33f;   // 4 frames @ 12fps
        public const float SkillDuration = 0.5f;     // 6 frames @ 12fps
        public const float HitDuration = 0.167f;     // 2 frames @ 12fps
        public const float DeathDuration = 0.5f;     // 6 frames @ 12fps
    }

    // Attack timing for hit detection
    public static class AttackFrames
    {
        // Frame at which damage should be applied (0-indexed)
        public const int MeleeHitFrame = 2;      // Middle of attack
        public const int RangedReleaseFrame = 1; // Early release
        public const int SkillActivateFrame = 3; // After windup
    }

    // Effect animations
    public static class Effects
    {
        public const float HitFlash = 0.1f;
        public const float DamageNumber = 1.0f;
        public const float BuffIcon = 0.5f;
        public const float LevelUp = 2.0f;
        public const float DeathPoof = 0.3f;
    }
}
```

### Animation Events

```csharp
// Animation event handlers
public class SlimeAnimationEvents : MonoBehaviour
{
    public event Action OnAttackHit;
    public event Action OnSkillActivate;
    public event Action OnDeathComplete;
    public event Action<string> OnPlaySound;

    // Called by animation events
    public void AttackHit() => OnAttackHit?.Invoke();
    public void SkillActivate() => OnSkillActivate?.Invoke();
    public void DeathComplete() => OnDeathComplete?.Invoke();
    public void PlaySound(string soundName) => OnPlaySound?.Invoke(soundName);

    // Spawn VFX at specific frames
    public void SpawnEffect(string effectName)
    {
        VFXManager.Instance.Play(effectName, transform.position);
    }
}
```

---

## Audio Specifications

### Audio Categories

```
Audio/
├── Music/
│   ├── Menu/
│   │   ├── MainMenu.ogg
│   │   └── Victory.ogg
│   ├── Combat/
│   │   ├── Battle_01.ogg
│   │   ├── Battle_02.ogg
│   │   ├── Battle_03.ogg
│   │   └── Boss_01.ogg
│   └── Ambient/
│       ├── Forest.ogg
│       ├── Cave.ogg
│       └── Castle.ogg
├── SFX/
│   ├── UI/
│   │   ├── Button_Click.wav
│   │   ├── Button_Hover.wav
│   │   ├── Panel_Open.wav
│   │   ├── Panel_Close.wav
│   │   ├── Confirm.wav
│   │   └── Cancel.wav
│   ├── Combat/
│   │   ├── Attack_Melee_01.wav
│   │   ├── Attack_Melee_02.wav
│   │   ├── Attack_Ranged_01.wav
│   │   ├── Hit_Physical_01.wav
│   │   ├── Hit_Physical_02.wav
│   │   ├── Hit_Fire.wav
│   │   ├── Hit_Ice.wav
│   │   ├── Hit_Lightning.wav
│   │   ├── Critical_Hit.wav
│   │   └── Miss.wav
│   ├── Skills/
│   │   ├── Skill_Fire.wav
│   │   ├── Skill_Ice.wav
│   │   ├── Skill_Lightning.wav
│   │   ├── Skill_Heal.wav
│   │   ├── Skill_Buff.wav
│   │   └── Skill_Ultimate.wav
│   ├── Character/
│   │   ├── Slime_Jump.wav
│   │   ├── Slime_Land.wav
│   │   ├── Slime_Hurt_01.wav
│   │   ├── Slime_Hurt_02.wav
│   │   ├── Slime_Death.wav
│   │   └── Level_Up.wav
│   ├── Enemy/
│   │   ├── Enemy_Spawn.wav
│   │   ├── Enemy_Attack.wav
│   │   ├── Enemy_Death.wav
│   │   └── Boss_Roar.wav
│   └── Rewards/
│       ├── Coin_Pickup.wav
│       ├── Item_Drop.wav
│       ├── Chest_Open.wav
│       ├── Equip.wav
│       └── Upgrade.wav
└── Voice/
    └── Announcer/
        ├── Round_Start.ogg
        ├── Victory.ogg
        └── Defeat.ogg
```

### Audio Manager

```csharp
public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }

    [Header("Audio Sources")]
    [SerializeField] private AudioSource musicSource;
    [SerializeField] private AudioSource ambienceSource;
    [SerializeField] private AudioSource[] sfxSources;

    [Header("Audio Mixers")]
    [SerializeField] private AudioMixer masterMixer;

    // Volume settings
    private const string MasterVolume = "MasterVolume";
    private const string MusicVolume = "MusicVolume";
    private const string SFXVolume = "SFXVolume";

    // Audio pools
    private Dictionary<string, AudioClip> _clipCache = new();
    private int _currentSfxIndex = 0;

    void Awake()
    {
        if (Instance != null)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        LoadSettings();
    }

    #region Music

    public void PlayMusic(string musicName, float fadeDuration = 1f)
    {
        StartCoroutine(CrossfadeMusic(musicName, fadeDuration));
    }

    private IEnumerator CrossfadeMusic(string musicName, float duration)
    {
        AudioClip newClip = LoadClip($"Music/{musicName}");
        if (newClip == null) yield break;

        float startVolume = musicSource.volume;

        // Fade out
        for (float t = 0; t < duration / 2; t += Time.deltaTime)
        {
            musicSource.volume = Mathf.Lerp(startVolume, 0, t / (duration / 2));
            yield return null;
        }

        // Switch track
        musicSource.clip = newClip;
        musicSource.Play();

        // Fade in
        for (float t = 0; t < duration / 2; t += Time.deltaTime)
        {
            musicSource.volume = Mathf.Lerp(0, startVolume, t / (duration / 2));
            yield return null;
        }

        musicSource.volume = startVolume;
    }

    #endregion

    #region SFX

    public void PlaySFX(string sfxName, float volumeScale = 1f, float pitchVariation = 0.1f)
    {
        AudioClip clip = LoadClip($"SFX/{sfxName}");
        if (clip == null) return;

        AudioSource source = sfxSources[_currentSfxIndex];
        _currentSfxIndex = (_currentSfxIndex + 1) % sfxSources.Length;

        source.pitch = 1f + UnityEngine.Random.Range(-pitchVariation, pitchVariation);
        source.PlayOneShot(clip, volumeScale);
    }

    public void PlaySFXAtPosition(string sfxName, Vector3 position, float volumeScale = 1f)
    {
        AudioClip clip = LoadClip($"SFX/{sfxName}");
        if (clip == null) return;

        AudioSource.PlayClipAtPoint(clip, position, volumeScale);
    }

    #endregion

    #region Settings

    public void SetMasterVolume(float volume)
    {
        masterMixer.SetFloat(MasterVolume, Mathf.Log10(volume) * 20);
        PlayerPrefs.SetFloat(MasterVolume, volume);
    }

    public void SetMusicVolume(float volume)
    {
        masterMixer.SetFloat(MusicVolume, Mathf.Log10(volume) * 20);
        PlayerPrefs.SetFloat(MusicVolume, volume);
    }

    public void SetSFXVolume(float volume)
    {
        masterMixer.SetFloat(SFXVolume, Mathf.Log10(volume) * 20);
        PlayerPrefs.SetFloat(SFXVolume, volume);
    }

    private void LoadSettings()
    {
        SetMasterVolume(PlayerPrefs.GetFloat(MasterVolume, 1f));
        SetMusicVolume(PlayerPrefs.GetFloat(MusicVolume, 0.7f));
        SetSFXVolume(PlayerPrefs.GetFloat(SFXVolume, 1f));
    }

    #endregion

    private AudioClip LoadClip(string path)
    {
        if (_clipCache.TryGetValue(path, out AudioClip cached))
            return cached;

        AudioClip clip = Resources.Load<AudioClip>($"Audio/{path}");
        if (clip != null)
            _clipCache[path] = clip;

        return clip;
    }
}
```

### Audio Specifications

```
Format Requirements:
┌─────────────────────────────────────────────────────────────┐
│ Category     │ Format │ Sample Rate │ Channels │ Notes     │
├──────────────┼────────┼─────────────┼──────────┼───────────┤
│ Music        │ OGG    │ 44.1kHz     │ Stereo   │ Streaming │
│ Ambience     │ OGG    │ 44.1kHz     │ Stereo   │ Looping   │
│ SFX          │ WAV    │ 44.1kHz     │ Mono     │ One-shot  │
│ UI SFX       │ WAV    │ 22.05kHz    │ Mono     │ Short     │
│ Voice        │ OGG    │ 44.1kHz     │ Mono     │ Optional  │
└──────────────┴────────┴─────────────┴──────────┴───────────┘

File Size Targets (per file):
- Music: 2-4 MB (2-3 min loops)
- Ambience: 1-2 MB (1-2 min loops)
- SFX: 10-100 KB (< 2 seconds)
- UI SFX: 5-20 KB (< 0.5 seconds)

Total Audio Budget: ~50 MB
```

---

## UI/UX Design

### Screen Flow (Always-In-Gameplay Model)

Unlike traditional games with lobbies, the player is **immediately in gameplay** after login. All menus overlay on top of the active battle.

```
┌─────────────────────────────────────────────────────────────┐
│                  SCREEN FLOW (IDLE RPG)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐     ┌─────────┐     ┌─────────────────────┐   │
│  │ Splash  │────▶│  Login  │────▶│  MAIN GAMEPLAY      │   │
│  │ (Logo)  │     │ (Auto)  │     │  ┌───────────────┐  │   │
│  └─────────┘     └─────────┘     │  │ Battle Area   │  │   │
│                                   │  │ (Always On)   │  │   │
│        Player lands directly ───▶│  │               │  │   │
│        in their current stage    │  │ Current Stage │  │   │
│                                   │  │ Auto-Progress │  │   │
│                                   │  └───────────────┘  │   │
│                                   └──────────┬──────────┘   │
│                                              │              │
│                 ┌────────────────────────────┼──────────────┤
│                 │         OVERLAY PANELS     │              │
│    ┌────────────┼────────────┬───────────────┼────────────┐ │
│    ▼            ▼            ▼               ▼            ▼ │
│ ┌──────┐  ┌──────────┐  ┌────────┐  ┌────────────┐  ┌─────┐│
│ │Char- │  │Equipment │  │ Arena  │  │  Dungeon   │  │Shop ││
│ │acter │  │& Skills  │  │(Async) │  │(Special)   │  │     ││
│ └──────┘  └──────────┘  └────────┘  └────────────┘  └─────┘│
│                                                             │
│    All panels slide up from bottom or side                  │
│    Battle continues in background (paused or auto)          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                   SIDE PANELS (Events)                      │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Top-Up  │  │  Daily  │  │  Rush   │  │  Lucky  │        │
│  │ (IAP)   │  │  Tasks  │  │  Event  │  │  Star   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  These appear as floating buttons on left/right edges       │
│  Tap to open full-screen event panel                        │
└─────────────────────────────────────────────────────────────┘
```

### Main Gameplay HUD (Portrait Mobile)

```
┌──────────────────────────────────────┐
│ ┌────┐  Player Name    💎7496  💰0.95│  ← Top Bar (always visible)
│ │ Av │  ⚔️ 1869.1M     💠5006.5K     │
│ │ Lv │  ████████████░░ 4477.9K/6611K │
│ └────┘                               │
├────────────────────────────┬─────────┤
│ [Speed Up]  📍Stage I1-1   │  100.0  │  ← Stage indicator + progress
│  Battle    ────────────────┤ ────▶   │
├────────────────────────────┴─────────┤
│                                      │
│  ┌─────┐           ┌─────┐   ┌─────┐ │  ← Left side: Events
│  │TopUp│           │     │   │Daily│ │
│  └─────┘           │     │   │Tasks│ │
│  ┌─────┐           │     │   └─────┘ │
│  │Arena│           │     │   ┌─────┐ │
│  └─────┘   👾  👾   │ 💀 │   │Rush │ │  ← Center: Battle area
│  ┌─────┐      👾    │BOSS│   │Event│ │    (enemies, player, effects)
│  │ AFK │   👾    👾 │    │   └─────┘ │
│  └─────┘           │     │   ┌─────┐ │
│                    └─────┘   │Lucky│ │
│        18  18                │Star │ │  ← Damage numbers
│     18    24   5  3          └─────┘ │
│        ═══════════                   │
│        🟢 Player                     │  ← Player (manual control)
│        ═══════════                   │    Weapons orbit around
│                                      │
├──────────────────────────────────────┤
│  Character Lv.119  ██████████░ 118/119│  ← Stage progress bar
├──────────────────────────────────────┤
│ ┌────┐ ○ ○ ○ ○ ○ ○    [AUTO]        │  ← Skill slots + Auto toggle
│ │Move│ (Skills - unlock via progress)│
│ └────┘                               │
├──────────────────────────────────────┤
│┌────┬────┬────┬────┬────┬────┬────┐  │  ← Equipment grid (3x3 visible)
││ 🗡️ │ 🛡️ │ 👒 │ 👕 │ 👖 │ 🥾 │ 💍 │  │    Tap to open full equipment
│├────┼────┼────┼────┼────┼────┼────┤  │
││Lv17│Lv17│Lv15│Lv18│Lv16│Lv17│Lv19│  │
│└────┴────┴────┴────┴────┴────┴────┘  │
│         [23]  🏺 255  ⚙️ [Auto]       │  ← Magic Furnace, settings
├──────────────────────────────────────┤
│ 💬 [World]User123: Hello everyone!   │  ← Chat ticker
├──────────────────────────────────────┤
│ 🧙 │ 🐾 │ ⚔️ │ 🏠 │ 👑 │ 🛒         │  ← Bottom nav bar
│Char│ Pal │Dung│Base│King│Shop        │
└──────────────────────────────────────┘
```

### Bottom Navigation Bar

The primary navigation always visible at the bottom:

| Icon | Tab | Description |
|------|-----|-------------|
| 🧙 | **Character** | Stats, talents, appearance |
| 🐾 | **Pal** | Companion pets, summons |
| ⚔️ | **Dungeon** | Special stages, boss raids |
| 🏠 | **Base** | Idle production, upgrades |
| 👑 | **Kingdom** | Guild, social features |
| 🛒 | **Shop** | IAP, daily deals, gacha |

### Side Event Buttons (Floating)

Always visible on screen edges, with notification badges:

**Left Side:**
- Top-Up (IAP promotion)
- Arena (Async PvP)
- AFK Rewards (claim offline progress)

**Right Side:**
- Daily Tasks (quests, achievements)
- Rush Event (limited-time)
- Lucky Star (gacha/lottery)
- Seasonal Events (rotating)

### Panel Overlay System

When a panel opens, battle continues in background:

```csharp
public enum PanelBehavior
{
    PauseBattle,      // Full pause (settings, shop purchase)
    ContinueBattle,   // Battle continues (equipment, character)
    AutoBattle        // Force auto-battle while panel open
}
```

### Attribute System

All stats that affect player and combat performance.

#### Primary Attributes

| Attribute | Abbreviation | Description |
|-----------|--------------|-------------|
| **HP** | HP | Health Points - total survivability |
| **ATK** | ATK | Attack Power - base damage dealt |
| **DEF** | DEF | Defense - reduces incoming damage |
| **Move SPD** | MSPD | Movement Speed - how fast player moves |
| **ATK SPD** | ASPD | Attack Speed - rate of basic attacks |
| **Skill Recharge SPD** | SRSPD | How fast skills come off cooldown |
| **Pal ATK SPD** | PASPD | Attack speed of companion/pal |

#### Critical Stats

| Attribute | Abbreviation | Description |
|-----------|--------------|-------------|
| **Basic ATK Crit%** | BACRIT | Crit chance for basic attacks |
| **Skill Crit%** | SCRIT | Crit chance for skills |
| **Pal Crit%** | PCRIT | Crit chance for pal attacks |
| **Basic ATK Crit DMG** | BACRITD | Crit damage multiplier for basic attacks |
| **Skill Crit DMG** | SCRITD | Crit damage multiplier for skills |
| **Pal Crit DMG** | PCRITD | Crit damage multiplier for pal attacks |

#### Damage Modifiers

| Attribute | Abbreviation | Description |
|-----------|--------------|-------------|
| **Basic ATK DMG** | BADMG | Bonus damage for basic attacks |
| **Attr DMG** | ATTRDMG | Attribute/elemental damage bonus |
| **Boss DMG** | BOSSDMG | Extra damage against bosses |
| **Player DMG** | PLRDMG | Extra damage against players (PvP) |

#### Damage Reduction

| Attribute | Abbreviation | Description |
|-----------|--------------|-------------|
| **Boss DMG Red** | BOSSRED | Reduces damage taken from bosses |
| **Total DMG Red** | TOTRED | Global damage reduction |
| **Basic ATK DMG Reduce** | BARED | Reduces incoming basic attack damage |
| **Skill DMG Reduce** | SRED | Reduces incoming skill damage |
| **Pal DMG Reduce** | PRED | Reduces incoming pal damage |
| **Attribute DMG Reduce** | ATTRRED | Reduces incoming elemental damage |
| **Player DMG Reduce** | PLRRED | Reduces damage from players (PvP) |

#### Utility Stats

| Attribute | Abbreviation | Description |
|-----------|--------------|-------------|
| **EVA%** | EVA | Evasion - chance to dodge attacks |
| **Regen/s** | REGENS | Health regeneration per second |
| **Regen** | REGEN | Flat health regeneration (on hit/interval) |
| **Attr Follow-up** | ATTRFU | Triggers follow-up attribute attacks |
| **Attr Boost** | ATTRB | Amplifies attribute effects |
| **Ignore Crit DMG** | ICRITD | Reduces enemy crit damage against you |
| **Ignore Crit** | ICRIT | Reduces enemy crit chance against you |
| **Ignore Evasion** | IEVA | Bypasses enemy evasion |

#### Attribute Enum

```go
// server/internal/game/attributes.go

type Attribute int

const (
    AttrHP Attribute = iota
    AttrATK
    AttrDEF
    AttrMoveSpeed
    AttrAtkSpeed
    AttrSkillRechargeSpeed
    AttrPalAtkSpeed
    AttrBasicAtkCrit
    AttrSkillCrit
    AttrPalCrit
    AttrBasicAtkCritDmg
    AttrSkillCritDmg
    AttrPalCritDmg
    AttrBasicAtkDmg
    AttrAttrDmg
    AttrBossDmg
    AttrBossDmgRed
    AttrTotalDmgRed
    AttrEvasion
    AttrRegenPerSec
    AttrRegen
    AttrAttrFollowUp
    AttrAttrBoost
    AttrIgnoreCritDmg
    AttrIgnoreCrit
    AttrBasicAtkDmgRed
    AttrSkillDmgRed
    AttrPalDmgRed
    AttrAttrDmgRed
    AttrIgnoreEvasion
    AttrPlayerDmg
    AttrPlayerDmgRed
    AttrCount // 31 total attributes
)

var AttributeNames = map[Attribute]string{
    AttrHP:                 "HP",
    AttrATK:                "ATK",
    AttrDEF:                "DEF",
    AttrMoveSpeed:          "Move SPD",
    AttrAtkSpeed:           "ATK SPD",
    AttrSkillRechargeSpeed: "Skill Recharge SPD",
    AttrPalAtkSpeed:        "Pal ATK SPD",
    AttrBasicAtkCrit:       "Basic ATK Crit%",
    AttrSkillCrit:          "Skill Crit%",
    AttrPalCrit:            "Pal Crit%",
    AttrBasicAtkCritDmg:    "Basic ATK Crit DMG",
    AttrSkillCritDmg:       "Skill Crit DMG",
    AttrPalCritDmg:         "Pal Crit DMG",
    AttrBasicAtkDmg:        "Basic ATK DMG",
    AttrAttrDmg:            "Attr DMG",
    AttrBossDmg:            "Boss DMG",
    AttrBossDmgRed:         "Boss DMG Red",
    AttrTotalDmgRed:        "Total DMG Red",
    AttrEvasion:            "EVA%",
    AttrRegenPerSec:        "Regen/s",
    AttrRegen:              "Regen",
    AttrAttrFollowUp:       "Attr Follow-up",
    AttrAttrBoost:          "Attr Boost",
    AttrIgnoreCritDmg:      "Ignore Crit DMG",
    AttrIgnoreCrit:         "Ignore Crit",
    AttrBasicAtkDmgRed:     "Basic ATK DMG Red",
    AttrSkillDmgRed:        "Skill DMG Red",
    AttrPalDmgRed:          "Pal DMG Red",
    AttrAttrDmgRed:         "Attr DMG Red",
    AttrIgnoreEvasion:      "Ignore Evasion",
    AttrPlayerDmg:          "Player DMG",
    AttrPlayerDmgRed:       "Player DMG Red",
}

// PlayerStats holds all computed stats for a player
type PlayerStats struct {
    Base      [AttrCount]float64 `json:"base"`       // Base stats from level
    Equipment [AttrCount]float64 `json:"equipment"`  // Stats from gear
    Buffs     [AttrCount]float64 `json:"buffs"`      // Temporary buffs
    Total     [AttrCount]float64 `json:"total"`      // Computed totals
}

func (s *PlayerStats) Recalculate() {
    for i := 0; i < int(AttrCount); i++ {
        s.Total[i] = s.Base[i] + s.Equipment[i] + s.Buffs[i]
    }
}

func (s *PlayerStats) GetStat(attr Attribute) float64 {
    return s.Total[attr]
}
```

#### Protobuf Definition

```protobuf
// proto/attributes.proto

syntax = "proto3";
package game;

enum Attribute {
    ATTR_HP = 0;
    ATTR_ATK = 1;
    ATTR_DEF = 2;
    ATTR_MOVE_SPEED = 3;
    ATTR_ATK_SPEED = 4;
    ATTR_SKILL_RECHARGE_SPEED = 5;
    ATTR_PAL_ATK_SPEED = 6;
    ATTR_BASIC_ATK_CRIT = 7;
    ATTR_SKILL_CRIT = 8;
    ATTR_PAL_CRIT = 9;
    ATTR_BASIC_ATK_CRIT_DMG = 10;
    ATTR_SKILL_CRIT_DMG = 11;
    ATTR_PAL_CRIT_DMG = 12;
    ATTR_BASIC_ATK_DMG = 13;
    ATTR_ATTR_DMG = 14;
    ATTR_BOSS_DMG = 15;
    ATTR_BOSS_DMG_RED = 16;
    ATTR_TOTAL_DMG_RED = 17;
    ATTR_EVASION = 18;
    ATTR_REGEN_PER_SEC = 19;
    ATTR_REGEN = 20;
    ATTR_ATTR_FOLLOW_UP = 21;
    ATTR_ATTR_BOOST = 22;
    ATTR_IGNORE_CRIT_DMG = 23;
    ATTR_IGNORE_CRIT = 24;
    ATTR_BASIC_ATK_DMG_RED = 25;
    ATTR_SKILL_DMG_RED = 26;
    ATTR_PAL_DMG_RED = 27;
    ATTR_ATTR_DMG_RED = 28;
    ATTR_IGNORE_EVASION = 29;
    ATTR_PLAYER_DMG = 30;
    ATTR_PLAYER_DMG_RED = 31;
}

message StatValue {
    Attribute attribute = 1;
    double value = 2;
}

message PlayerStats {
    repeated StatValue base = 1;
    repeated StatValue equipment = 2;
    repeated StatValue buffs = 3;
    repeated StatValue total = 4;
}
```

---

### Equipment Slot System

The game has 15 equipment slots total. No visible backpack/inventory system - all equipment is obtained via the Dice Roll system or special unlock systems.

#### Equipment Slots

| Slot | Type | Obtained Via | Notes |
|------|------|--------------|-------|
| 1 | **Weapon** | Dice Roll | Main weapon type (sword, staff, bow, etc.) |
| 2 | **Bullet** | Dice Roll | Projectile type for attacks |
| 3 | **Attribute** | Dice Roll | Adds elemental/special effects to bullets |
| 4 | **Helmet** | Dice Roll | Head armor |
| 5 | **Mask** | Dice Roll | Face accessory |
| 6 | **Necklace** | Dice Roll | Neck accessory |
| 7 | **Cloak** | Dice Roll | Back armor |
| 8 | **Gloves** | Dice Roll | Hand armor |
| 9 | **Shield** | Dice Roll | Off-hand defense |
| 10 | **Boots** | Dice Roll | Foot armor |
| 11 | **Mount** | Mount System | 🔒 Unlocked later - special summon |
| 12 | **Artifact** | Artifact System | 🔒 Unlocked later - special summon |
| 13 | **Back Accessory** | Accessory System | 🔒 Unlocked later - cosmetic + stats |
| 14 | **Treasure** | Treasure System | 🔒 Unlocked later - 7 slots, 6 choices each |
| 15 | **Star Soul** | Star Soul System | 🔒 Unlocked later - ultimate power |

### Equipment Panel Layout

```
┌──────────────────────────────────────┐
│ ◀ Equipment              [Auto] ⚙️   │
├──────────────────────────────────────┤
│  COMBAT GEAR                         │
│  ┌────┐ ┌────┐ ┌────┐               │
│  │ 🗡️ │ │ 🔫 │ │ 🔥 │               │  ← Weapon, Bullet, Attribute
│  │Wpon│ │Bult│ │Attr│               │
│  │Lv17│ │Lv15│ │Lv12│               │
│  └────┘ └────┘ └────┘               │
├──────────────────────────────────────┤
│  ARMOR                               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │ 🪖 │ │ 🎭 │ │ 📿 │ │ 🧥 │        │  ← Helmet, Mask, Necklace, Cloak
│  │Helm│ │Mask│ │Neck│ │Clok│        │
│  │Lv18│ │Lv16│ │Lv14│ │Lv15│        │
│  └────┘ └────┘ └────┘ └────┘        │
│  ┌────┐ ┌────┐ ┌────┐               │
│  │ 🧤 │ │ 🛡️ │ │ 👢 │               │  ← Gloves, Shield, Boots
│  │Glov│ │Shld│ │Boot│               │
│  │Lv13│ │Lv17│ │Lv16│               │
│  └────┘ └────┘ └────┘               │
├──────────────────────────────────────┤
│  SPECIAL (Unlock at higher levels)   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ 🐴 │ │ 🏺 │ │ 🎒 │ │ 💎 │ │ ⭐ │ │  ← Mount, Artifact, Back, Treasure, Star Soul
│  │ 🔒 │ │ 🔒 │ │ 🔒 │ │ 🔒 │ │ 🔒 │ │
│  │Lv30│ │Lv50│ │Lv40│ │Lv60│ │Lv80│ │  ← Unlock levels
│  └────┘ └────┘ └────┘ └────┘ └────┘ │
├──────────────────────────────────────┤
│  ○ ○ ○ ○ ○ ○  Skill Slots            │
├──────────────────────────────────────┤
│  🎲 DICE ROLL                        │
│  ┌─────────────────────────────────┐ │
│  │  [Roll x1]  [Roll x10]  Lv.5    │ │  ← Dice level affects drop rates
│  │   💰 1000    💰 9000    [⬆️]    │ │
│  └─────────────────────────────────┘ │
│         [Upgrade] [Enhance]          │
└──────────────────────────────────────┘
```

### Dice Roll System

The primary equipment acquisition method. Similar to Legend of Mushroom's Lamp or Pew Pew Slime's Slime Jelly.

```go
// server/internal/game/dice_roll.go

type DiceRollSystem struct {
    Level           int     `json:"level"`           // Current dice level
    MaxLevel        int     `json:"max_level"`       // 100
    Experience      int64   `json:"experience"`      // XP towards next level
    TotalRolls      int64   `json:"total_rolls"`     // Lifetime rolls
}

type DiceRollConfig struct {
    SingleRollCost   int64   `yaml:"single_roll_cost"`    // 1000 gold
    TenRollCost      int64   `yaml:"ten_roll_cost"`       // 9000 gold (10% discount)
    LevelUpXPBase    int64   `yaml:"level_up_xp_base"`    // 100
    LevelUpXPScale   float64 `yaml:"level_up_xp_scale"`   // 1.15

    // Items that CAN be rolled (basic equipment)
    RollableSlots []EquipmentSlot `yaml:"rollable_slots"`
}

// Slots that can be obtained via Dice Roll
var DiceRollableSlots = []EquipmentSlot{
    SlotWeapon,
    SlotBullet,
    SlotAttribute,
    SlotHelmet,
    SlotMask,
    SlotNecklace,
    SlotCloak,
    SlotGloves,
    SlotShield,
    SlotBoots,
}

// Slots that have their own special systems
var SpecialSlots = []EquipmentSlot{
    SlotMount,         // Mount Summon System
    SlotArtifact,      // Artifact Summon System
    SlotBackAccessory, // Accessory Summon System
    SlotTreasure,      // Treasure System (7 slots)
    SlotStarSoul,      // Star Soul System
}

// Drop rates by dice level
type DiceDropRates struct {
    Level   int                `json:"level"`
    Rates   map[Rarity]float32 `json:"rates"`
}

func GetDiceDropRates(level int) map[Rarity]float32 {
    // Base rates at level 1
    baseRates := map[Rarity]float32{
        RarityNormal:    0.40,   // 40%
        RarityUnique:    0.25,   // 25%
        RarityWell:      0.15,   // 15%
        RarityRare:      0.10,   // 10%
        RarityMythic:    0.05,   // 5%
        RarityEpic:      0.03,   // 3%
        RarityLegendary: 0.015,  // 1.5%
        RarityImmortal:  0.004,  // 0.4%
        RaritySupreme:   0.001,  // 0.1%
        // Aurous and Eternal cannot be rolled via dice
    }

    // Each level improves rates slightly
    // Higher rarities get bigger boosts per level
    levelBonus := float32(level-1) * 0.002

    rates := make(map[Rarity]float32)
    for rarity, baseRate := range baseRates {
        bonus := levelBonus * float32(rarity+1) * 0.1
        rates[rarity] = min(baseRate+bonus, 0.5) // Cap at 50%
    }

    // Normalize rates
    return normalizeRates(rates)
}

func (d *DiceRollSystem) Roll(player *Player, count int) ([]Equipment, error) {
    config := GetDiceConfig()

    // Calculate cost
    cost := config.SingleRollCost * int64(count)
    if count == 10 {
        cost = config.TenRollCost
    }

    if player.Gold < cost {
        return nil, ErrInsufficientGold
    }

    // Perform rolls
    results := []Equipment{}
    rates := GetDiceDropRates(d.Level)

    for i := 0; i < count; i++ {
        // Roll rarity
        rarity := rollRarity(rates)

        // Roll slot type
        slot := DiceRollableSlots[rand.Intn(len(DiceRollableSlots))]

        // Generate equipment
        equipment := GenerateEquipment(slot, rarity, player.Level)
        results = append(results, equipment)

        // Add XP to dice
        d.AddExperience(1)
    }

    // Deduct cost
    player.Gold -= cost
    d.TotalRolls += int64(count)

    return results, nil
}

func (d *DiceRollSystem) AddExperience(rolls int) {
    d.Experience += int64(rolls)

    // Check level up
    xpNeeded := d.GetXPForNextLevel()
    for d.Experience >= xpNeeded && d.Level < d.MaxLevel {
        d.Experience -= xpNeeded
        d.Level++
        xpNeeded = d.GetXPForNextLevel()
    }
}

func (d *DiceRollSystem) GetXPForNextLevel() int64 {
    config := GetDiceConfig()
    return int64(float64(config.LevelUpXPBase) * math.Pow(config.LevelUpXPScale, float64(d.Level)))
}
```

### Equipment Sub-Attributes

All dice-rollable equipment (non-special slots) can roll **two random sub-attributes** in addition to their base stats. These sub-attributes provide additional bonuses.

#### Rollable Sub-Attributes

| Sub-Attribute | Description |
|---------------|-------------|
| **Any** | Wild card - can be any sub-attribute |
| **Basic ATK Crit%** | Bonus critical hit chance for basic attacks |
| **Skill Crit%** | Bonus critical hit chance for skills |
| **Pal Crit%** | Bonus critical hit chance for pal/companion attacks |
| **Attr DMG** | Bonus attribute/elemental damage |
| **Boss DMG Red** | Reduced damage taken from bosses |
| **EVA%** | Bonus evasion chance |
| **Regen/s** | Health regeneration per second |

#### Equipment Structure with Sub-Attributes

```go
// server/internal/game/equipment.go

type SubAttribute int

const (
    SubAttrAny SubAttribute = iota        // Wild card
    SubAttrBasicAtkCrit                   // Basic ATK Crit%
    SubAttrSkillCrit                      // Skill Crit%
    SubAttrPalCrit                        // Pal Crit%
    SubAttrAttrDmg                        // Attr DMG
    SubAttrBossDmgRed                     // Boss DMG Red
    SubAttrEvasion                        // EVA%
    SubAttrRegenPerSec                    // Regen/s
    SubAttrCount
)

var RollableSubAttributes = []SubAttribute{
    SubAttrBasicAtkCrit,
    SubAttrSkillCrit,
    SubAttrPalCrit,
    SubAttrAttrDmg,
    SubAttrBossDmgRed,
    SubAttrEvasion,
    SubAttrRegenPerSec,
}

type SubAttributeValue struct {
    Type  SubAttribute `json:"type"`
    Value float64      `json:"value"`
}

type Equipment struct {
    ID            string              `json:"id"`
    TemplateID    string              `json:"template_id"`
    Slot          EquipmentSlot       `json:"slot"`
    Rarity        Rarity              `json:"rarity"`
    Level         int                 `json:"level"`

    // Base stats from equipment type + rarity
    BaseStats     map[Attribute]float64 `json:"base_stats"`

    // Two random sub-attributes (only for dice-rollable equipment)
    SubAttributes [2]SubAttributeValue  `json:"sub_attributes"`

    // Enhancement level (separate from level)
    EnhanceLevel  int                 `json:"enhance_level"`

    // Locked from auto-equip/sell
    Locked        bool                `json:"locked"`
}

// Sub-attribute value ranges by rarity
var SubAttrRanges = map[Rarity]struct{ Min, Max float64 }{
    RarityNormal:    {0.5, 1.0},
    RarityUnique:    {1.0, 2.0},
    RarityWell:      {1.5, 3.0},
    RarityRare:      {2.0, 4.0},
    RarityMythic:    {3.0, 6.0},
    RarityEpic:      {4.0, 8.0},
    RarityLegendary: {5.0, 10.0},
    RarityImmortal:  {7.0, 14.0},
    RaritySupreme:   {10.0, 20.0},
}

func GenerateEquipment(slot EquipmentSlot, rarity Rarity, playerLevel int) Equipment {
    equip := Equipment{
        ID:         GenerateUUID(),
        TemplateID: GetTemplateForSlot(slot, rarity),
        Slot:       slot,
        Rarity:     rarity,
        Level:      playerLevel,
        BaseStats:  GetBaseStatsForTemplate(slot, rarity, playerLevel),
    }

    // Roll two sub-attributes (only for dice-rollable slots)
    if slot.IsDiceRollable() {
        equip.SubAttributes = rollSubAttributes(rarity)
    }

    return equip
}

func rollSubAttributes(rarity Rarity) [2]SubAttributeValue {
    var result [2]SubAttributeValue
    usedTypes := make(map[SubAttribute]bool)
    ranges := SubAttrRanges[rarity]

    for i := 0; i < 2; i++ {
        // Roll unique sub-attribute type
        var subType SubAttribute
        for {
            subType = RollableSubAttributes[rand.Intn(len(RollableSubAttributes))]
            if !usedTypes[subType] {
                usedTypes[subType] = true
                break
            }
        }

        // Roll value within rarity range
        value := ranges.Min + rand.Float64()*(ranges.Max-ranges.Min)

        result[i] = SubAttributeValue{
            Type:  subType,
            Value: value,
        }
    }

    return result
}
```

### Auto-Roll Settings

The auto-roll system allows players to continuously roll dice with filters to automatically keep or discard equipment.

#### Auto-Roll Configuration

```go
// server/internal/game/auto_roll.go

type AutoRollSettings struct {
    Enabled          bool                `json:"enabled"`
    MinQuality       Rarity              `json:"min_quality"`       // Minimum rarity to keep
    FilterCondition1 [2]SubAttribute     `json:"filter_condition_1"` // First filter (select 2)
    FilterCondition2 [2]SubAttribute     `json:"filter_condition_2"` // Second filter (select 2)
    ItemsPerDraw     int                 `json:"items_per_draw"`     // 1, 2, 3, 4, 6, 8, 10, 15, 20
}

var ValidItemsPerDraw = []int{1, 2, 3, 4, 6, 8, 10, 15, 20}

// Filter logic: Keep item if it meets quality AND has any matching sub-attribute from either filter
type AutoRollFilter struct {
    Settings AutoRollSettings
}

func (f *AutoRollFilter) ShouldKeep(equip Equipment) bool {
    // Check minimum quality
    if equip.Rarity < f.Settings.MinQuality {
        return false
    }

    // Check if any sub-attribute matches filter conditions
    matchesFilter1 := f.matchesFilterCondition(equip, f.Settings.FilterCondition1)
    matchesFilter2 := f.matchesFilterCondition(equip, f.Settings.FilterCondition2)

    // Keep if matches either filter (OR logic between filters)
    return matchesFilter1 || matchesFilter2
}

func (f *AutoRollFilter) matchesFilterCondition(equip Equipment, condition [2]SubAttribute) bool {
    for _, equipSub := range equip.SubAttributes {
        for _, filterSub := range condition {
            // SubAttrAny matches everything
            if filterSub == SubAttrAny || equipSub.Type == filterSub {
                return true
            }
        }
    }
    return false
}

func (d *DiceRollSystem) AutoRoll(player *Player, settings AutoRollSettings) (*AutoRollResult, error) {
    if !isValidItemsPerDraw(settings.ItemsPerDraw) {
        return nil, ErrInvalidDrawCount
    }

    filter := AutoRollFilter{Settings: settings}

    // Perform the roll
    equipment, err := d.Roll(player, settings.ItemsPerDraw)
    if err != nil {
        return nil, err
    }

    result := &AutoRollResult{
        Kept:      []Equipment{},
        Discarded: []Equipment{},
    }

    for _, equip := range equipment {
        if filter.ShouldKeep(equip) {
            result.Kept = append(result.Kept, equip)
        } else {
            result.Discarded = append(result.Discarded, equip)
            // Convert discarded to gold/materials
            player.Gold += getDisenchantValue(equip)
        }
    }

    return result, nil
}

type AutoRollResult struct {
    Kept      []Equipment `json:"kept"`
    Discarded []Equipment `json:"discarded"`
    GoldGained int64      `json:"gold_gained"`
}

func isValidItemsPerDraw(count int) bool {
    for _, valid := range ValidItemsPerDraw {
        if count == valid {
            return true
        }
    }
    return false
}
```

#### Auto-Roll UI Panel

```
┌──────────────────────────────────────┐
│ ⚙️ Auto-Roll Settings         [X]    │
├──────────────────────────────────────┤
│                                      │
│  Minimum Quality:                    │
│  ┌──────────────────────────────┐    │
│  │ ▼ Rare                       │    │  ← Dropdown: Normal → Supreme
│  └──────────────────────────────┘    │
│                                      │
│  Filter Condition 1: (Select 2)      │
│  ┌────────┐ ┌────────┐               │
│  │☑ Basic │ │☑ Skill │               │  ← Checkboxes for sub-attributes
│  │  Crit% │ │  Crit% │               │
│  └────────┘ └────────┘               │
│  ┌────────┐ ┌────────┐               │
│  │☐ Pal   │ │☐ Attr  │               │
│  │  Crit% │ │  DMG   │               │
│  └────────┘ └────────┘               │
│  ┌────────┐ ┌────────┐ ┌────────┐    │
│  │☐ Boss  │ │☐ EVA%  │ │☐ Regen │    │
│  │  Red   │ │        │ │   /s   │    │
│  └────────┘ └────────┘ └────────┘    │
│                                      │
│  Filter Condition 2: (Select 2)      │
│  ┌────────┐ ┌────────┐               │
│  │☐ Basic │ │☐ Skill │               │
│  │  Crit% │ │  Crit% │               │
│  └────────┘ └────────┘               │
│  ... (same options)                  │
│                                      │
│  Items Per Draw:                     │
│  ┌────────────────────────────────┐  │
│  │ 1  2  3  4  6  8  10  15  [20] │  │  ← Toggle buttons
│  └────────────────────────────────┘  │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │        [Start Auto-Roll]        │ │
│  │            💰 20,000            │ │  ← Cost based on items per draw
│  └─────────────────────────────────┘ │
│                                      │
│  [Save Settings]    [Reset]          │
└──────────────────────────────────────┘
```

#### C# Auto-Roll Client

```csharp
// Scripts/UI/Panels/AutoRollPanel.cs

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class AutoRollPanel : MonoBehaviour
{
    [Header("Quality Filter")]
    [SerializeField] private Dropdown _minQualityDropdown;

    [Header("Filter Condition 1")]
    [SerializeField] private Toggle[] _filter1Toggles; // 7 toggles for each sub-attribute

    [Header("Filter Condition 2")]
    [SerializeField] private Toggle[] _filter2Toggles;

    [Header("Items Per Draw")]
    [SerializeField] private ToggleGroup _itemsPerDrawGroup;
    [SerializeField] private Toggle[] _itemCountToggles; // 1, 2, 3, 4, 6, 8, 10, 15, 20

    [Header("Actions")]
    [SerializeField] private Button _startButton;
    [SerializeField] private Button _saveButton;
    [SerializeField] private Button _resetButton;
    [SerializeField] private Text _costText;

    private AutoRollSettings _settings;
    private readonly int[] _validItemCounts = { 1, 2, 3, 4, 6, 8, 10, 15, 20 };

    private void Awake()
    {
        PopulateQualityDropdown();
        SetupToggleListeners();
        LoadSettings();
    }

    private void PopulateQualityDropdown()
    {
        _minQualityDropdown.ClearOptions();
        var options = new List<string>
        {
            "Normal", "Unique", "Well", "Rare", "Mythic",
            "Epic", "Legendary", "Immortal", "Supreme"
        };
        _minQualityDropdown.AddOptions(options);
        _minQualityDropdown.onValueChanged.AddListener(OnQualityChanged);
    }

    private void SetupToggleListeners()
    {
        // Filter 1 - max 2 selections
        foreach (var toggle in _filter1Toggles)
        {
            toggle.onValueChanged.AddListener(_ => ValidateFilterSelection(_filter1Toggles));
        }

        // Filter 2 - max 2 selections
        foreach (var toggle in _filter2Toggles)
        {
            toggle.onValueChanged.AddListener(_ => ValidateFilterSelection(_filter2Toggles));
        }

        // Items per draw
        for (int i = 0; i < _itemCountToggles.Length; i++)
        {
            int index = i;
            _itemCountToggles[i].onValueChanged.AddListener(isOn =>
            {
                if (isOn) OnItemCountChanged(_validItemCounts[index]);
            });
        }

        _startButton.onClick.AddListener(OnStartAutoRoll);
        _saveButton.onClick.AddListener(SaveSettings);
        _resetButton.onClick.AddListener(ResetSettings);
    }

    private void ValidateFilterSelection(Toggle[] toggles)
    {
        int activeCount = 0;
        foreach (var toggle in toggles)
        {
            if (toggle.isOn) activeCount++;
        }

        // If more than 2 selected, disable remaining
        if (activeCount >= 2)
        {
            foreach (var toggle in toggles)
            {
                if (!toggle.isOn)
                    toggle.interactable = false;
            }
        }
        else
        {
            foreach (var toggle in toggles)
            {
                toggle.interactable = true;
            }
        }

        UpdateSettings();
    }

    private void OnQualityChanged(int index)
    {
        _settings.MinQuality = (Rarity)index;
        UpdateCost();
    }

    private void OnItemCountChanged(int count)
    {
        _settings.ItemsPerDraw = count;
        UpdateCost();
    }

    private void UpdateCost()
    {
        long baseCost = GameConfig.DiceRoll.SingleRollCost;
        long totalCost = baseCost * _settings.ItemsPerDraw;

        // 10% discount for 10+ items
        if (_settings.ItemsPerDraw >= 10)
            totalCost = (long)(totalCost * 0.9f);

        _costText.text = $"💰 {totalCost:N0}";
    }

    private void UpdateSettings()
    {
        _settings.FilterCondition1 = GetSelectedSubAttributes(_filter1Toggles);
        _settings.FilterCondition2 = GetSelectedSubAttributes(_filter2Toggles);
    }

    private SubAttribute[] GetSelectedSubAttributes(Toggle[] toggles)
    {
        var selected = new List<SubAttribute>();
        for (int i = 0; i < toggles.Length && selected.Count < 2; i++)
        {
            if (toggles[i].isOn)
                selected.Add((SubAttribute)(i + 1)); // +1 because 0 is "Any"
        }

        // Pad with Any if less than 2 selected
        while (selected.Count < 2)
            selected.Add(SubAttribute.Any);

        return selected.ToArray();
    }

    private async void OnStartAutoRoll()
    {
        _startButton.interactable = false;

        try
        {
            var result = await NetworkManager.Instance.SendRequest<AutoRollResponse>(
                OpCodes.AutoRollReq,
                new AutoRollRequest { Settings = _settings }
            );

            // Show results
            AutoRollResultPopup.Show(result.Kept, result.Discarded, result.GoldGained);
        }
        catch (Exception e)
        {
            ErrorPopup.Show(e.Message);
        }
        finally
        {
            _startButton.interactable = true;
        }
    }

    private void SaveSettings()
    {
        PlayerPrefs.SetString("AutoRollSettings", JsonUtility.ToJson(_settings));
        ToastNotification.Show("Settings saved!");
    }

    private void LoadSettings()
    {
        string json = PlayerPrefs.GetString("AutoRollSettings", "");
        if (!string.IsNullOrEmpty(json))
        {
            _settings = JsonUtility.FromJson<AutoRollSettings>(json);
            ApplySettingsToUI();
        }
        else
        {
            _settings = new AutoRollSettings
            {
                MinQuality = Rarity.Rare,
                ItemsPerDraw = 10
            };
        }
        UpdateCost();
    }

    private void ResetSettings()
    {
        _settings = new AutoRollSettings
        {
            MinQuality = Rarity.Rare,
            ItemsPerDraw = 10
        };
        ApplySettingsToUI();
        UpdateCost();
    }

    private void ApplySettingsToUI()
    {
        _minQualityDropdown.value = (int)_settings.MinQuality;

        // Reset all toggles
        foreach (var t in _filter1Toggles) { t.isOn = false; t.interactable = true; }
        foreach (var t in _filter2Toggles) { t.isOn = false; t.interactable = true; }

        // Apply filter selections
        ApplyFilterToToggles(_settings.FilterCondition1, _filter1Toggles);
        ApplyFilterToToggles(_settings.FilterCondition2, _filter2Toggles);

        // Apply item count
        int itemIndex = Array.IndexOf(_validItemCounts, _settings.ItemsPerDraw);
        if (itemIndex >= 0 && itemIndex < _itemCountToggles.Length)
        {
            _itemCountToggles[itemIndex].isOn = true;
        }
    }

    private void ApplyFilterToToggles(SubAttribute[] filter, Toggle[] toggles)
    {
        foreach (var attr in filter)
        {
            if (attr != SubAttribute.Any)
            {
                int index = (int)attr - 1; // -1 because Any is 0
                if (index >= 0 && index < toggles.Length)
                    toggles[index].isOn = true;
            }
        }
    }
}

[Serializable]
public class AutoRollSettings
{
    public Rarity MinQuality;
    public SubAttribute[] FilterCondition1 = new SubAttribute[2];
    public SubAttribute[] FilterCondition2 = new SubAttribute[2];
    public int ItemsPerDraw = 10;
}

public enum SubAttribute
{
    Any = 0,
    BasicAtkCrit = 1,
    SkillCrit = 2,
    PalCrit = 3,
    AttrDmg = 4,
    BossDmgRed = 5,
    Evasion = 6,
    RegenPerSec = 7
}
```

---

### Treasure System

7 treasure slots, each with 6 different treasures to choose from (30 total). Middle treasure is locked until special unlock.

```go
// server/internal/game/treasure.go

type TreasureSystem struct {
    Slots       [7]TreasureSlot `json:"slots"`
    UnlockLevel int             `json:"unlock_level"` // Level required to access
}

type TreasureSlot struct {
    SlotIndex       int       `json:"slot_index"`      // 0-6
    SelectedID      string    `json:"selected_id"`     // Currently equipped treasure
    UnlockedIDs     []string  `json:"unlocked_ids"`    // Treasures unlocked for this slot
    MiddleLocked    bool      `json:"middle_locked"`   // Middle (4th) treasure locked
}

type Treasure struct {
    ID          string  `json:"id"`
    Name        string  `json:"name"`
    SlotIndex   int     `json:"slot_index"`      // Which slot this belongs to (0-6)
    Position    int     `json:"position"`        // Position in slot (0-5, 3 is middle/locked)
    Rarity      Rarity  `json:"rarity"`
    Stats       Stats   `json:"stats"`
    SetBonus    string  `json:"set_bonus"`       // Bonus when multiple from same set
}

const (
    TreasuresPerSlot    = 6
    TotalTreasureSlots  = 7
    TotalTreasures      = 30  // 7 slots * 6 treasures - but organized differently
    MiddleTreasureIndex = 3   // The locked middle position
)

func (ts *TreasureSystem) SelectTreasure(slotIndex int, treasureID string) error {
    if slotIndex < 0 || slotIndex >= TotalTreasureSlots {
        return ErrInvalidSlot
    }

    slot := &ts.Slots[slotIndex]

    // Check if treasure is unlocked
    if !contains(slot.UnlockedIDs, treasureID) {
        return ErrTreasureLocked
    }

    // Check if it's the middle treasure and still locked
    treasure := GetTreasure(treasureID)
    if treasure.Position == MiddleTreasureIndex && slot.MiddleLocked {
        return ErrMiddleTreasureLocked
    }

    slot.SelectedID = treasureID
    return nil
}
```

### Equipment Slot Enum

```go
// server/internal/game/equipment_slots.go

type EquipmentSlot int

const (
    SlotWeapon EquipmentSlot = iota
    SlotBullet
    SlotAttribute
    SlotHelmet
    SlotMask
    SlotNecklace
    SlotCloak
    SlotGloves
    SlotShield
    SlotBoots
    SlotMount
    SlotArtifact
    SlotBackAccessory
    SlotTreasure
    SlotStarSoul

    SlotCount // Total: 15
)

var SlotNames = map[EquipmentSlot]string{
    SlotWeapon:        "Weapon",
    SlotBullet:        "Bullet",
    SlotAttribute:     "Attribute",
    SlotHelmet:        "Helmet",
    SlotMask:          "Mask",
    SlotNecklace:      "Necklace",
    SlotCloak:         "Cloak",
    SlotGloves:        "Gloves",
    SlotShield:        "Shield",
    SlotBoots:         "Boots",
    SlotMount:         "Mount",
    SlotArtifact:      "Artifact",
    SlotBackAccessory: "Back Accessory",
    SlotTreasure:      "Treasure",
    SlotStarSoul:      "Star Soul",
}

var SlotUnlockLevels = map[EquipmentSlot]int{
    SlotWeapon:        1,
    SlotBullet:        1,
    SlotAttribute:     5,
    SlotHelmet:        1,
    SlotMask:          10,
    SlotNecklace:      1,
    SlotCloak:         15,
    SlotGloves:        1,
    SlotShield:        1,
    SlotBoots:         1,
    SlotMount:         30,
    SlotArtifact:      50,
    SlotBackAccessory: 40,
    SlotTreasure:      60,
    SlotStarSoul:      80,
}

// Check if slot can be rolled via dice
func (s EquipmentSlot) IsDiceRollable() bool {
    switch s {
    case SlotWeapon, SlotBullet, SlotAttribute,
         SlotHelmet, SlotMask, SlotNecklace,
         SlotCloak, SlotGloves, SlotShield, SlotBoots:
        return true
    default:
        return false
    }
}
```

### Equipment Panel Layout (C# Client)

```csharp
// Scripts/UI/Panels/EquipmentPanel.cs

public class EquipmentPanel : UIPanel
{
    [Header("Slot References")]
    [SerializeField] private EquipmentSlotUI[] combatSlots;    // Weapon, Bullet, Attribute
    [SerializeField] private EquipmentSlotUI[] armorSlots;     // Helmet through Boots
    [SerializeField] private EquipmentSlotUI[] specialSlots;   // Mount through Star Soul

    [Header("Dice Roll")]
    [SerializeField] private Button rollSingleButton;
    [SerializeField] private Button rollTenButton;
    [SerializeField] private TextMeshProUGUI diceLevelText;
    [SerializeField] private Slider diceXPSlider;
    [SerializeField] private TextMeshProUGUI rollCostSingleText;
    [SerializeField] private TextMeshProUGUI rollCostTenText;

    [Header("Actions")]
    [SerializeField] private Button upgradeButton;
    [SerializeField] private Button enhanceButton;
    [SerializeField] private Button autoEquipButton;

    private PlayerEquipment _equipment;
    private DiceRollSystem _diceSystem;

    public void Initialize(PlayerEquipment equipment, DiceRollSystem dice)
    {
        _equipment = equipment;
        _diceSystem = dice;

        // Setup slot UIs
        SetupSlots();
        UpdateDiceUI();

        // Button listeners
        rollSingleButton.onClick.AddListener(() => OnRollClicked(1));
        rollTenButton.onClick.AddListener(() => OnRollClicked(10));
    }

    private void SetupSlots()
    {
        // Combat slots
        combatSlots[0].Initialize(EquipmentSlot.Weapon, _equipment);
        combatSlots[1].Initialize(EquipmentSlot.Bullet, _equipment);
        combatSlots[2].Initialize(EquipmentSlot.Attribute, _equipment);

        // Armor slots
        armorSlots[0].Initialize(EquipmentSlot.Helmet, _equipment);
        armorSlots[1].Initialize(EquipmentSlot.Mask, _equipment);
        armorSlots[2].Initialize(EquipmentSlot.Necklace, _equipment);
        armorSlots[3].Initialize(EquipmentSlot.Cloak, _equipment);
        armorSlots[4].Initialize(EquipmentSlot.Gloves, _equipment);
        armorSlots[5].Initialize(EquipmentSlot.Shield, _equipment);
        armorSlots[6].Initialize(EquipmentSlot.Boots, _equipment);

        // Special slots (may be locked)
        specialSlots[0].Initialize(EquipmentSlot.Mount, _equipment);
        specialSlots[1].Initialize(EquipmentSlot.Artifact, _equipment);
        specialSlots[2].Initialize(EquipmentSlot.BackAccessory, _equipment);
        specialSlots[3].Initialize(EquipmentSlot.Treasure, _equipment);
        specialSlots[4].Initialize(EquipmentSlot.StarSoul, _equipment);
    }

    private void UpdateDiceUI()
    {
        diceLevelText.text = $"Lv.{_diceSystem.Level}";
        diceXPSlider.value = (float)_diceSystem.Experience / _diceSystem.GetXPForNextLevel();

        var config = GameConfig.DiceRoll;
        rollCostSingleText.text = $"💰 {config.SingleRollCost}";
        rollCostTenText.text = $"💰 {config.TenRollCost}";
    }

    private async void OnRollClicked(int count)
    {
        var result = await NetworkManager.Instance.SendRequest<DiceRollResponse>(
            OpCodes.DiceRollReq,
            new DiceRollRequest { Count = count }
        );

        if (result.Success)
        {
            // Show roll animation
            await DiceRollAnimation.Play(result.Items);

            // Update UI
            UpdateDiceUI();

            // Auto-equip if better
            if (autoEquipButton.isOn)
            {
                _equipment.AutoEquipBest(result.Items);
            }
        }
    }
}

public class EquipmentSlotUI : MonoBehaviour
{
    [SerializeField] private Image slotBackground;
    [SerializeField] private Image itemIcon;
    [SerializeField] private TextMeshProUGUI levelText;
    [SerializeField] private GameObject lockOverlay;
    [SerializeField] private TextMeshProUGUI unlockLevelText;

    private EquipmentSlot _slot;
    private PlayerEquipment _equipment;

    public void Initialize(EquipmentSlot slot, PlayerEquipment equipment)
    {
        _slot = slot;
        _equipment = equipment;

        Refresh();
    }

    public void Refresh()
    {
        int playerLevel = PlayerManager.Instance.Level;
        int unlockLevel = EquipmentSlotData.GetUnlockLevel(_slot);

        bool isLocked = playerLevel < unlockLevel;
        lockOverlay.SetActive(isLocked);

        if (isLocked)
        {
            unlockLevelText.text = $"Lv{unlockLevel}";
            itemIcon.gameObject.SetActive(false);
            return;
        }

        var item = _equipment.GetEquipped(_slot);
        if (item != null)
        {
            itemIcon.gameObject.SetActive(true);
            itemIcon.sprite = item.Icon;
            levelText.text = $"Lv{item.Level}";

            // Apply rarity colors
            var colors = RarityColors.GetColors(item.Rarity);
            slotBackground.material.SetColor("_DarkColor", colors.Dark);
            slotBackground.material.SetColor("_LightColor", colors.Light);
        }
        else
        {
            itemIcon.gameObject.SetActive(false);
            levelText.text = "";
        }
    }
}
```

### UI Components

```csharp
// Base UI panel with animations
public abstract class UIPanel : MonoBehaviour
{
    [SerializeField] protected CanvasGroup canvasGroup;
    [SerializeField] protected float animationDuration = 0.3f;

    protected virtual void Awake()
    {
        canvasGroup = GetComponent<CanvasGroup>() ?? gameObject.AddComponent<CanvasGroup>();
    }

    public virtual void Show()
    {
        gameObject.SetActive(true);
        StartCoroutine(FadeIn());
        AudioManager.Instance.PlaySFX("UI/Panel_Open");
    }

    public virtual void Hide()
    {
        StartCoroutine(FadeOut());
        AudioManager.Instance.PlaySFX("UI/Panel_Close");
    }

    private IEnumerator FadeIn()
    {
        canvasGroup.alpha = 0;
        transform.localScale = Vector3.one * 0.9f;

        for (float t = 0; t < animationDuration; t += Time.deltaTime)
        {
            float progress = t / animationDuration;
            canvasGroup.alpha = progress;
            transform.localScale = Vector3.Lerp(Vector3.one * 0.9f, Vector3.one, progress);
            yield return null;
        }

        canvasGroup.alpha = 1;
        transform.localScale = Vector3.one;
    }

    private IEnumerator FadeOut()
    {
        for (float t = 0; t < animationDuration; t += Time.deltaTime)
        {
            float progress = t / animationDuration;
            canvasGroup.alpha = 1 - progress;
            yield return null;
        }

        gameObject.SetActive(false);
    }
}

// Damage number popup
public class DamageNumber : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI text;
    [SerializeField] private float floatSpeed = 50f;
    [SerializeField] private float lifetime = 1f;

    private Color _originalColor;

    public void Initialize(int damage, DamageType type, bool isCritical)
    {
        text.text = damage.ToString();

        // Color based on type
        text.color = type switch
        {
            DamageType.Physical => Color.white,
            DamageType.Fire => new Color(1f, 0.5f, 0f),
            DamageType.Ice => new Color(0.5f, 0.8f, 1f),
            DamageType.Lightning => new Color(1f, 1f, 0.5f),
            DamageType.Poison => new Color(0.5f, 1f, 0.5f),
            DamageType.Heal => Color.green,
            _ => Color.white
        };

        // Critical hit styling
        if (isCritical)
        {
            text.fontSize *= 1.5f;
            text.text = $"CRIT!\n{damage}";
        }

        _originalColor = text.color;
        StartCoroutine(Animate());
    }

    private IEnumerator Animate()
    {
        Vector3 startPos = transform.position;
        float elapsed = 0;

        while (elapsed < lifetime)
        {
            elapsed += Time.deltaTime;
            float progress = elapsed / lifetime;

            // Float upward
            transform.position = startPos + Vector3.up * (floatSpeed * elapsed);

            // Fade out
            text.color = new Color(
                _originalColor.r,
                _originalColor.g,
                _originalColor.b,
                1f - progress
            );

            yield return null;
        }

        Destroy(gameObject);
    }
}

// Health bar component
public class HealthBar : MonoBehaviour
{
    [SerializeField] private Image fillImage;
    [SerializeField] private Image damageImage;
    [SerializeField] private TextMeshProUGUI healthText;
    [SerializeField] private float damageAnimSpeed = 2f;

    private float _targetFill;
    private float _damageFill;

    public void SetHealth(int current, int max)
    {
        _targetFill = (float)current / max;
        healthText.text = $"{current}/{max}";

        fillImage.fillAmount = _targetFill;

        // Damage indicator catches up slowly
        if (_damageFill < _targetFill)
            _damageFill = _targetFill;
    }

    void Update()
    {
        if (_damageFill > _targetFill)
        {
            _damageFill = Mathf.MoveTowards(_damageFill, _targetFill, damageAnimSpeed * Time.deltaTime);
            damageImage.fillAmount = _damageFill;
        }
    }
}

// Skill button with cooldown
public class SkillButton : MonoBehaviour, IPointerClickHandler
{
    [SerializeField] private Image iconImage;
    [SerializeField] private Image cooldownOverlay;
    [SerializeField] private TextMeshProUGUI cooldownText;
    [SerializeField] private Image chargeIndicator;

    private SkillData _skillData;
    private float _cooldownRemaining;
    private bool _isOnCooldown;

    public void Initialize(SkillData skill)
    {
        _skillData = skill;
        iconImage.sprite = skill.Icon;
    }

    public void OnPointerClick(PointerEventData eventData)
    {
        if (!_isOnCooldown)
        {
            GameplayManager.Instance.UseSkill(_skillData.SkillId);
            StartCooldown(_skillData.Cooldown);
        }
    }

    public void StartCooldown(float duration)
    {
        _cooldownRemaining = duration;
        _isOnCooldown = true;
        StartCoroutine(CooldownRoutine());
    }

    private IEnumerator CooldownRoutine()
    {
        while (_cooldownRemaining > 0)
        {
            _cooldownRemaining -= Time.deltaTime;
            float progress = _cooldownRemaining / _skillData.Cooldown;

            cooldownOverlay.fillAmount = progress;
            cooldownText.text = Mathf.CeilToInt(_cooldownRemaining).ToString();
            cooldownText.gameObject.SetActive(true);

            yield return null;
        }

        _isOnCooldown = false;
        cooldownOverlay.fillAmount = 0;
        cooldownText.gameObject.SetActive(false);
    }
}
```

### Responsive UI Scaling

```csharp
public class UIScaler : MonoBehaviour
{
    [SerializeField] private CanvasScaler canvasScaler;

    // Reference resolution
    private const float ReferenceWidth = 1920f;
    private const float ReferenceHeight = 1080f;

    void Start()
    {
        AdjustScale();
    }

    void AdjustScale()
    {
        float screenRatio = (float)Screen.width / Screen.height;
        float referenceRatio = ReferenceWidth / ReferenceHeight;

        if (screenRatio >= referenceRatio)
        {
            // Wider than reference - match height
            canvasScaler.matchWidthOrHeight = 1f;
        }
        else
        {
            // Taller than reference - match width
            canvasScaler.matchWidthOrHeight = 0f;
        }
    }
}
```

---

## Map & Level Design

### Map Structure

```csharp
[CreateAssetMenu(fileName = "NewMap", menuName = "Game/Map Data")]
public class MapData : ScriptableObject
{
    [Header("Basic Info")]
    public string MapId;
    public string DisplayName;
    public Sprite Thumbnail;
    public Sprite Background;

    [Header("Dimensions")]
    public int Width = 20;      // In tiles
    public int Height = 15;     // In tiles
    public float TileSize = 1f; // Unity units

    [Header("Spawn Configuration")]
    public Vector2[] PlayerSpawnPoints;
    public SpawnZone[] EnemySpawnZones;
    public Vector2 BossSpawnPoint;

    [Header("Environment")]
    public TileSet TileSet;
    public PropPlacement[] Props;
    public HazardZone[] Hazards;

    [Header("Gameplay")]
    public float BaseWaveInterval = 5f;
    public WaveConfig[] Waves;
    public int MaxEnemiesAlive = 30;

    [Header("Music & Ambience")]
    public string MusicTrack;
    public string AmbienceTrack;
}

[System.Serializable]
public class SpawnZone
{
    public Rect Area;
    public float SpawnWeight = 1f;
    public bool EdgeOnly = false;
}

[System.Serializable]
public class WaveConfig
{
    public int WaveNumber;
    public EnemySpawnEntry[] Enemies;
    public float SpawnDelay;
    public bool IsBossWave;
}

[System.Serializable]
public class EnemySpawnEntry
{
    public string EnemyId;
    public int Count;
    public float SpawnInterval;
}

[System.Serializable]
public class PropPlacement
{
    public GameObject Prefab;
    public Vector2 Position;
    public float Rotation;
    public bool BlocksMovement;
    public bool BlocksProjectiles;
}

[System.Serializable]
public class HazardZone
{
    public Rect Area;
    public HazardType Type;
    public float DamagePerSecond;
    public float TickInterval = 0.5f;
}

public enum HazardType
{
    Fire,
    Poison,
    Spikes,
    Water,
    Void
}
```

### Map Templates

```
Available Maps:
┌─────────────────────────────────────────────────────────────┐
│ Map Name      │ Size   │ Theme     │ Difficulty │ Waves    │
├───────────────┼────────┼───────────┼────────────┼──────────┤
│ Forest Glade  │ 20x15  │ Forest    │ ★☆☆☆☆     │ 10       │
│ Dark Cave     │ 25x20  │ Cave      │ ★★☆☆☆     │ 15       │
│ Lava Pits     │ 20x15  │ Volcanic  │ ★★★☆☆     │ 15       │
│ Ice Cavern    │ 25x20  │ Ice       │ ★★★☆☆     │ 20       │
│ Ancient Ruins │ 30x20  │ Ruins     │ ★★★★☆     │ 25       │
│ Shadow Realm  │ 25x25  │ Dark      │ ★★★★★     │ 30       │
└───────────────┴────────┴───────────┴────────────┴──────────┘

PvP Arenas:
┌─────────────────────────────────────────────────────────────┐
│ Arena Name    │ Size   │ Players   │ Hazards    │ Pickups  │
├───────────────┼────────┼───────────┼────────────┼──────────┤
│ Colosseum     │ 20x20  │ 2-4       │ None       │ Health   │
│ Lava Ring     │ 25x25  │ 2-4       │ Shrinking  │ Buff     │
│ Ice Duel      │ 15x15  │ 2         │ Slippery   │ None     │
│ Chaos Arena   │ 30x30  │ 4-8       │ Random     │ All      │
└───────────────┴────────┴───────────┴────────────┴──────────┘
```

### Tileset Configuration

```csharp
[CreateAssetMenu(fileName = "NewTileSet", menuName = "Game/Tile Set")]
public class TileSet : ScriptableObject
{
    [Header("Ground Tiles")]
    public TileBase[] GroundTiles;        // Main walkable
    public TileBase[] GroundVariants;     // Visual variety

    [Header("Wall Tiles")]
    public TileBase[] WallTiles;          // Blocking
    public TileBase[] WallTopTiles;       // Top decoration

    [Header("Transition Tiles")]
    public TileBase[] EdgeTiles;          // Blob autotile (47 tiles)

    [Header("Props")]
    public TileBase[] SmallProps;         // Non-blocking decor
    public TileBase[] LargeProps;         // Blocking decor

    [Header("Special")]
    public TileBase SpawnPointTile;       // Visual marker only
    public TileBase ExitPointTile;        // Level exit
    public TileBase HazardTile;           // Damage zone

    // Auto-tiling rules
    public RuleTile GroundRuleTile;
    public RuleTile WallRuleTile;
}
```

---

## Content Pipeline

### Asset Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   ASSET PIPELINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CREATION                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Art: Aseprite/Photoshop → PNG → Unity                │   │
│  │ Audio: FL Studio/Audacity → OGG/WAV → Unity          │   │
│  │ Data: Google Sheets → CSV → Unity ScriptableObjects  │   │
│  │ Levels: Tiled/LDtk → JSON → Unity Tilemaps           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  2. PROCESSING                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Unity Import Settings (automatic via AssetPostproc) │   │
│  │ → Sprite slicing                                     │   │
│  │ → Atlas packing                                      │   │
│  │ → Audio compression                                  │   │
│  │ → Data validation                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  3. BUNDLING                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Asset Bundles (for dynamic loading):                 │   │
│  │ → Core (always loaded)                               │   │
│  │ → Characters (per-skin bundles)                      │   │
│  │ → Maps (per-map bundles)                             │   │
│  │ → Audio (streaming bundles)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  4. DELIVERY                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ WebGL: Addressables with CDN caching                 │   │
│  │ Mobile: Initial install + on-demand download         │   │
│  │ Desktop: Full installation                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Import from Spreadsheets

```csharp
#if UNITY_EDITOR
using UnityEditor;
using System.IO;

public class DataImporter : EditorWindow
{
    [MenuItem("Tools/Import Game Data")]
    static void ImportData()
    {
        ImportEnemies();
        ImportSkills();
        ImportEquipment();
        ImportWaves();

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        Debug.Log("Data import complete!");
    }

    static void ImportEnemies()
    {
        string csv = File.ReadAllText("Assets/Data/CSV/Enemies.csv");
        string[] lines = csv.Split('\n');

        // Skip header
        for (int i = 1; i < lines.Length; i++)
        {
            string[] values = lines[i].Split(',');
            if (values.Length < 10) continue;

            string id = values[0].Trim();
            string path = $"Assets/Data/Enemies/{id}.asset";

            EnemyData enemy = AssetDatabase.LoadAssetAtPath<EnemyData>(path);
            if (enemy == null)
            {
                enemy = ScriptableObject.CreateInstance<EnemyData>();
                AssetDatabase.CreateAsset(enemy, path);
            }

            enemy.EnemyId = id;
            enemy.DisplayName = values[1].Trim();
            enemy.BaseHealth = int.Parse(values[2]);
            enemy.BaseAttack = int.Parse(values[3]);
            enemy.BaseDefense = int.Parse(values[4]);
            enemy.MoveSpeed = float.Parse(values[5]);
            enemy.AttackRange = float.Parse(values[6]);
            enemy.AttackCooldown = float.Parse(values[7]);
            enemy.ExpReward = int.Parse(values[8]);
            enemy.GoldReward = int.Parse(values[9]);

            EditorUtility.SetDirty(enemy);
        }
    }

    static void ImportSkills()
    {
        // Similar pattern for skills...
    }

    static void ImportEquipment()
    {
        // Similar pattern for equipment...
    }

    static void ImportWaves()
    {
        // Similar pattern for wave configs...
    }
}
#endif
```

### Addressable Assets Configuration

```csharp
// Addressable asset labels
public static class AssetLabels
{
    public const string Core = "core";
    public const string Characters = "characters";
    public const string Enemies = "enemies";
    public const string Effects = "effects";
    public const string UI = "ui";
    public const string Audio = "audio";
    public const string Maps = "maps";
}

// Asset loader with caching
public class AssetLoader : MonoBehaviour
{
    private static Dictionary<string, Object> _cache = new();
    private static Dictionary<string, AsyncOperationHandle> _handles = new();

    public static async Task<T> LoadAsync<T>(string address) where T : Object
    {
        if (_cache.TryGetValue(address, out Object cached))
            return cached as T;

        var handle = Addressables.LoadAssetAsync<T>(address);
        _handles[address] = handle;

        T result = await handle.Task;
        _cache[address] = result;

        return result;
    }

    public static async Task PreloadLabel(string label)
    {
        var locations = await Addressables.LoadResourceLocationsAsync(label).Task;

        var tasks = new List<Task>();
        foreach (var location in locations)
        {
            tasks.Add(Addressables.LoadAssetAsync<Object>(location).Task);
        }

        await Task.WhenAll(tasks);
        Debug.Log($"Preloaded {tasks.Count} assets with label '{label}'");
    }

    public static void Unload(string address)
    {
        if (_handles.TryGetValue(address, out var handle))
        {
            Addressables.Release(handle);
            _handles.Remove(address);
            _cache.Remove(address);
        }
    }

    public static void UnloadAll()
    {
        foreach (var handle in _handles.Values)
        {
            Addressables.Release(handle);
        }
        _handles.Clear();
        _cache.Clear();
    }
}
```

### Build Configuration

```csharp
#if UNITY_EDITOR
public class BuildPipeline : MonoBehaviour
{
    [MenuItem("Build/WebGL Development")]
    static void BuildWebGLDev()
    {
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetScenes(),
            locationPathName = "Builds/WebGL-Dev",
            target = BuildTarget.WebGL,
            options = BuildOptions.Development | BuildOptions.AllowDebugging
        };

        // WebGL specific settings
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.memorySize = 512;
        PlayerSettings.WebGL.linkerTarget = WebGLLinkerTarget.Wasm;

        UnityEditor.BuildPipeline.BuildPlayer(options);
    }

    [MenuItem("Build/WebGL Production")]
    static void BuildWebGLProd()
    {
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetScenes(),
            locationPathName = "Builds/WebGL-Prod",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        };

        // Production settings
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;

        UnityEditor.BuildPipeline.BuildPlayer(options);
    }

    static string[] GetScenes()
    {
        return new[]
        {
            "Assets/Scenes/Bootstrap.unity",
            "Assets/Scenes/MainMenu.unity",
            "Assets/Scenes/Gameplay.unity",
            "Assets/Scenes/Loading.unity"
        };
    }
}
#endif
```

---

## Version Control for Assets

### Git LFS Configuration

```gitattributes
# Unity specific
*.unity binary
*.prefab binary
*.asset binary
*.meta text

# Images
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.psd filter=lfs diff=lfs merge=lfs -text
*.tga filter=lfs diff=lfs merge=lfs -text

# Audio
*.wav filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text

# Video
*.mp4 filter=lfs diff=lfs merge=lfs -text

# 3D (if needed later)
*.fbx filter=lfs diff=lfs merge=lfs -text

# Fonts
*.ttf filter=lfs diff=lfs merge=lfs -text
*.otf filter=lfs diff=lfs merge=lfs -text

# Archives
*.zip filter=lfs diff=lfs merge=lfs -text

# Unity large files
*.cubemap filter=lfs diff=lfs merge=lfs -text
*.unitypackage filter=lfs diff=lfs merge=lfs -text
```

### Asset Naming Convention

```
Naming Standards:
┌─────────────────────────────────────────────────────────────┐
│ Category        │ Format                    │ Example       │
├─────────────────┼───────────────────────────┼───────────────┤
│ Sprites         │ Type_Name_Variant         │ Slime_Blue_Idle│
│ Animations      │ Char_Action_Dir           │ Slime_Walk_R  │
│ Audio SFX       │ Category_Name_Num         │ Hit_Sword_01  │
│ Audio Music     │ Style_Name                │ Battle_Boss   │
│ UI Elements     │ UI_Category_Name          │ UI_Btn_Play   │
│ Prefabs         │ Pfb_Category_Name         │ Pfb_Enemy_Goblin│
│ Materials       │ Mat_Name                  │ Mat_Slime     │
│ ScriptableObj   │ SO_Type_Name              │ SO_Skill_Fireball│
│ Scenes          │ Scn_Name                  │ Scn_MainMenu  │
└─────────────────┴───────────────────────────┴───────────────┘

File Organization:
- Use lowercase with underscores for folders
- Use PascalCase for asset files
- Group related assets in subfolders
- Keep source files (.psd, .aseprite) in a separate /Source folder
```

---

## Asset Budget

```
Target Build Size: < 50 MB (WebGL initial load)

Asset Size Breakdown:
┌─────────────────────────────────────────────────────────────┐
│ Category             │ Uncompressed │ Compressed │ Notes    │
├──────────────────────┼──────────────┼────────────┼──────────┤
│ Character Sprites    │ 8 MB         │ 2 MB       │ 5 chars  │
│ Enemy Sprites        │ 12 MB        │ 3 MB       │ 20 types │
│ Effect Sprites       │ 8 MB         │ 2 MB       │ VFX      │
│ UI Sprites           │ 6 MB         │ 1.5 MB     │ All UI   │
│ Environment          │ 10 MB        │ 2.5 MB     │ 6 maps   │
│ Audio (Music)        │ 20 MB        │ 8 MB       │ Streaming│
│ Audio (SFX)          │ 10 MB        │ 4 MB       │ Preload  │
│ Fonts                │ 2 MB         │ 0.5 MB     │ 2 fonts  │
│ Code/Scripts         │ N/A          │ 5 MB       │ WASM     │
│ Data (JSON/SO)       │ 2 MB         │ 0.5 MB     │ Configs  │
├──────────────────────┼──────────────┼────────────┼──────────┤
│ **Total**            │ **~78 MB**   │ **~29 MB** │          │
└──────────────────────┴──────────────┴────────────┴──────────┘

Optimization Strategies:
1. Sprite atlasing reduces draw calls and file count
2. Audio streaming for music (no preload)
3. Brotli compression for WebGL
4. Lazy loading for non-essential content
5. LOD system for effects on low-end devices
```

---

## Next Section

Continue to **Section VIII: Development Milestones** for project phases and deliverables.

---

# VIII. Development Milestones

## Overview

This section outlines the development phases, MVP scope, feature priorities, and release roadmap for the game clone project.

---

## Development Phases

```
┌─────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT PHASES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 0: Foundation                                        │
│  ├── Project setup (Unity, Git, CI/CD)                     │
│  ├── Core architecture implementation                       │
│  ├── Basic networking (WebSocket connection)                │
│  └── Development environment                                │
│                                                             │
│  Phase 1: Prototype (MVP)                                   │
│  ├── Single player gameplay loop                            │
│  ├── Basic combat system                                    │
│  ├── Enemy spawning and AI                                  │
│  ├── Level progression                                      │
│  └── Placeholder art                                        │
│                                                             │
│  Phase 2: Core Features                                     │
│  ├── Multiplayer infrastructure                             │
│  ├── Account system                                         │
│  ├── Equipment system                                       │
│  ├── Skill system                                           │
│  └── Basic UI                                               │
│                                                             │
│  Phase 3: Content                                           │
│  ├── Multiple maps/stages                                   │
│  ├── Enemy variety                                          │
│  ├── Equipment tiers                                        │
│  ├── Skill trees                                            │
│  └── Art assets                                             │
│                                                             │
│  Phase 4: Game Modes                                        │
│  ├── PvP Arena                                              │
│  ├── Co-op Boss Raids                                       │
│  ├── Guild system                                           │
│  └── Leaderboards                                           │
│                                                             │
│  Phase 5: Polish & Launch                                   │
│  ├── Audio implementation                                   │
│  ├── VFX polish                                             │
│  ├── Performance optimization                               │
│  ├── Bug fixes                                              │
│  └── Soft launch / Beta                                     │
│                                                             │
│  Phase 6: Live Operations                                   │
│  ├── Events and seasons                                     │
│  ├── New content updates                                    │
│  ├── Balance patches                                        │
│  └── Community features                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Foundation

### Objectives
- Set up development environment
- Establish project architecture
- Create basic networking layer

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Unity Project Setup | Create Unity project with folder structure | P0 |
| Git Repository | Initialize with LFS, .gitignore, branching strategy | P0 |
| Go Server Scaffold | Basic Pitaya server with health checks | P0 |
| WebSocket Connection | Client connects to server successfully | P0 |
| Packet System | Basic send/receive with protobuf | P0 |
| CI/CD Pipeline | Automated builds for server and client | P1 |
| Development Docker | Local dev environment with Redis/MySQL | P1 |
| Logging System | Structured logging on both ends | P1 |

### Acceptance Criteria
- [ ] Unity project builds for WebGL without errors
- [ ] Go server starts and accepts connections
- [ ] Client can connect, send, and receive packets
- [ ] CI builds pass on push to main

---

## Phase 1: Prototype (MVP)

### Objectives
- Playable single-player survival loop
- Core combat feels responsive
- Basic progression system

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Player Controller | Movement, collision, basic attack | P0 |
| Camera System | Follow player with bounds | P0 |
| Enemy Spawner | Wave-based spawning from edges | P0 |
| Basic Enemy AI | Chase and attack player | P0 |
| Combat System | Damage calculation, hit detection | P0 |
| Health System | HP, damage, death | P0 |
| XP & Leveling | Gain XP from kills, level up | P0 |
| Basic Skills | 2-3 auto-targeting skills | P1 |
| Timer/Survival | Survive X minutes to win | P1 |
| Placeholder Art | Simple shapes with color coding | P1 |
| Basic HUD | Health bar, XP bar, timer | P1 |

### Acceptance Criteria
- [ ] Player can move and attack enemies
- [ ] Enemies spawn in waves and chase player
- [ ] Player gains XP and levels up
- [ ] Game ends when player dies or timer completes
- [ ] 5 minutes of engaging gameplay

---

## Phase 2: Core Features

### Objectives
- Server-authoritative multiplayer
- Persistent player accounts
- Equipment and skill systems

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Auth System | Login/Register with JWT | P0 |
| Database Integration | MySQL for accounts, Redis for sessions | P0 |
| Server Authority | Server validates all actions | P0 |
| Client Prediction | Smooth movement with reconciliation | P0 |
| Entity Interpolation | Smooth remote entities | P0 |
| Equipment Data | Stats, slots, types | P0 |
| Equipment UI | Inventory, equip/unequip | P0 |
| Skill System | Skill definitions, cooldowns | P0 |
| Skill Tree UI | View and unlock skills | P1 |
| Stat System | ATK, DEF, HP, etc. with modifiers | P0 |
| Buff System | Temporary stat modifications | P1 |
| Main Menu | Login, character select, play | P1 |

### Acceptance Criteria
- [ ] Players can create accounts and login
- [ ] Game state is validated server-side
- [ ] Equipment affects player stats
- [ ] Skills can be unlocked and used
- [ ] Multiplayer session with 2+ players works

---

## Phase 3: Content

### Objectives
- Multiple playable stages
- Diverse enemy types
- Meaningful progression

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Map System | Load different maps/tilesets | P0 |
| 6 Maps | Forest, Cave, Lava, Ice, Ruins, Shadow | P0 |
| 15+ Enemy Types | Variety of behaviors and elements | P0 |
| 3 Boss Enemies | Multi-phase boss fights | P1 |
| Equipment Tiers | Common → Mythic rarity | P0 |
| 30+ Equipment Items | Weapons, armor, accessories | P0 |
| 20+ Skills | Variety across elements | P0 |
| Character Skins | 5 base slime variants | P1 |
| Final Art Assets | Sprites, animations, effects | P0 |
| Sound Effects | Combat, UI, environment | P1 |
| Music Tracks | Menu, battle, boss themes | P1 |

### Acceptance Criteria
- [ ] All 6 maps playable with unique themes
- [ ] 15+ distinct enemy types with behaviors
- [ ] Full equipment progression path
- [ ] All skills implemented and balanced
- [ ] Art assets complete (no placeholders)

---

## Phase 4: Game Modes

### Objectives
- Competitive multiplayer
- Cooperative gameplay
- Social features

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Arena System | Async PvP with leaderboard rankings | P0 |
| Defense Builds | Players set builds AI controls in defense | P0 |
| Battle Simulation | AI vs AI async combat | P0 |
| ELO/MMR System | Skill-based rankings and opponent selection | P0 |
| Arena Seasons | Seasonal rankings with rewards | P1 |
| Guild System | Create, join, manage guilds | P1 |
| Guild Boss | Guild members attack shared boss | P2 |
| Leaderboards | Rankings (arena, power, level) | P0 |
| Daily/Weekly Rewards | Login bonuses, quests | P1 |
| Achievement System | Unlock achievements | P2 |
| Friends List | Add friends, view profiles | P1 |
| Chat System | Global, guild chat | P1 |

### Acceptance Criteria
- [ ] Players can challenge opponents from arena leaderboard
- [ ] Defense builds are properly stored and simulated
- [ ] ELO changes correctly reflect battle outcomes
- [ ] Guilds function with proper permissions
- [ ] Leaderboards update in real-time

---

## Phase 5: Polish & Launch

### Objectives
- Production-ready quality
- Performance optimization
- Beta testing

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Tutorial System | New player onboarding | P0 |
| Settings Menu | Audio, graphics, controls | P0 |
| Performance Optimization | 60 FPS on target devices | P0 |
| Memory Optimization | < 256MB RAM usage | P0 |
| Load Time Optimization | < 10s initial load | P0 |
| Bug Fixing | Critical and major bugs | P0 |
| Balance Pass | Stats, difficulty curves | P0 |
| Localization | English + 2 languages | P1 |
| Analytics Integration | Tracking key metrics | P0 |
| Crash Reporting | Sentry/Crashlytics | P0 |
| Beta Test | Closed beta with feedback | P0 |
| Server Scaling Test | Load test 1000+ CCU | P0 |

### Acceptance Criteria
- [ ] New players understand game within 5 minutes
- [ ] Game runs at 60 FPS on mid-tier devices
- [ ] No game-breaking bugs
- [ ] Server handles expected load
- [ ] Beta feedback incorporated

---

## Phase 6: Live Operations

### Objectives
- Ongoing content updates
- Player retention features
- Community growth

### Deliverables

| Task | Description | Priority |
|------|-------------|----------|
| Seasonal Events | Limited-time game modes | P0 |
| Battle Pass | Seasonal progression track | P1 |
| New Maps | Additional stages | P1 |
| New Characters | Additional slime types | P1 |
| New Equipment | Content updates | P1 |
| Balance Updates | Regular meta adjustments | P0 |
| Community Events | Tournaments, contests | P1 |
| Quality of Life | Player-requested features | P0 |
| Bug Fixes | Ongoing maintenance | P0 |

### Cadence
- **Weekly**: Bug fixes, small balance changes
- **Bi-weekly**: Minor content additions
- **Monthly**: Major content update
- **Quarterly**: Seasonal event / battle pass

---

## Feature Priority Matrix

```
Priority Definitions:
┌────────┬────────────────────────────────────────────────────┐
│ P0     │ Must have - Required for phase completion          │
│ P1     │ Should have - Important but not blocking           │
│ P2     │ Nice to have - Can be deferred to later phases     │
│ P3     │ Future consideration - Post-launch features        │
└────────┴────────────────────────────────────────────────────┘

Feature Matrix:
┌─────────────────────────┬────────┬─────────────────────────┐
│ Feature                 │ Priority│ Phase                  │
├─────────────────────────┼────────┼─────────────────────────┤
│ Core Combat             │ P0     │ Phase 1                 │
│ Enemy AI                │ P0     │ Phase 1                 │
│ Level Progression       │ P0     │ Phase 1                 │
│ Multiplayer             │ P0     │ Phase 2                 │
│ Account System          │ P0     │ Phase 2                 │
│ Equipment               │ P0     │ Phase 2                 │
│ Skills                  │ P0     │ Phase 2                 │
│ Multiple Maps           │ P0     │ Phase 3                 │
│ Boss Fights             │ P1     │ Phase 3                 │
│ PvP Arena               │ P0     │ Phase 4                 │
│ Co-op Raids             │ P0     │ Phase 4                 │
│ Guilds                  │ P1     │ Phase 4                 │
│ Leaderboards            │ P0     │ Phase 4                 │
│ Tutorial                │ P0     │ Phase 5                 │
│ Achievements            │ P2     │ Phase 4                 │
│ Battle Pass             │ P1     │ Phase 6                 │
│ Seasonal Events         │ P0     │ Phase 6                 │
│ Spectator Mode          │ P3     │ Post-launch             │
│ Replay System           │ P3     │ Post-launch             │
│ Custom Matches          │ P2     │ Post-launch             │
│ Map Editor              │ P3     │ Post-launch             │
└─────────────────────────┴────────┴─────────────────────────┘
```

---

## MVP Definition

### Minimum Viable Product (End of Phase 1)

```
MVP Feature Set:
┌─────────────────────────────────────────────────────────────┐
│ ✅ INCLUDED                     │ ❌ NOT INCLUDED           │
├─────────────────────────────────┼───────────────────────────┤
│ Player movement & attack        │ Multiplayer               │
│ Enemy waves (3 types)           │ Account persistence       │
│ Basic combat (hit/damage)       │ Equipment system          │
│ XP and leveling (1-10)          │ Multiple maps             │
│ 3 skills (auto-target)          │ PvP/Co-op modes           │
│ Survival timer (5 min)          │ Guilds                    │
│ Win/lose conditions             │ Leaderboards              │
│ Basic HUD                       │ Final art assets          │
│ Placeholder graphics            │ Sound/music               │
│ WebGL build                     │ Mobile support            │
└─────────────────────────────────┴───────────────────────────┘

MVP Success Metrics:
- Session length: 5+ minutes average
- Retry rate: 60%+ of players retry after death
- Completion rate: 20%+ survive 5 minutes
- Bug reports: < 5 critical bugs
```

---

## Risk Assessment

```
┌─────────────────────────────────────────────────────────────┐
│ Risk                    │ Impact │ Likelihood │ Mitigation  │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Scope creep             │ High   │ High       │ Strict MVP  │
│                         │        │            │ definition  │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Network sync issues     │ High   │ Medium     │ Early       │
│                         │        │            │ prototype   │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Performance problems    │ Medium │ Medium     │ Regular     │
│                         │        │            │ profiling   │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Art asset delays        │ Medium │ Medium     │ Placeholder │
│                         │        │            │ art first   │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Server scaling issues   │ High   │ Low        │ Load test   │
│                         │        │            │ early       │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Balance problems        │ Medium │ High       │ Data-driven │
│                         │        │            │ tuning      │
├─────────────────────────┼────────┼────────────┼─────────────┤
│ Security vulnerabilities│ High   │ Medium     │ Security    │
│                         │        │            │ audit       │
└─────────────────────────┴────────┴────────────┴─────────────┘
```

---

## Technical Debt Management

### Debt Categories

1. **Intentional Debt** (Acceptable for MVP)
   - Placeholder assets
   - Hardcoded values (to be data-driven)
   - Basic error handling
   - Minimal logging

2. **Track and Fix** (Fix before Phase 3)
   - Code duplication
   - Missing unit tests
   - Incomplete documentation
   - Performance shortcuts

3. **Never Accept**
   - Security vulnerabilities
   - Data corruption risks
   - Critical race conditions
   - Unrecoverable errors

### Debt Tracking

```csharp
// Use TODO comments with categories
// TODO(P1): Replace with data-driven config
// TODO(PERF): Optimize this loop for large enemy counts
// TODO(SEC): Validate input before processing
// HACK: Temporary fix for issue #123
// FIXME: This breaks with > 100 enemies

// Track in code and periodically audit
public static class TechDebtTracker
{
    // Run in editor to list all TODOs
    [MenuItem("Tools/List Tech Debt")]
    static void ListTechDebt()
    {
        // Scan all .cs files for TODO/HACK/FIXME comments
        // Output to console with file:line references
    }
}
```

---

## Definition of Done

### Per-Feature Checklist

```
Feature Complete When:
☐ Functionality works as specified
☐ Unit tests written and passing
☐ Integration tested with related systems
☐ No critical/major bugs
☐ Performance within targets
☐ Code reviewed and approved
☐ Documentation updated (if API changed)
☐ No compiler warnings
☐ Works on target platform (WebGL)

Additional for Multiplayer Features:
☐ Server-side validation implemented
☐ Client prediction/reconciliation working
☐ Tested with 100ms simulated latency
☐ Handles disconnection gracefully

Additional for UI Features:
☐ Responsive on target resolutions
☐ Accessible (readable text, contrast)
☐ Sound effects connected
☐ Animations smooth
```

---

## Quality Gates

### Phase Completion Requirements

```
Phase 0 → Phase 1:
☐ All P0 tasks complete
☐ CI/CD pipeline working
☐ Development environment documented

Phase 1 → Phase 2:
☐ MVP playable end-to-end
☐ 5-minute gameplay session possible
☐ Core loop is engaging (playtest feedback)

Phase 2 → Phase 3:
☐ Multiplayer stable with 4+ players
☐ Account persistence working
☐ Equipment/Skills systems complete

Phase 3 → Phase 4:
☐ All 6 maps playable
☐ 15+ enemy types implemented
☐ Art assets complete
☐ Balance pass complete

Phase 4 → Phase 5:
☐ All game modes functional
☐ Arena PvP working
☐ Guilds operational
☐ Leaderboards live

Phase 5 → Launch:
☐ All P0/P1 bugs fixed
☐ Performance targets met
☐ Beta feedback addressed
☐ Server load tested
☐ Analytics working
☐ Crash reporting active
```

---

# IX. UI/Theme System

## Rarity System

The game uses an 11-tier rarity system for items, equipment, characters, and other collectibles.

### Rarity Tiers (Lowest to Highest)

| Tier | Rarity | Description |
|------|--------|-------------|
| 1 | Normal | Common drops, basic items |
| 2 | Unique | Uncommon, slightly better stats |
| 3 | Well | Above average quality |
| 4 | Rare | Noticeably powerful |
| 5 | Mythic | Strong items, harder to obtain |
| 6 | Epic | Very powerful, gacha featured |
| 7 | Legendary | Extremely rare and powerful |
| 8 | Immortal | Near top-tier, prestige items |
| 9 | Supreme | Elite tier, very hard to obtain |
| 10 | Aurous | Ultra-rare, special events |
| 11 | Eternal | Highest tier, ultimate rarity |

### Rarity Color Palette

Each rarity has a two-tone color scheme (dark/light) used for gradients on item borders, backgrounds, and UI elements.

| Rarity | Dark Side | Light Side | Preview |
|--------|-----------|------------|---------|
| **Normal** | `#8DA5B0` | `#F7F7F7` | Gray/White |
| **Unique** | `#32A178` | `#74F48C` | Green |
| **Well** | `#2089AD` | `#76E1FF` | Cyan/Teal |
| **Rare** | `#A948D9` | `#ECA3FF` | Purple/Violet |
| **Mythic** | `#CFAF0E` | `#FFF766` | Yellow/Gold |
| **Epic** | `#E77019` | `#FFB165` | Orange |
| **Legendary** | `#E83737` | `#FF756F` | Red/Crimson |
| **Immortal** | `#FE789A` | `#FFC6D5` | Pink |
| **Supreme** | `#3385F5` | `#8FB4FF` | Blue |
| **Aurous** | `#E2A010` | `#FFD500` | Gold gradient |
| **Eternal** | Rainbow/Iridescent | Animated gradient | Multicolor |

### Rarity Enum (Protobuf)

```protobuf
// proto/common.proto

enum Rarity {
    RARITY_NORMAL = 0;
    RARITY_UNIQUE = 1;
    RARITY_WELL = 2;
    RARITY_RARE = 3;
    RARITY_MYTHIC = 4;
    RARITY_EPIC = 5;
    RARITY_LEGENDARY = 6;
    RARITY_IMMORTAL = 7;
    RARITY_SUPREME = 8;
    RARITY_AUROUS = 9;
    RARITY_ETERNAL = 10;
}
```

### Rarity Colors (C# Client)

```csharp
// Scripts/UI/Theme/RarityColors.cs

using UnityEngine;

public static class RarityColors
{
    public struct RarityColorPair
    {
        public Color Dark;
        public Color Light;

        public RarityColorPair(string darkHex, string lightHex)
        {
            ColorUtility.TryParseHtmlString(darkHex, out Dark);
            ColorUtility.TryParseHtmlString(lightHex, out Light);
        }
    }

    public static readonly RarityColorPair Normal = new("#8DA5B0", "#F7F7F7");
    public static readonly RarityColorPair Unique = new("#32A178", "#74F48C");
    public static readonly RarityColorPair Well = new("#2089AD", "#76E1FF");
    public static readonly RarityColorPair Rare = new("#A948D9", "#ECA3FF");
    public static readonly RarityColorPair Mythic = new("#CFAF0E", "#FFF766");
    public static readonly RarityColorPair Epic = new("#E77019", "#FFB165");
    public static readonly RarityColorPair Legendary = new("#E83737", "#FF756F");
    public static readonly RarityColorPair Immortal = new("#FE789A", "#FFC6D5");
    public static readonly RarityColorPair Supreme = new("#3385F5", "#8FB4FF");
    public static readonly RarityColorPair Aurous = new("#E2A010", "#FFD500");
    // Eternal uses animated rainbow shader

    private static readonly RarityColorPair[] _colors =
    {
        Normal, Unique, Well, Rare, Mythic,
        Epic, Legendary, Immortal, Supreme, Aurous
    };

    public static RarityColorPair GetColors(Rarity rarity)
    {
        int index = (int)rarity;
        if (index >= 0 && index < _colors.Length)
            return _colors[index];
        return Normal;
    }

    public static bool IsEternal(Rarity rarity) => rarity == Rarity.Eternal;
}
```

### Rarity Gradient Shader

```hlsl
// Shaders/UI/RarityGradient.shader

Shader "UI/RarityGradient"
{
    Properties
    {
        _DarkColor ("Dark Color", Color) = (1,1,1,1)
        _LightColor ("Light Color", Color) = (1,1,1,1)
        _GradientAngle ("Gradient Angle", Range(0, 360)) = 135
        _MainTex ("Texture", 2D) = "white" {}
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        Blend SrcAlpha OneMinusSrcAlpha

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            fixed4 _DarkColor;
            fixed4 _LightColor;
            float _GradientAngle;
            sampler2D _MainTex;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float angle = radians(_GradientAngle);
                float2 dir = float2(cos(angle), sin(angle));
                float t = dot(i.uv - 0.5, dir) + 0.5;
                t = saturate(t);

                fixed4 col = lerp(_DarkColor, _LightColor, t);
                fixed4 tex = tex2D(_MainTex, i.uv);
                return col * tex;
            }
            ENDCG
        }
    }
}
```

### Eternal Rarity Rainbow Shader

```hlsl
// Shaders/UI/EternalRainbow.shader

Shader "UI/EternalRainbow"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Speed ("Animation Speed", Range(0.1, 5)) = 1.0
        _Saturation ("Saturation", Range(0, 1)) = 0.8
        _Brightness ("Brightness", Range(0, 1)) = 0.9
    }

    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        Blend SrcAlpha OneMinusSrcAlpha

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float _Speed;
            float _Saturation;
            float _Brightness;

            // HSV to RGB conversion
            float3 hsv2rgb(float3 c)
            {
                float4 K = float4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
                float3 p = abs(frac(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * lerp(K.xxx, saturate(p - K.xxx), c.y);
            }

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // Animated hue based on position and time
                float hue = frac(i.uv.x * 0.5 + i.uv.y * 0.3 + _Time.y * _Speed * 0.1);
                float3 rainbow = hsv2rgb(float3(hue, _Saturation, _Brightness));

                fixed4 tex = tex2D(_MainTex, i.uv);
                return fixed4(rainbow, tex.a);
            }
            ENDCG
        }
    }
}
```

### Item Frame Component

```csharp
// Scripts/UI/Components/ItemFrame.cs

using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(Image))]
public class ItemFrame : MonoBehaviour
{
    [SerializeField] private Image _borderImage;
    [SerializeField] private Image _backgroundImage;
    [SerializeField] private Image _iconImage;
    [SerializeField] private Material _gradientMaterial;
    [SerializeField] private Material _rainbowMaterial;

    private Rarity _currentRarity = Rarity.Normal;

    public void SetRarity(Rarity rarity)
    {
        _currentRarity = rarity;

        if (RarityColors.IsEternal(rarity))
        {
            // Use rainbow shader for Eternal
            _borderImage.material = _rainbowMaterial;
            _backgroundImage.material = _rainbowMaterial;
        }
        else
        {
            // Use gradient for other rarities
            var colors = RarityColors.GetColors(rarity);

            Material mat = new Material(_gradientMaterial);
            mat.SetColor("_DarkColor", colors.Dark);
            mat.SetColor("_LightColor", colors.Light);

            _borderImage.material = mat;
            _backgroundImage.material = mat;
        }
    }

    public void SetIcon(Sprite icon)
    {
        _iconImage.sprite = icon;
    }
}
```

---

## UI Color Palette

### Primary Colors

| Usage | Color | Hex |
|-------|-------|-----|
| Primary Action | Blue | `#4A90D9` |
| Secondary Action | Gray | `#6B7280` |
| Success | Green | `#22C55E` |
| Warning | Yellow | `#EAB308` |
| Error/Danger | Red | `#EF4444` |
| Info | Cyan | `#06B6D4` |

### Background Colors

| Usage | Color | Hex |
|-------|-------|-----|
| Panel Dark | Dark Blue-Gray | `#1F2937` |
| Panel Medium | Medium Gray | `#374151` |
| Panel Light | Light Gray | `#4B5563` |
| Overlay | Black 60% | `#000000 @ 60%` |
| Modal Background | Dark | `#111827` |

### Text Colors

| Usage | Color | Hex |
|-------|-------|-----|
| Primary Text | White | `#FFFFFF` |
| Secondary Text | Light Gray | `#D1D5DB` |
| Muted Text | Gray | `#9CA3AF` |
| Disabled Text | Dark Gray | `#6B7280` |
| Link Text | Blue | `#60A5FA` |

---

## Typography

### Font Stack

```csharp
// Recommended fonts for mobile game UI
Primary Font: "Nunito" or "Poppins" (clean, rounded, readable)
Numeric Font: "Roboto Mono" (monospace for stats/numbers)
Decorative Font: "Cinzel" (for titles, headers)
```

### Text Sizes (Reference Resolution: 1920x1080)

| Usage | Size | Weight |
|-------|------|--------|
| Title Large | 48px | Bold |
| Title | 36px | Bold |
| Header | 28px | SemiBold |
| Subheader | 22px | SemiBold |
| Body Large | 18px | Regular |
| Body | 16px | Regular |
| Caption | 14px | Regular |
| Small | 12px | Regular |

---

## UI Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Button Press | 100ms | EaseOutQuad |
| Panel Open | 300ms | EaseOutBack |
| Panel Close | 200ms | EaseInQuad |
| Fade In | 200ms | EaseOutQuad |
| Fade Out | 150ms | EaseInQuad |
| Item Popup | 400ms | EaseOutElastic |
| Number Tick | 50ms per digit | Linear |
| Rarity Shine | 2000ms | Linear (loop) |

---

## Appendix: Quick Reference

### Key Metrics Targets

| Metric | Target |
|--------|--------|
| Frame Rate | 60 FPS |
| Initial Load | < 10 seconds |
| Memory (Client) | < 256 MB |
| Packet Latency | < 100ms P95 |
| Concurrent Users | 10,000 |
| Server Response | < 50ms |
| Client Tick Rate | 20 Hz |
| Server Tick Rate | 20 Hz |

### Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Game Engine | Unity 2022 LTS |
| Platform | WebGL |
| Server Framework | Go + Pitaya |
| Database | MySQL + Redis |
| Message Broker | NATS |
| Serialization | Protocol Buffers |
| Transport | WebSocket |
| Encryption | AES-128-CBC |
| CI/CD | GitHub Actions |
| Hosting | Kubernetes |
| CDN | CloudFlare |
| Monitoring | Prometheus + Grafana |

### Project Links

```
Repository Structure:
/game-clone
├── /client          # Unity project
├── /server          # Go server
├── /proto           # Shared protobuf definitions
├── /infrastructure  # Docker, K8s, Terraform
├── /docs            # Additional documentation
└── ARCHITECTURE.md  # This document
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | - | - | Initial architecture document |

---

*End of Architecture Document*
