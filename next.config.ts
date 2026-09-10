import type { NextConfig } from "next";

/**
 * 두 가지 빌드 모드.
 *
 * 1) 기본 (EC2 등 Node 서버): `output: "standalone"`.
 *    `next build` 가 `.next/standalone/` 에 server.js + 필요한 node_modules 만 추려 넣는다. 서버에는 Node 만 있으면 되고
 *    `npm install` 을 돌리지 않는다. `.next/static` 과 `public` 은 포함되지 않으므로 `scripts/package-standalone.mjs` 가 복사한다.
 *
 * 2) GitHub Pages 정적 배포: `scripts/build-pages.mjs` 가 GITHUB_PAGES=true 로 빌드한다.
 *    - output: "export" 로 out/ 에 정적 HTML 생성. 서버 라우트(/api/*)는 스크립트가 빌드 동안 제외한다.
 *    - basePath: 저장소 하위 경로(https://cpk0709.github.io/resize_images/). 링크·정적 자산에 자동 적용된다.
 *    - trailingSlash: /privacy → /privacy/index.html 로 만들어 정적 호스팅에서 새로 고침·직접 접근이 동작한다.
 *    - headers() 는 정적 호스팅에 적용되지 않는다 (아래 주석 참고).
 */
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const GITHUB_PAGES_BASE_PATH = "/resize_images";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: GITHUB_PAGES_BASE_PATH,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : { output: "standalone" }),
  // 네이티브 바이너리를 쓰는 패키지는 번들링에서 제외 (sharp, prisma 는 Next 기본 목록에 있지만 명시)
  serverExternalPackages: ["sharp", "@prisma/client", "@prisma/adapter-pg", "pg"],
  poweredByHeader: false,
  /**
   * 보안 헤더. Node 서버(Vercel, next start)에서만 적용된다.
   * GitHub Pages 같은 정적 호스팅은 응답 헤더를 제어할 수 없어 no-store 등이 붙지 않는다.
   * 이 앱은 파일을 서버로 보내지 않으므로 캐시에 남는 것은 코드·페이지 껍데기뿐이지만, 임시 배포라는 점을 README 에 명시한다.
   */
  async headers() {
    return [
      {
        // /_next/static 은 제외: 파일명에 해시가 붙은 불변 자산이라 Next 가 붙이는 1년 캐시(immutable)를 살려 둔다.
        // 여기까지 no-store 를 걸면 방문마다 1MB 넘는 JS(heic2any 등)를 다시 받는다 (standalone 로컬 검증에서 확인).
        source: "/((?!_next/static).*)",
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
