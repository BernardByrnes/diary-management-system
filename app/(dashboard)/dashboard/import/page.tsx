import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Upload } from "lucide-react";
import ImportClient from "@/components/import/ImportClient";

export default async function ImportPage() {
  const session = await auth();
  const user = session!.user as { id: string; role: string };

  if (user.role !== "EXECUTIVE_DIRECTOR") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Upload className="w-5 h-5 text-violet-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSV Import</h1>
          <p className="text-sm text-gray-400">
            Upload a spreadsheet and the AI will map and import the data
          </p>
        </div>
      </div>

      <ImportClient />
    </div>
  );
}
