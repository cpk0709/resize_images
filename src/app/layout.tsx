import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuFit - 관공서 제출용 서류 이미지 최적화",
  description:
    "회원가입 없이, 아이폰 HEIC 사진을 JPG/PDF 로 바꾸고 목표 용량에 맞춰 압축하고, 주민번호를 가리세요. 파일은 1시간 뒤 완전 삭제됩니다.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  );
}
