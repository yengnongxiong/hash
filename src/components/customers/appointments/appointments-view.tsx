"use client";

import { useState } from "react";
import { AppointmentWithRelations, AppointmentType, Customer } from "@/types/database";
import { AppointmentsTable } from "./appointments-table";
import { AppointmentsCalendar } from "./appointments-calendar";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Calendar as CalendarIcon } from "lucide-react";

interface AppointmentsViewProps {
  initialData: AppointmentWithRelations[];
  customers: Pick<Customer, "id" | "name" | "company">[];
  appointmentTypes: AppointmentType[];
}

export function AppointmentsView({ initialData, customers, appointmentTypes }: AppointmentsViewProps) {
  const [view, setView] = useState<"table" | "calendar">("table");
  const [data, setData] = useState(initialData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "calendar")}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <CreateAppointmentDialog customers={customers} appointmentTypes={appointmentTypes} />
      </div>

      {view === "table" ? (
        <AppointmentsTable data={data} />
      ) : (
        <AppointmentsCalendar data={data} />
      )}
    </div>
  );
}
