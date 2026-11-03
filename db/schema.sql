-- 앱 테이블. auth-schema.sql 다음에 실행("user" 참조)
create table dream (
  user_id text not null references "user"(id) on delete cascade,
  id text not null,
  data jsonb,                       -- 삭제되면 null
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);
create table category_log (
  user_id text not null references "user"(id) on delete cascade,
  name text not null, at timestamptz not null, deleted boolean not null,
  primary key (user_id, name)
);
create table push_subscription (
  endpoint text primary key,
  user_id text not null references "user"(id) on delete cascade,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
-- 알림은 사용자당 하루 1통(그날 알릴 꿈을 묶는다). 같은 날 두 번 보내지 않게 날짜만 남긴다
create table reminder_log (
  user_id text not null references "user"(id) on delete cascade,
  sent_on date not null,
  primary key (user_id, sent_on)
);
