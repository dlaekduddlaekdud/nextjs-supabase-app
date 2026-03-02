-- 호스트만 완료/취소된 이벤트를 삭제할 수 있는 RLS 정책 추가
CREATE POLICY "호스트 이벤트 삭제" ON events FOR DELETE
  USING (host_id = auth.uid());
