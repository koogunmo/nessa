CREATE TABLE "show" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"tvdb" INTEGER UNIQUE,
	"imdb" TEXT,
	"status" INTEGER DEFAULT 0 NOT NULL,
	"ended" INTEGER DEFAULT 0 NOT NULL,
	"name" TEXT,
	"directory" TEXT,
	"feed" TEXT,
	"hd" INTEGER DEFAULT 0 NOT NULL,
	"synopsis" TEXT
);

CREATE TABLE "show_episode" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"show_id" INTEGER REFERENCES "show"("id"),
	"status" INTEGER DEFAULT 0 NOT NULL,
	"season" INTEGER,
	"episode" INTEGER,
	"title" TEXT,
	"airdate" TEXT,
	"file" TEXT,
	"hash" TEXT,
	"downloaded" TEXT,
	"watched" INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE "show_unmatched" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"directory" TEXT UNIQUE,
	"tvdb" INTEGER,
	"tvrage" INTEGER
);

CREATE TABLE "user" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"username" TEXT UNIQUE,
	"password" TEXT,
	"salt" TEXT
);

CREATE INDEX "index" ON "show_episode" ("show_id","season","episode");