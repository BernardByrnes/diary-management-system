import type { Role } from "@prisma/client";

export type { Role };

export interface SessionUser {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface BranchWithRelations {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  ownerId: string;
  owner: {
    id: string;
    fullName: string;
    phone: string;
  };
  managers: {
    manager: {
      id: string;
      fullName: string;
      phone: string;
    };
  }[];
}

export interface DashboardStats {
  totalMilkToday: number;
  totalSalesToday: number;
  totalExpensesThisMonth: number;
  pendingTransfers: number;
  unreadNotifications: number;
}
