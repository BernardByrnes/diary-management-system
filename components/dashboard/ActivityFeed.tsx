import { Droplets, Clock } from "lucide-react";

export interface ActivityItem {
  id: string;
  supplierName: string;
  branchName: string;
  liters: number;
  date: string; // ISO string
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-800">
          Recent Supply Entries
        </h3>
        <span className="text-xs text-gray-400 font-medium">Last entries</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <Droplets className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No supply entries yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Supply records will appear here
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              {/* Index badge */}
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                <span className="text-xs font-bold text-green-700">{idx + 1}</span>
              </div>

              {/* Supplier + branch */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.supplierName}
                </p>
                <p className="text-xs text-gray-400 truncate">{item.branchName}</p>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span>{timeAgo(item.date)}</span>
              </div>

              {/* Liters */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900 font-mono">
                  {item.liters.toFixed(1)}
                  <span className="text-xs text-gray-400 font-normal ml-0.5">L</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
