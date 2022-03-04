CREATE OR REPLACE FUNCTION truncate_tables(username IN VARCHAR) RETURNS void AS $$
DECLARE
    statements CURSOR FOR
        SELECT tablename FROM pg_tables
        WHERE tableowner = username AND schemaname = 'public';
BEGIN
    FOR stmt IN statements LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(stmt.tablename) || ' CASCADE;';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT truncate_tables('digitalmarketplace');

-- Since the above truncates all table, re-add initial content and contentVersions data (from migration 20201202094826_admin-content-stubs.ts)
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('042cb7fe-aae7-4b27-aea0-6a4cf6c7ef73', '2022-02-15 23:06:05.71+00', null, 'about', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('735096eb-219f-4268-ae00-06b9b3dc007e', '2022-02-15 23:06:05.71+00', null, 'accessibility', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('ae3908fc-df1a-45a4-adfa-c749f206cac1', '2022-02-15 23:06:05.71+00', null, 'code-with-us-opportunity-guide', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('12539c48-84c4-432b-a937-e72fe1053736', '2022-02-15 23:06:05.71+00', null, 'code-with-us-proposal-guide', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('f5763a59-4e85-4df1-8961-bf46c980930e', '2022-02-15 23:06:05.71+00', null, 'code-with-us-terms-and-conditions', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('03380516-ffd3-4f46-b684-2b3f0373f015', '2022-02-15 23:06:05.71+00', null, 'copyright', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('a76e80af-94ef-4c04-907e-5102d6698e25', '2022-02-15 23:06:05.71+00', null, 'disclaimer', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('6951e943-19aa-45f9-9a39-152c32d683e5', '2022-02-15 23:06:05.71+00', null, 'markdown-guide', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('017eba1d-6cd2-4f3a-921f-4d1f8c89017f', '2022-02-15 23:06:05.71+00', null, 'privacy', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('14a4ad09-bea3-435b-96ff-c099ff8d6e09', '2022-02-15 23:06:05.71+00', null, 'sprint-with-us-opportunity-guide', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('fc6703bc-bd4d-4fc3-a5fd-877a81ed3c89', '2022-02-15 23:06:05.71+00', null, 'sprint-with-us-opportunity-scope', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('e780e893-d2a7-4253-8ada-cd35903aff04', '2022-02-15 23:06:05.71+00', null, 'sprint-with-us-proposal-evaluation', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('3b624801-0e94-4d70-92d1-5fc75b7a42dc', '2022-02-15 23:06:05.71+00', null, 'sprint-with-us-proposal-guide', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('337d2b47-0e8d-4369-8791-b4afc4d6b856', '2022-02-15 23:06:05.71+00', null, 'sprint-with-us-terms-and-conditions', 't');
INSERT INTO content (id, "createdAt", "createdBy", slug, fixed) VALUES('9af14bf2-f3f9-4b80-ba18-a0ff6ae58942', '2022-02-15 23:06:05.71+00', null, 'terms-and-conditions', 't');


INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'about', 'Initial version', '2022-02-15 23:06:05.71+00', null, '042cb7fe-aae7-4b27-aea0-6a4cf6c7ef73');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'accessibility', 'Initial version', '2022-02-15 23:06:05.71+00', null, '735096eb-219f-4268-ae00-06b9b3dc007e');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'code-with-us-opportunity-guide', 'Initial version', '2022-02-15 23:06:05.71+00', null, 'ae3908fc-df1a-45a4-adfa-c749f206cac1');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'code-with-us-proposal-guide', 'Initial version', '2022-02-15 23:06:05.71+00', null, '12539c48-84c4-432b-a937-e72fe1053736');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'code-with-us-terms-and-conditions', 'Initial version', '2022-02-15 23:06:05.71+00', null, 'f5763a59-4e85-4df1-8961-bf46c980930e');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'copyright', 'Initial version', '2022-02-15 23:06:05.71+00', null, '03380516-ffd3-4f46-b684-2b3f0373f015');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'disclaimer', 'Initial version', '2022-02-15 23:06:05.71+00', null, 'a76e80af-94ef-4c04-907e-5102d6698e25');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'markdown-guide', 'Initial version', '2022-02-15 23:06:05.71+00', null, '6951e943-19aa-45f9-9a39-152c32d683e5');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'privacy', 'Initial version', '2022-02-15 23:06:05.71+00', null, '017eba1d-6cd2-4f3a-921f-4d1f8c89017f');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'sprint-with-us-opportunity-guide', 'Initial version', '2022-02-15 23:06:05.71+00', null, '14a4ad09-bea3-435b-96ff-c099ff8d6e09');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'sprint-with-us-opportunity-scope', 'Initial version', '2022-02-15 23:06:05.71+00', null, 'fc6703bc-bd4d-4fc3-a5fd-877a81ed3c89');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'sprint-with-us-proposal-evaluation', 'Initial version', '2022-02-15 23:06:05.71+00', null, 'e780e893-d2a7-4253-8ada-cd35903aff04');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'sprint-with-us-proposal-guide', 'Initial version', '2022-02-15 23:06:05.71+00', null, '3b624801-0e94-4d70-92d1-5fc75b7a42dc');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'sprint-with-us-terms-and-conditions', 'Initial version', '2022-02-15 23:06:05.71+00', null, '337d2b47-0e8d-4369-8791-b4afc4d6b856');
INSERT INTO "contentVersions" (id, title, body, "createdAt", "createdBy", "contentId") VALUES(1, 'terms-and-conditions', 'Initial version', '2022-02-15 23:06:05.71+00', null, '9af14bf2-f3f9-4b80-ba18-a0ff6ae58942');
