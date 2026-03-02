-- 이벤트 관리 시스템 마이그레이션

-- profiles 테이블이 없으면 생성 (auth.users 기반)
CREATE TABLE IF NOT EXISTS profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     text,
  full_name text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 이벤트 테이블
CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  location     text,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  status       text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','cancelled','completed')),
  host_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  has_expense  boolean NOT NULL DEFAULT false,
  has_carpool  boolean NOT NULL DEFAULT false,
  rsvp_due_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 이벤트 멤버 (역할 + RSVP)
CREATE TABLE event_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('host','co_host','member')),
  rsvp      text NOT NULL DEFAULT 'pending' CHECK (rsvp IN ('pending','attending','declined')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- 이메일 초대 (토큰 기반)
CREATE TABLE invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invited_by  uuid NOT NULL REFERENCES profiles(id),
  email       text NOT NULL,
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','declined','expired')),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 공지
CREATE TABLE announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES profiles(id),
  title      text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 비용 (has_expense=true 시 사용)
CREATE TABLE expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  paid_by    uuid NOT NULL REFERENCES profiles(id),
  title      text NOT NULL,
  amount     integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 비용 분담 (더치페이: n등분)
CREATE TABLE expense_splits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id),
  amount      integer NOT NULL CHECK (amount >= 0),
  is_settled  boolean NOT NULL DEFAULT false,
  UNIQUE (expense_id, user_id)
);

-- 카풀 제안 (has_carpool=true 시 사용)
CREATE TABLE carpool_offers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  driver_id  uuid NOT NULL REFERENCES profiles(id),
  departure  text NOT NULL,
  seats      integer NOT NULL CHECK (seats BETWEEN 1 AND 8),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 카풀 탑승 신청
CREATE TABLE carpool_passengers (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id  uuid NOT NULL REFERENCES carpool_offers(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES profiles(id),
  status    text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending','confirmed','rejected')),
  UNIQUE (offer_id, user_id)
);

-- 인덱스
CREATE INDEX idx_event_members_event_id  ON event_members(event_id);
CREATE INDEX idx_event_members_user_id   ON event_members(user_id);
CREATE INDEX idx_announcements_event_id  ON announcements(event_id);
CREATE INDEX idx_expenses_event_id       ON expenses(event_id);
CREATE INDEX idx_expense_splits_user_id  ON expense_splits(user_id);
CREATE INDEX idx_carpool_offers_event_id ON carpool_offers(event_id);
CREATE INDEX idx_invitations_token       ON invitations(token);

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpool_offers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpool_passengers ENABLE ROW LEVEL SECURITY;

-- profiles RLS
CREATE POLICY "본인 프로필 조회" ON profiles FOR SELECT USING (true);
CREATE POLICY "본인 프로필 수정" ON profiles FOR UPDATE USING (auth.uid() = id);

-- events RLS
CREATE POLICY "멤버는 이벤트 조회 가능" ON events FOR SELECT
  USING (
    host_id = auth.uid()  -- 호스트는 항상 자신의 이벤트 조회 가능 (INSERT RETURNING 포함)
    OR EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = events.id
        AND event_members.user_id = auth.uid()
    )
  );

CREATE POLICY "인증 사용자 이벤트 생성" ON events FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "호스트/공동호스트 이벤트 수정" ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = events.id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('host','co_host')
    )
  );

-- event_members RLS
CREATE POLICY "이벤트 멤버 조회" ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "멤버 추가 (호스트/공동호스트)" ON event_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

CREATE POLICY "본인 RSVP 수정" ON event_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

CREATE POLICY "호스트/공동호스트 멤버 삭제" ON event_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

-- invitations RLS
CREATE POLICY "초대 토큰 조회 (누구나)" ON invitations FOR SELECT
  USING (true);

CREATE POLICY "호스트/공동호스트 초대 생성" ON invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = invitations.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

CREATE POLICY "초대 상태 수정" ON invitations FOR UPDATE
  USING (true);

-- announcements RLS
CREATE POLICY "멤버 공지 조회" ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = announcements.event_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "호스트/공동호스트 공지 작성" ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = announcements.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

CREATE POLICY "호스트/공동호스트 공지 삭제" ON announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = announcements.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

-- expenses RLS
CREATE POLICY "멤버 비용 조회" ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = expenses.event_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "멤버 비용 추가" ON expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by
    AND EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = expenses.event_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "호스트/공동호스트 비용 삭제" ON expenses FOR DELETE
  USING (
    paid_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = expenses.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

-- expense_splits RLS
CREATE POLICY "멤버 분담 조회" ON expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN event_members em ON em.event_id = e.event_id
      WHERE e.id = expense_splits.expense_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "분담 생성" ON expense_splits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "본인 분담 정산 처리" ON expense_splits FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM expenses e
      JOIN event_members em ON em.event_id = e.event_id
      WHERE e.id = expense_splits.expense_id
        AND em.user_id = auth.uid()
        AND em.role IN ('host','co_host')
    )
  );

CREATE POLICY "비용 삭제 시 분담 삭제" ON expense_splits FOR DELETE
  USING (true);

-- carpool_offers RLS
CREATE POLICY "멤버 카풀 조회" ON carpool_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = carpool_offers.event_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "멤버 카풀 제안" ON carpool_offers FOR INSERT
  WITH CHECK (
    auth.uid() = driver_id
    AND EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = carpool_offers.event_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "운전자 카풀 수정/삭제" ON carpool_offers FOR DELETE
  USING (driver_id = auth.uid());

-- carpool_passengers RLS
CREATE POLICY "카풀 탑승자 조회" ON carpool_passengers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carpool_offers co
      JOIN event_members em ON em.event_id = co.event_id
      WHERE co.id = carpool_passengers.offer_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "멤버 탑승 신청" ON carpool_passengers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM carpool_offers co
      JOIN event_members em ON em.event_id = co.event_id
      WHERE co.id = carpool_passengers.offer_id
        AND em.user_id = auth.uid()
    )
  );

CREATE POLICY "탑승 상태 수정 (운전자 or 본인)" ON carpool_passengers FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM carpool_offers co
      WHERE co.id = carpool_passengers.offer_id
        AND co.driver_id = auth.uid()
    )
  );

CREATE POLICY "탑승 취소" ON carpool_passengers FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM carpool_offers co
      WHERE co.id = carpool_passengers.offer_id
        AND co.driver_id = auth.uid()
    )
  );
