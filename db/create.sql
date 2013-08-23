CREATE TABLE "show" (
"id" INTEGER PRIMARY KEY AUTOINCREMENT,
"tvdb" INTEGER,
"tvrage" INTEGER,
"imdb" TEXT,
"status" INTEGER DEFAULT 0,
"ended" INTEGER DEFAULT 0,
"name" TEXT,
"directory" TEXT,
"feed" TEXT,
"hd" INTEGER DEFAULT 0 NOT NULL,
"synopsis" TEXT
);

CREATE TABLE "show_episode" (
"id" INTEGER PRIMARY KEY AUTOINCREMENT,
"show_id" INTEGER REFERENCES "show"("id"),
"season" INTEGER,
"episode" INTEGER,
"title" TEXT,
"airdate" TEXT,
"file" TEXT,
"hash" TEXT
);

CREATE INDEX "index" ON "show_episode" ("show_id","season","episode");