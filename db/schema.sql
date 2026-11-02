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
create table reminder_log (
  user_id text not null references "user"(id) on delete cascade,
  milestone_id text not null, due_date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, milestone_id, due_date)
);
