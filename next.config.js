/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    const apiInternal = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    return [
      {
        source: "/socket.io",
        destination: `${apiInternal}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiInternal}/socket.io/:path*`,
      },
      {
        source: "/avatars/:path*",
        destination: `${apiInternal}/avatars/:path*`,
      },
      {
        source: "/rooms",
        destination: `${apiInternal}/rooms`,
      },
      {
        source: "/rooms/:path*",
        destination: `${apiInternal}/rooms/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${apiInternal}/auth/:path*`,
      },
      {
        source: "/profile/:path*",
        destination: `${apiInternal}/profile/:path*`,
      },
      {
        source: "/games/:path*",
        destination: `${apiInternal}/games/:path*`,
      },
      {
        source: "/room/:path*",
        destination: `${apiInternal}/room/:path*`,
      },
      {
        source: "/health",
        destination: `${apiInternal}/health`,
      },
    ];
  },
};

module.exports = nextConfig;