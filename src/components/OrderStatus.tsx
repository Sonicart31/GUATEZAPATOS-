export const STATUSES = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"] as const;

const styles: Record<string, string> = {
  pendiente: "bg-secondary text-secondary-foreground",
  confirmado: "bg-accent text-accent-foreground",
  enviado: "bg-primary text-primary-foreground",
  entregado: "bg-success text-primary-foreground",
  cancelado: "bg-destructive text-destructive-foreground",
};

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip capitalize ${styles[status] ?? styles.pendiente}`}>{status}</span>;
}
