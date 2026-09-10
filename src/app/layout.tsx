import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { AppBar } from "@/components/layout/AppBar";
import "./globals.css";

/*
 * 글꼴은 next/font 가 빌드 시 내려받아 함께 배포한다. 실행 중 Google 서버로 요청이 나가지 않는다 (프라이버시 원칙).
 * Inter: 라틴·숫자. Noto Sans KR: 한글 (유니코드 범위별로 잘려 있어 쓰는 글자 범위만 내려받는다).
 */
const inter = Inter({ subsets: ["latin"], weight: "variable", display: "swap", variable: "--font-inter" });
const notoKr = Noto_Sans_KR({ subsets: ["latin"], weight: "variable", display: "swap", variable: "--font-noto-kr", preload: false });

export const metadata: Metadata = {
  title: "DocuFit - 관공서 제출용 서류 이미지 최적화",
  description:
    "회원가입 없이, 아이폰 HEIC 사진을 JPG/PDF 로 바꾸고 목표 용량에 맞춰 압축하고, 주민번호를 가리세요. 파일은 1시간 뒤 완전 삭제됩니다.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${inter.variable} ${notoKr.variable}`}>
      <body className="flex min-h-full flex-col bg-surface font-sans text-ink">
        <AppBar />
        {/* 푸터는 각 페이지가 그린다. 스튜디오는 모바일 고정 액션 바 때문에 푸터 아래 여백이 필요하고, 안내 페이지는 필요 없다. */}
        {children}
      </body>
    </html>
  );
}
