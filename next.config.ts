import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브 바이너리를 쓰는 패키지는 번들링에서 제외 (sharp, prisma 는 Next 기본 목록에 있지만 명시)
  serverExternalPackages: ["sharp", "@prisma/client", "@prisma/adapter-pg", "pg"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // 민감 서류를 다루는 페이지: 브라우저 캐시에 남기지 않는다
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
