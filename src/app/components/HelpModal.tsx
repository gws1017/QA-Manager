'use client';
import React, { useState } from 'react';
import { X } from 'lucide-react';

/** 사이드바 '사용 가이드' 버튼으로 여는 도움말 모달 */
export default function HelpModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'tc' | 'issue' | 'common'>('tc');
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#1f3864]">사용 가이드</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {/* 탭 */}
        <div className="flex border-b shrink-0">
          {([['tc', 'TC 관리'], ['issue', '이슈 관리'], ['common', '공통']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-[#1f3864] text-[#1f3864]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* 내용 */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-gray-700">
          {tab === 'tc' && <>
            <Section title="프로젝트 / 탭 관리">
              <Item label="프로젝트 추가" desc="사이드바 하단 입력창에 이름 입력 후 + 버튼" />
              <Item label="프로젝트 삭제" desc="사이드바 프로젝트명 우측 휴지통 아이콘 클릭 (포함된 탭·TC 전부 삭제)" />
              <Item label="이름 변경" desc="프로젝트명 또는 탭명 더블클릭 후 수정" />
              <Item label="탭 추가" desc="프로젝트 펼친 후 하단 + 버튼" />
              <Item label="탭 삭제" desc="탭명 우측 휴지통 아이콘 클릭" />
            </Section>
            <Section title="TC 작성">
              <Item label="TC 추가" desc="상단 'TC 추가' 버튼 클릭" />
              <Item label="TC 수정" desc="행 클릭하면 상세 펼침 → 각 필드 직접 수정" />
              <Item label="TC 복제" desc="행 우측 복사 아이콘 클릭 → 동일 탭 하단에 복제본 생성" />
              <Item label="TC 삭제" desc="행 우측 휴지통 아이콘 클릭" />
              <Item label="결과 변경" desc="행의 결과 드롭다운에서 Pass / Fail / N/A / No Run 선택" />
            </Section>
            <Section title="필터 / 일괄 작업">
              <Item label="결과 필터" desc="상단 Pass · Fail · No Run 배지 클릭 → 해당 결과만 표시, 다시 클릭하면 해제" />
              <Item label="TC 선택" desc="좌측 체크박스 클릭 (헤더 체크박스로 전체 선택)" />
              <Item label="일괄 결과변경" desc="TC 선택 후 상단 툴바에서 결과 버튼 클릭" />
              <Item label="일괄 삭제" desc="TC 선택 후 툴바 '일괄 삭제' 버튼 클릭" />
            </Section>
            <Section title="스크린샷">
              <Item label="붙여넣기" desc="TC 상세 펼친 상태에서 Ctrl+V" />
              <Item label="드래그&드롭" desc="이미지 파일을 점선 영역에 드롭" />
              <Item label="파일 선택" desc="'파일 선택' 버튼 클릭" />
              <Item label="캡션" desc="썸네일 아래 입력창에 캡션 입력 후 포커스 해제 시 저장" />
              <Item label="확대보기" desc="썸네일 클릭 → 라이트박스에서 캡션 포함 표시" />
            </Section>
            <Section title="엑셀 Import / Export">
              <Item label="Export" desc="상단 '엑셀 Export' 버튼 → 프로젝트 전체 다운로드 (탭별 시트 + 대시보드)" />
              <Item label="Import" desc="상단 '엑셀 Import' 버튼 → Export와 동일한 형식의 파일 업로드, 기존 TC는 업데이트, 신규는 추가" />
            </Section>
          </>}
          {tab === 'issue' && <>
            <Section title="이슈 프로젝트 관리">
              <Item label="프로젝트 추가" desc="이슈 탭 → 사이드바 하단 입력창에 이름 입력 후 + 버튼" />
              <Item label="프로젝트 삭제" desc="프로젝트명 우측 휴지통 아이콘 (포함된 이슈 전부 삭제)" />
              <Item label="이름 변경" desc="프로젝트명 더블클릭 후 수정" />
            </Section>
            <Section title="이슈 작성">
              <Item label="이슈 추가" desc="상단 '이슈 추가' 버튼 클릭" />
              <Item label="이슈 수정" desc="행 클릭하면 상세 펼침 → 제목·유형·우선순위·마감기한·설명 수정" />
              <Item label="상태 변경" desc="행의 상태 드롭다운에서 Open / In Progress / Resolved / Closed 선택" />
              <Item label="이슈 복제" desc="행 우측 복사 아이콘 클릭" />
              <Item label="이슈 삭제" desc="행 우측 휴지통 아이콘 클릭" />
            </Section>
            <Section title="필터 / 일괄 작업">
              <Item label="필터" desc="상단 상태·유형·우선순위 드롭다운으로 조합 필터링" />
              <Item label="이슈 선택" desc="좌측 체크박스 클릭 (헤더로 전체 선택)" />
              <Item label="일괄 이동" desc="이슈 선택 후 상단 '이동할 프로젝트' 드롭다운 선택 → 이동" />
              <Item label="일괄 삭제" desc="이슈 선택 후 상단 빨간 '삭제' 버튼 클릭" />
            </Section>
            <Section title="TC 연결">
              <Item label="TC 연결" desc="이슈 상세 펼침 → '연관 TC' 패널 → 검색창에서 TC 선택" />
              <Item label="연결 해제" desc="연결된 TC 우측 X 버튼" />
              <Item label="TC로 이동" desc="연결된 TC 배지 클릭 → 해당 TC로 즉시 이동 및 펼침" />
            </Section>
            <Section title="스크린샷">
              <Item label="첨부 방법" desc="Ctrl+V · 드래그&드롭 · 파일 선택 (TC 스크린샷과 동일)" />
              <Item label="캡션 / 확대보기" desc="TC 스크린샷과 동일" />
            </Section>
          </>}
          {tab === 'common' && <>
            <Section title="TC ↔ 이슈 양방향 연결">
              <Item label="이슈 → TC" desc="이슈 상세의 연관 TC 배지 클릭 → TC 관리 화면으로 이동 후 해당 TC 펼침" />
              <Item label="TC → 이슈" desc="TC 상세의 연관 이슈 배지 클릭 → 이슈 화면으로 이동 후 해당 이슈 펼침" />
            </Section>
            <Section title="사이드바 뷰 전환">
              <Item label="TC 관리" desc="상단 'TC 관리' 탭 클릭" />
              <Item label="이슈 관리" desc="상단 '이슈' 탭 클릭 → 이슈 전용 프로젝트 목록으로 전환" />
            </Section>
            <Section title="데이터 저장">
              <Item label="자동 저장" desc="모든 입력은 포커스 해제(onBlur) 또는 선택 즉시 서버에 자동 저장됨" />
              <Item label="DB 위치" desc="서버 PC의 data/ 폴더에 SQLite 파일로 저장, 이미지는 data/screenshots/ 에 저장" />
            </Section>
          </>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-[#1f3864] mb-2 pb-1 border-b border-gray-100">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Item({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 font-medium text-gray-700 w-28">{label}</span>
      <span className="text-gray-500">{desc}</span>
    </div>
  );
}
