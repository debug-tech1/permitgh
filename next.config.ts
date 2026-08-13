import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Attachments are validated at 2MB/file and up to
      // MAX_ATTACHMENTS files (see lib/validation.ts) — base64 encoding adds
      // ~33% overhead, so this needs real headroom above the raw byte cap.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
