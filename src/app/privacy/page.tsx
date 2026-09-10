import type { Metadata } from "next";
import Link from "next/link";
import { FILE_TTL_MS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "개인정보 처리 안내 - DocuFit",
  description: "DocuFit 은 서류 이미지를 브라우저 안에서만 처리하며 서버로 전송하거나 저장하지 않습니다.",
};

/** 마지막으로 내용을 검토한 날짜. 정책을 바꾸면 함께 갱신한다. */
const LAST_REVIEWED = "2026-09-09";

/**
 * 개인정보 처리 안내.
 * 법률 자문이 아니라 "실제로 무엇을 하고 하지 않는지" 를 사실대로 적는 문서다. 코드가 바뀌면 이 문서도 바뀌어야 한다.
 * - 현재 버전은 파일을 서버로 보내지 않는다 (Phase 2, 브라우저 전용).
 * - 서버 처리 옵션(Phase 3)이 켜지면 "서버 처리를 선택한 경우" 절이 실제 동작이 된다. 그 전까지는 예고다.
 */
export default function PrivacyPage() {
  const ttlMinutes = Math.round(FILE_TTL_MS / 60_000);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
      <Link href="/" prefetch={false} className="text-sm text-muted underline hover:text-ink">
        ← 스튜디오로 돌아가기
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy">개인정보 처리 안내</h1>
      <p className="mt-2 text-sm text-muted">마지막 검토: {LAST_REVIEWED}</p>

      <section className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <Block title="한 줄 요약">
          DocuFit 은 회원가입이 없고, 올리신 서류 이미지를 <strong>서버로 전송하거나 저장하지 않습니다.</strong> 변환·압축·가리기·이어붙이기·PDF
          만들기는 모두 사용자의 브라우저 안에서 실행되고, 탭을 닫으면 남는 것이 없습니다.
        </Block>

        <Block title="1. 수집하지 않는 것">
          <ul className="list-disc space-y-1 pl-5">
            <li>이름, 이메일, 전화번호 등 계정 정보. 회원가입과 로그인이 없습니다.</li>
            <li>업로드한 이미지와 그 안의 내용(주민등록번호, 서명, 계약 조건 등). 서버에 도달하지 않습니다.</li>
            <li>파일명, 촬영 위치·시각·기기 정보(EXIF). 결과 파일을 만들 때 EXIF 는 제거됩니다.</li>
            <li>쿠키. 현재 버전은 쿠키를 설정하지 않습니다.</li>
            <li>분석·광고 스크립트. 사용하지 않습니다.</li>
          </ul>
        </Block>

        <Block title="2. 브라우저 안에서 일어나는 일">
          <p>
            페이지를 열면 코드가 브라우저로 내려오고, 그 뒤의 모든 처리는 사용자의 기기에서 일어납니다. 아이폰 HEIC 변환, 목표 용량 압축,
            검은 박스·모자이크 가리기, 크롭·회전, 이어붙이기, PDF 조립이 여기에 해당합니다. 이미지 데이터는 브라우저 메모리에만 있고, 페이지를
            새로 고치거나 탭을 닫으면 사라집니다. 결과 파일은 사용자가 &ldquo;다운로드&rdquo; 를 눌렀을 때 기기에만 저장됩니다.
          </p>
        </Block>

        <Block title="3. 서버가 받는 것">
          <p>
            서버는 페이지와 코드를 전달하는 역할만 합니다. 다른 웹사이트와 마찬가지로, 서비스를 운영하는 호스팅 업체가 접속 기록(접속 시각, IP 주소,
            브라우저 종류, 요청한 주소)을 보안·장애 대응 목적으로 일정 기간 보관할 수 있습니다. 이 기록에는 이미지나 파일명이 포함되지 않습니다.
            보관 기간과 업체는 배포 환경이 확정되면 이 문단에 명시합니다.
          </p>
        </Block>

        <Block title="4. 서버 처리를 선택한 경우 (준비 중)">
          <p>
            향후 브라우저가 처리하기 어려운 초대형 이미지를 위해 &ldquo;서버에서 처리&rdquo; 옵션이 추가될 수 있습니다. 이 옵션은 사용자가 명시적으로
            선택했을 때만 동작하며, 그때도 다음 원칙을 지킵니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>가리기(마스킹)를 마친 이미지만 전송합니다. 가리기 전 원본은 보내지 않습니다.</li>
            <li>결과 파일은 암호화된 저장소에 두고, 생성 후 <strong>{ttlMinutes}분</strong>이 지나면 자동으로 완전히 삭제합니다.</li>
            <li>다운로드 링크는 짧은 시간만 유효하며, 파일명·이미지 내용은 기록에 남기지 않습니다.</li>
          </ul>
          <p className="mt-2 text-sm text-muted">현재 버전에는 이 옵션이 없습니다. 위 내용은 추가될 경우의 약속입니다.</p>
        </Block>

        <Block title="5. 제출처 프리셋의 용량 기준">
          <p>
            정부24·대법원·홈택스 등 프리셋의 &ldquo;기본 파일 1장 최대 용량&rdquo; 은 공개 안내를 바탕으로 보수적으로 잡은 <strong>참고값</strong>입니다.
            기관 안내는 민원 종류마다 다르고 예고 없이 바뀌므로, 제출 전 해당 사이트의 첨부 안내를 확인하시기 바랍니다.
          </p>
        </Block>

        <Block title="6. 문의">
          <p>
            이 안내에 대한 질문이나 정정 요청은 프로젝트 저장소(
            <a href="https://github.com/cpk0709/resize_images" className="underline" rel="noopener noreferrer" target="_blank">
              github.com/cpk0709/resize_images
            </a>
            ) 이슈로 남겨 주세요.
          </p>
        </Block>
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-panel p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}
