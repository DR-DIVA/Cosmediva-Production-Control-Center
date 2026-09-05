import { queryPeople } from '@/lib/peopleDb';

export interface DomainEventPayload {
  [key: string]: any;
}

/**
 * Emits a domain event into the domain_events table for asynchronous subscription
 * and audit trail.
 */
export async function emitDomainEvent(
  eventName: string,
  entityType: string,
  entityId?: string | null,
  payload: DomainEventPayload = {},
  correlationId?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const corrId = correlationId || `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { rows } = await queryPeople(
      `INSERT INTO domain_events (event_name, entity_type, entity_id, payload, correlation_id, occurred_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id;`,
      [eventName, entityType, entityId || null, JSON.stringify(payload || {}), corrId]
    );

    return { success: true, eventId: rows[0]?.id };
  } catch (err: any) {
    console.warn(`[DomainEvents] Warning emitting ${eventName}:`, err.message);
    return { success: false, error: err.message };
  }
}
