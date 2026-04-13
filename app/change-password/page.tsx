"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Failed to change password. Please try again.");
        return;
      }

      await signOut({ callbackUrl: "/auth/login" });
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-700" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set Your Password</h1>
          <p className="text-gray-500 mt-1 text-sm">
            You must set a new password before continuing
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {serverError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                className={`w-full px-4 py-3 text-base rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500
                  ${errors.currentPassword ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="mt-1.5 text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                className={`w-full px-4 py-3 text-base rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500
                  ${errors.newPassword ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="mt-1.5 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                At least 8 characters, one uppercase letter, one number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                className={`w-full px-4 py-3 text-base rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500
                  ${errors.confirmPassword ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg text-base transition-colors"
            >
              {isLoading ? "Saving..." : "Set New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
