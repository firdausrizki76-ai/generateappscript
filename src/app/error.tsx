"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-950 text-surface-100 p-4">
      <div className="glass border border-surface-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-fade-up">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          Ups! Terjadi Kesalahan
        </h2>
        
        <p className="text-surface-400 mb-8 text-sm leading-relaxed">
          Maaf, ada sesuatu yang tidak beres. Browser Anda mungkin menyimpan file cache yang sudah usang. Silakan muat ulang halaman secara penuh.
        </p>

        <div className="flex flex-col gap-3">
          <button
            // We forcefully reload the window instead of using Next.js reset() 
            // to bypass the aggressive client router cache and fetch the latest chunks!
            onClick={() => window.location.reload()}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang Paksa (Hard Refresh)
          </button>
          
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="btn-ghost w-full"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
