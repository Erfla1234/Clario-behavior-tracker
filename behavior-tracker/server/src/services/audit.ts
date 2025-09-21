export interface AuditLogEntry {
  org_id: string;
  actor_id: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  entity?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}

export const auditService = {
  async log(pool: any, entry: AuditLogEntry) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (org_id, actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.org_id,
          entry.actor_id,
          entry.action,
          entry.entity,
          entry.entity_id,
          entry.metadata ? JSON.stringify(entry.metadata) : null
        ]
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
};