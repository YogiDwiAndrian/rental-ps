import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow custom domains in development
  allowedDevOrigins: [
    'rentalps.local',
    'admin.rentalps.local',
    'demo.rentalps.local',
    'pslounge.rentalps.local',
    // Add more tenant subdomains as needed
  ],
  
};

export default nextConfig;