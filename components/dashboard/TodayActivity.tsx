import { Activity, Clock } from "lucide-react";

export interface AuditActivityItem {
  id: string;
  action: string;      // "CREATE" | "UPDATE" | "DELETE"
  entityType: string;
  userName: string;
  createdAt: string;   // ISO string
}

interface TodayActivityProps {
  items: AuditActivityItem[];
}

const entityLabels: Record<string, string> = {
  MilkSupply: "milk supply",
  Sale: "a sale",
  Expense: "an expense",
  BankDeposit: "a bank deposit",
  LactometerReading: "a lactometer reading",
  MilkTransfer: "a milk transfer",
  Advance: "an advance",
  SupplierPayment: "a supplier payment",
  ProfitDistribution: "a profit distribution",
  Branch: "a branch",
  User: "a user",
  Supplier: "a supplier",
};

const actionVerbs: Record<string, Record<string, string>> = {
  CREATE: {
    MilkSupply: "recorded milk supply",
    Sale: "recorded a sale",
    Expense: "recorded an expense",
    BankDeposit: "logged a bank deposit",
    LactometerReading: "recorded a lactometer reading",
    MilkTransfer: "requested a milk transfer",
    Advance: "recorded an advance",
    default: "created",
  },
  UPDATE: {
    MilkTransfer: "updated a transfer",
    SupplierPayment: "updated a supplier payment",
    ProfitDistribution: "updated a distribution",
    default: "updated",
  },
  DELETE: {
    default: "deleted",
  },
};

function describeAction(action: string, entityType: string): string {
  const verbs = actionVerbs[action] ?? actionVerbs.CREATE;
  return verbs[entityType] ?? `${action.toLowerCase()}d ${entityLabels[entityType] ?? entityType.toLowerCase()}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const actionDotColor: Record<string, string> = {
  CREATE: "bg-green-400",
  UPDATE: "bg-blue-400",
  DELETE: "bg-red-400",
};

export default function TodayActivity({ items }: TodayActivityProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Today&apos;s Activity</h3>
        <span className="text-xs text-gray-400">{items.length} action{items.length !== 1 ? "s" : ""}</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No activity yet today</p>
          <p className="text-xs text-gray-400 mt-1">Actions taken today will appear here</p>
        </div>
      ) : (
        <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="mt-1.5 shrink-0">
                <div className={`w-2 h-2 rounded-full ${actionDotColor[item.action] ?? "bg-gray-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">
                  <span className="font-medium">{item.userName}</span>
                  {" "}
                  <span className="text-gray-600">{describeAction(item.action, item.entityType)}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{timeAgo(item.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
