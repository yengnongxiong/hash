"use client";

import { Appointment } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Check, X, Trash } from "lucide-react";
import { updateAppointmentStatus, deleteAppointment } from "@/app/(dashboard)/people/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type CustomerInfo = { id?: string; name: string | null; company: string | null; customer_number?: string };
type AppointmentWithCustomer = Appointment & {
  customers?: CustomerInfo | CustomerInfo[] | null;
};

interface AppointmentsTableProps {
  data: AppointmentWithCustomer[];
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "scheduled":
      return <Badge variant="outline">Scheduled</Badge>;
    case "completed":
      return <Badge className="bg-green-500">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function AppointmentsTable({ data }: AppointmentsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (id: string, status: "completed" | "cancelled") => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, status);
      if (result.error) {
        toast.error("Failed to update status", { description: result.error });
      } else {
        toast.success(`Appointment marked as ${status}`);
        router.refresh();
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const result = await deleteAppointment(id);
      if (result.error) {
        toast.error("Failed to delete", { description: result.error });
      } else {
        toast.success("Appointment deleted");
        router.refresh();
      }
    });
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No appointments scheduled
      </div>
    );
  }

  return (
    <div className={isPending ? "opacity-70" : ""}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell className="font-medium">{appointment.title}</TableCell>
              <TableCell>
                {appointment.customers ? (
                  <div>
                    {Array.isArray(appointment.customers) ? (
                      appointment.customers.map((c, i) => (
                        <div key={i}>
                          <div>{c.name}</div>
                          {c.company && (
                            <div className="text-xs text-muted-foreground">{c.company}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <>
                        <div>{appointment.customers.name}</div>
                        {appointment.customers.company && (
                          <div className="text-xs text-muted-foreground">
                            {appointment.customers.company}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{formatDateTime(appointment.start_time)}</TableCell>
              <TableCell>{appointment.end_time ? formatDateTime(appointment.end_time) : "—"}</TableCell>
              <TableCell>{appointment.location || "—"}</TableCell>
              <TableCell>{getStatusBadge(appointment.status || "scheduled")}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(appointment.id, "completed")}
                      disabled={appointment.status === "completed"}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(appointment.id, "cancelled")}
                      disabled={appointment.status === "cancelled"}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(appointment.id)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
