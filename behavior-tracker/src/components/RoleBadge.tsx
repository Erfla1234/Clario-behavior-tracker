export function RoleBadge({ role }: { role: 'staff' | 'supervisor' }) {
  return (
    <span className={`badge badge-${role}`}>
      {role === 'supervisor' ? 'Supervisor' : 'Staff'}
    </span>
  );
}