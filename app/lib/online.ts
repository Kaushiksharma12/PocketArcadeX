// Online Multiplayer Helper using ntfy.sh

export interface OnlineEvent {
  id: string;
  sender: string;
  type: string;
  payload: any;
  time?: number;
}

// Generate unique 6-character room code (alphanumeric uppercase, avoiding confusing chars)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Persist unique player session ID in sessionStorage
export function getSessionPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('pocket_arcade_x_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('pocket_arcade_x_player_id', id);
  }
  return id;
}

// Helper to publish a message to ntfy.sh
export async function publishEvent(roomCode: string, type: string, payload: any): Promise<boolean> {
  const topic = `pocket-arcade-x-room-${roomCode.toUpperCase()}`;
  const sender = getSessionPlayerId();
  const eventData = {
    sender,
    type,
    payload,
    timestamp: Date.now()
  };

  try {
    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: JSON.stringify(eventData),
      headers: {
        'Title': `Event: ${type}`,
        'X-Cache': 'yes' // Explicitly request caching
      }
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to publish event:', err);
    return false;
  }
}

// Helper to poll all historical events for a room
export async function fetchEventHistory(roomCode: string): Promise<OnlineEvent[]> {
  const topic = `pocket-arcade-x-room-${roomCode.toUpperCase()}`;
  try {
    const response = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`);
    if (!response.ok) return [];
    
    const text = await response.text();
    if (!text.trim()) return [];

    // Parse newline-delimited JSON
    const lines = text.split('\n').filter(Boolean);
    const events: OnlineEvent[] = [];

    for (const line of lines) {
      try {
        const rawMsg = JSON.parse(line);
        if (rawMsg.event === 'message' && rawMsg.message) {
          const parsedData = JSON.parse(rawMsg.message);
          if (parsedData.sender && parsedData.type) {
            events.push({
              id: rawMsg.id,
              sender: parsedData.sender,
              type: parsedData.type,
              payload: parsedData.payload,
              time: rawMsg.time
            });
          }
        }
      } catch (e) {
        // Skip unparsable or control messages
      }
    }

    // Sort by message time ascending
    return events.sort((a, b) => (a.time || 0) - (b.time || 0));
  } catch (err) {
    console.error('Failed to fetch event history:', err);
    return [];
  }
}

// Client connection manager for SSE
export class OnlineConnection {
  private roomCode: string;
  private eventSource: EventSource | null = null;
  private onEventCallback: (event: OnlineEvent) => void;
  private onStatusCallback: (status: 'connected' | 'connecting' | 'disconnected') => void;
  private processedIds: Set<string>;
  private includeSelf: boolean;

  constructor(
    roomCode: string,
    onEvent: (event: OnlineEvent) => void,
    onStatus: (status: 'connected' | 'connecting' | 'disconnected') => void,
    processedIds: Set<string>,
    includeSelf = false
  ) {
    this.roomCode = roomCode.toUpperCase();
    this.onEventCallback = onEvent;
    this.onStatusCallback = onStatus;
    this.processedIds = processedIds;
    this.includeSelf = includeSelf;
  }

  connect() {
    if (typeof window === 'undefined') return;
    this.disconnect();

    const topic = `pocket-arcade-x-room-${this.roomCode}`;
    this.onStatusCallback('connecting');

    try {
      this.eventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);

      this.eventSource.onopen = () => {
        this.onStatusCallback('connected');
      };

      this.eventSource.onerror = () => {
        this.onStatusCallback('disconnected');
        // SSE automatically retries, but we report the state change
      };

      this.eventSource.onmessage = (event) => {
        try {
          const rawMsg = JSON.parse(event.data);
          if (rawMsg.event === 'message' && rawMsg.message) {
            const parsedData = JSON.parse(rawMsg.message);
            if (parsedData.sender && parsedData.type) {
              const onlineEvent: OnlineEvent = {
                id: rawMsg.id,
                sender: parsedData.sender,
                type: parsedData.type,
                payload: parsedData.payload,
                time: rawMsg.time
              };

              // Prevent duplicates and ignore our own live messages if includeSelf is false
              if (!this.processedIds.has(onlineEvent.id)) {
                this.processedIds.add(onlineEvent.id);
                if (this.includeSelf || onlineEvent.sender !== getSessionPlayerId()) {
                  this.onEventCallback(onlineEvent);
                }
              }
            }
          }
        } catch (e) {
          // Ignore parse errors or ping/system events
        }
      };
    } catch (err) {
      console.error('Failed to establish EventSource connection:', err);
      this.onStatusCallback('disconnected');
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.onStatusCallback('disconnected');
  }
}
